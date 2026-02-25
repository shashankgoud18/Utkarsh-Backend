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
    age: Number,
    trade: String,
    experience: Number,
    location: String,

    salaryRange: {
      min: Number,
      max: Number,
    },

    skills: [String],
    languages: [String],
    availability: String,

    questions: [String],
    answers: [answerSchema],
    totalScore: Number,
    badge: String,
    aiSummary: String,
    
    // Detailed evaluation fields
    skillBreakdown: {
      technical: Number,
      safety: Number,
      experience: Number,
      problemSolving: Number,
      communication: Number,
    },
    strengths: [String],
    weaknesses: [String],
    recommendations: [String],
    workReadiness: String,
    confidenceLevel: String,
    hiringRecommendation: String,
    
    status: {
      type: String,
      default: "pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("LabourProfile", labourProfileSchema);