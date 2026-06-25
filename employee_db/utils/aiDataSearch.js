import { Patch, Feedback } from "../model/publishTracker.model.js";

function parseExtraFields(notes = "") {
  if (!notes) return {};
  try {
    const parsed = JSON.parse(notes);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function detectDateRange(question) {
  const q = question.toLowerCase();
  const now = new Date();

  if (q.includes("today")) {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return { start, end: now };
  }
  if (q.includes("this week")) {
    return { start: startOfWeek(now), end: now };
  }
  if (q.includes("last week")) {
    const end = startOfWeek(now);
    end.setMilliseconds(-1);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return { start, end };
  }
  if (q.includes("this month")) {
    return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now };
  }
  if (q.includes("last month")) {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    return { start, end };
  }
  if (q.includes("this year")) {
    return { start: new Date(now.getFullYear(), 0, 1), end: now };
  }

  return null;
}

function detectStatus(question) {
  const q = question.toLowerCase();
  if (q.includes("failed")) return "Failed";
  if (q.includes("pending")) return "Pending";
  if (q.includes("completed") || q.includes("deployed")) return "Completed";
  if (q.includes("testing") || q.includes("approved")) return "Testing";
  if (q.includes("in progress") || q.includes("in review")) return "In Progress";
  if (q.includes("on hold") || q.includes("rolled back")) return "On Hold";
  return null;
}

function detectPatchType(question) {
  const q = question.toLowerCase();
  if (q.includes("bug fix") || q.includes("bugfix")) return "Bug Fix";
  if (q.includes("hotfix")) return "Hotfix";
  if (q.includes("security")) return "Security";
  if (q.includes("enhancement")) return "Enhancement";
  if (q.includes("feature")) return "Feature";
  return null;
}

function detectServerType(question) {
  const q = question.toLowerCase();
  if (q.includes("trial")) return "Trial";
  if (q.includes("production")) return "Production";
  return null;
}

function extractKeywords(question) {
  const stopWords = new Set([
    "a", "an", "the", "is", "are", "was", "were", "what", "which", "who", "how", "many",
    "show", "all", "me", "my", "about", "from", "for", "in", "on", "at", "to", "of",
    "this", "that", "these", "those", "last", "latest", "recent", "patch", "patches",
    "release", "releases", "related", "available", "only", "week", "month", "year",
    "today", "yesterday", "summarize", "summary", "list", "tell", "give", "find",
    "feature", "features", "bug", "fixes", "fix", "production", "trial", "server",
    "module", "authentication", "deployed", "pending", "failed", "completed",
  ]);

  return [...new Set(
    question
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 2 && !stopWords.has(word))
  )].slice(0, 8);
}

function mapPatchForContext(patch) {
  const extra = parseExtraFields(patch.notes);
  return {
    id: String(patch._id),
    title: patch.title,
    version: patch.version,
    project: patch.clientName || "",
    module: patch.moduleName || "",
    type: extra.patch_type || "Feature",
    server: extra.server_type || "Trial",
    status: patch.status,
    priority: patch.priority || "Medium",
    releaseDate: patch.releaseDate ? new Date(patch.releaseDate).toISOString().split("T")[0] : "",
    assignedTo: patch.assignedTo || "",
    reviewedBy: extra.reviewed_by || patch.updatedBy || "",
    description: (patch.description || "").slice(0, 200),
  };
}

function matchesPatchType(patch, patchType) {
  if (!patchType) return true;
  const extra = parseExtraFields(patch.notes);
  return (extra.patch_type || "Feature").toLowerCase() === patchType.toLowerCase();
}

function matchesServerType(patch, serverType) {
  if (!serverType) return true;
  const extra = parseExtraFields(patch.notes);
  return (extra.server_type || "Trial").toLowerCase() === serverType.toLowerCase();
}

function scorePatch(patch, keywords) {
  const haystack = [
    patch.title,
    patch.version,
    patch.clientName,
    patch.moduleName,
    patch.description,
    patch.assignedTo,
    patch.notes,
  ].join(" ").toLowerCase();

  let score = 0;
  for (const keyword of keywords) {
    if (haystack.includes(keyword)) score += 2;
  }
  if (patch.releaseDate) score += 1;
  return score;
}

