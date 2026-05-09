import { genAI } from './gemini';

const MODELS = [
  "gemini-3.1-flash-lite-preview", 
  "gemini-3-flash-preview", 
  "gemini-2.5-flash",
  "gemini-2.5-pro"
];

/**
 * Uses Gemini to analyze spreadsheet headers and map them to database fields.
 */
export const analyzeSheetStructure = async (headers, sampleData) => {
  const prompt = `
    You are an expert data engineer. I have a spreadsheet with the following headers and first 5 rows of data.
    Headers: ${JSON.stringify(headers)}
    Sample Data: ${JSON.stringify(sampleData)}

    Your task is to identify:
    1. Which column represents the Student Name.
    2. Which column represents the Student USN (University Serial Number, usually looks like 4SF24CI001).
    3. Which column represents the Student Email.
    4. Which columns represent Attendance Dates. Note: dates might be serial numbers or strings.

    Respond ONLY with a JSON object in this format:
    {
      "mapping": {
        "name": "column_header_for_name",
        "usn": "column_header_for_usn",
        "email": "column_header_for_email"
      },
      "attendanceColumns": [
        { "header": "date_header", "index": 0, "isDate": true, "inferredDate": "DD-MM-YYYY" }
      ],
      "hasMissingDateHeaders": boolean
    }
    
    If a header is missing or empty but clearly contains attendance data (like a column of true/false or P/A after the student info), mark it as isDate: true and header: "Unknown".
  `;

  const attemptGeneration = async (modelName) => {
    const currentModel = genAI.getGenerativeModel({ model: modelName });
    const result = await currentModel.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("AI did not return a valid JSON object. Response: " + text);
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      throw new Error("Failed to parse AI JSON: " + e.message + "\n\nRaw text: " + jsonMatch[0]);
    }
  };

  let lastError = null;
  for (const modelName of MODELS) {
    try {
      console.log(`Attempting AI analysis with model: ${modelName}`);
      return await attemptGeneration(modelName);
    } catch (error) {
      lastError = error;
      const isRetryable = error.message.includes('404') || 
                         error.message.includes('503') || 
                         error.message.includes('429') ||
                         error.message.includes('overloaded');
      
      if (isRetryable) {
        console.warn(`Model ${modelName} failed or unavailable, trying next fallback...`);
        continue;
      }
      break;
    }
  }

  console.error("All AI models failed:", lastError);
  throw lastError;
};

/**
 * Infers missing dates based on a schedule hint.
 */
export const inferDates = async (columnCount, scheduleHint, startDate) => {
  const prompt = `
    A user has ${columnCount} attendance columns without date headers.
    The class schedule is: ${scheduleHint}
    The start date or context date is: ${startDate}

    Generate a list of ${columnCount} likely dates for these columns in DD-MM-YYYY format.
    Return ONLY a JSON array of strings.
  `;

  const attemptGeneration = async (modelName) => {
    const currentModel = genAI.getGenerativeModel({ model: modelName });
    const result = await currentModel.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("AI did not return a valid JSON array. Response: " + text);
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      throw new Error("Failed to parse AI JSON array: " + e.message + "\n\nRaw text: " + jsonMatch[0]);
    }
  };

  let lastError = null;
  for (const modelName of MODELS) {
    try {
      console.log(`Attempting Date Inference with model: ${modelName}`);
      return await attemptGeneration(modelName);
    } catch (error) {
      lastError = error;
      const isRetryable = error.message.includes('404') || 
                         error.message.includes('503') || 
                         error.message.includes('429') ||
                         error.message.includes('overloaded');
      
      if (isRetryable) {
        console.warn(`Model ${modelName} failed or unavailable for date inference, trying next fallback...`);
        continue;
      }
      break;
    }
  }

  console.error("All AI models failed for date inference:", lastError);
  throw lastError;
};
