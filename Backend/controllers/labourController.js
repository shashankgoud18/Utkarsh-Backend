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
    const {
      trade,
      location,
      minExperience,
      minSalary,
      maxSalary,
    } = req.query;

    let query = {
      status: "evaluated",
    };

    if (trade) {
      query.trade = { $regex: trade, $options: "i" };
    }

    if (location) {
      query.location = { $regex: location, $options: "i" };
    }

    if (minExperience) {
      query.experience = { $gte: Number(minExperience) };
    }

    if (minSalary || maxSalary) {
      query["salaryRange.min"] = {
        $lte: Number(maxSalary || 999999),
      };

      query["salaryRange.max"] = {
        $gte: Number(minSalary || 0),
      };
    }

    const results = await LabourProfile.find(query)
      .select("name trade experience location salaryRange totalScore badge")
      .sort({ totalScore: -1 });

    res.json(results);
  } catch (error) {
    next(error);
  }
};

const getSingleLabour = async (req, res) => {
  try {
    const labour = await LabourProfile.findById(req.params.id);

    if (!labour) {
      return res.status(404).json({ message: "Profile not found" });
    }

    res.status(200).json(labour);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

const updateLabour = async (req, res) => {
  try {
    const allowedFields = [
  "name",
  "phone",
  "location",
  "experience",
  "trade",
  "salaryRange"
];

    const updates = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const updatedLabour = await LabourProfile.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    if (!updatedLabour) {
      return res.status(404).json({ message: "Profile not found" });
    }

    res.status(200).json(updatedLabour);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

module.exports = {
  createProfile,
  getQuestions,
  submitAnswers,
  searchLabour,
  getSingleLabour,
  updateLabour
};