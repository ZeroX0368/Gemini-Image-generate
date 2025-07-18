
const { GoogleGenerativeAI } = require("@google/generative-ai");
const express = require('express');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const app = express();

async function generateImage(prompt) {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-exp",
    generationConfig: {
      responseModalities: ["Text", "Image"]
    }
  });

  try {
    const response = await model.generateContent(prompt);
    
    for (const part of response.response.candidates[0].content.parts) {
      if (part.inlineData) {
        return part.inlineData.data; // Return base64 image data
      }
    }
    
    throw new Error("No image generated");
  } catch (error) {
    console.error("Error generating content:", error);
    throw error;
  }
}

// Store generated images in memory with unique IDs
const imageCache = new Map();

app.get('/image', async (req, res) => {
  try {
    const prompt = req.query.prompt;
    
    if (!prompt) {
      return res.status(400).json({ error: "Prompt parameter is required" });
    }

    const imageData = await generateImage(prompt);
    
    // Generate unique ID for the image
    const imageId = Date.now() + '-' + Math.random().toString(36).substring(2);
    
    // Store image data in cache
    imageCache.set(imageId, imageData);
    
    // Return JSON with image URL
    const imageUrl = `${req.protocol}://${req.get('host')}/generated/${imageId}.png`;
    
    res.json({
      success: true,
      image: imageUrl,
      prompt: prompt
    });
    
  } catch (error) {
    res.status(500).json({ error: "Failed to generate image" });
  }
});

// Endpoint to serve generated images
app.get('/generated/:imageId.png', (req, res) => {
  const imageId = req.params.imageId;
  const imageData = imageCache.get(imageId);
  
  if (!imageData) {
    return res.status(404).json({ error: "Image not found" });
  }
  
  const imageBuffer = Buffer.from(imageData, 'base64');
  
  res.set({
    'Content-Type': 'image/png',
    'Content-Length': imageBuffer.length
  });
  
  res.send(imageBuffer);
});

app.listen(5000, '0.0.0.0', () => {
  console.log('Server running on port 5000');
});
