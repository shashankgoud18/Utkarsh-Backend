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
Detect the language of this message. It may be written in native script OR transliterated in English (like "main mesthri hun" for Hindi).
Return ONLY the language code.
Return one of: hindi, english, kannada, tamil, telugu, marathi, bengali
If unsure, return "english".

Message: "${message}"
`;

  try {
    const text = await callGemini(prompt);
    const lang = text.toLowerCase().trim();
    // Clean any extra text, just get the language code
    const langCode = lang.split('\n')[0].trim();
    return langCode;
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
    tamil: [
      "உங்கள் முழு பெயர் என்ன?",
      "உங்கள் வயது எவ்வளவு?",
      "உங்கள் ஃபோன் எண் என்ன?",
      "இந்த பணிக்களில் உங்களுக்கு எத்தனை வருட அভিজ்ঞதை உண்டு?",
    ],
    telugu: [
      "మీ పూర్తి పేరు ఏమిటి?",
      "మీ వయస్సు ఎంత?",
      "మీ ఫోన్ నంబర్ ఏమిటి?",
      "ఈ పనిలో మీకు ఎన్ని సంవత్సరాల అనుభవం ఉంది?",
    ],
    kannada: [
      "ನಿಮ್ಮ ಪೂರ್ಣ ಹೆಸರು ಏನು?",
      "ನಿಮ್ಮ ವಯಸ್ಸು ಎಷ್ಟು?",
      "ನಿಮ್ಮ ಫೋನ್ ಸಂಖ್ಯೆ ಏನು?",
      "ಈ ವ್ಯವಹಾರದಲ್ಲಿ ನಿಮಗೆ ಎಷ್ಟು ವರ್ಷಗಳ ಅನುಭವ ಇದೆ?",
    ],
    marathi: [
      "आपले पूर्ण नाव काय आहे?",
      "आपले वय किती आहे?",
      "आपला फोन नंबर काय आहे?",
      "या व्यवसायात आपल्याला किती वर्षांचा अनुभव आहे?",
    ],
    bengali: [
      "আপনার পূর্ণ নাম কি?",
      "আপনার বয়স কত?",
      "আপনার ফোন নম্বর কি?",
      "এই পেশায় আপনার কত বছরের অভিজ্ঞতা আছে?",
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

const getWorkQuestionsTemplate = (trade, language = "english") => {
  const templates = {
    english: [
      `What are the main tasks you do as a ${trade}?`,
      `Which tools do you use most in ${trade} work?`,
      `How do you ensure safety while working?`,
      `Describe a common problem you face and how you solve it.`,
      `How do you check quality in your work?`,
      `Tell me about the most difficult project you have completed.`,
    ],
    hindi: [
      `एक ${trade} के रूप में आपके मुख्य काम क्या हैं?`,
      `आप ${trade} के काम में कौन से उपकरण सबसे अधिक उपयोग करते हैं?`,
      `आप काम करते समय सुरक्षा कैसे सुनिश्चित करते हैं?`,
      `एक आम समस्या का वर्णन करें जिसका आप सामना करते हैं और आप इसे कैसे हल करते हैं।`,
      `आप अपने काम की गुणवत्ता कैसे जांचते हैं?`,
      `मुझे अपने द्वारा पूरी की गई सबसे कठिन परियोजना के बारे में बताएं।`,
    ],
    tamil: [
      `${trade} ஆக உங்களின் முக்கிய பணிகள் என்ன?`,
      `${trade} பணிகளில் நீங்கள் எந்த கருவிகளை அதிகம் பயன்படுத்துகிறீர்கள்?`,
      `நீங்கள் பணிபுரியும் போது பாதுகாப்பை எவ்வாறு உறுதிசெய்கிறீர்கள்?`,
      `நீங்கள் எதிர்கொள்ளும் ஒரு பொதுவான பிரச்சனை மற்றும் அதை எவ்வாறு தீர்க்கிறீர்கள் என்பதை விளக்கவும்.`,
      `உங்கள் பணியின் தரத்தை நீங்கள் எவ்வாறு சரிபார்க்கிறீர்கள்?`,
      `நீங்கள் முடித்த மிகக் கடினமான திட்டத்தைப் பற்றி என்னிடம் சொல்லுங்கள்.`,
    ],
    telugu: [
      `${trade} ఆ ఉద్యోగం లో మీ ప్రధాన పనులు ఏమిటి?`,
      `${trade} పనిలో మీరు ఎక్కువగా ఏ సాధనాలను ఉపయోగిస్తారు?`,
      `మీరు పని చేసేటప్పుడు భద్రతను ఎలా నిర్ధారిస్తారు?`,
      `మీరు ఎదుర్కొనే ఒక సాధారణ సమస్య మరియు మీరు దానిని ఎలా పరిష్కరిస్తారో వివరించండి.`,
      `మీ పనిని మీరు ఎలా దీర్ఘకాలికంగా నిర్ధారిస్తారు?`,
      `మీరు పూర్తి చేసిన చాలా కష్టమైన ప్రాజెక్ట్ గురించి నాకు చెప్పండి.`,
    ],
    kannada: [
      `${trade} ಆಗಿ ನಿಮ್ಮ ಮುಖ್ಯ ಕೆಲಸಗಳು ಯಾವುವು?`,
      `${trade} ಕೆಲಸದಲ್ಲಿ ನೀವು ಹೆಚ್ಚಾಗಿ ಯಾವ ಉಪಕರಣಗಳನ್ನು ಬಳಸುತ್ತೀರಿ?`,
      `ನೀವು ಕೆಲಸ ಮಾಡುತ್ತಿರುವಾಗ ನೀವು ಸುರಕ್ಷೆಯನ್ನು ಹೇಗೆ ಖಾತರಿ ಮಾಡುತ್ತೀರಿ?`,
      `ನೀವು ಎದುರಿಸುವ ಸಾಮಾನ್ಯ ಸಮಸ್ಯೆಯನ್ನು ಮತ್ತು ನೀವು ಅದನ್ನು ಹೇಗೆ ಪರಿಹರಿಸುತ್ತೀರಿ ಎಂಬುದನ್ನು ವಿವರಿಸಿ.`,
      `ನಿಮ್ಮ ಕೆಲಸದ ಗುಣಮಟ್ಟವನ್ನು ನೀವು ಹೇಗೆ ಪರಿಶೀಲಿಸುತ್ತೀರಿ?`,
      `ನೀವು ಪೂರ್ಣಗೊಳಿಸಿದ ಅತ್ಯಂತ ಕಷ್ಟಕರ ಯೋಜನೆ ಬಗ್ಗೆ ನನಗೆ ಹೇಳಿ.`,
    ],
    marathi: [
      `एक ${trade} म्हणून आपले मुख्य काम काय आहेत?`,
      `${trade} कामात आप कोणते उपकरण सर्वाधिक वापरता?`,
      `आप काम करताना सुरक्षा कशी सुनिश्चित करता?`,
      `आप एकोणी मोठी समस्या आणि तुम्ही तिचे निराकरण कसे करता याचे वर्णन करा.`,
      `आपल्या कामाची गुणवत्ता आप कशी तपासता?`,
      `आपण पूर्ण केलेल्या सर्वात कठीण प्रकल्पाबद्दल मला सांगा.`,
    ],
    bengali: [
      `একজন ${trade} হিসাবে আপনার প্রধান কাজগুলি কী?`,
      `${trade} কাজে আপনি সবচেয়ে বেশি কোন সরঞ্জামগুলি ব্যবহার করেন?`,
      `আপনি কাজ করার সময় আপনি নিরাপত্তা কীভাবে নিশ্চিত করেন?`,
      `আপনি যে সাধারণ সমস্যার সম্মুখীন হন এবং আপনি এটি কীভাবে সমাধান করেন তা বর্ণনা করুন।`,
      `আপনি আপনার কাজের গুণমান কীভাবে পরীক্ষা করেন?`,
      `আপনি সম্পন্ন করেছেন এমন সবচেয়ে কঠিন প্রকল্প সম্পর্কে আমাকে বলুন।`,
    ],
  };

  return templates[language] || templates.english;
};

const generateWorkQuestions = async (trade, experience, language = "english") => {
  const languageInstruction =
    language === "english"
      ? "Generate questions in English."
      : `Generate questions in ${language}. Do NOT use English at all.`;

  const prompt = `
You are generating 6 short interview questions for a ${trade}.
These questions should be about their work and skills - NOT testing them.
Examples: "What are your main tasks?", "What tools do you use?", "Describe a difficult project"
Questions must be simple and suitable for voice answers.
${languageInstruction}
Return ONLY a JSON array of exactly 6 strings.
`;

  try {
    const text = await callGemini(prompt);
    const parsed = JSON.parse(cleanJsonText(text));
    if (Array.isArray(parsed) && parsed.length >= 6) {
      return parsed.slice(0, 6);
    }
    // If API response is not valid, use fallback
    return getWorkQuestionsTemplate(trade, language);
  } catch (error) {
    // Fallback to hardcoded questions in user's language
    return getWorkQuestionsTemplate(trade, language);
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