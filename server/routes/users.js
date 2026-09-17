import express from 'express';
import bcrypt from 'bcryptjs';
import { cryptoNativeOrRandomUUID } from '../utils.js';
import { getDb } from '../db.js';
import { authenticateToken, requireRole } from '../auth.js';

const router = express.Router();

// Apply authentication to all user routes
router.use(authenticateToken);

// GET /api/users - List users
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    let users;

    if (req.user.role === 'admin') {
      // Admin gets full details of all users
      users = await db.all(`
        SELECT id, username, role, display_in_agenda, created_at, updated_at 
        FROM users 
        ORDER BY username ASC
      `);
    } else {
      // Non-admins only see users visible in agenda
      users = await db.all(`
        SELECT id, username, role, display_in_agenda 
        FROM users 
        WHERE display_in_agenda = 1 
        ORDER BY username ASC
      `);
    }

    // Convert display_in_agenda INTEGER to boolean
    const formatted = users.map(u => ({
      ...u,
      display_in_agenda: Boolean(u.display_in_agenda)
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

// POST /api/users - Create user (Admin only)
router.post('/', requireRole('admin'), async (req, res) => {
  try {
    const { username, password, role, display_in_agenda } = req.body;

    if (!username || !password || !role) {
      return res.status(400).json({ error: 'Username, password, and role are required.' });
    }

    if (!['admin', 'editor', 'reader'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be admin, editor, or reader.' });
    }

    const db = await getDb();
    
    // Check if username already exists
    const existing = await db.get('SELECT id FROM users WHERE username = ?', [username.trim()]);
    if (existing) {
      return res.status(400).json({ error: 'Username already taken.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = cryptoNativeOrRandomUUID();
    const agendaFlag = display_in_agenda === false ? 0 : 1;

    await db.run(
      `INSERT INTO users (id, username, password_hash, role, display_in_agenda) VALUES (?, ?, ?, ?, ?)`,
      [userId, username.trim(), passwordHash, role, agendaFlag]
    );

    const newUser = await db.get(
      'SELECT id, username, role, display_in_agenda, created_at FROM users WHERE id = ?',
      [userId]
    );

    res.status(201).json({
      ...newUser,
      display_in_agenda: Boolean(newUser.display_in_agenda)
    });
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ error: 'Failed to create user.' });
  }
});

// PUT /api/users/:id - Update user details (Admin only)
router.put('/:id', requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { username, role, display_in_agenda } = req.body;

    const db = await getDb();
    const existing = await db.get('SELECT * FROM users WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (role && !['admin', 'editor', 'reader'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role.' });
    }

    // Prevent demoting the default admin if it's the last admin
    if (existing.role === 'admin' && role && role !== 'admin') {
      const adminCount = await db.get("SELECT COUNT(*) as count FROM users WHERE role = 'admin'");
      if (adminCount.count <= 1) {
        return res.status(400).json({ error: 'Cannot remove the last remaining admin account.' });
      }
    }

    const newUsername = username ? username.trim() : existing.username;
    const newRole = role || existing.role;
    const newAgendaFlag = display_in_agenda !== undefined ? (display_in_agenda ? 1 : 0) : existing.display_in_agenda;

    const now = new Date().toISOString();

    await db.run(
      `UPDATE users SET username = ?, role = ?, display_in_agenda = ?, updated_at = ? WHERE id = ?`,
      [newUsername, newRole, newAgendaFlag, now, id]
    );

    const updatedUser = await db.get(
      'SELECT id, username, role, display_in_agenda, updated_at FROM users WHERE id = ?',
      [id]
    );

    res.json({
      ...updatedUser,
      display_in_agenda: Boolean(updatedUser.display_in_agenda)
    });
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ error: 'Failed to update user.' });
  }
});

// POST /api/users/:id/reset-password - Admin reset password
router.post('/:id/reset-password', requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.trim().length === 0) {
      return res.status(400).json({ error: 'New password is required.' });
    }

    const db = await getDb();
    const existing = await db.get('SELECT id FROM users WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const now = new Date().toISOString();

    await db.run('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?', [passwordHash, now, id]);

    res.json({ message: 'Password reset successfully.' });
  } catch (err) {
    console.error('Error resetting password:', err);
    res.status(500).json({ error: 'Failed to reset password.' });
  }
});

// POST /api/users/change-password - Change own password (All users)
router.post('/change-password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required.' });
    }

    if (newPassword.length < 4) {
      return res.status(400).json({ error: 'New password must be at least 4 characters long.' });
    }

    const db = await getDb();
    const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    const now = new Date().toISOString();

    await db.run('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?', [newHash, now, userId]);

    res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    console.error('Error changing password:', err);
    res.status(500).json({ error: 'Failed to change password.' });
  }
});

// DELETE /api/users/:id - Delete user (Admin only)
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    if (id === req.user.id) {
      return res.status(400).json({ error: 'You cannot delete your own account.' });
    }

    const db = await getDb();
    const existing = await db.get('SELECT * FROM users WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'User not found.' });
    }

    await db.run('DELETE FROM users WHERE id = ?', [id]);
    res.json({ message: 'User deleted successfully.' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ error: 'Failed to delete user.' });
  }
});

export default router;
