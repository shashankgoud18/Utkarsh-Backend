const ConversationSession = require("../models/ConversationSession");
const LabourProfile = require("../models/LabourProfile");
const {
  generateIntakeQuestions,
  extractProfileFromText,
  generateWorkQuestions,
  evaluateWorkAnswers,
  detectLanguage,
  extractTradeFromMessage,
} = require("../services/aiService");

// START INTAKE - Get all 10 questions
const startIntake = async (req, res, next) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: "Message is required" });
    }

    const language = await detectLanguage(message);
    const trade = await extractTradeFromMessage(message);
    const basicQuestions = await generateIntakeQuestions(message, language);
    const workQuestions = await generateWorkQuestions(trade, 0, language);

    const allQuestions = [...basicQuestions, ...workQuestions];

    const session = await ConversationSession.create({
      messages: [{ role: "user", content: message }],
      language,
      trade,
      questions: allQuestions,
      answers: [],
      status: "collecting",
    });

    return res.json({
      sessionId: session._id,
      language,
      trade,
      allQuestions,
      basicQuestionsCount: basicQuestions.length,
      totalQuestions: allQuestions.length,
    });
  } catch (error) {
    console.error("=== START INTAKE ERROR ===");
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    res.status(500).json({ 
      error: "Failed to start intake",
      details: error.message 
    });
  }
};

// SUBMIT ANSWERS - Get profile with evaluation
const submitAnswers = async (req, res, next) => {
  try {
    const { sessionId, answers } = req.body;

    if (!sessionId || !Array.isArray(answers)) {
      return res.status(400).json({ error: "sessionId and answers array are required" });
    }

    const session = await ConversationSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    const allQuestions = session.questions || [];
    const basicQuestionsCount = 4;
    const workQuestionsCount = allQuestions.length - basicQuestionsCount;

    const basicAnswers = answers.slice(0, basicQuestionsCount);
    const workAnswers = answers.slice(basicQuestionsCount);

    // Extract profile from basic answers
    const basicAnswersText = basicAnswers
      .map((ans, idx) => `Q${idx + 1}: ${allQuestions[idx]}\nA: ${ans}`)
      .join("\n");

    const extracted = await extractProfileFromText(
      session.messages?.[0]?.content || "",
      allQuestions.slice(0, basicQuestionsCount),
      basicAnswersText
    );

    // Evaluate work answers
    const workQuestions = allQuestions.slice(basicQuestionsCount, basicQuestionsCount + workQuestionsCount);
    const evaluation = await evaluateWorkAnswers(
      extracted.trade || session.trade || "worker",
      workQuestions,
      workAnswers,
      session.language || "english"
    );

    // Create evaluated answers array
    const evaluatedAnswers = [
      ...basicAnswers.map((ans, idx) => ({
        question: allQuestions[idx],
        answer: ans,
        score: 10,
        reason: "Basic information collected",
      })),
      ...(evaluation.evaluations || []),
    ];

    // Create profile
    const profile = await LabourProfile.create({
      name: extracted.name || basicAnswers[0] || "",
      phone: extracted.phone || basicAnswers[2] || "",
      age: extracted.age || parseInt(basicAnswers[1]) || 0,
      trade: session.trade || extracted.trade || "worker",
      experience: extracted.experience || parseInt(basicAnswers[3]) || 0,
      location: extracted.location || "",
      salaryRange: extracted.salaryRange,
      skills: extracted.skills || [],
      languages: extracted.languages || [],
      availability: extracted.availability || "",
      aiSummary: evaluation.summary || extracted.notes || "",
      status: "evaluated",
      questions: allQuestions,
      answers: evaluatedAnswers,
      totalScore: evaluation.totalScore || 0,
      badge: evaluation.badge || "Bronze",
      skillBreakdown: evaluation.skillBreakdown || {},
      strengths: evaluation.strengths || [],
      weaknesses: evaluation.weaknesses || [],
      recommendations: evaluation.recommendations || [],
      workReadiness: evaluation.workReadiness || "Entry Level",
      confidenceLevel: evaluation.confidenceLevel || "Medium",
      hiringRecommendation: evaluation.hiringRecommendation || "Maybe",
    });

    // Update session
    session.status = "completed";
    session.answers = answers;
    await session.save();

    // Return lean profile
    const leanProfile = profile.toObject();
    delete leanProfile.questions;
    delete leanProfile.answers;

    return res.json({
      completed: true,
      profile: leanProfile,
      scoreOutOf100: evaluation.totalScore || 0,
    });
  } catch (error) {
    console.error("=== SUBMIT ANSWERS ERROR ===");
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    console.error("Request body:", req.body);
    res.status(500).json({ 
      error: "Failed to process answers",
      details: error.message,
      hint: "Check server logs for details"
    });
  }
};

module.exports = { startIntake, submitAnswers };
