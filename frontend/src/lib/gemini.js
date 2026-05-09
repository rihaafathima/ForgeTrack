import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';

if(!apiKey || apiKey === 'your_gemini_api_key_here') {
  console.warn("Gemini API Key is missing or using placeholder in .env.local");
} else {
  console.log("Gemini API Key loaded successfully (starts with:", apiKey.substring(0, 7), ")");
}

export const genAI = new GoogleGenerativeAI(apiKey || 'uninitialized');
