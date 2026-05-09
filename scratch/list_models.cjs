
const { GoogleGenerativeAI } = require('../frontend/node_modules/@google/generative-ai');

const apiKey = 'AIzaSyBxv1lpCZ8iL-uJxs7NOsJEawbtu0XDhQI';
const genAI = new GoogleGenerativeAI(apiKey);

async function list() {
  try {
    // There isn't a direct listModels in the simple SDK usually, 
    // but we can try to fetch from the raw endpoint
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("List Failed:", error.message);
  }
}

list();
