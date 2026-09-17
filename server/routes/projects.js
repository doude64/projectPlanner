import express from 'express';
import { cryptoNativeOrRandomUUID } from '../utils.js';
import { getDb } from '../db.js';
import { authenticateToken, requireRole } from '../auth.js';

const router = express.Router();

// Apply authentication to all project routes
router.use(authenticateToken);

// Helper view-like query joining projects with user info
async function fetchProjectsQuery(db, whereClause = '', params = []) {
  const query = `
    SELECT 
      p.id,
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
      p.created_by_user_id,
      cb.username AS created_by_username,
      p.created_at,
      p.updated_at
    FROM projects p
    LEFT JOIN users u ON p.assigned_user_id = u.id
    LEFT JOIN users cb ON p.created_by_user_id = cb.id
    ${whereClause}
    ORDER BY p.priority ASC, p.start_time ASC
  `;

  const rows = await db.all(query, params);
  return rows.map(r => ({
    ...r,
    user_display_in_agenda: r.user_display_in_agenda !== null ? Boolean(r.user_display_in_agenda) : true
  }));
}

// GET /api/projects - View all projects
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const projects = await fetchProjectsQuery(db);
    res.json(projects);
  } catch (err) {
    console.error('Error fetching projects:', err);
    res.status(500).json({ error: 'Failed to fetch projects.' });
  }
});

// GET /api/projects/:id - Get single project
router.get('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const projects = await fetchProjectsQuery(db, 'WHERE p.id = ?', [req.params.id]);
    if (!projects.length) {
      return res.status(404).json({ error: 'Project not found.' });
    }
    res.json(projects[0]);
  } catch (err) {
    console.error('Error fetching project:', err);
    res.status(500).json({ error: 'Failed to fetch project.' });
  }
});

