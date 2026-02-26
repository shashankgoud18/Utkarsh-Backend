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

// Helper function to extract clean name from answer
const extractCleanName = (nameAnswer) => {
  if (!nameAnswer) return "";
  
  let cleaned = nameAnswer.trim();
  
  // Remove common Hindi prefixes
  cleaned = cleaned.replace(/^(मेरा नाम |मेरा नाम है |नाम है |मेरा )/i, '');
  
  // Remove common English prefixes
  cleaned = cleaned.replace(/^(my name is |my name's |i am |i'm |name is |this is )/i, '');
  
  // Remove trailing "है" (hai - "is" in Hindi)
  cleaned = cleaned.replace(/\s*है\s*$/i, '');
  
  return cleaned.trim();
};

// Helper function to extract clean phone number
const extractCleanPhone = (phoneAnswer) => {
  if (!phoneAnswer) return "";
  
  // Extract only digits
  const digits = phoneAnswer.replace(/\D/g, '');
  
  // Return last 10 digits if longer (in case of country code)
  return digits.length > 10 ? digits.slice(-10) : digits;
};

// Helper function to extract number (for age, experience)
const extractNumber = (answer) => {
  if (!answer) return 0;
  
  // Extract first number found in the string
  const match = answer.match(/\d+/);
  return match ? parseInt(match[0]) : 0;
};

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

// SUBMIT ANSWERS - Session-less: Frontend sends language + responses
// const submitAnswers = async (req, res, next) => {

//   try {
//     const { language, responses } = req.body;

//     // Validate input
//     if (!language || typeof language !== 'string') {
//       return res.status(400).json({ error: "language is required" });
//     }

//     if (!Array.isArray(responses) || responses.length < 4) {
//       return res.status(400).json({ error: "responses array with at least 4 items is required" });
//     }

//     // Validate each response has question and answer
//     for (const resp of responses) {
//       if (!resp.question || !resp.answer) {
//         return res.status(400).json({ error: "Each response must have question and answer fields" });
//       }
//     }

//     // Extract questions and answers from responses
//     const questions = responses.map(r => r.question);
//     const answers = responses.map(r => r.answer);

//     // Extract trade from answers (usually in basic answers)
//     const initialMessage = `${answers[0]} ${answers[3]}`; // name + experience combined
//     const trade = await extractTradeFromMessage(initialMessage);

//     const basicQuestionsCount = 4;
//     const basicAnswers = answers.slice(0, basicQuestionsCount);
//     const workAnswers = answers.slice(basicQuestionsCount);

//     // Extract profile from basic answers
//     const basicAnswersText = basicAnswers
//       .map((ans, idx) => `Q${idx + 1}: ${questions[idx]}\nA: ${ans}`)
//       .join("\n");

//     const extracted = await extractProfileFromText(
//       initialMessage,
//       questions.slice(0, basicQuestionsCount),
//       basicAnswersText
//     );

//     // Evaluate work answers
//     const workQuestions = questions.slice(basicQuestionsCount);
//     const evaluation = await evaluateWorkAnswers(
//       trade || extracted.trade || "worker",
//       workQuestions,
//       workAnswers,
//       language
//     );

//     // Create evaluated answers array
//     const evaluatedAnswers = [
//       ...basicAnswers.map((ans, idx) => ({
//         question: questions[idx],
//         answer: ans,
//         score: 10,
//         reason: "Basic information collected",
//       })),
//       ...(evaluation.evaluations || []),
//     ];

//     // Create profile
//     const profile = await LabourProfile.create({
//       name: extracted.name || extractCleanName(basicAnswers[0]) || "",
//       phone: extracted.phone || extractCleanPhone(basicAnswers[2]) || "",
//       age: extracted.age || extractNumber(basicAnswers[1]) || 0,
//       trade: trade || extracted.trade || "worker",
//       experience: extracted.experience || extractNumber(basicAnswers[3]) || 0,
//       location: extracted.location || "",
//       salaryRange: extracted.salaryRange,
//       skills: extracted.skills || [],
//       languages: extracted.languages || [],
//       availability: extracted.availability || "",
//       aiSummary: evaluation.summary || extracted.notes || "",
//       status: "evaluated",
//       questions: questions,
//       answers: evaluatedAnswers,
//       totalScore: evaluation.totalScore || 0,
//       badge: evaluation.badge || "Bronze",
//       skillBreakdown: evaluation.skillBreakdown || {},
//       strengths: evaluation.strengths || [],
//       weaknesses: evaluation.weaknesses || [],
//       recommendations: evaluation.recommendations || [],
//       workReadiness: evaluation.workReadiness || "Entry Level",
//       confidenceLevel: evaluation.confidenceLevel || "Medium",
//       hiringRecommendation: evaluation.hiringRecommendation || "Maybe",
//     });

//     // Return lean profile
//     const leanProfile = profile.toObject();
//     delete leanProfile.questions;
//     delete leanProfile.answers;

//     return res.json({
//       success: true,
//       profile: leanProfile,
//       scoreOutOf100: evaluation.totalScore || 0,
//     });
//   } catch (error) {
//     console.error("=== SUBMIT ANSWERS ERROR ===");
//     console.error("Error message:", error.message);
//     console.error("Error stack:", error.stack);
//     console.error("Request body:", req.body);
//     res.status(500).json({ 
//       error: "Failed to process answers",
//       details: error.message,
//     });
//   }
// };

const { analyzeInterview } = require("../services/gemini_service");
console.log(analyzeInterview);

const submitInterview = async (req, res) => {
  try {
    const { language, responses } = req.body;

    if (!language || !responses || !Array.isArray(responses) || responses.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid interview data",
      });
    }

    const analysis = await analyzeInterview(language, responses);

    return res.status(200).json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    // Print full error details
    console.error("Submit Interview Full Error:", error);
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error("No response received:", error.request);
    } else {
      console.error("Error message:", error.message);
    }

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};


module.exports = { startIntake, submitInterview  };
