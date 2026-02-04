-- Add size enum and column to tasks table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'size') THEN
        CREATE TYPE size AS ENUM ('xs', 's', 'm', 'l', 'xl');
    END IF;
END
$$;

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS size size;
