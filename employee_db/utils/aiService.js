import { buildContextText, buildFallbackAnswer } from "./aiDataSearch.js";

const SYSTEM_PROMPT = `You are an AI assistant for a Patch Update Tracker app.
Answer only using the database context provided below.
Be concise, accurate, and use markdown when helpful.
If the context does not contain the answer, say you could not find it in the database.
Do not invent patch names, versions, dates, or people.`;

const GEMINI_MODEL_FALLBACKS = [
  "gemini-2.0-flash-lite",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
];

const OPENROUTER_MODELS = [
  "openrouter/free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "meta-llama/llama-3.2-3b-instruct:free",
];

function buildUserPrompt(question, context, today) {
  return `Today's date: ${today}\n\nDatabase context:\n${context}\n\nUser question: ${question}`;
}

function isQuotaError(status, message) {
  return status === 429 || /quota|rate.?limit|resource_exhausted/i.test(message);
}

function isValidGeminiKey(key) {
  return Boolean(key?.trim().startsWith("AIza"));
}

async function callGeminiModel(apiKey, model, systemPrompt, userPrompt) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 1024 },
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    const error = new Error(`Gemini error (${response.status}): ${text}`);
    error.status = response.status;
    throw error;
  }

  const payload = await response.json();
  return payload.candidates?.[0]?.content?.parts?.map((part) => part.text).join("").trim() || "";
}

async function callGemini(systemPrompt, userPrompt) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!isValidGeminiKey(apiKey)) throw new Error("GEMINI_API_KEY is missing or invalid (must start with AIza)");

  const preferred = process.env.GEMINI_MODEL?.trim();
  const models = preferred
    ? [preferred, ...GEMINI_MODEL_FALLBACKS.filter((m) => m !== preferred)]
    : GEMINI_MODEL_FALLBACKS;

  let lastError;
  for (const model of models) {
    try {
      const answer = await callGeminiModel(apiKey, model, systemPrompt, userPrompt);
      if (answer) {
        console.log(`[AI] Gemini responded using model: ${model}`);
        return answer;
      }
    } catch (error) {
      lastError = error;
      console.warn(`[AI] Gemini model ${model} failed:`, error.message?.slice(0, 160));
      if (isQuotaError(error.status, error.message)) break;
    }
  }

  throw lastError || new Error("All Gemini models failed");
}

async function callGroq(systemPrompt, userPrompt) {
  const apiKey = process.env.GROQ_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("GROQ_API_KEY is not set");

  const baseUrl = (process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1").replace(/\/$/, "");
  const model = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Groq error (${response.status}): ${text}`);
  }

  const payload = await response.json();
  return payload.choices?.[0]?.message?.content?.trim() || "";
}

async function callOpenRouter(systemPrompt, userPrompt) {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");

  const preferred = process.env.OPENROUTER_MODEL?.trim();
  const models = preferred
    ? [preferred, ...OPENROUTER_MODELS.filter((m) => m !== preferred)]
    : OPENROUTER_MODELS;

  let lastError;
  for (const model of models) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": "http://localhost:5173",
          "X-Title": "Publish Tracker",
        },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          max_tokens: 1024,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`OpenRouter error (${response.status}): ${text}`);
      }

      const payload = await response.json();
      const answer = payload.choices?.[0]?.message?.content?.trim() || "";
      if (answer) {
        console.log(`[AI] OpenRouter responded using model: ${model}`);
        return answer;
      }
    } catch (error) {
      lastError = error;
      console.warn(`[AI] OpenRouter model ${model} failed:`, error.message?.slice(0, 160));
    }
  }

  throw lastError || new Error("All OpenRouter models failed");
}

async function callOllama(systemPrompt, userPrompt) {
  const baseUrl = (process.env.OLLAMA_BASE_URL || "http://localhost:11434").replace(/\/$/, "");
  const model = process.env.OLLAMA_MODEL || "llama3.2:1b";

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      stream: false,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Ollama error (${response.status}): ${text}`);
  }

  const payload = await response.json();
  return payload.message?.content?.trim() || "";
}

export function getConfiguredProviders() {
  const providers = [];
  if (process.env.GROQ_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim()) providers.push("groq");
  if (process.env.OPENROUTER_API_KEY?.trim()) providers.push("openrouter");
  if (isValidGeminiKey(process.env.GEMINI_API_KEY)) providers.push("gemini");
  if (process.env.OLLAMA_ENABLED === "true") providers.push("ollama");
  return providers;
}

async function callProvider(provider, systemPrompt, userPrompt) {
  if (provider === "gemini") return callGemini(systemPrompt, userPrompt);
  if (provider === "groq") return callGroq(systemPrompt, userPrompt);
  if (provider === "openrouter") return callOpenRouter(systemPrompt, userPrompt);
  if (provider === "ollama") return callOllama(systemPrompt, userPrompt);
  throw new Error(`Unknown AI provider: ${provider}`);
}

export async function generateAiAnswer(question, searchResult) {
  const context = buildContextText(searchResult);
  const today = new Date().toISOString().split("T")[0];
  const userPrompt = buildUserPrompt(question, context, today);
  const provider = (process.env.AI_PROVIDER || "auto").toLowerCase();

  if (provider === "none") {
    return buildFallbackAnswer(searchResult);
  }

  const providersToTry = provider === "auto" ? getConfiguredProviders() : [provider];

  if (providersToTry.length === 0) {
    console.log("[AI] No API keys configured — using smart database answers.");
    return buildFallbackAnswer(searchResult);
  }

  console.log(`[AI] Trying providers: ${providersToTry.join(" → ")}`);

  for (const currentProvider of providersToTry) {
    try {
      const answer = await callProvider(currentProvider, SYSTEM_PROMPT, userPrompt);
      if (answer) return answer;
    } catch (error) {
      console.warn(`[AI] ${currentProvider} unavailable:`, error.message?.slice(0, 200));
    }
  }

  console.warn("[AI] All providers failed — using smart database answers.");
  return buildFallbackAnswer(searchResult);
}
