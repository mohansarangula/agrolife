
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisSettings } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const geminiService = {
  async analyzeCropImage(base64Image: string, cropType: string, settings?: AnalysisSettings) {
    const sensitivityNote = settings?.sensitivity === 'ultra' 
      ? "Perform an extremely rigorous analysis, looking for even the most minute signs of stress or disease."
      : settings?.sensitivity === 'high'
      ? "Perform a detailed analysis, being highly sensitive to early signs of crop issues."
      : "Perform a standard agricultural analysis.";

    const detailNote = settings?.detailLevel === 'comprehensive'
      ? "Provide an exhaustive report with in-depth technical explanations for each observation."
      : settings?.detailLevel === 'basic'
      ? "Provide a concise, high-level summary of the findings."
      : "Provide a standard level of detail suitable for a general farming report.";

    const researchNote = settings?.includeResearch 
      ? "Include relevant scientific context or recent agricultural research findings if applicable."
      : "";

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image,
            },
          },
          {
            text: `As an agricultural expert, analyze this image of a ${cropType} crop. 
            ${sensitivityNote}
            ${detailNote}
            ${researchNote}
            
            Identify if there are any diseases, describe the severity, and provide specific recommendations for the farmer.
            IMPORTANT: If a disease is detected, use Google Search to find 2-3 helpful YouTube video links that explain how to treat or manage this specific disease for this crop.
            Respond in JSON format.`,
          },
        ],
      },
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            status: { type: Type.STRING, description: 'healthy, warning, or critical' },
            disease: { type: Type.STRING, description: 'Name of the detected disease, or none' },
            severity: { type: Type.STRING, description: 'Low, Medium, or High' },
            confidence: { type: Type.NUMBER, description: 'Confidence score from 0 to 1' },
            recommendations: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            youtubeLinks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  url: { type: Type.STRING }
                },
                required: ["title", "url"]
              },
              description: 'List of relevant YouTube video links found via search'
            }
          },
          required: ["status", "disease", "severity", "confidence", "recommendations"]
        }
      }
    });

    try {
      const result = JSON.parse(response.text || '{}');
      
      // If the model didn't populate youtubeLinks in JSON but found them in grounding metadata
      if ((!result.youtubeLinks || result.youtubeLinks.length === 0) && response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
        const chunks = response.candidates[0].groundingMetadata.groundingChunks;
        const links = chunks
          .filter(chunk => chunk.web && chunk.web.uri.includes('youtube.com'))
          .map(chunk => ({
            title: chunk.web?.title || 'YouTube Video',
            url: chunk.web?.uri || ''
          }));
        if (links.length > 0) {
          result.youtubeLinks = links;
        }
      }
      
      return result;
    } catch (e) {
      console.error("Failed to parse Gemini response", e);
      return null;
    }
  },

  async askAi(question: string, language: string, history: {role: 'user' | 'model', parts: any[]}[] = [], imageBase64?: string) {
    const systemInstruction = `You are "AgroAssist", a professional agricultural AI assistant. 
    Provide expert advice on crops, soil, pests, weather impacts, and farming techniques. 
    If an image is provided, identify the plant, its health, and give specific details about it.
    Be concise, supportive, and practical. 
    The current language is ${language}. Respond in that language. 
    If you don't know the answer, recommend consulting a local agricultural extension officer.`;

    const currentParts: any[] = [{ text: question }];
    if (imageBase64) {
      currentParts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: imageBase64
        }
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [...history, { role: 'user', parts: currentParts }],
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });

    return response.text;
  }
};
