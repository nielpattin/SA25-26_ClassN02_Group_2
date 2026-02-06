-- 0003_activities_target_id_to_text.sql
-- Fix: activities.target_id must be text to support Better Auth user IDs (text)
-- in addition to UUIDs for other entity types (tasks, boards, etc.)

ALTER TABLE activities 
  ALTER COLUMN target_id TYPE text USING target_id::text;
