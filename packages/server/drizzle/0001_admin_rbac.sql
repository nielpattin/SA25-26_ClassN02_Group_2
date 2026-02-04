-- Migration: Admin RBAC (F35)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'admin_role') THEN
        CREATE TYPE admin_role AS ENUM ('super_admin', 'moderator', 'support');
    END IF;
END
$$;

ALTER TABLE "user" ADD COLUMN IF NOT EXISTS admin_role admin_role;

CREATE TABLE IF NOT EXISTS admin_audit_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    admin_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    action text NOT NULL,
    target_type text NOT NULL,
    target_id text,
    metadata jsonb,
    created_at timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS admin_audit_log_admin_idx ON admin_audit_log (admin_id);
CREATE INDEX IF NOT EXISTS admin_audit_log_action_idx ON admin_audit_log (action);
CREATE INDEX IF NOT EXISTS admin_audit_log_created_at_idx ON admin_audit_log (created_at);
