const axios = require("axios");

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent";

const callGemini = async (prompt) => {
  const url = `${GEMINI_URL}?key=${process.env.GEMINI_API_KEY}`;
  try {
    const response = await axios.post(
      url,
      {
        contents: [{ parts: [{ text: prompt }] }],
      },
      { timeout: 30000 }
    );
    return response.data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error("Gemini API Error:", error.response?.status, error.response?.statusText);
    console.error("Error details:", error.response?.data || error.message);
    throw error;
  }
};

const cleanJsonText = (text) => {
  return text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
};

const extractTradeFromMessage = async (message) => {
  const prompt = `
Extract the trade/occupation/work type from this message.
The message can be in Hindi, English, or transliterated Hindi.
Return ONLY the trade name in English, in lowercase, as a single word or short phrase (max 2-3 words).
Examples: "plumber", "electrician", "mason", "carpenter", "driver", "cook", "security guard", "welder", "tailor", "cleaner", etc.

If no specific trade is mentioned, return "worker".

Message: "${message}"

Return ONLY the trade name, nothing else.
`;

  try {
    const text = await callGemini(prompt);
    const trade = text.toLowerCase().trim().split('\n')[0].trim();
    // Clean up any extra punctuation or formatting
    return trade.replace(/['".,;:]/g, '').trim() || 'worker';
  } catch (error) {
    console.log("⚠️  Trade extraction API failed, using fallback");
    
    // Simple fallback: check for common keywords
    const lowerMsg = message.toLowerCase();
    const commonTrades = {
      'plumber': ['plumber', 'nalsaz', 'नलसाज़'],
      'electrician': ['electrician', 'bijli', 'बिजली'],
      'mason': ['mason', 'mesthri', 'mistri', 'मिस्त्री'],
      'carpenter': ['carpenter', 'badhoi', 'बढ़ई'],
      'painter': ['painter', 'rang', 'पेंटर'],
      'driver': ['driver', 'चालक'],
      'cook': ['cook', 'bawarchi', 'बावर्ची'],
    };
    
    for (const [trade, keywords] of Object.entries(commonTrades)) {
      for (const keyword of keywords) {
        if (lowerMsg.includes(keyword)) {
          return trade;
        }
      }
    }
    
    return 'worker';
  }
};

const detectLanguage = async (message) => {
  const prompt = `
Detect the language of this message. It may be written in native script OR transliterated in English (like "main mesthri hun" for Hindi).
Return ONLY the language code: "hindi" OR "english"
If the message contains Hindi words (even in English script), return "hindi".
If unsure, return "english".

Message: "${message}"
`;

  try {
    const text = await callGemini(prompt);
    const lang = text.toLowerCase().trim();
    const langCode = lang.split('\n')[0].trim();
    // Only support Hindi and English
    return langCode === 'hindi' ? 'hindi' : 'english';
  } catch (error) {
    // Fallback: simple keyword detection
    const msg = message.toLowerCase();
    if (/main|mera|mesthri|mistri|hun|hoon|hai|kaam|करता|काम|हूं|मैं/.test(msg)) {
      return 'hindi';
    }
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
      "உங்கள் முழு பெயர் என்ன?",        // FIXED: Tamil characters only
      "உங்கள் வயது எவ்வளவு?",
      "உங்கள் ஃபோன் எண் என்ன?",
      "இந்த பணியில் உங்களுக்கு எத்தனை வருட அனுபவம் உண்டு?",
    ],
    telugu: [
      "మీ పూర్తి పేరు ఏమిటి?",
      "మీ వయస్సు ఎంత?",
      "మీ ఫోன் నంబర్ ఏమిటి?",
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

// FIXED: Correct function signature
const extractProfileFromText = async (initialMessage, questions, answersText) => {
  const prompt = `
You are extracting a structured labour profile.
Use the user's initial message and answers to questions.
Return ONLY JSON with this shape:
{
  "name": "",
  "phone": "",
  "age": 0,
  "trade": "",
  "experience": 0,
  "location": "",
  "salaryRange": { "min": 0, "max": 0 },
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
    console.log("⚠️  Profile extraction API failed:", error.message);
    console.log("Using regex fallback extraction");
    
    // Extract all answers from formatted text (pattern: "A: answer")
    const answerMatches = answersText.match(/A:\s*([^\n]+)/g) || [];
    const answers = answerMatches.map(match => match.replace(/A:\s*/, '').trim());
    
    // Clean name - remove "मेरा नाम", "my name is", etc.
    let name = answers[0] || "";
    name = name.replace(/^(मेरा नाम |मेरा नाम है |नाम है |मेरा |my name is |my name's |i am |i'm |name is |this is )/i, '');
    name = name.replace(/\s*है\s*$/i, '').trim();
    
    // Clean phone - extract digits only
    let phone = answers[2] || "";
    const phoneDigits = phone.replace(/\D/g, '');
    phone = phoneDigits.length > 10 ? phoneDigits.slice(-10) : phoneDigits;
    
    // Extract numbers from age and experience
    const ageMatch = answers[1]?.match(/\d+/);
    const age = ageMatch ? parseInt(ageMatch[0]) : 0;
    
    const expMatch = answers[3]?.match(/\d+/);
    const experience = expMatch ? parseInt(expMatch[0]) : 0;

    return {
      name,
      phone,
      age,
      trade: "",
      experience,
      location: "",
      salaryRange: { min: 0, max: 0 },
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
  };
  return templates[language] || templates.english;
};

const generateWorkQuestions = async (trade, experience, language = "english") => {
  const languageInstruction = language === "hindi" 
    ? "सभी सवाल हिंदी में बनाएं। अंग्रेजी का बिल्कुल उपयोग न करें।" 
    : "Generate all questions in English only.";

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
    return getWorkQuestionsTemplate(trade, language);
  } catch (error) {
    console.log(`API failed, using ${language} fallback questions`);
    return getWorkQuestionsTemplate(trade, language);
  }
};

const evaluateWorkAnswers = async (trade, workQuestions, workAnswers, language = "english") => {
  const qa = workQuestions.map((question, idx) => ({
    question,
    answer: workAnswers[idx] || "",
  }));

  const languageInstruction = language === "hindi" 
    ? "सभी विश्लेषण हिंदी में प्रदान करें। strengths, weaknesses, recommendations और summary - सब हिंदी में।" 
    : "Provide all analysis in English.";

  const prompt = `
You are a supportive evaluator for ${trade} candidates.
Be GENEROUS with scoring - focus on positives and potential.
Give good scores (7-10) for reasonable answers. Only give low scores if answers show serious issues.

${languageInstruction}

Return ONLY JSON with this shape:
{
  "evaluations": [{"question": "", "answer": "", "score": 0, "reason": ""}],
  "totalScore": 0,
  "badge": "Bronze",
  "skillBreakdown": {"technical": 0, "safety": 0, "experience": 0, "problemSolving": 0, "communication": 0},
  "strengths": [""],
  "weaknesses": [""],
  "recommendations": [""],
  "workReadiness": "Entry Level",
  "confidenceLevel": "Medium",
  "summary": "",
  "hiringRecommendation": "Maybe"
}

Scoring: 9-10=Excellent, 7-8=Good, 5-6=Acceptable, 3-4=Weak, 0-2=Poor

Analyze these answers:
${qa.map((item) => `Q: ${item.question}\nA: ${item.answer}`).join("\n\n")}
`;

  try {
    const text = await callGemini(prompt);
    return JSON.parse(cleanJsonText(text));
  } catch (error) {
    console.log("⚠️  Evaluation API failed:", error.message);
    console.log("Using generous mock scoring");
    // Generous fallback: 8/10 for any non-empty answer
    let sum = 0;
    const evaluations = qa.map((item) => {
      const score = item.answer.trim() ? 8 : 0;
      sum += score;
      return { 
        question: item.question, 
        answer: item.answer, 
        score, 
        reason: item.answer.trim() ? "Good response provided" : "No answer"
      };
    });

    const totalScore = qa.length ? Math.round((sum / (qa.length * 10)) * 100) : 0;
    const badge = totalScore >= 75 ? "Gold" : totalScore >= 50 ? "Silver" : "Bronze";

    return {
      evaluations,
      totalScore,
      badge,
      skillBreakdown: { 
        technical: totalScore, 
        safety: totalScore, 
        experience: totalScore, 
        problemSolving: totalScore, 
        communication: totalScore 
      },
      strengths: language === "hindi" 
        ? ["अच्छी प्रतिक्रिया", "काम करने की इच्छा", "अनुभवी"]
        : ["Good responses", "Willing to work", "Experienced"],
      weaknesses: language === "hindi" 
        ? ["विस्तृत मूल्यांकन के लिए API सक्षम करें"]
        : ["Enable API for detailed evaluation"],
      recommendations: language === "hindi" 
        ? ["व्यावहारिक अनुभव प्राप्त करते रहें", "सुरक्षा प्रथाओं पर ध्यान दें"]
        : ["Continue gaining experience", "Focus on safety practices"],
      workReadiness: totalScore >= 70 ? "Intermediate" : "Entry Level",
      confidenceLevel: totalScore >= 70 ? "High" : "Medium",
      summary: language === "hindi" 
        ? "उम्मीदवार ने प्रासंगिक कार्य अनुभव प्रदान किया है और अपने व्यापार की अच्छी समझ दिखाई है।"
        : "Candidate has provided relevant work experience and shows good understanding of their trade.",
      hiringRecommendation: totalScore >= 75 ? "Hire" : totalScore >= 60 ? "Maybe" : "No Hire"
    };
  }
};

module.exports = {
  generateIntakeQuestions,
  extractProfileFromText,
  generateWorkQuestions,
  evaluateWorkAnswers,
  detectLanguage,
  extractTradeFromMessage,  // NOW EXPORTED
};
