import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';

if(!apiKey) {
  console.warn("Gemini API Key is missing. Make sure to define it in .env.local");
}

export const genAI = new GoogleGenerativeAI(apiKey || 'uninitialized');
