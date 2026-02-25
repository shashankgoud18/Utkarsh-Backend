const axios = require("axios");

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent";

// Mock data for testing when API fails
const mockGenerateQuestions = (trade, experience) => {
  const questions = [
    `Tell us about your experience as a ${trade} with ${experience} years of expertise.`,
    `What are the main tools and equipment you use in your work as a ${trade}?`,
    `Describe your approach to quality and safety in your trade.`,
    `How do you handle difficult situations or client complaints in your field?`,
    `What training or certifications do you have for your role as a ${trade}?`,
  ];
  return questions;
};

const mockEvaluateAnswer = () => {
  return {
    score: Math.floor(Math.random() * 10) + 1,
    reason: "Mock evaluation - Gemini API connection failed. Replace with actual API key to get real evaluations."
  };
};

const mockGenerateSummary = (trade, experience) => {
  return `${trade} with ${experience} years of proven expertise. Strong technical skills with demonstrated ability to deliver quality work. Reliable professional suitable for various project requirements.`;
};

const generateQuestions = async (trade, experience) => {
  const prompt = `Generate 5 simple practical interview questions for a ${trade} with ${experience} years experience. Return strictly as JSON array of strings like ["question1", "question2", ...]. Do not include any markdown formatting or code blocks.`;

  try {
    console.log("Generating questions for:", trade, experience);
    const url = `${GEMINI_URL}?key=${process.env.GEMINI_API_KEY}`;
    console.log("API URL:", url.substring(0, 80) + "...");
    
    const response = await axios.post(
      url,
      {
        contents: [{ parts: [{ text: prompt }] }],
      },
      { timeout: 30000 }
    );

    console.log("Questions response received");
    let text = response.data.candidates[0].content.parts[0].text;
    
    // Remove markdown code blocks if present
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const parsed = JSON.parse(text);
    console.log("Questions parsed successfully");
    return parsed;
  } catch (error) {
    console.error("Error generating questions:", error.response?.status, error.message);
    console.warn("⚠️  Using mock data. To use real API: Check API key in .env and ensure Gemini API is enabled in Google Cloud Console");
    return mockGenerateQuestions(trade, experience);
  }
};

const evaluateAnswer = async (trade, question, answer) => {
  const prompt = `
  Evaluate this ${trade} interview answer.
  Question: ${question}
  Answer: ${answer}
  Return strictly in JSON format:
  { "score": number (0-10), "reason": "text" }
  Do not include any markdown formatting or code blocks.
  `;

  try {
    console.log("Evaluating answer...");
    const response = await axios.post(
      `${GEMINI_URL}?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
      },
      { timeout: 30000 }
    );

    console.log("Evaluation response received");
    let text = response.data.candidates[0].content.parts[0].text;
    
    // Remove markdown code blocks if present
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const parsed = JSON.parse(text);
    console.log("Evaluation parsed successfully");
    return parsed;
  } catch (error) {
    console.error("Error evaluating answer:", error.message);
    console.warn("⚠️  Using mock data for evaluation");
    return mockEvaluateAnswer();
  }
};

const generateSummary = async (trade, experience, totalScore) => {
  const prompt = `
  Generate a 3 line professional summary for a ${trade}
  with ${experience} years experience and skill score ${totalScore}.
  `;

  try {
    console.log("Generating summary...");
    const response = await axios.post(
      `${GEMINI_URL}?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
      },
      { timeout: 30000 }
    );

    console.log("Summary response received");
    const text = response.data.candidates[0].content.parts[0].text;
    console.log("Summary generated successfully");
    return text;
  } catch (error) {
    console.error("Error generating summary:", error.message);
    console.warn("⚠️  Using mock data for summary");
    return mockGenerateSummary(trade, experience);
  }
};

module.exports = {
  generateQuestions,
  evaluateAnswer,
  generateSummary,
};