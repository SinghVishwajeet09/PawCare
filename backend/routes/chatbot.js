const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { protect } = require('../middleware/auth');
const { findNgos } = require('../services/ngoDirectory');

// initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const systemInstruction = `You are PawBot, an AI assistant for the PawCare animal rescue platform.
Your goals:
1. Guide users on how to handle injured or distressed animals safely.
2. Provide basic first aid tips for animals.
3. Help users find nearest NGOs (we will provide location context if available).
4. Reply conversationally in a mix of Hindi and English (Hinglish/Hindi-English). 
5. Be compassionate, concise, and informative.
`;

router.post('/', async (req, res) => {
  const { message, location } = req.body;

  if (!message) {
    return res.status(400).json({ message: 'Message is required' });
  }

  try {
    let contextPrompt = systemInstruction;

    if (location && location.state && location.district) {
      const ngos = findNgos({ state: location.state, district: location.district, limit: 3 });
      if (ngos.length > 0) {
         contextPrompt += `\n\nNearby NGOs available in ${location.district}, ${location.state}:\n`;
         ngos.forEach(ngo => {
           contextPrompt += `- ${ngo.name} (Contact: ${ngo.contactNumber})\n`;
         });
      } else {
         contextPrompt += `\n\nThere are no known NGOs in our database for ${location.district}, ${location.state} yet.\n`;
      }
    }
    let retryCount = 0;
    let result = null;
    // Add retry loop and fallback for 503 Service Unavailable API errors
    while (retryCount < 3) {
      try {
        const modelName = retryCount === 0 ? "gemini-2.5-flash" : "gemini-2.0-flash";
        const model = genAI.getGenerativeModel({ model: modelName, systemInstruction: contextPrompt });
        result = await model.generateContent(message);
        break; 
      } catch (err) {
        if (err.status === 503 && retryCount < 2) {
          retryCount++;
          console.warn(`Gemini API 503 error, retrying with fallback model... (Attempt ${retryCount + 1})`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          throw err;
        }
      }
    }  
    console.log("Result received from Gemini");
    const text = result.response.text();

    res.json({ reply: text });
  } catch (error) {
    console.error('PawBot error detailed:', error.message, error.stack);
    res.status(500).json({ message: 'Failed to generate response. Please try again later.', error: error.message });
  }
});
module.exports = router;
