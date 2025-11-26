
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { TranscriptionResult, RequestMode } from "../types";

const apiKey = process.env.API_KEY;

if (!apiKey) {
  console.error("API Key is missing. Please check process.env.API_KEY");
}

const ai = new GoogleGenAI({ apiKey: apiKey || '' });

export const convertFileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the Data URI prefix (e.g., "data:image/jpeg;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const transcribeDocument = async (
  base64Data: string,
  mimeType: string,
  mode: RequestMode
): Promise<TranscriptionResult> => {
  try {
    const modelId = 'gemini-3-pro-preview';

    const properties: Record<string, any> = {};
    const required: string[] = [];

    if (mode === RequestMode.DIPLOMATIC || mode === RequestMode.BOTH) {
      properties.diplomatic = {
        type: Type.STRING,
        description: "The diplomatic transcription of the text, preserving original spelling, line breaks, and archaic characters.",
      };
      required.push("diplomatic");
    }

    if (mode === RequestMode.MODERN || mode === RequestMode.BOTH) {
      properties.modern = {
        type: Type.STRING,
        description: "The text converted into modern Czech orthography (pravopis) and readable format as a continuous block.",
      };
      required.push("modern");
    }

    const transcriptionSchema: Schema = {
      type: Type.OBJECT,
      properties: properties,
      required: required,
    };

    let promptText = `Jsi expert na paleografii a starou češtinu. Tvým úkolem je provést transkripci přiloženého dokumentu (staročeský text).`;
    
    if (mode === RequestMode.BOTH) {
      promptText += `
      Proveď DVA typy přepisu a vrať je ve strukturovaném JSON formátu:
      1. "diplomatic": Diplomatický přepis. Zachovej přesně řádkování, interpunkci, staré znaky (např. spřežky, dlouhé s) a původní pravopis.
      2. "modern": Převod do moderního pravopisu. Text sjednoť do bloků (odstraň řádkování tam, kde nedává smysl), uprav pravopis podle současné normy spisovné češtiny, ale zachovej slovní zásobu a gramatiku.`;
    } else if (mode === RequestMode.DIPLOMATIC) {
      promptText += `
      Proveď pouze DIPLOMATICKÝ přepis ("diplomatic"). Zachovej přesně řádkování, interpunkci, staré znaky (např. spřežky, dlouhé s) a původní pravopis.`;
    } else if (mode === RequestMode.MODERN) {
      promptText += `
      Proveď pouze PŘEVOD DO MODERNÍHO PRAVOPISU ("modern"). Text sjednoť do bloků (odstraň řádkování tam, kde nedává smysl), uprav pravopis podle současné normy spisovné češtiny, ale zachovej slovní zásobu a gramatiku.`;
    }

    promptText += `
    Pokud je text nečitelný, odhadni ho podle kontextu a označ nejistá místa otazníkem v závorce (?).`;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          },
          {
            text: promptText
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: transcriptionSchema,
        systemInstruction: "You are a specialized OCR assistant for historical texts, specifically Old Czech (Staročeština). You are precise and scholarly.",
      }
    });

    const textResponse = response.text;
    if (!textResponse) {
      throw new Error("No response received from the model.");
    }

    const jsonResult = JSON.parse(textResponse) as TranscriptionResult;
    return jsonResult;

  } catch (error) {
    console.error("Error during transcription:", error);
    throw error;
  }
};
