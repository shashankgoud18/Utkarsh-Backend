const axios = require("axios");

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";

const generateQuestions = async (trade, experience) => {
  const prompt = `Generate 5 simple practical interview questions for a ${trade} with ${experience} years experience. Return strictly as JSON array.`;

  const response = await axios.post(
    `${GEMINI_URL}?key=${process.env.GEMINI_API_KEY}`,
    {
      contents: [{ parts: [{ text: prompt }] }],
    }
  );

  const text = response.data.candidates[0].content.parts[0].text;
  return JSON.parse(text);
};

const evaluateAnswer = async (trade, question, answer) => {
  const prompt = `
  Evaluate this ${trade} interview answer.
  Question: ${question}
  Answer: ${answer}
  Return strictly in JSON:
  { "score": number, "reason": "text" }
  `;

  const response = await axios.post(
    `${GEMINI_URL}?key=${process.env.GEMINI_API_KEY}`,
    {
      contents: [{ parts: [{ text: prompt }] }],
    }
  );

  const text = response.data.candidates[0].content.parts[0].text;
  return JSON.parse(text);
};

const generateSummary = async (trade, experience, totalScore) => {
  const prompt = `
  Generate a 3 line professional summary for a ${trade}
  with ${experience} years experience and skill score ${totalScore}.
  `;

  const response = await axios.post(
    `${GEMINI_URL}?key=${process.env.GEMINI_API_KEY}`,
    {
      contents: [{ parts: [{ text: prompt }] }],
    }
  );

  return response.data.candidates[0].content.parts[0].text;
};

module.exports = {
  generateQuestions,
  evaluateAnswer,
  generateSummary,
};