-- =============================================================================
-- Projects Planner Initial Seed Data
-- =============================================================================

-- Ensure pgcrypto extension is active for password hashing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Clear existing data if re-running seed
TRUNCATE projects, users CASCADE;

-- -----------------------------------------------------------------------------
-- 1. Insert Default Users
-- -----------------------------------------------------------------------------
-- Default Admin User:
--   Username: admin
--   Password: didier (hashed with bcrypt / pgcrypto)
--   Role: admin
--   Display in Agenda: true
INSERT INTO users (id, username, password_hash, role, display_in_agenda) VALUES
(
    '00000000-0000-0000-0000-000000000001',
    'admin',
    crypt('didier', gen_salt('bf')),
    'admin',
    TRUE
),
(
    '00000000-0000-0000-0000-000000000002',
    'editor_john',
    crypt('editor123', gen_salt('bf')),
    'editor',
    TRUE
),
(
    '00000000-0000-0000-0000-000000000003',
    'reader_sarah',
    crypt('reader123', gen_salt('bf')),
    'reader',
    TRUE
),
(
    '00000000-0000-0000-0000-000000000004',
    'editor_hidden',
    crypt('hidden123', gen_salt('bf')),
    'editor',
    FALSE -- Hidden from agenda/calendar assignment dropdowns by default
);

-- -----------------------------------------------------------------------------
-- 2. Insert Sample Projects
-- -----------------------------------------------------------------------------
INSERT INTO projects (
    id,
    title,
    description,
    start_time,
    end_time,
    priority,
    progress_percentage,
    assigned_user_id,
    created_by_user_id
) VALUES
(
    '10000000-0000-0000-0000-000000000001',
    'Website Redesign - Phase 1',
    'Initial mockups and user flow architecture for the calendar interface.',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP + INTERVAL '14 days',
    1, -- High priority
    45, -- 45% progress
    '00000000-0000-0000-0000-000000000002', -- Assigned to editor_john
    '00000000-0000-0000-0000-000000000001'  -- Created by admin
),
(
    '10000000-0000-0000-0000-000000000002',
    'Database Migration & Backup Setup',
    'PostgreSQL setup with replication and automated daily backups.',
    CURRENT_TIMESTAMP + INTERVAL '3 days',
    CURRENT_TIMESTAMP + INTERVAL '10 days',
    2,
    80, -- 80% progress
    '00000000-0000-0000-0000-000000000001', -- Assigned to admin
    '00000000-0000-0000-0000-000000000001'  -- Created by admin
),
(
    '10000000-0000-0000-0000-000000000003',
    'Q4 Roadmap Planning',
    'Quarterly planning and project priority review with stakeholder team.',
    CURRENT_TIMESTAMP + INTERVAL '15 days',
    CURRENT_TIMESTAMP + INTERVAL '30 days',
    3,
    0, -- 0% progress
    NULL, -- Unassigned
    '00000000-0000-0000-0000-000000000001'
);
