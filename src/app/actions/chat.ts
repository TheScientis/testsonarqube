"use server";

import type { ChatSession, ChatMessage } from "@/lib/types";
import { isSupabaseConfigured } from "@/lib/supabase";
import { createClient } from "@/lib/supabase/server";
import { getGeminiModel, isGeminiConfigured, getEmbedding } from "@/lib/gemini";
import { getUserPreferences } from "@/app/actions/preferences";

const AI_RESPONSES: Record<string, string> = {
  default:
    "Thank you for your report. Let me analyze the environmental regulations that apply to your situation.\n\nBased on **Undang-Undang No. 32 Tahun 2009** about Environmental Protection and Management, specifically **Pasal 87**, any party causing environmental damage is obligated to compensate and rehabilitate the affected area.\n\nWould you like me to draft a formal complaint (Surat Pengaduan) based on this information?",
  regulation:
    "Here are the relevant regulations I found:\n\n📋 **UU No. 32 Tahun 2009** — Environmental Protection and Management\n• Pasal 87: Liability for environmental damage\n• Pasal 98: Criminal sanctions for pollution\n\n📋 **Perda DKI Jakarta No. 3 Tahun 2013** — Waste Management\n• Pasal 126: Prohibition of waste dumping in water bodies\n• Pasal 127: Fines up to Rp 50,000,000\n\n📋 **PP No. 22 Tahun 2021** — Environmental Implementation\n• Chapter IV: Water pollution standards\n\nWould you like to use any of these in a formal complaint?",
  complaint:
    "I'll help you draft a Surat Pengaduan. I need a few more details:\n\n1. **Your full name** (for the complaint header)\n2. **Your address** (RT/RW and Kelurahan)\n3. **Exact date and time** of the incident\n4. **Description of the violation** (what you saw)\n\nOnce I have these details, I'll generate a formal complaint letter that you can download as PDF or share via WhatsApp.",
  pollution:
    'Air quality monitoring data for your area shows **PM2.5 levels at 85 µg/m³**, which exceeds the WHO guideline of 15 µg/m³ by 5.7×.\n\nThis is classified as **"Unhealthy"** on the Air Quality Index (AQI).\n\nRelevant regulations:\n📋 **PP No. 41 Tahun 1999** — Air Pollution Control\n📋 **Perda DKI Jakarta No. 2 Tahun 2005** — Air Quality Standards\n\nI recommend filing a complaint to the Dinas Lingkungan Hidup. Shall I draft one for you?',
};

export async function getSessions(
  includeArchived = false,
): globalThis.Promise<ChatSession[]> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      let query = supabase
        .from("chat_sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("last_message_at", { ascending: false });
      if (!includeArchived) {
        query = query.is("archived_at", null);
      }
      const { data, error } = await query;
      if (!error && data) return data as ChatSession[];
    }
  }
  return [];
}

export async function archiveSession(
  sessionId: string,
): globalThis.Promise<{ success: boolean }> {
  if (!isSupabaseConfigured()) return { success: false };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false };

  const { error } = await supabase
    .from("chat_sessions")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", sessionId)
    .eq("user_id", user.id);

  return { success: !error };
}

export async function restoreSession(
  sessionId: string,
): globalThis.Promise<{ success: boolean }> {
  if (!isSupabaseConfigured()) return { success: false };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false };

  const { error } = await supabase
    .from("chat_sessions")
    .update({ archived_at: null })
    .eq("id", sessionId)
    .eq("user_id", user.id);

  return { success: !error };
}

export async function getSessionMessages(
  sessionId: string,
): globalThis.Promise<ChatMessage[]> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: session } = await supabase
      .from("chat_sessions")
      .select("user_id")
      .eq("id", sessionId)
      .single();
    if (!session || session.user_id !== user.id) {
      return [];
    }

    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });
    if (!error && data) return data as ChatMessage[];
  }
  return [];
}

export async function createSession(): globalThis.Promise<ChatSession | null> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const newSession = {
        user_id: user.id,
        title: `Chat – ${new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short" })}`,
      };
      const { data, error } = await supabase
        .from("chat_sessions")
        .insert(newSession)
        .select()
        .single();
      if (!error && data) return data as ChatSession;
    }
    return null; // Guest sessions handled on client if needed
  }
  return null;
}

