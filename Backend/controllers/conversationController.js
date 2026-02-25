const ConversationSession = require("../models/ConversationSession");
const LabourProfile = require("../models/LabourProfile");
const {
  generateIntakeQuestions,
  extractProfileFromText,
  generateWorkQuestions,
  evaluateWorkAnswers,
  detectLanguage,
} = require("../services/aiService");

// Get questions endpoint: user sends message → get all 10 questions (4 basic + 6 work)
const startIntake = async (req, res, next) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ message: "Message is required" });
    }

    const language = await detectLanguage(message);
    const basicQuestions = await generateIntakeQuestions(message, language);

    // Generate work questions based on trade hint from message
    const workQuestions = await generateWorkQuestions(
      message,
      0,
      language
    );

    const fallbackWorkQuestions = [
      `What are the main tasks you do as a ${message}?`,
      `Which tools do you use most in ${message} work?`,
      `How do you ensure safety while working as a ${message}?`,
      `Explain how you handle a common problem in ${message} work.`,
      `How do you check quality in your work?`,
      `Describe a difficult job you completed.`,
    ];

    const allQuestions = [
      ...basicQuestions,
      ...(workQuestions.length ? workQuestions : fallbackWorkQuestions),
    ];

    const session = await ConversationSession.create({
      messages: [{ role: "user", content: message }],
      language,
      questions: allQuestions,
      answers: [],
      status: "collecting",
    });

    return res.json({
      sessionId: session._id,
      language,
      allQuestions,
      basicQuestionsCount: basicQuestions.length,
    });
  } catch (error) {
    next(error);
  }
};

// Submit answers endpoint: user submits answers to all questions → get profile with score
const submitAnswers = async (req, res, next) => {
  try {
    const { sessionId, answers } = req.body;

    if (!sessionId || !Array.isArray(answers)) {
      return res.status(400).json({
        message: "sessionId and answers array are required",
      });
    }

    const session = await ConversationSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    const allQuestions = session.questions || [];
    const basicQuestionsCount = 4; // First 4 are basic
    const workQuestionsCount = allQuestions.length - basicQuestionsCount;

    // Split into basic and work answers
    const basicAnswers = answers.slice(0, basicQuestionsCount);
    const workAnswers = answers.slice(basicQuestionsCount);

    // Extract profile from basic answers
    const basicAnswersText = basicAnswers
      .map((ans, idx) => `Q: ${allQuestions[idx]}\nA: ${ans}`)
      .join("\n");

    const extracted = await extractProfileFromText(
      session.messages?.[0]?.content || "",
      allQuestions.slice(0, basicQuestionsCount),
      basicAnswersText
    );

    // Evaluate work answers
    const workQuestions = allQuestions.slice(
      basicQuestionsCount,
      basicQuestionsCount + workQuestionsCount
    );

    const evaluation = await evaluateWorkAnswers(
      extracted.trade || session.messages?.[0]?.content || "worker",
      workQuestions,
      workAnswers,
      session.language || "english"
    );

    // Combine all answers with scores
    const evaluatedAnswers = [
      ...basicAnswers.map((ans, idx) => ({
        question: allQuestions[idx],
        answer: ans,
        score: 10,
        reason: "Basic information verified",
      })),
      ...(evaluation.evaluations || workAnswers.map((ans, idx) => ({
        question: workQuestions[idx],
        answer: ans,
        score: 5,
        reason: "Work answer assessed",
      }))),
    ];

    // Create profile with full evaluation
    const profile = await LabourProfile.create({
      name: extracted.name,
      phone: extracted.phone,
      age: extracted.age,
      trade: extracted.trade || session.messages?.[0]?.content,
      experience: extracted.experience,
      location: extracted.location,
      salaryRange: extracted.salaryRange,
      skills: extracted.skills,
      languages: extracted.languages,
      availability: extracted.availability,
      aiSummary: evaluation.summary || extracted.notes,
      status: "evaluated",
      questions: allQuestions,
      answers: evaluatedAnswers,
      totalScore: evaluation.totalScore,
      badge: evaluation.badge,
      skillBreakdown: evaluation.skillBreakdown,
      strengths: evaluation.strengths,
      weaknesses: evaluation.weaknesses,
      recommendations: evaluation.recommendations,
      workReadiness: evaluation.workReadiness,
      confidenceLevel: evaluation.confidenceLevel,
      hiringRecommendation: evaluation.hiringRecommendation,
    });

    session.status = "completed";
    session.answers = evaluatedAnswers;
    await session.save();

    return res.json({
      completed: true,
      profile,
      scoreOutOf100: evaluation.totalScore,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  startIntake,
  submitAnswers,
};