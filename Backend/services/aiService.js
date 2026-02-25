const axios = require("axios");

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent";

const callGemini = async (prompt) => {
  const url = `${GEMINI_URL}?key=${process.env.GEMINI_API_KEY}`;
  const response = await axios.post(
    url,
    {
      contents: [{ parts: [{ text: prompt }] }],
    },
    { timeout: 30000 }
  );

  return response.data.candidates[0].content.parts[0].text;
};

const cleanJsonText = (text) => {
  return text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
};

const detectLanguage = async (message) => {
  const prompt = `
Detect the language of this message and return ONLY the language code.
Return one of: hindi, english, kannada, tamil, telugu, marathi, bengali
If unsure, return "english".

Message: ${message}
`;

  try {
    const text = await callGemini(prompt);
    const lang = text.toLowerCase().trim();
    return lang;
  } catch (error) {
    return "english";
  }
};

const defaultQuestions = (hint, language = "english") => {
  const questions = {
    english: [
      "What is your full name?",
      "How old are you?",
      "What is your phone number?",
      "How many years of experience do you have in this trade?",
    ],
    hindi: [
      "आपका पूरा नाम क्या है?",
      "आपकी उम्र कितनी है?",
      "आपका फोन नंबर क्या है?",
      "आपको इस काम में कितने साल का अनुभव है?",
    ],
  };

  return questions[language] || questions.english;
};

const generateIntakeQuestions = async (initialMessage, language = "english") => {
  return defaultQuestions(initialMessage, language);
};

const extractProfileFromText = async (initialMessage, questions, answersText) => {
  const prompt = `
You are extracting a structured labour profile.
Use the user's initial message and answers to questions.
Return ONLY JSON with this shape:
{
  "name": "",
  "phone": "",
  "age": number,
  "trade": "",
  "experience": number,
  "location": "",
  "salaryRange": { "min": number, "max": number },
  "skills": [""],
  "languages": [""],
  "availability": "",
  "notes": ""
}

Initial message: ${initialMessage}
Questions: ${questions.join(" | ")}
Answers: ${answersText}
`;

  try {
    const text = await callGemini(prompt);
    const parsed = JSON.parse(cleanJsonText(text));
    return parsed;
  } catch (error) {
    const phoneMatch = answersText.match(/(\+?\d[\d\s-]{7,})/);
    const ageMatch = answersText.match(/\b(\d{2})\b\s*(years|yrs|age)?/i);
    const expMatch = answersText.match(/(\d{1,2})\s*(years|yrs)\s*(experience|exp)/i);

    return {
      name: "",
      phone: phoneMatch ? phoneMatch[1].replace(/\s+/g, "") : "",
      age: ageMatch ? Number(ageMatch[1]) : undefined,
      trade: "",
      experience: expMatch ? Number(expMatch[1]) : undefined,
      location: "",
      salaryRange: { min: undefined, max: undefined },
      skills: [],
      languages: [],
      availability: "",
      notes: answersText?.slice(0, 300) || "",
    };
  }
};

const generateWorkQuestions = async (trade, experience, language = "english") => {
  const languageInstruction =
    language === "english"
      ? "Generate questions in English."
      : `Generate questions in ${language}. Do NOT use English.`;

  const prompt = `
Give me 6 short questions,these questions should be relatted to ${trade}.Also in these questions we dont have to test the person just we have to collect some basic questions about his work and skills. example what was your recent work.
Questions must be simple and suitable for voice answers.
${languageInstruction}
Return ONLY a JSON array of strings.
Experience: ${experience || "unknown"}
`;

  try {
    const text = await callGemini(prompt);
    const parsed = JSON.parse(cleanJsonText(text));
    return Array.isArray(parsed) ? parsed.slice(0, 6) : [];
  } catch (error) {
    return [];
  }
};

const evaluateWorkAnswers = async (trade, workQuestions, workAnswers, language = "english") => {
  const qa = workQuestions.map((question, idx) => ({
    question,
    answer: workAnswers[idx] || "",
  }));

  const languageInstruction =
    language === "english"
      ? "Provide all analysis in English."
      : `Provide all analysis in ${language}.`;

  const prompt = `
You are an expert evaluator for ${trade} candidates.
Analyze the answers deeply and provide comprehensive evaluation.

${languageInstruction}

Return ONLY JSON with this shape:
{
  "evaluations": [
    { "question": "", "answer": "", "score": number (0-10), "reason": "" }
  ],
  "totalScore": number,
  "badge": "Bronze" | "Silver" | "Gold",
  "skillBreakdown": {
    "technical": number (0-100),
    "safety": number (0-100),
    "experience": number (0-100),
    "problemSolving": number (0-100),
    "communication": number (0-100)
  },
  "strengths": ["strength 1", "strength 2", "..."],
  "weaknesses": ["weakness 1", "weakness 2", "..."],
  "recommendations": ["recommendation 1", "recommendation 2", "..."],
  "workReadiness": "Not Ready" | "Entry Level" | "Intermediate" | "Advanced" | "Expert",
  "confidenceLevel": "Low" | "Medium" | "High",
  "summary": "detailed professional summary (3-5 lines)",
  "hiringRecommendation": "Strong Hire" | "Hire" | "Maybe" | "No Hire"
}

Analyze these answers carefully:
${qa.map((item) => `Q: ${item.question}\nA: ${item.answer}`).join("\n\n")}

Consider:
- Technical knowledge depth
- Safety awareness
- Practical experience indicators
- Problem-solving ability
- Communication clarity
- Honesty vs exaggeration
`;

  try {
    const text = await callGemini(prompt);
    const parsed = JSON.parse(cleanJsonText(text));
    return parsed;
  } catch (error) {
    let sum = 0;
    const evaluations = qa.map((item) => {
      const score = item.answer.trim() ? 6 : 0;
      sum += score;
      return {
        question: item.question,
        answer: item.answer,
        score,
        reason: "Mock evaluation",
      };
    });

    const totalScore = evaluations.length
      ? Math.round((sum / (evaluations.length * 10)) * 100)
      : 0;

    let badge = "Bronze";
    if (totalScore >= 80) badge = "Gold";
    else if (totalScore >= 50) badge = "Silver";

    return {
      evaluations,
      totalScore,
      badge,
      skillBreakdown: {
        technical: totalScore,
        safety: totalScore,
        experience: totalScore,
        problemSolving: totalScore,
        communication: totalScore,
      },
      strengths: ["Mock data - answered questions"],
      weaknesses: ["Mock data - needs real evaluation"],
      recommendations: ["Get real API evaluation for detailed analysis"],
      workReadiness: totalScore >= 60 ? "Intermediate" : "Entry Level",
      confidenceLevel: "Medium",
      summary: "Mock evaluation summary - enable Gemini API for detailed analysis",
      hiringRecommendation: totalScore >= 70 ? "Hire" : "Maybe",
    };
  }
};

module.exports = {
  generateIntakeQuestions,
  extractProfileFromText,
  generateWorkQuestions,
  evaluateWorkAnswers,
  detectLanguage,
};