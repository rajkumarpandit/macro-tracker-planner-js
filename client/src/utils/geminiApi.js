import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_CONFIG } from '../config/constants';

// Initialize the Gemini API
const genAI = new GoogleGenerativeAI(process.env.REACT_APP_GEMINI_API_KEY);

/**
 * Parse food item and quantity from natural language text
 * @param {string} text - Natural language input (e.g., "2 bananas")
 * @returns {Promise<{foodName: string, quantity: number, unit: string}>}
 */
export async function parseFoodFromText(text) {
  try {
    const model = genAI.getGenerativeModel({ model: GEMINI_CONFIG.MODEL_NAME });
    
    const prompt = `You are a food parsing assistant. Parse the following text and extract ONLY ONE food item with its quantity.
If multiple food items are mentioned, return an error.

Input: "${text}"

Return a JSON object with this EXACT structure (no additional text):
{
  "success": true/false,
  "foodName": "name of the food item",
  "quantity": numeric value,
  "unit": "unit of measurement (pieces, grams, cups, etc.)",
  "error": "error message if multiple items detected or parsing failed"
}

Rules:
1. If multiple food items detected, set success: false and provide error message
2. foodName should be singular form (e.g., "banana" not "bananas")
3. quantity must be a number
4. unit should be standardized (g, kg, pieces, cups, tbsp, etc.)
5. Return ONLY the JSON object, no other text`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let jsonText = response.text().trim();
    
    // Remove markdown code blocks if present
    jsonText = jsonText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    
    console.log('Gemini Raw Response:', jsonText);
    
    // Try to extract JSON from the response
    let jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in response:', jsonText);
      throw new Error('Invalid response format from Gemini');
    }
    
    console.log('Extracted JSON:', jsonMatch[0]);
    const parsed = JSON.parse(jsonMatch[0]);
    console.log('Parsed Object:', parsed);
    
    if (!parsed.success) {
      throw new Error(parsed.error || 'Failed to parse food item');
    }
    
    // Convert food name to Title Case (InitCap)
    const toTitleCase = (str) => {
      return str.toLowerCase().split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
    };
    
    return {
      foodName: toTitleCase(parsed.foodName),
      quantity: parsed.quantity,
      unit: parsed.unit
    };
  } catch (error) {
    console.error('Error parsing food text:', error);
    console.error('Error details:', error.message, error.stack);
    throw new Error(error.message || 'Failed to parse food item. Please try again.');
  }
}

/**
 * Get macro nutrition information for a food item
 * @param {string} foodName - Name of the food item
 * @param {string} unit - Unit of measurement
 * @returns {Promise<{calories: number, protein: number, carbs: number, fats: number, servingSize: string}>}
 */
export async function getMacrosFromGemini(foodName, unit) {
  try {
    const model = genAI.getGenerativeModel({ model: GEMINI_CONFIG.MODEL_NAME });
    
    const prompt = `You are a nutrition information assistant. Provide macro nutrition information for the following food item.

Food: "${foodName}"
Unit: "${unit}"

Return a JSON object with this EXACT structure (no additional text):
{
  "success": true/false,
  "calories": numeric value (per unit),
  "protein": numeric value in grams (per unit),
  "carbs": numeric value in grams (per unit),
  "fats": numeric value in grams (per unit),
  "servingSize": "description of serving size",
  "error": "error message if data not available"
}

Rules:
1. Provide values for 1 ${unit} of ${foodName}
2. All numeric values should be per the specified unit
3. If the food item is not recognized, set success: false
4. servingSize should describe what "1 unit" means (e.g., "1 medium banana (118g)")
5. Return ONLY the JSON object, no other text`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let jsonText = response.text().trim();
    
    // Remove markdown code blocks if present
    jsonText = jsonText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    
    // Try to extract JSON from the response
    let jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid response format from Gemini');
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    if (!parsed.success) {
      throw new Error(parsed.error || 'Failed to fetch macro information');
    }
    
    return {
      calories: parsed.calories,
      protein: parsed.protein,
      carbs: parsed.carbs,
      fats: parsed.fats,
      servingSize: parsed.servingSize
    };
  } catch (error) {
    console.error('Error fetching macros from Gemini:', error);
    throw new Error(error.message || 'Failed to fetch macro information. Please try again.');
  }
}

/**
 * Check if two food names are semantically similar using Gemini AI
 * @param {string} foodName1 - First food name
 * @param {string} foodName2 - Second food name
 * @returns {Promise<boolean>} - True if they refer to the same food item
 */
export async function areFoodsSimilar(foodName1, foodName2) {
  try {
    const model = genAI.getGenerativeModel({ model: GEMINI_CONFIG.MODEL_NAME });
    
    const prompt = `Are these two food items essentially the same thing? Consider synonyms, different word orders, and common variations.

Food 1: "${foodName1}"
Food 2: "${foodName2}"

Examples of similar items:
- "Boiled Potato" and "Potato Boiled" are the SAME
- "Chicken Breast" and "Breast Chicken" are the SAME
- "White Rice" and "Rice White" are the SAME
- "Apple" and "Green Apple" are DIFFERENT (different varieties)
- "Chicken" and "Chicken Breast" are DIFFERENT (different cuts)

Return a JSON object with this EXACT structure (no additional text):
{
  "areSimilar": true/false,
  "reason": "brief explanation"
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let jsonText = response.text().trim();
    
    // Remove markdown code blocks if present
    jsonText = jsonText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    
    // Try to extract JSON from the response
    let jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in similarity check:', jsonText);
      return false; // Default to not similar if can't parse
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    console.log('Similarity check result:', parsed);
    
    return parsed.areSimilar === true;
  } catch (error) {
    console.error('Error checking food similarity:', error);
    return false; // Default to not similar on error
  }
}

