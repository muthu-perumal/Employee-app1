import mongoose from "mongoose";
import { AIConversation } from "../model/publishTracker.model.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import { searchPublishTrackerData } from "../utils/aiDataSearch.js";
import { generateAiAnswer } from "../utils/aiService.js";

export const askAI = async (req, res) => {
  try {
    const { conversationId, message } = req.body;
    if (!message || !message.trim()) return sendError(res, new Error("Message is required"), 400);

    const searchResult = await searchPublishTrackerData(message.trim());
    const answer = await generateAiAnswer(message.trim(), searchResult);

    let conversation;
    if (conversationId && mongoose.Types.ObjectId.isValid(conversationId)) {
      conversation = await AIConversation.findById(conversationId);
    }
    if (!conversation) {
      conversation = await AIConversation.create({ title: message.slice(0, 50), messages: [] });
    }

    conversation.messages.push({ role: "user", text: message.trim() });
    conversation.messages.push({ role: "assistant", text: answer });
    await conversation.save();

    return sendSuccess(
      res,
      {
        conversationId: conversation._id,
        text: answer,
        messages: conversation.messages,
        matchedPatches: searchResult.patches.length,
      },
      "AI response generated successfully"
    );
  } catch (error) {
    return sendError(res, error, 500, "Failed to process AI request");
  }
};

export const getConversations = async (_req, res) => {
  try {
    const conversations = await AIConversation.find({ isDeleted: false }).select("title updatedAt createdAt messages").sort({ updatedAt: -1 }).lean();
    const data = conversations.map((c) => ({ id: c._id, title: c.title, updatedAt: c.updatedAt, messagesCount: c.messages?.length || 0 }));
    return sendSuccess(res, data, "Conversations fetched successfully");
  } catch (error) {
    return sendError(res, error, 500, "Failed to fetch conversations");
  }
};

export const getConversation = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return sendError(res, new Error("Invalid conversation id"), 400);
    const conversation = await AIConversation.findOne({ _id: req.params.id, isDeleted: false });
    if (!conversation) return sendError(res, new Error("Conversation not found"), 404);
    return sendSuccess(res, conversation, "Conversation fetched successfully");
  } catch (error) {
    return sendError(res, error, 500, "Failed to fetch conversation");
  }
};
