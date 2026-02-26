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
  answers: [String],
  status: {
    type: String,
    enum: ["collecting", "completed"],
    default: "collecting",
  },
});

module.exports = mongoose.model("ConversationSession", sessionSchema);