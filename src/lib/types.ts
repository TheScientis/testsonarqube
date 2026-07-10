// ── Promise Tracker (F-001) ──

export interface Promise {
    id: string;
    region_id: string | null;
    quote: string;
    source_url: string;
    source_domain: string;
    source_status: "active" | "404" | "paywalled";
    date: string;
    category: "new_promise" | "progress_update" | "fulfillment";
    walk_o_meter_score: number;
    walk_o_meter_count: number;
    summary_what: string | null;
    summary_when: string | null;
    summary_budget: string | null;
    watchdog_commentary: string | null;
    politician_name: string;
    politician_role: string;
    like_count: number;
    comment_count: number;
    image_url: string | null;
    created_at: string;
}

export interface PromiseComment {
    id: string;
    promise_id: string;
    user_id: string;
    user_name: string;
    text: string;
    like_count: number;
    flag_count: number;
    hidden: boolean;
    created_at: string;
}

export interface PromiseFeedFilters {
    search?: string;
    category?: string;
    region?: string;
    year?: string;
    status?: string;
    page?: number;
}

export interface PromiseFeedResult {
    promises: Promise[];
    total_count: number;
    has_more: boolean;
}

// ── Bang Jaga AI Chat (F-002) ──

export interface ChatSession {
    id: string;
    title: string;
    created_at: string;
    last_message_at: string;
}

export interface ChatMessage {
    id: string;
    session_id: string;
    role: "user" | "assistant";
    content: string;
    attachment_urls: string[];
    created_at: string;
}

// Regulations (RAG for Bang Jaga)
export interface Regulation {
    id: string;
    region_id: string | null;
    type: "perda" | "uu" | "pp";
    title: string;
    source_url: string | null;
    content_text: string;
    effective_date: string | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
}

export interface CreateRegulationInput {
    title: string;
    type: "perda" | "uu" | "pp";
    region_id?: string | null;
    source_url?: string | null;
    content_text: string;
    effective_date?: string | null;
}

// ── Walk-o-Meter (F-003) ──

export interface WalkOMeterReport {
    id: string;
    report_type: "promise_verification" | "bang_jaga_complaint";
    promise_id: string | null;
    complaint_id: string | null;
    vote: "yes" | "no" | null;
    photo_url: string;
    latitude: number;
    longitude: number;
    region_id: string | null;
    user_id: string;
    user_name: string;
    tags: string[];
    trust_tier: "standard" | "ground_truth";
    verification_count: number;
    description: string;
    location_label: string;
    status: "pending" | "accepted" | "rejected" | "resolved";
    created_at: string;
}

export interface LeaderboardEntry {
    rank: number;
    region_name: string;
    resolved_count: number;
    resolution_rate: string;
    trend: "up" | "flat" | "down";
}

export interface MapReportFilters {
    region_id?: string;
    report_type?: string;
    page?: number;
}

// ── User / Auth ──

export interface UserProfile {
    id: string;
    email: string;
    name: string;
    avatar_url: string | null;
    watchdog_level: string;
    xp: number;
    member_since: string;
    location: string;
}
