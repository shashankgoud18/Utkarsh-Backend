// import axios from "axios";
// const { buildPrompt } = require("../utils/promptBuilder") ;

const axios = require("axios");
const { buildPrompt } = require("../utils/promptBuilder");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const analyzeInterview = async (language, responses) => {
  try {
    const prompt = buildPrompt(language, responses);
    console.log("API Key exists:", !!process.env.GEMINI_API_KEY);
    console.log("Generated Prompt:", prompt);

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
      }
    );

    const text =
      response.data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    console.log("Gemini response received:", text.slice(0, 100));
    return text;

  } catch (error) {
    // Log everything Gemini sends back
    console.error("=== Gemini Full Error ===");
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Headers:", error.response.headers);
      console.error("Data:", JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error("No response received:", error.request);
    } else {
      console.error("Axios error message:", error.message);
    }
    throw new Error("Gemini analysis failed");
  }
};

module.exports = { analyzeInterview };