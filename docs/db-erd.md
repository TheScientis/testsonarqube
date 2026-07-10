# Entity Relationship Diagram (ERD)

This document provides a visual representation and detailed description of the database schema for the WIWOKDETOK project.

## Diagram

```mermaid
erDiagram
    PROMISES ||--o{ PROMISE_COMMENTS : "has"
    PROMISES ||--o{ WALK_O_METER_REPORTS : "referenced_in"
    PROMISES ||--o{ PROMISES : "sub_promises"
    REGULATIONS ||--o| REGULATION_EMBEDDINGS : "has"
    CHAT_SESSIONS ||--o{ CHAT_MESSAGES : "contains"
    USER_PROFILES ||--o{ PROMISE_COMMENTS : "owns"
    USER_PROFILES ||--o{ WALK_O_METER_REPORTS : "reports"

    PROMISES {
        uuid id PK
        text region_id
        text quote
        text source_url
        text source_domain
        text source_status
        date date
        text category
        int walk_o_meter_score
        int walk_o_meter_count
        text summary_what
        text summary_when
        text summary_budget
        text watchdog_commentary
        text politician_name
        text politician_role
        int like_count
        int comment_count
        text image_url
        timestamptz created_at
        vector embedding
        uuid parent_promise_id FK
    }

    PROMISE_COMMENTS {
        uuid id PK
        uuid promise_id FK
        uuid user_id FK
        text user_name
        text text
        int like_count
        int flag_count
        boolean hidden
        timestamptz created_at
    }

    REGULATIONS {
        uuid id PK
        text region_id
        text type
        text title
        text source_url
        text content_text
        date effective_date
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at
    }

    REGULATION_EMBEDDINGS {
        uuid id PK
        uuid regulation_id FK
        int chunk_index
        text content_chunk
        vector embedding
    }

    WALK_O_METER_REPORTS {
        uuid id PK
        text report_type
        uuid promise_id FK
        uuid complaint_id
        text vote
        text photo_url
        float latitude
        float longitude
        text region_id
        uuid user_id FK
        text user_name
        text[] tags
        text trust_tier
        int verification_count
        text description
        text location_label
        text status
        timestamptz created_at
    }

    USER_PROFILES {
        uuid id PK
        text email
        text name
        text avatar_url
        text watchdog_level
        int xp
        timestamptz member_since
        text location
    }

    CHAT_SESSIONS {
        uuid id PK
        text title
        timestamptz created_at
        timestamptz last_message_at
    }

    CHAT_MESSAGES {
        uuid id PK
        uuid session_id FK
        text role
        text content
        text[] attachment_urls
        timestamptz created_at
    }
```

## Tables and Descriptions

### `PROMISES` (F-001)
Tracks political promises, environmental pledges, and their progress.
- `id`: Unique identifier.
- `region_id`: Associated Indonesian region code.
- `quote`: The direct political statement.
- `source_url`: Link to the source (news, social media).
- `category`: `new_promise`, `progress_update`, or `fulfillment`.
- `walk_o_meter_score`: Community trust score.
- `parent_promise_id`: FK to another promise (for tracking updates to a specific pledge).

### `PROMISE_COMMENTS`
User interaction on specific promises.
- `promise_id`: FK to `PROMISES`.
- `user_id`: FK to `USER_PROFILES`.

### `REGULATIONS` (RAG for Bang Jaga)
Local and national regulations stored for AI context.
- `type`: `perda` (local), `uu` (law), or `pp` (government regulation).
- `content_text`: Full text of the regulation.

### `REGULATION_EMBEDDINGS`
Vector chunks of regulations for semantic search.
- `embedding`: Vector data (768 dimensions).

### `WALK_O_METER_REPORTS` (F-003)
Ground-truth field reports from users.
- `promise_id`: Linked promise being verified.
- `photo_url`: Evidence from the field.
- `latitude` / `longitude`: Geolocation of the report.
- `status`: `pending`, `accepted`, `rejected`, or `resolved`.

### `USER_PROFILES`
User data and gamification status.
- `watchdog_level`: Level based on XP.

### `CHAT_SESSIONS` & `CHAT_MESSAGES`
Bang Jaga AI assistant conversation history.
- `session_id`: Links messages to a specific session.
