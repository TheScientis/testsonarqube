import type { ChatMessage } from "@/lib/types";

export interface ComplaintDraft {
    subject: string;
    recipient_title: string;
    recipient_office: string;
    location: string;
    time: string;
    violation_type: string;
    violation_description: string;
    legal_basis: string;
    reporter_name?: string;
}

const COMPLAINT_DRAFT_REGEX = /<!-- COMPLAINT_DRAFT:([\s\S]*?) -->/;
const COMPLAINT_CLEAR_MARKER = "<!-- COMPLAINT_CLEAR -->";

const REQUIRED_FIELDS: (keyof ComplaintDraft)[] = [
    "subject",
    "recipient_title",
    "recipient_office",
    "location",
    "time",
    "violation_type",
    "violation_description",
    "legal_basis",
];

export function extractComplaintDraft(
    content: string
): ComplaintDraft | null {
    const match = content.match(COMPLAINT_DRAFT_REGEX);
    if (!match?.[1]) return null;
    try {
        const data = JSON.parse(match[1].trim());
        if (REQUIRED_FIELDS.every((f) => data[f] && typeof data[f] === "string")) {
            return data as ComplaintDraft;
        }
        return null;
    } catch {
        return null;
    }
}

export function hasComplaintClear(content: string): boolean {
    return content.includes(COMPLAINT_CLEAR_MARKER);
}

export function stripComplaintMarkers(content: string): string {
    return content
        .replace(COMPLAINT_DRAFT_REGEX, "")
        .replace(COMPLAINT_CLEAR_MARKER, "")
        .trimEnd();
}

/**
 * Scan messages (newest-first) to find the latest complaint state.
 * Returns the draft if the most recent marker is COMPLAINT_DRAFT,
 * or null if COMPLAINT_CLEAR was encountered first (or no markers exist).
 */
export function deriveComplaintDraftFromMessages(
    messages: ChatMessage[]
): ComplaintDraft | null {
    for (let i = messages.length - 1; i >= 0; i--) {
        const msg = messages[i];
        if (msg.role !== "assistant") continue;

        if (hasComplaintClear(msg.content)) return null;

        const draft = extractComplaintDraft(msg.content);
        if (draft) return draft;
    }
    return null;
}

export function formatComplaintForWhatsApp(draft: ComplaintDraft): string {
    const today = new Date().toLocaleDateString("id-ID", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });
    const reporter = draft.reporter_name || "Warga Pelapor";

    return [
        `*SURAT PENGADUAN MASYARAKAT*`,
        ``,
        `Kepada Yth,`,
        `*${draft.recipient_title}*`,
        `${draft.recipient_office}`,
        ``,
        `*Perihal: ${draft.subject}*`,
        ``,
        `Lokasi: ${draft.location}`,
        `Waktu: ${draft.time}`,
        `Jenis Pelanggaran: ${draft.violation_type}`,
        ``,
        `${draft.violation_description}`,
        ``,
        `Dasar Hukum: ${draft.legal_basis}`,
        ``,
        `${today}`,
        `${reporter}`,
        ``,
        `---`,
        `*Dihasilkan oleh Bang Jaga AI via WIWOKDETOK*`,
    ].join("\n");
}
