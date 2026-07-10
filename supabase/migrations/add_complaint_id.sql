-- Add the complaint_id column to walk_o_meter_reports
ALTER TABLE walk_o_meter_reports
ADD COLUMN IF NOT EXISTS complaint_id UUID REFERENCES chat_sessions(id);

-- Notify schema cache to reload
NOTIFY pgrst, 'reload schema';