export async function searchPublishTrackerData(question) {
  const keywords = extractKeywords(question);
  const dateRange = detectDateRange(question);
  const status = detectStatus(question);
  const patchType = detectPatchType(question);
  const serverType = detectServerType(question);

  const baseQuery = { isDeleted: false };
  if (status) baseQuery.status = status;

  const [allPatches, feedbackItems, stats] = await Promise.all([
    Patch.find(baseQuery).sort({ createdAt: -1 }).limit(300).lean(),
    Feedback.find({ isDeleted: false }).sort({ createdAt: -1 }).limit(50).lean(),
    Promise.all([
      Patch.countDocuments({ isDeleted: false }),
      Patch.countDocuments({ isDeleted: false, status: "Completed" }),
      Patch.countDocuments({ isDeleted: false, status: "Pending" }),
      Patch.countDocuments({ isDeleted: false, status: "Failed" }),
      Feedback.countDocuments({ isDeleted: false, status: "Open" }),
    ]),
  ]);

  let patches = allPatches.filter((patch) => {
    if (!matchesPatchType(patch, patchType)) return false;
    if (!matchesServerType(patch, serverType)) return false;
    if (dateRange) {
      const date = patch.releaseDate || patch.createdAt;
      if (!date) return false;
      const value = new Date(date);
      if (value < dateRange.start || value > dateRange.end) return false;
    }
    return true;
  });

  if (keywords.length > 0) {
    const scored = patches
      .map((patch) => ({ patch, score: scorePatch(patch, keywords) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    patches = scored.length > 0 ? scored.map((item) => item.patch) : patches.slice(0, 20);
  }

  const q = question.toLowerCase();
  if (q.includes("latest") || q.includes("recent")) {
    patches = [...patches].sort((a, b) => new Date(b.releaseDate || b.createdAt) - new Date(a.releaseDate || a.createdAt));
  }

  const limitedPatches = patches.slice(0, 25).map(mapPatchForContext);
  const [total, completed, pending, failed, openFeedback] = stats;

  const typeBreakdown = limitedPatches.reduce((acc, patch) => {
    acc[patch.type] = (acc[patch.type] || 0) + 1;
    return acc;
  }, {});

  const assigneeBreakdown = limitedPatches.reduce((acc, patch) => {
    const name = patch.assignedTo || "Unassigned";
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {});

  return {
    question,
    filters: { keywords, status, patchType, serverType, dateRange },
    stats: { total, completed, pending, failed, openFeedback },
    patches: limitedPatches,
    feedback: feedbackItems.slice(0, 10).map((item) => ({
      clientName: item.clientName,
      status: item.status,
      feedback: (item.feedback || "").slice(0, 150),
      createdAt: item.createdAt,
    })),
    breakdown: { typeBreakdown, assigneeBreakdown },
  };
}

export function buildContextText(searchResult) {
  const lines = [
    `Database stats: ${searchResult.stats.total} total patches, ${searchResult.stats.completed} completed, ${searchResult.stats.pending} pending, ${searchResult.stats.failed} failed, ${searchResult.stats.openFeedback} open feedback.`,
  ];

  if (searchResult.patches.length === 0) {
    lines.push("No matching patches found for this question.");
  } else {
    lines.push(`Matching patches (${searchResult.patches.length}):`);
    for (const patch of searchResult.patches) {
      lines.push(
        `- ${patch.version} | ${patch.title} | project=${patch.project} | module=${patch.module} | type=${patch.type} | server=${patch.server} | status=${patch.status} | priority=${patch.priority} | release=${patch.releaseDate || "N/A"} | by=${patch.assignedTo || "N/A"} | desc=${patch.description}`
      );
    }
  }

  if (searchResult.feedback.length > 0) {
    lines.push("Recent feedback:");
    for (const item of searchResult.feedback) {
      lines.push(`- ${item.clientName} (${item.status}): ${item.feedback}`);
    }
  }

  return lines.join("\n");
}

export function buildFallbackAnswer(searchResult) {
  const { question, patches, stats, breakdown, filters } = searchResult;
  const q = question.toLowerCase();

  if (/how many|count|total|number of/.test(q)) {
    if (/bug fix|bugfix/.test(q)) {
      const count = patches.filter((p) => p.type === "Bug Fix").length;
      return `There are **${count}** bug fix patch(es) matching your query. Overall database total: **${stats.total}** patches.`;
    }
    if (/feature/.test(q)) {
      const count = patches.filter((p) => p.type === "Feature").length;
      return `There are **${count}** feature patch(es) matching your query. Overall database total: **${stats.total}** patches.`;
    }
    if (/failed/.test(q)) return `**${stats.failed}** patches have failed status in the database.`;
    if (/pending/.test(q)) return `**${stats.pending}** patches are pending in the database.`;
    if (/completed|deployed/.test(q)) return `**${stats.completed}** patches are completed/deployed in the database.`;
    if (/feedback/.test(q)) return `There are **${stats.openFeedback}** open feedback items in the database.`;
    return `Database totals: **${stats.total}** patches, **${stats.completed}** completed, **${stats.pending}** pending, **${stats.failed}** failed, **${stats.openFeedback}** open feedback.`;
  }

  if (/who worked|most patches|released by/.test(q)) {
    const top = Object.entries(breakdown.assigneeBreakdown).sort((a, b) => b[1] - a[1])[0];
    if (top) return `**${top[0]}** worked on the most matching patches (**${top[1]}**).`;
  }

  if (/latest|recent|last release|newest/.test(q)) {
    const latest = patches[0];
    if (latest) {
      return `The latest matching release is **${latest.version}** — **${latest.title}** (${latest.type}, ${latest.server}, ${latest.status})` +
        (latest.releaseDate ? `, released on **${latest.releaseDate}**` : "") +
        (latest.assignedTo ? ` by **${latest.assignedTo}**` : "") + ".";
    }
  }

  if (/bug fix|feature|vs|versus/.test(q) && patches.length > 0) {
    const lines = ["Breakdown by patch type:", ...Object.entries(breakdown.typeBreakdown).map(([type, count]) => `- **${type}**: ${count}`)];
    return lines.join("\n");
  }

  if (patches.length === 0) {
    const filterNote = filters.dateRange ? " for the selected time period" : "";
    return `No patches found matching your question${filterNote}. Database totals: **${stats.total}** patches, **${stats.completed}** completed, **${stats.pending}** pending.`;
  }

  const lines = [
    `Found **${patches.length}** relevant patch(es):`,
    "",
    ...patches.slice(0, 10).map(
      (patch) =>
        `- **${patch.version}** — ${patch.title} (${patch.type}, ${patch.server}, ${patch.status})` +
        (patch.releaseDate ? ` — released ${patch.releaseDate}` : "") +
        (patch.assignedTo ? ` — by ${patch.assignedTo}` : "")
    ),
  ];

  const types = Object.entries(breakdown.typeBreakdown);
  if (types.length > 1) {
    lines.push("", "By type:", ...types.map(([type, count]) => `- ${type}: ${count}`));
  }

  return lines.join("\n");
}
