import { GoogleGenAI, Type, Schema } from "@google/genai";
import { DecisionInput, DecisionAnalysis, DecisionFramework, FollowUpAdvice } from "../types";

// Initialize Gemini AI client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const model = "gemini-3-flash-preview";

// Helper to clean JSON string if model adds markdown code blocks
const cleanJsonString = (text: string): string => {
  let clean = text.trim();
  // Remove markdown code blocks if present
  if (clean.startsWith('```json')) {
    clean = clean.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (clean.startsWith('```')) {
    clean = clean.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return clean;
};

export const generateAlternatives = async (problemContext: string): Promise<string[]> => {
  if (!problemContext.trim()) return [];

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      alternatives: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "List of 3 distinct options or potential outcomes in Bahasa Indonesia."
      }
    },
    required: ["alternatives"]
  };

  const prompt = `
    The user has a decision-making situation:
    "${problemContext}".
    
    Provide 3 distinct options of what could happen or available courses of action in response to this problem.
    Focus on realistic possibilities or choices the user might face.
    Each option should be a concise sentence.
    
    IMPORTANT: Provide the alternatives in **Bahasa Indonesia**.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.7,
      },
    });

    if (response.text) {
      try {
        const cleanText = cleanJsonString(response.text);
        const data = JSON.parse(cleanText);
        // Ensure we return exactly 3, or whatever was found, trimmed to 3
        return data.alternatives.slice(0, 3);
      } catch (e) {
        console.error("Failed to parse alternatives JSON:", response.text);
        return [];
      }
    }
    return [];
  } catch (error) {
    console.error("Error generating alternatives:", error);
    throw error;
  }
};

export const analyzeDecision = async (input: DecisionInput): Promise<DecisionAnalysis> => {
  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      bestChoiceId: {
        type: Type.INTEGER,
        description: "The ID of the alternative with the highest score.",
      },
      executiveSummary: {
        type: Type.STRING,
        description: "A brief overview of the decision analysis and recommendation based on the selected framework AND user values, explicitly weighing the pros and cons of the options, in Bahasa Indonesia.",
      },
      results: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.INTEGER, description: "The ID corresponding to the provided alternative." },
            title: { type: Type.STRING, description: "A short, catchy 3-5 word title for this solution in Bahasa Indonesia." },
            score: { type: Type.INTEGER, description: "Alignment score from 0 to 100 based on the framework and user values." },
            outcomes: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING }, 
              description: "List of 3-5 concrete potential events. MUST include both POSITIVE possibilities and NEGATIVE risks/consequences that could happen, in Bahasa Indonesia." 
            },
            reasoning: { 
              type: Type.STRING, 
              description: "Detailed narrative analysis of the consequences, evaluating why it fits or does not fit the framework and values, in Bahasa Indonesia." 
            },
            pros: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of advantages in Bahasa Indonesia." },
            cons: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of disadvantages or risks in Bahasa Indonesia." },
          },
          required: ["id", "title", "score", "outcomes", "reasoning", "pros", "cons"],
        },
      },
    },
    required: ["bestChoiceId", "executiveSummary", "results"],
  };

  const frameworkPrompts: Record<DecisionFramework, string> = {
    'General': "Analyze based on rational, logical decision-making principles, focusing on feasibility, effectiveness, and risk management.",
    'Christianity': "Analyze based on Christian biblical principles, prioritizing love, forgiveness, justice, integrity, and alignment with God's will as understood in the Bible.",
    'Muslim': "Analyze based on Islamic principles, prioritizing Quranic teachings, the Sunnah, and ensuring actions are Halal and avoid Haram.",
    'Hedonistic': "Analyze based on Hedonism, prioritizing immediate personal pleasure, satisfaction, minimizing pain, and maximizing self-enjoyment regardless of long-term duties.",
    'Efficient': "Analyze based on strict Efficiency, prioritizing the path of least resistance, lowest resource cost (time/money), and quickest resolution."
  };

  const specificInstruction = frameworkPrompts[input.framework] || frameworkPrompts['General'];

  // Construct the alternatives text dynamically based on how many were provided
  const alternativesText = input.alternatives
    .map(alt => {
      let text = `${alt.id}. (ID: ${alt.id}) ${alt.text}`;
      if (alt.userPros && alt.userPros.length > 0) {
        text += `\n       - User-identified Pros: ${alt.userPros.filter(p => p.trim()).join(", ")}`;
      }
      if (alt.userCons && alt.userCons.length > 0) {
        text += `\n       - User-identified Cons: ${alt.userCons.filter(c => c.trim()).join(", ")}`;
      }
      return text;
    })
    .join('\n    ');
  
  const valuesText = input.values && input.values.length > 0 
    ? input.values.join(", ") 
    : "None specified (Use general framework principles)";
    
  const situationText = input.situation ? input.situation : "Not provided (Focus on the problem statement)";

  const prompt = `
    You are an expert decision-making consultant.
    
    **User Context:**
    - Situation: "${situationText}"
    - Specific Problem: "${input.problem}"
    - **Prioritized Personal Values**: ${valuesText}
    
    **The User is considering these alternatives (some with their own initial thoughts):**
    ${alternativesText}
    
    **Framework:** ${specificInstruction}
    
    **Task:**
    Assign a percentage score (0-100) to each option indicating how well it aligns with:
    1. The **${input.framework}** perspective.
    2. The user's **Prioritized Personal Values** (${valuesText}).
    
    **Scoring Rubric:**
    - **90-100**: Perfect Alignment. The option strongly fulfills the framework and the user's personal values with virtually no downsides.
    - **70-89**: High Alignment. A strong fit, but may have minor risks or slight deviations.
    - **50-69**: Moderate Alignment. Acceptable, but compromises on key values or has notable drawbacks.
    - **30-49**: Low Alignment. Significant conflict with framework or personal values.
    - **0-29**: Anti-Alignment. Actively opposes the framework's principles or personal values.

    **Content Requirements:**
    1. **Executive Summary**: Your final recommendation MUST explicitly explain how you weighed the pros and cons of the best option against the others to arrive at this conclusion.
    2. **Outcomes**: List concrete, observable events that could happen. You **MUST** include a mix of positive outcomes and negative possibilities/risks for each option. Do not just list the good things; include potential failures or negative side effects.
    3. **Reasoning**: Provide a narrative paragraph analyzing *why* these outcomes are good or bad according to the ${input.framework} framework AND the user's personal values. **Explicitly weigh the pros and cons in your evaluation.**
    4. **Pros/Cons**: Generate a comprehensive list of pros and cons. You should incorporate the user's provided pros/cons if they are valid, but also expand on them with your own expert analysis.
    
    **IMPORTANT LANGUAGE REQUIREMENT:** 
    Output ALL text content (titles, summary, outcomes, reasoning, pros, cons) in **Bahasa Indonesia**. 
    Even if the user input is in English, your analysis and output must be in Bahasa Indonesia.
    
    Provide a structured JSON response.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.4, 
      },
    });

    if (response.text) {
      const cleanText = cleanJsonString(response.text);
      try {
        const data = JSON.parse(cleanText) as DecisionAnalysis;
        
        // Hydrate with original text to ensure we display what user typed alongside AI analysis
        data.results = data.results.map(r => {
          const original = input.alternatives.find(a => a.id === r.id);
          return {
            ...r,
            originalText: original ? original.text : "Opsi Tidak Diketahui"
          };
        });

        return data;
      } catch (parseError) {
        console.error("JSON Parse Error:", parseError);
        console.log("Raw Text:", response.text);
        throw new Error("Failed to parse AI response");
      }
    } else {
      throw new Error("No response text received from Gemini. This might be due to safety filters.");
    }
  } catch (error) {
    console.error("Error analyzing decision:", error);
    throw error;
  }
};

