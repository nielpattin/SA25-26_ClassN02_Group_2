-- 0006_notification_template_status.sql
DO $$
BEGIN
    ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'template_status';
END
$$;
