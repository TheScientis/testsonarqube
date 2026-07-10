-- Add default_region_id to user_preferences (used by Profile "Default region" and Bang Jaga)
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS default_region_id TEXT;

NOTIFY pgrst, 'reload schema';
