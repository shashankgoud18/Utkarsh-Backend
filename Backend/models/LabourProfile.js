const mongoose = require("mongoose");

const answerSchema = new mongoose.Schema({
  question: String,
  answer: String,
  score: Number,
  reason: String,
});

const labourProfileSchema = new mongoose.Schema(
  {
    name: String,
    phone: String,
    trade: String,
    experience: Number,
    location: String,
    questions: [String],
    answers: [answerSchema],
    totalScore: Number,
    badge: String,
    aiSummary: String,
    status: {
      type: String,
      default: "pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("LabourProfile", labourProfileSchema);