// POST /api/projects - Create project (Admin & Editor)
router.post('/', requireRole('admin', 'editor'), async (req, res) => {
  try {
    const { title, description, start_time, end_time, priority, progress_percentage, assigned_user_id } = req.body;

    if (!title || !start_time || !end_time) {
      return res.status(400).json({ error: 'Title, start time, and end time are required.' });
    }

    const startDate = new Date(start_time);
    const endDate = new Date(end_time);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ error: 'Invalid start time or end time format.' });
    }
    if (endDate < startDate) {
      return res.status(400).json({ error: 'End time cannot be earlier than start time.' });
    }

    const db = await getDb();
    let finalAssignedUserId = assigned_user_id || null;

    // RBAC logic for assignment:
    // Editors can only assign projects to themselves or leave unassigned
    if (req.user.role === 'editor') {
      if (assigned_user_id && assigned_user_id !== req.user.id) {
        return res.status(403).json({ error: 'Editors can only assign projects to themselves.' });
      }
    }

    // Verify assigned user exists if specified
    if (finalAssignedUserId) {
      const assignedUser = await db.get('SELECT id FROM users WHERE id = ?', [finalAssignedUserId]);
      if (!assignedUser) {
        return res.status(400).json({ error: 'Assigned user does not exist.' });
      }
    }

    const projectId = cryptoNativeOrRandomUUID();
    const now = new Date().toISOString();
    const progressVal = Math.min(100, Math.max(0, parseInt(progress_percentage) || 0));
    const prioVal = parseInt(priority) || 1;

    await db.run(
      `INSERT INTO projects (
        id, title, description, start_time, end_time, priority, 
        progress_percentage, progress_updated_at, assigned_user_id, created_by_user_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        projectId,
        title.trim(),
        description || '',
        startDate.toISOString(),
        endDate.toISOString(),
        prioVal,
        progressVal,
        now,
        finalAssignedUserId,
        req.user.id,
        now,
        now
      ]
    );

    const created = await fetchProjectsQuery(db, 'WHERE p.id = ?', [projectId]);
    res.status(201).json(created[0]);
  } catch (err) {
    console.error('Error creating project:', err);
    res.status(500).json({ error: 'Failed to create project.' });
  }
});

// PUT /api/projects/:id - Edit project
router.put('/:id', requireRole('admin', 'editor'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, start_time, end_time, priority, progress_percentage, assigned_user_id } = req.body;

    const db = await getDb();
    const existing = await db.get('SELECT * FROM projects WHERE id = ?', [id]);

    if (!existing) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    // Editor permission check: Editors can edit projects assigned to them or created by them
    if (req.user.role === 'editor') {
      const isAssignedToMe = existing.assigned_user_id === req.user.id;
      const isCreatedByMe = existing.created_by_user_id === req.user.id;
      if (!isAssignedToMe && !isCreatedByMe) {
        return res.status(403).json({ error: 'Editors can only edit projects assigned to them or created by them.' });
      }

      // Editors can only assign to themselves or unassign
      if (assigned_user_id && assigned_user_id !== req.user.id) {
        return res.status(403).json({ error: 'Editors can only assign projects to themselves.' });
      }
    }

    const startDate = start_time ? new Date(start_time) : new Date(existing.start_time);
    const endDate = end_time ? new Date(end_time) : new Date(existing.end_time);

    if (endDate < startDate) {
      return res.status(400).json({ error: 'End time cannot be earlier than start time.' });
    }

    let finalProgress = existing.progress_percentage;
    let progressUpdatedAt = existing.progress_updated_at;
    const now = new Date().toISOString();

    if (progress_percentage !== undefined && progress_percentage !== null) {
      const parsedVal = Math.min(100, Math.max(0, parseInt(progress_percentage)));
      if (parsedVal !== existing.progress_percentage) {
        finalProgress = parsedVal;
        progressUpdatedAt = now; // Progress timestamp updated!
      }
    }

    const newTitle = title !== undefined ? title.trim() : existing.title;
    const newDesc = description !== undefined ? description : existing.description;
    const newPrio = priority !== undefined ? parseInt(priority) : existing.priority;
    const newAssignedId = assigned_user_id !== undefined ? (assigned_user_id || null) : existing.assigned_user_id;

    await db.run(
      `UPDATE projects SET 
        title = ?, description = ?, start_time = ?, end_time = ?, 
        priority = ?, progress_percentage = ?, progress_updated_at = ?, 
        assigned_user_id = ?, updated_at = ?
      WHERE id = ?`,
      [
        newTitle,
        newDesc,
        startDate.toISOString(),
        endDate.toISOString(),
        newPrio,
        finalProgress,
        progressUpdatedAt,
        newAssignedId,
        now,
        id
      ]
    );

    const updated = await fetchProjectsQuery(db, 'WHERE p.id = ?', [id]);
    res.json(updated[0]);
  } catch (err) {
    console.error('Error updating project:', err);
    res.status(500).json({ error: 'Failed to update project.' });
  }
});

// PATCH /api/projects/:id/move - Quick drag-and-drop schedule/priority update
router.patch('/:id/move', requireRole('admin', 'editor'), async (req, res) => {
  try {
    const { id } = req.params;
    const { start_time, end_time, priority } = req.body;

    const db = await getDb();
    const existing = await db.get('SELECT * FROM projects WHERE id = ?', [id]);

    if (!existing) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    // Editor permission check
    if (req.user.role === 'editor') {
      const isAssignedToMe = existing.assigned_user_id === req.user.id;
      const isCreatedByMe = existing.created_by_user_id === req.user.id;
      if (!isAssignedToMe && !isCreatedByMe) {
        return res.status(403).json({ error: 'Editors can only reschedule projects assigned to them or created by them.' });
      }
    }

    const newStart = start_time ? new Date(start_time).toISOString() : existing.start_time;
    const newEnd = end_time ? new Date(end_time).toISOString() : existing.end_time;
    const newPrio = priority !== undefined ? parseInt(priority) : existing.priority;
    const now = new Date().toISOString();

    await db.run(
      `UPDATE projects SET start_time = ?, end_time = ?, priority = ?, updated_at = ? WHERE id = ?`,
      [newStart, newEnd, newPrio, now, id]
    );

    const updated = await fetchProjectsQuery(db, 'WHERE p.id = ?', [id]);
    res.json(updated[0]);
  } catch (err) {
    console.error('Error moving project:', err);
    res.status(500).json({ error: 'Failed to move project.' });
  }
});

// DELETE /api/projects/:id - Delete project
router.delete('/:id', requireRole('admin', 'editor'), async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDb();
    const existing = await db.get('SELECT * FROM projects WHERE id = ?', [id]);

    if (!existing) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    if (req.user.role === 'editor' && existing.created_by_user_id !== req.user.id) {
      return res.status(403).json({ error: 'Editors can only delete projects they created.' });
    }

    await db.run('DELETE FROM projects WHERE id = ?', [id]);
    res.json({ message: 'Project deleted successfully.' });
  } catch (err) {
    console.error('Error deleting project:', err);
    res.status(500).json({ error: 'Failed to delete project.' });
  }
});

export default router;
