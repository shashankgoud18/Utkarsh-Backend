const buildPrompt = (language, responses) => {
  const formatted = responses
    .map(
      (item, index) =>
        `Q${index + 1}: ${item.question}\nA${index + 1}: ${item.answer}`
    )
    .join("\n\n");

  return `
You are a professional resume builder AI.

Language: ${language}

Below are interview question and answer pairs:

${formatted}

Your task:
1. Extract personal details
2. Identify skills
3. Identify experience
4. Generate structured resume content
5. Return output in clean JSON format

Respond ONLY in valid JSON.
`;
};

module.exports = { buildPrompt };