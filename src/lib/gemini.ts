import { GoogleGenerativeAI } from "@google/generative-ai";

let genAI: GoogleGenerativeAI | null = null;

export function getGenAI(): GoogleGenerativeAI {
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error(
            "Missing required environment variable: GOOGLE_GEMINI_API_KEY. " +
            "AI features require this key to be set."
        );
    }
    if (!genAI) {
        genAI = new GoogleGenerativeAI(apiKey);
    }
    return genAI;
}
export function isGeminiConfigured(): boolean {
    return Boolean(process.env.GOOGLE_GEMINI_API_KEY);
}
export function getGeminiModel(systemInstruction?: string) {
    const ai = getGenAI();
    return ai.getGenerativeModel({
        model: "gemini-3.1-flash-lite-preview",
        systemInstruction,
    });
}

export async function summarizeSource(content: string): Promise<{ what: string; when: string; budget: string; politician_name: string; politician_role: string } | null> {
    const ai = getGenAI();
    const model = ai.getGenerativeModel({
        model: "gemini-3.1-flash-lite-preview",
        systemInstruction: "Extract the core environmental/civic promise from the provided text. If the text does NOT contain a clear civic or environmental promise (made by a politician, candidate, or government entity), set 'what' to 'None' and 'politician_name' to 'Unknown'. Otherwise, extract: what was promised, when it will happen, the mentioned budget (or 'Not specified'), the name of the politician/entity making the promise (or 'Unknown' if just referred to generally like 'City Gov'), and their role/title (or 'Unknown'). Respond with a JSON object containing keys: 'what', 'when', 'budget', 'politician_name', 'politician_role'."
    });
    try {
        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: content }] }],
            generationConfig: { responseMimeType: "application/json" }
        });
        const text = result.response.text();
        return JSON.parse(text);
    } catch (e: any) {
        if (e?.status === 429 || e?.response?.status === 429 || String(e).includes('429')) throw e;
        console.error("Error summarizing source:", e);
        return null;
    }
}

export async function generateWatchdogCommentary(promiseText: string, currentScore: number): Promise<string | null> {
    const ai = getGenAI();
    const model = ai.getGenerativeModel({
        model: "gemini-3.1-flash-lite-preview",
        systemInstruction: "You are Bang Jaga, a cynical but fair environmental watchdog in Indonesia. Given a political promise and its current community walk-o-meter verification score (0-100), write a 1 to 2 sentence commentary in Indonesian. Be sharp and witty. Focus on the gap between the promise and reality if the score is low, or praise if high. No personal attacks."
    });
    try {
        const result = await model.generateContent(`Promise: ${promiseText}\nVerification Score: ${currentScore}/100`);
        return result.response.text().trim();
    } catch (e: any) {
        if (e?.status === 429 || e?.response?.status === 429 || String(e).includes('429')) throw e;
        console.error("Error generating commentary:", e);
        return null;
    }
}

export async function getEmbedding(text: string): Promise<number[] | null> {
    const ai = getGenAI();
    //hit ListModels endpoint
    if (!ai) return null;
    try {
        const model = ai.getGenerativeModel({ model: "gemini-embedding-001" });
        const result = await model.embedContent(text);
        return result.embedding.values.slice(0, 768);
    } catch (e: any) {
        if (e?.status === 429 || e?.response?.status === 429 || String(e).includes('429')) throw e;
        console.error("Error generating embedding:", e);
        return null;
    }
}

export async function classifyPromiseRelationship(oldSummary: string, newSummary: string): Promise<'EXACT_DUPLICATE' | 'PROGRESS_UPDATE' | 'FULFILLMENT' | 'UNRELATED'> {
    const ai = getGenAI();
    if (!ai) return 'UNRELATED';

    const model = ai.getGenerativeModel({
        model: "gemini-3.1-flash-lite-preview",
        systemInstruction: "You are an assistant that classifies the relationship between an old political promise and a new news article summary. Reply with EXACTLY ONE WORD from this list: EXACT_DUPLICATE, PROGRESS_UPDATE, FULFILLMENT, or UNRELATED. \n\n- EXACT_DUPLICATE: The new article is just reporting the exact same initial promise.\n- PROGRESS_UPDATE: The new article reports partial progress, delays, or updates on the old promise.\n- FULFILLMENT: The new article reports that the old promise has been fully completed or delivered.\n- UNRELATED: The new article is about something completely different."
    });

    try {
        const prompt = `Old Promise: ${oldSummary}\nNew Article Summary: ${newSummary}\n\nClassification:`;
        const result = await model.generateContent(prompt);
        const text = result.response.text().trim().toUpperCase();

        if (text.includes('EXACT_DUPLICATE')) return 'EXACT_DUPLICATE';
        if (text.includes('PROGRESS_UPDATE')) return 'PROGRESS_UPDATE';
        if (text.includes('FULFILLMENT')) return 'FULFILLMENT';

        return 'UNRELATED';
    } catch (e: any) {
        if (e?.status === 429 || e?.response?.status === 429 || String(e).includes('429')) throw e;
        console.error("Error classifying relationship:", e);
        return 'UNRELATED'; // safe fallback
    }
}
