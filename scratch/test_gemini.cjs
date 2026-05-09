
const { GoogleGenerativeAI } = require('../frontend/node_modules/@google/generative-ai');

const apiKey = 'AIzaSyBxv1lpCZ8iL-uJxs7NOsJEawbtu0XDhQI';
const genAI = new GoogleGenerativeAI(apiKey);

async function test() {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("Hello");
    const response = await result.response;
    console.log("Success:", response.text());
  } catch (error) {
    console.error("Test Failed:", error.message);
  }
}

test();
