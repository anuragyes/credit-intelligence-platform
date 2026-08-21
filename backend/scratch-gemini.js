import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function test() {
  try {
    const response = await gemini.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: 'What are the current accounts receivable, current assets, and current liabilities for Reliance Industries (RELIANCE.NS) for the latest fiscal year? Return only a JSON object with these three keys mapping to the numerical values in INR Crores.',
      tools: [{ googleSearch: {} }]
    });
    console.log(response.text);
  } catch (e) {
    console.error(e);
  }
}
test();
