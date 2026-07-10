export const BANNED_KEYWORDS = [
    "goblok", "tolol", "anjing", "babi", "bangsat", "kontol", "memek", "ngentot", "peju",
    "bitch", "fuck", "shit", "asshole", "cunt", "nword", "faggot", "retard", "bunuh"
];

export function containsInappropriateContent(text: string): boolean {
    if (!text) return false;
    const normalizedText = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
    const words = normalizedText.split(/\s+/);
    return words.some(word => BANNED_KEYWORDS.includes(word));
}
