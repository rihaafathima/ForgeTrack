
const { GoogleGenerativeAI } = require('../frontend/node_modules/@google/generative-ai');

const apiKey = 'AIzaSyBxv1lpCZ8iL-uJxs7NOsJEawbtu0XDhQI';

async function findModels() {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();
    const flashModels = data.models.filter(m => m.name.includes('flash')).map(m => m.name);
    console.log("Flash Models:", flashModels);
  } catch (error) {
    console.error("Failed:", error.message);
  }
}

findModels();
