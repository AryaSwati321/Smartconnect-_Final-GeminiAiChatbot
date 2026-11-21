const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const generateResponse = async (userMessage) => {
  try {
    const prompt = `
You are SmartConnect AI Assistant.

SmartConnect is an AI-powered Hyperlocal Community Hub.

Features:
- User Registration & Login
- Service Booking
- Vendor Registration
- Booking Tracking
- Community Posts
- Events
- AI Chatbot

Answer politely and clearly.

User Question:
${userMessage}
`;

    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Sorry, I couldn't generate a response.";
  }
};

module.exports = { generateResponse };