export const chatAboutAlternative = async (
  problem: string,
  alternative: string,
  framework: string,
  message: string,
  history: { role: 'user' | 'model'; text: string }[]
): Promise<string> => {
  const systemInstruction = `
    Anda adalah konsultan pengambilan keputusan ahli. 
    Konteks: Masalah user adalah "${problem}", dan mereka sedang mendiskusikan opsi: "${alternative}".
    Analisis ini menggunakan perspektif: "${framework}".

    TUGAS ANDA:
    1. Jawab pertanyaan user HANYA terkait opsi ini dan bagaimana hubungannya dengan masalah mereka.
    2. JANGAN membicarakan hal di luar topik keputusan ini.
    3. Jika user bertanya hal lain, ingatkan mereka dengan sopan untuk tetap fokus pada analisis keputusan ini.
    4. Berikan saran yang praktis, objektif, dan sesuai dengan framework "${framework}".
    5. Selalu gunakan **Bahasa Indonesia**.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [
        ...history.map(h => ({ role: h.role, parts: [{ text: h.text }] })),
        { role: 'user', parts: [{ text: message }] }
      ],
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    if (response.text) {
      return response.text;
    }
    throw new Error("No response from AI");
  } catch (error) {
    console.error("Error in chatAboutAlternative:", error);
    throw error;
  }
};

export const generateFollowUp = async (problem: string, alternative: string, framework: string): Promise<FollowUpAdvice> => {
  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      steps: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "3 concrete implementation steps in Bahasa Indonesia."
      },
      advice: {
        type: Type.STRING,
        description: "One critical piece of wisdom or advice in Bahasa Indonesia."
      }
    },
    required: ["steps", "advice"]
  };

  const prompt = `
    User Problem: "${problem}"
    Selected Option: "${alternative}"
    Framework: "${framework}"

    The user has decided to proceed with this option.
    1. Provide 3 actionable, concrete steps they should take immediately to make this successful.
    2. Provide 1 piece of critical advice or wisdom (warning or encouragement) relevant to this choice.

    Output in **Bahasa Indonesia**.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.5,
      },
    });

    if (response.text) {
      const cleanText = cleanJsonString(response.text);
      return JSON.parse(cleanText) as FollowUpAdvice;
    }
    throw new Error("No response");
  } catch (error) {
    console.error("Error generating follow up:", error);
    throw error;
  }
};
