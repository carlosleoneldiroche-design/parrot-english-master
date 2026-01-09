
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Exercise, PronunciationFeedback, UserGoal, SupportedLanguage } from "../types";

// Helper function to convert language code to full name for prompt engineering
const getLanguageName = (code: SupportedLanguage) => {
  const names: Record<string, string> = {
    es: 'Spanish', fr: 'French', pt: 'Portuguese', de: 'German', it: 'Italian', 
    zh: 'Chinese', ja: 'Japanese', hi: 'Hindi', ar: 'Arabic', ru: 'Russian',
    bn: 'Bengali', ur: 'Urdu', id: 'Indonesian', ko: 'Korean', vi: 'Vietnamese',
    tr: 'Turkish', te: 'Telugu', mr: 'Marathi', ta: 'Tamil', tl: 'Tagalog',
    pl: 'Polish', nl: 'Dutch', sv: 'Swedish', el: 'Greek', he: 'Hebrew', th: 'Thai'
  };
  return names[code] || 'Spanish';
};

export const analyzeVideoContent = async (videoBase64: string, nativeLang: SupportedLanguage = 'es'): Promise<string> => {
  const langName = getLanguageName(nativeLang);
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: [
      {
        parts: [
          { inlineData: { data: videoBase64, mimeType: 'video/mp4' } },
          { text: `Analiza este video y proporciona una lección en ${langName}. 
            1. Resume lo que sucede. 
            2. Extrae 5 palabras clave de vocabulario en inglés con su significado en ${langName}. 
            3. Explica un punto gramatical interesante usado en el video.
            Formato Markdown claro.` }
        ]
      }
    ]
  });
  return response.text || "No se pudo analizar el video.";
};

export const generateLessonExercises = async (topic: string, goal?: UserGoal, nativeLang: SupportedLanguage = 'es'): Promise<Exercise[]> => {
  const goalContext = goal ? `El objetivo del usuario es ${goal}.` : "";
  const langName = getLanguageName(nativeLang);
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Genera 5 ejercicios de aprendizaje de inglés para una lección titulada "${topic}". ${goalContext}
    El idioma nativo del usuario es ${langName}. 
    - TRANSLATE: Proporciona una oración en ${langName} para que el usuario la traduzca al inglés.
    - ROLEPLAY: Proporciona una frase corta de un personaje (p.ej. un camarero) para que el usuario responda en inglés.
    - EXPLANATIONS: Todas las explicaciones y feedback deben estar en ${langName}.
    Incluye una mezcla de: TRANSLATE, MULTIPLE_CHOICE, SPEAKING, LISTENING, ROLEPLAY.
    Devuelve estrictamente JSON.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            type: { type: Type.STRING, enum: ['TRANSLATE', 'MULTIPLE_CHOICE', 'SPEAKING', 'LISTENING', 'ROLEPLAY'] },
            question: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctAnswer: { type: Type.STRING },
            audioText: { type: Type.STRING },
            explanation: { type: Type.STRING }
          },
          required: ['id', 'type', 'question', 'correctAnswer']
        }
      }
    }
  });

  try {
    return JSON.parse(response.text || '[]');
  } catch (e) {
    console.error("Error parsing exercises", e);
    return [];
  }
};

export const transcribeAudio = async (audioBase64: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        { inlineData: { mimeType: "audio/webm", data: audioBase64 } },
        { text: "Transcribe exactamente lo que se dice. Sin preámbulos." }
      ]
    }
  });
  return response.text?.trim() || "";
};

export const analyzePronunciation = async (audioBase64: string, expectedText: string, nativeLang: SupportedLanguage = 'es'): Promise<PronunciationFeedback> => {
  const langName = getLanguageName(nativeLang);
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        { inlineData: { mimeType: "audio/webm", data: audioBase64 } },
        { text: `Analiza la pronunciación en inglés del usuario comparada con: "${expectedText}". 
        Sé específico. Identifica qué palabras fueron correctas.
        Para palabras incorrectas, proporciona un consejo fonético en ${langName}.
        Retorna estrictamente JSON.` }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER },
          accuracy: { type: Type.STRING, enum: ['poor', 'fair', 'good', 'excellent'] },
          generalFeedback: { type: Type.STRING },
          wordAnalysis: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                word: { type: Type.STRING },
                isCorrect: { type: Type.BOOLEAN },
                feedback: { type: Type.STRING }
              },
              required: ['word', 'isCorrect']
            }
          }
        },
        required: ['score', 'accuracy', 'generalFeedback', 'wordAnalysis']
      }
    }
  });
  
  try {
    return JSON.parse(response.text || '{}');
  } catch (e) {
    return { score: 0, accuracy: 'poor', generalFeedback: "Error de análisis.", wordAnalysis: [] };
  }
};

export function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const playPronunciation = async (text: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } }
      }
    });
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) return;
    
    const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
    const audioContext = new AudioContextClass({ sampleRate: 24000 });
    const audioBuffer = await decodeAudioData(decode(base64Audio), audioContext, 24000, 1);
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    source.start();
  } catch (err) {
    console.error("TTS Error:", err);
  }
};

/**
 * Generates a short English audio summary of a lesson topic for listening practice.
 */
export const playLessonAudioSummary = async (topic: string, description: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // First, generate a 2-3 sentence clear English summary for listening
    const textResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Create a very short, clear 2-sentence English summary for a beginner-intermediate language lesson about "${topic}" (${description}). 
      Make it suitable for a listening exercise. Return ONLY the English text.`
    });
    
    const summaryText = textResponse.text?.trim() || `Today we are learning about ${topic}. Let's practice our skills together.`;
    
    // Then convert that text to speech
    await playPronunciation(summaryText);
    return summaryText;
  } catch (err) {
    console.error("Summary Audio Error:", err);
    throw err;
  }
};
