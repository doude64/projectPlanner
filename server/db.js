import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbDir = path.join(__dirname, '../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'projects_planner.db');

let dbInstance = null;

export async function getDb() {
  if (dbInstance) return dbInstance;

  dbInstance = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  await dbInstance.exec('PRAGMA foreign_keys = ON;');
  await initSchema(dbInstance);
  return dbInstance;
}

async function initSchema(db) {
  // 1. Create users table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'editor', 'reader')),
      display_in_agenda INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Create projects table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      priority INTEGER NOT NULL DEFAULT 0,
      progress_percentage INTEGER NOT NULL DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
      progress_updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      assigned_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_by_user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Check if admin user exists, seed if empty
  const adminUser = await db.get('SELECT * FROM users WHERE username = ?', ['admin']);
  if (!adminUser) {
    console.log('Seeding initial database users and projects...');
    
    const adminPass = await bcrypt.hash('didier', 10);
    const editorPass = await bcrypt.hash('editor123', 10);
    const readerPass = await bcrypt.hash('reader123', 10);
    const hiddenPass = await bcrypt.hash('hidden123', 10);

    const adminId = '00000000-0000-0000-0000-000000000001';
    const editorId = '00000000-0000-0000-0000-000000000002';
    const readerId = '00000000-0000-0000-0000-000000000003';
    const hiddenId = '00000000-0000-0000-0000-000000000004';

    await db.run(
      `INSERT INTO users (id, username, password_hash, role, display_in_agenda) VALUES (?, ?, ?, ?, ?)`,
      [adminId, 'admin', adminPass, 'admin', 1]
    );
    await db.run(
      `INSERT INTO users (id, username, password_hash, role, display_in_agenda) VALUES (?, ?, ?, ?, ?)`,
      [editorId, 'editor_john', editorPass, 'editor', 1]
    );
    await db.run(
      `INSERT INTO users (id, username, password_hash, role, display_in_agenda) VALUES (?, ?, ?, ?, ?)`,
      [readerId, 'reader_sarah', readerPass, 'reader', 1]
    );
    await db.run(
      `INSERT INTO users (id, username, password_hash, role, display_in_agenda) VALUES (?, ?, ?, ?, ?)`,
      [hiddenId, 'editor_hidden', hiddenPass, 'editor', 0]
    );

    // Seed sample projects relative to current date
    const now = new Date();
    
    const p1Start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2, 9, 0).toISOString();
    const p1End = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 5, 18, 0).toISOString();
    const p1Update = new Date(now.getTime() - 3600000 * 4).toISOString(); // 4 hours ago

    const p2Start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9, 0).toISOString();
    const p2End = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 10, 18, 0).toISOString();
    const p2Update = new Date(now.getTime() - 3600000 * 24).toISOString(); // yesterday

    const p3Start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 6, 9, 0).toISOString();
    const p3End = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 16, 18, 0).toISOString();
    const p3Update = new Date(now.getTime() - 3600000 * 48).toISOString(); // 2 days ago

    const p4Start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 5, 9, 0).toISOString();
    const p4End = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2, 18, 0).toISOString();
    const p4Update = new Date(now.getTime() - 3600000 * 12).toISOString(); // 12 hours ago

    await db.run(`
      INSERT INTO projects (id, title, description, start_time, end_time, priority, progress_percentage, progress_updated_at, assigned_user_id, created_by_user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      '10000000-0000-0000-0000-000000000001',
      'Website Redesign - Phase 1',
      'Initial mockups and user flow architecture for the calendar interface.',
      p1Start, p1End, 1, 45, p1Update, editorId, adminId
    ]);

    await db.run(`
      INSERT INTO projects (id, title, description, start_time, end_time, priority, progress_percentage, progress_updated_at, assigned_user_id, created_by_user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      '10000000-0000-0000-0000-000000000002',
      'Database Migration & Backup Setup',
      'PostgreSQL & SQLite dual engine setup with automated backups.',
      p2Start, p2End, 2, 80, p2Update, adminId, adminId
    ]);

    await db.run(`
      INSERT INTO projects (id, title, description, start_time, end_time, priority, progress_percentage, progress_updated_at, assigned_user_id, created_by_user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      '10000000-0000-0000-0000-000000000003',
      'Q4 Roadmap Planning',
      'Quarterly planning and project priority review with stakeholder team.',
      p3Start, p3End, 3, 10, p3Update, null, adminId
    ]);

    await db.run(`
      INSERT INTO projects (id, title, description, start_time, end_time, priority, progress_percentage, progress_updated_at, assigned_user_id, created_by_user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      '10000000-0000-0000-0000-000000000004',
      'Security Audit & Access Control Review',
      'Audit RBAC permissions and user session token security.',
      p4Start, p4End, 1, 95, p4Update, editorId, adminId
    ]);

    console.log('Seeding completed successfully!');
  }
}
