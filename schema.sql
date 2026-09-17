-- =============================================================================
-- Projects Planner PostgreSQL Database Schema
-- =============================================================================

-- Enable pgcrypto extension for UUID generation and secure password hashing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Clean up existing objects if re-running script (Order matters due to dependencies)
DROP VIEW IF EXISTS v_agenda_projects;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS users;
DROP TYPE IF EXISTS user_role;

-- -----------------------------------------------------------------------------
-- 1. User Roles ENUM
-- -----------------------------------------------------------------------------
-- Admin: Create users, reset passwords, create projects, assign to anyone
-- Editor: Create projects, edit assigned projects (start time, end time, progress %, assign to self)
-- Reader: Read-only access to calendar agenda
CREATE TYPE user_role AS ENUM ('admin', 'editor', 'reader');

-- -----------------------------------------------------------------------------
-- 2. Users Table
-- -----------------------------------------------------------------------------
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'reader',
    display_in_agenda BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Comments on Users table
COMMENT ON TABLE users IS 'Application users with role-based access control and agenda visibility flag.';
COMMENT ON COLUMN users.role IS 'Role of the user: admin, editor, or reader.';
COMMENT ON COLUMN users.display_in_agenda IS 'Option to hide or show user from calendar/agenda views.';

-- -----------------------------------------------------------------------------
-- 3. Projects Table
-- -----------------------------------------------------------------------------
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    priority INTEGER NOT NULL DEFAULT 0,
    progress_percentage INTEGER NOT NULL DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    progress_updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    assigned_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_end_after_start CHECK (end_time >= start_time)
);

-- Comments on Projects table
COMMENT ON TABLE projects IS 'Projects with schedule, priority ranking, completion percentage, and last updated tracking.';
COMMENT ON COLUMN projects.priority IS 'Priority rank used for drag-and-drop ordering in calendar/timeline.';
COMMENT ON COLUMN projects.progress_percentage IS 'Completion status percentage (0-100%).';
COMMENT ON COLUMN projects.progress_updated_at IS 'Timestamp of the last update to the progress percentage.';

-- -----------------------------------------------------------------------------
-- 4. Triggers & Functions
-- -----------------------------------------------------------------------------

-- Function to automatically update the `updated_at` column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for users table updated_at
CREATE TRIGGER trigger_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger for projects table updated_at
CREATE TRIGGER trigger_projects_updated_at
BEFORE UPDATE ON projects
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically update `progress_updated_at` when `progress_percentage` changes
CREATE OR REPLACE FUNCTION update_projects_progress_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') OR (OLD.progress_percentage IS DISTINCT FROM NEW.progress_percentage) THEN
        NEW.progress_updated_at = CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for projects table progress_updated_at
CREATE TRIGGER trigger_projects_progress_updated_at
BEFORE INSERT OR UPDATE ON projects
FOR EACH ROW
EXECUTE FUNCTION update_projects_progress_timestamp();

-- -----------------------------------------------------------------------------
-- 5. Indexes
-- -----------------------------------------------------------------------------
CREATE INDEX idx_projects_time_range ON projects (start_time, end_time);
CREATE INDEX idx_projects_assigned_user ON projects (assigned_user_id);
CREATE INDEX idx_projects_created_by ON projects (created_by_user_id);
CREATE INDEX idx_projects_priority ON projects (priority);
CREATE INDEX idx_users_display_in_agenda ON users (display_in_agenda);
CREATE INDEX idx_users_username ON users (username);

-- -----------------------------------------------------------------------------
-- 6. Agenda View
-- -----------------------------------------------------------------------------
-- View tailored for frontend calendar rendering, combining projects with user display options
CREATE OR REPLACE VIEW v_agenda_projects AS
SELECT 
    p.id AS project_id,
    p.title,
    p.description,
    p.start_time,
    p.end_time,
    p.priority,
    p.progress_percentage,
    p.progress_updated_at,
    p.assigned_user_id,
    u.username AS assigned_username,
    u.display_in_agenda AS user_display_in_agenda,
    cb.username AS created_by_username,
    p.created_at,
    p.updated_at
FROM projects p
LEFT JOIN users u ON p.assigned_user_id = u.id
LEFT JOIN users cb ON p.created_by_user_id = cb.id;

COMMENT ON VIEW v_agenda_projects IS 'View joining projects with user info for frontend calendar rendering.';
