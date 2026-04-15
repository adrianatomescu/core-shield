-- Run this only if users.role is backed by a PostgreSQL enum type.
-- If users.role is VARCHAR/TEXT, you do not need this migration.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'user_role'
    ) THEN
        BEGIN
            ALTER TYPE user_role ADD VALUE 'MANAGER';
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END;
    END IF;
END $$;
