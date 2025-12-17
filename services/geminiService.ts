import { GoogleGenAI } from "@google/genai";
import { photoMethod, transitionWords, realWords } from "../data";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const evaluatePhotoDescription = async (userText: string, imageUrl: string | null) => {
  const model = "gemini-2.5-flash";
  
  const systemPrompt = `
  You are an expert Duolingo English Test (DET) tutor. 
  The user is practicing "Write About the Photo".
  Evaluate their text based on these DET criteria:
  1. Structure: Did they use the Introduction -> Foreground -> Background -> Speculation flow?
  2. Vocabulary: Did they use B2/C1 words?
  3. Grammar & Spelling: Point out any errors (User is dysorthographic, be encouraging but precise).
  4. Content: Is it descriptive?
  
  Format the response as JSON with these keys: 
  {
    "score": number (0-100),
    "feedback": string (brief summary),
    "corrections": string[],
    "betterVersion": string
  }
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: [
        { role: "user", parts: [{ text: systemPrompt + "\n\nUser Response:\n" + userText }] }
      ],
      config: {
        responseMimeType: "application/json"
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Gemini Error", error);
    return {
      score: 0,
      feedback: "Error connecting to AI tutor.",
      corrections: [],
      betterVersion: ""
    };
  }
};

export const generateFillInBlank = async () => {
  const word = realWords[Math.floor(Math.random() * realWords.length)];
  const model = "gemini-2.5-flash";
  
  const prompt = `Generate a single sentence using the word "${word.word}". 
  The sentence should be B2 level context. 
  Output JSON: { "sentence": "The full sentence.", "missingWord": "${word.word}" }`;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (e) {
    return { sentence: `The ${word.word} was very important.`, missingWord: word.word };
  }
};

export const generateParagraphTask = async () => {
    const model = "gemini-2.5-flash";
    const prompt = `Generate a short paragraph (about 60-80 words) about an academic or general topic (e.g., science, history, environment).
    The English should be B2/C1 level.
    Output JSON: { "topic": "Title of topic", "text": "The full paragraph text..." }`;

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json"
            }
        });
        return JSON.parse(response.text || "{}");
    } catch (e) {
        return { 
            topic: "Technology", 
            text: "Technology has revolutionized the way we communicate. In the past, letters took days to arrive, but now emails are instantaneous. However, this convenience comes with challenges, such as maintaining privacy and avoiding distractions in our daily lives." 
        };
    }
}

export const getWordDetails = async (word: string) => {
  const model = "gemini-2.5-flash";
  // Requesting French translation and English example
  const prompt = `Translate the English word "${word}" to French and provide a simple example sentence in English using the word. 
  Output JSON: { "translation": "French translation", "example": "English example sentence." }`;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error(e);
    return { translation: "...", example: "Could not load example." };
  }
};