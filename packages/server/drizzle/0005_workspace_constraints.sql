-- Enforce workspace name and description length limits at the database level
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'workspaces_name_check') THEN
        ALTER TABLE workspaces ADD CONSTRAINT workspaces_name_check CHECK (length(name) <= 50);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'workspaces_description_check') THEN
        ALTER TABLE workspaces ADD CONSTRAINT workspaces_description_check CHECK (length(description) <= 200);
    END IF;
END
$$;
