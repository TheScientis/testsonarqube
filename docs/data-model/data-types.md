# Data Types

[Home](../README.md) > [Data Model](./README.md) > Types

## Overview

TypeScript interfaces in `src/lib/types.ts`. Field names use snake_case to match database.

---

## Promise Tracker (F-001)

### Promise

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | UUID |
| `region_id` | string \| null | Region |
| `quote` | string | Promise text |
| `source_url` | string | Source link |
| `source_domain` | string | Domain |
| `source_status` | "active" \| "404" \| "paywalled" | URL status |
| `date` | string | Promise date |
| `category` | "new_promise" \| "progress_update" \| "fulfillment" | Category |
| `walk_o_meter_score` | number | 0–100 score |
| `walk_o_meter_count` | number | Verification count |
| `summary_what`, `summary_when`, `summary_budget` | string \| null | Summaries |
| `watchdog_commentary` | string \| null | Commentary |
| `politician_name`, `politician_role` | string | Politician info |
| `like_count`, `comment_count` | number | Counts |
| `image_url` | string \| null | Image |
| `created_at` | string | Timestamp |

### PromiseComment

| Field | Type |
|-------|------|
| `id`, `promise_id`, `user_id`, `user_name` | string |
| `text` | string |
| `like_count`, `flag_count` | number |
| `hidden` | boolean |
| `created_at` | string |

### PromiseFeedFilters, PromiseFeedResult

- Filters: `search`, `category`, `region`, `year`, `status`, `page`
- Result: `promises`, `total_count`, `has_more`

---

## Bang Jaga (F-002)

### ChatSession

| Field | Type |
|-------|------|
| `id`, `title` | string |
| `created_at`, `last_message_at` | string |

### ChatMessage

| Field | Type |
|-------|------|
| `id`, `session_id` | string |
| `role` | "user" \| "assistant" |
| `content` | string |
| `attachment_urls` | string[] |
| `created_at` | string |

### Regulation

| Field | Type |
|-------|------|
| `id`, `region_id` | string \| null |
| `type` | "perda" \| "uu" \| "pp" |
| `title`, `source_url`, `content_text` | string |
| `effective_date` | string \| null |
| `created_at`, `updated_at`, `deleted_at` | string |

---

## Walk-o-Meter (F-003)

### WalkOMeterReport

| Field | Type |
|-------|------|
| `id` | string |
| `report_type` | "promise_verification" \| "bang_jaga_complaint" |
| `promise_id`, `complaint_id` | string \| null |
| `vote` | "yes" \| "no" \| null |
| `photo_url` | string |
| `latitude`, `longitude` | number |
| `region_id` | string \| null |
| `user_id`, `user_name` | string |
| `tags` | string[] |
| `trust_tier` | "standard" \| "ground_truth" |
| `verification_count` | number |
| `description`, `location_label` | string |
| `status` | "pending" \| "accepted" \| "rejected" \| "resolved" |
| `created_at` | string |

### LeaderboardEntry

| Field | Type |
|-------|------|
| `rank` | number |
| `region_name` | string |
| `resolved_count` | number |
| `resolution_rate` | string |
| `trend` | "up" \| "flat" \| "down" |

---

## User

### UserProfile

| Field | Type |
|-------|------|
| `id`, `email`, `name` | string |
| `avatar_url` | string \| null |
| `watchdog_level` | string |
| `xp` | number |
| `member_since`, `location` | string |

---

**Related:** [Database ERD](../db-erd.md) · [Promise Tracker](../features/feat-promise-tracker.md) · [Bang Jaga](../features/feat-bang-jaga.md) · [Walk-o-Meter](../features/feat-walk-o-meter.md)

---

**Last Updated:** 2025-03-16