export async function sendMessage(
  sessionId: string,
  message: string,
  attachmentUrls: string[] = [],
): globalThis.Promise<ChatMessage | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: session } = await supabase
    .from("chat_sessions")
    .select("user_id")
    .eq("id", sessionId)
    .single();
  if (!session || session.user_id !== user.id) {
    return null; // Unauthorized
  }

  let responseContent = AI_RESPONSES.default;
  let fallbackHit = true;

  if (isGeminiConfigured()) {
    try {
      let historyStr = "";
      let ragContext = "";

      if (isSupabaseConfigured()) {
        const { data } = await supabase
          .from("chat_messages")
          .select("role, content")
          .eq("session_id", sessionId)
          .order("created_at", { ascending: true })
          .limit(10);

        if (data && data.length > 0) {
          historyStr = data
            .map(
              (m) =>
                `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`,
            )
            .join("\n\n");
        }

        const { data: userProfile } = await supabase
          .from("profiles")
          .select("location")
          .eq("id", user.id)
          .single();
        const prefs = await getUserPreferences(user.id);
        const userRegion =
          userProfile?.location ??
          prefs?.default_region_id ??
          prefs?.regions_of_interest?.[0] ??
          null;

        const embedding = await getEmbedding(message);
        if (embedding) {
          const { data: regs } = await supabase.rpc("match_regulations", {
            query_embedding: `[${embedding.join(",")}]`,
            match_threshold: 0.5,
            match_count: 10,
          });

          if (regs && regs.length > 0) {
            let filteredRegs = regs;
            if (userRegion) {
              filteredRegs = regs.filter(
                (r: any) =>
                  !r.region_id ||
                  r.region_id === "nasional" ||
                  r.region_id === userRegion,
              );
              if (filteredRegs.length === 0) filteredRegs = regs;
            }
            const topRegs = filteredRegs.slice(0, 3);
            ragContext =
              "\n\n--- RELEVANT REGULATIONS ---\n" +
              topRegs
                .map((r: any) => `[${r.title}]: ${r.content}`)
                .join("\n\n") +
              "\n----------------------------\n";
          }
        }
      }

      const complaintInstructions = `

COMPLAINT LETTER (SURAT PENGADUAN) DRAFTING PROTOCOL:
When the user wants a Surat Pengaduan, follow these rules:

1. First gather necessary information: subject, location, time, violation description, etc.
2. When the user has BOTH expressed intention to create a Surat Pengaduan AND agreed/confirmed they want it drafted, AND you have enough information to fill all required fields, include the following marker at the VERY END of your response (after all visible text), on its own line:

<!-- COMPLAINT_DRAFT:{"subject":"...","recipient_title":"...","recipient_office":"...","location":"...","time":"...","violation_type":"...","violation_description":"...","legal_basis":"...","reporter_name":"..."} -->

Field rules:
- subject: Complaint subject in Bahasa Indonesia (e.g. "Laporan Pembuangan Sampah Ilegal di Bantaran Sungai Ciliwung")
- recipient_title: Recipient title (e.g. "Kepala Dinas Lingkungan Hidup")
- recipient_office: Recipient office (e.g. "Provinsi DKI Jakarta")
- location: Incident location
- time: Date/time of incident (use approximate if not exact)
- violation_type: Type of violation (e.g. "Pembuangan Sampah Ilegal")
- violation_description: A formal paragraph describing the violation, suitable for the letter body. Write it in Bahasa Indonesia, formal tone, starting with "Dengan hormat, bersama surat ini saya menyampaikan..."
- legal_basis: Relevant law/regulation citation
- reporter_name: Reporter name if provided, empty string "" if unknown

3. If the user cancels the complaint or says they don't need it, include this at the end instead:
<!-- COMPLAINT_CLEAR -->

4. If the user asks to update/revise the complaint, include an updated COMPLAINT_DRAFT with the revised fields.

RULES:
- Only include COMPLAINT_DRAFT when ALL required fields can be filled (infer reasonable defaults from context).
- If the user hasn't given enough info, ask them first. Do NOT include the marker.
- The JSON must be valid and on a single line within the marker.
- Do NOT mention the marker in your visible response.
- Your visible response should describe what you've drafted and invite corrections.`;

      let model;
      if (ragContext) {
        const systemPrompt = `You are Bang Jaga, a tough, cynical but fair Betawi legal assistant specializing in Indonesian environmental law.

Use the provided regulations below to answer the user's question or draft a complaint.
STRICT INSTRUCTION (HALLUCINATION FALLBACK): DO NOT invent, hallucinate, or guess any laws, pasal, or regulations. You must ONLY cite laws that are present in the provided context below. If the user asks about a law not in the context, explicitly state "Maaf, data hukum tentang itu tida (tidak ada) di database saya" and refuse to invent a citation.

Speak in formal Indonesian. Keep your tone professional, direct, and casual. Do not be overly friendly. Keep your answers short and to the point.

${complaintInstructions}

${ragContext}`;
        model = getGeminiModel(systemPrompt);
      } else {
        model =
          getGeminiModel(`You are Bang Jaga, a tough, cynical but fair Betawi legal assistant specializing in Indonesian environmental law.

STRICT INSTRUCTION (HALLUCINATION FALLBACK): DO NOT invent, hallucinate, or guess any laws, pasal, or regulations. You currently have NO database access to look up laws for this query. If the user asks for specific laws, explicitly state "Maaf, saya tidak menemukan referensi hukum yang valid untuk saat ini" and refuse to invent a citation.

Speak in formal Indonesian. Keep your tone professional, direct, and casual. Do not be overly friendly. Keep your answers short and to the point. Help the user draft complaints if they ask.

${complaintInstructions}`);
      }

      if (model) {
        const parts: any[] = [];
        const textPart = historyStr
          ? `Previous Conversation:\n${historyStr}\n\nUser's new message: ${message}`
          : `User's message: ${message}`;
        parts.push({ text: textPart });

        // Auto-generate title if this is the first message
        supabase
          .from("chat_messages")
          .select("id", { count: "exact" })
          .eq("session_id", sessionId)
          .then(async ({ count }) => {
            if (count === 2) {
              // 2 because 1 user + 1 assistant
              try {
                const titlePrompt = `Generate a very short, maximum 4-word title for this chat based on the user's first message: "${message}". Respond ONLY with the title.`;
                const titleResult = await model.generateContent(titlePrompt);
                const newTitle = titleResult.response
                  .text()
                  .trim()
                  .replace(/["']/g, "");
                await supabase
                  .from("chat_sessions")
                  .update({ title: newTitle })
                  .eq("id", sessionId);
              } catch (e) {
                console.error("Failed to generate title", e);
              }
            }
          });

        for (const url of attachmentUrls) {
          try {
            const res = await fetch(url);
            if (res.ok) {
              const arrayBuffer = await res.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);
              const base64 = buffer.toString("base64");
              const mimeType = res.headers.get("content-type") || "image/jpeg";
              parts.push({
                inlineData: {
                  data: base64,
                  mimeType,
                },
              });
            }
          } catch (e) {
            console.error("Failed to fetch image attachment:", url);
          }
        }

        const result = await model.generateContent(parts);
        const text = result.response.text();
        if (text) {
          responseContent = text;
          fallbackHit = false;
        }
      }
    } catch (e) {
      console.error("Gemini API error:", e);
    }
  }

  if (fallbackHit) {
    const lower = message.toLowerCase();
    if (
      lower.includes("regulation") ||
      lower.includes("law") ||
      lower.includes("perda") ||
      lower.includes("uu") ||
      lower.includes("hukum")
    ) {
      responseContent = AI_RESPONSES.regulation;
    } else if (
      lower.includes("complaint") ||
      lower.includes("pengaduan") ||
      lower.includes("surat") ||
      lower.includes("draft")
    ) {
      responseContent = AI_RESPONSES.complaint;
    } else if (
      lower.includes("pollution") ||
      lower.includes("air") ||
      lower.includes("quality") ||
      lower.includes("polusi") ||
      lower.includes("udara")
    ) {
      responseContent = AI_RESPONSES.pollution;
    }
  }

  if (isSupabaseConfigured()) {
    await supabase.from("chat_messages").insert({
      session_id: sessionId,
      role: "user",
      content: message,
      attachment_urls: attachmentUrls,
    });

    const { data, error } = await supabase
      .from("chat_messages")
      .insert({
        session_id: sessionId,
        role: "assistant",
        content: responseContent,
      })
      .select()
      .single();

    await supabase
      .from("chat_sessions")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", sessionId);

    const draftMatch = responseContent.match(
      /<!-- COMPLAINT_DRAFT:({.*?}) -->/,
    );
    if (draftMatch && draftMatch[1]) {
      try {
        const parsedDraft = JSON.parse(draftMatch[1]);
        await supabase.from("generated_documents").insert({
          session_id: sessionId,
          user_id: user.id,
          document_type: "complaint",
          content: parsedDraft,
        });
      } catch (e) {
        console.error("Failed to persist generated document", e);
      }
    }

    if (!error && data) {
      return data as ChatMessage;
    }
  }

  return null; // Guest chat not saved
}

export async function submitRagFeedback(
  messageId: string,
  query: string,
  suggestedCorrection: string,
): globalThis.Promise<{ success: boolean; message: string }> {
  if (!isSupabaseConfigured())
    return { success: false, message: "Database not configured" };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.from("rag_feedback").insert({
      user_id: user?.id || null,
      message_id: messageId,
      query,
      suggested_correction: suggestedCorrection,
    });
    return { success: true, message: "Feedback submitted successfully" };
  } catch (e: any) {
    return {
      success: false,
      message: e.message || "Failed to submit feedback",
    };
  }
}
