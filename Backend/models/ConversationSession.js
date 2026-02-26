const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema({
  messages: [
    {
      role: String, // "user" or "assistant"
      content: String,
    },
  ],
  language: {
    type: String,
    default: "english",
  },
  trade: {
    type: String,
  },
  questions: [String],
  answers: [String],  // Raw answer strings
  workQuestions: [String],
  workAnswers: [
    {
      question: String,
      answer: String,
      score: Number,
      reason: String,
    },
  ],
  phase: {
    type: String,
    enum: ["basic", "work", "completed"],
    default: "basic",
  },
  score: Number,
  status: {
    type: String,
    enum: ["collecting", "completed"],
    default: "collecting",
  },
  extractedData: Object,
});

module.exports = mongoose.model("ConversationSession", sessionSchema);