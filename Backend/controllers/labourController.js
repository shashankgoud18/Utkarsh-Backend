const LabourProfile = require("../models/LabourProfile");
const {
  generateQuestions,
  evaluateAnswer,
  generateSummary,
} = require("../utils/geminiService");

// Create Profile
const createProfile = async (req, res, next) => {
  try {
    const { name, phone, trade, experience, location } = req.body;

    const profile = await LabourProfile.create({
      name,
      phone,
      trade,
      experience,
      location,
    });

    res.json(profile);
  } catch (error) {
    next(error);
  }
};

// Generate Questions
const getQuestions = async (req, res, next) => {
  try {
    const { id } = req.params;

    const profile = await LabourProfile.findById(id);
    if (!profile) return res.status(404).json({ message: "Not found" });

    const questions = await generateQuestions(
      profile.trade,
      profile.experience
    );

    profile.questions = questions;
    await profile.save();

    res.json(questions);
  } catch (error) {
    next(error);
  }
};

// Submit Answers
const submitAnswers = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { answers } = req.body;

    const profile = await LabourProfile.findById(id);
    if (!profile) return res.status(404).json({ message: "Not found" });

    let total = 0;
    const evaluatedAnswers = [];

    for (let item of answers) {
      const evaluation = await evaluateAnswer(
        profile.trade,
        item.question,
        item.answer
      );

      total += evaluation.score;

      evaluatedAnswers.push({
        question: item.question,
        answer: item.answer,
        score: evaluation.score,
        reason: evaluation.reason,
      });
    }

    const percentage = (total / (answers.length * 10)) * 100;

    let badge = "Bronze";
    if (percentage >= 80) badge = "Gold";
    else if (percentage >= 50) badge = "Silver";

    const summary = await generateSummary(
      profile.trade,
      profile.experience,
      percentage
    );

    profile.answers = evaluatedAnswers;
    profile.totalScore = percentage;
    profile.badge = badge;
    profile.aiSummary = summary;
    profile.status = "evaluated";

    await profile.save();

    res.json(profile);
  } catch (error) {
    next(error);
  }
};

// Search
const searchLabour = async (req, res, next) => {
  try {
    const { trade, location } = req.query;

    const results = await LabourProfile.find({
      trade,
      location,
      status: "evaluated",
    }).sort({ totalScore: -1 });

    res.json(results);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createProfile,
  getQuestions,
  submitAnswers,
  searchLabour,
};