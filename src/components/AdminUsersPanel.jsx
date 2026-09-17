import React, { useState } from 'react';
import { 
  Users, UserPlus, Key, Shield, UserCheck, Eye, EyeOff, 
  Trash2, X, Check, AlertCircle, Edit2 
} from 'lucide-react';

export default function AdminUsersPanel({ 
  users, 
  currentUser, 
  onCreateUser, 
  onUpdateUser, 
  onResetPassword, 
  onDeleteUser, 
  onClose 
}) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [resetTargetUser, setResetTargetUser] = useState(null);

  // New User Form State
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('editor');
  const [newDisplayInAgenda, setNewDisplayInAgenda] = useState(true);

  // Reset Password Form State
  const [resetPassInput, setResetPassInput] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!newUsername.trim() || !newPassword) {
      setError('Username and password are required.');
      return;
    }

    try {
      await onCreateUser({
        username: newUsername.trim(),
        password: newPassword,
        role: newRole,
        display_in_agenda: newDisplayInAgenda
      });

      setSuccess(`User "${newUsername}" created successfully!`);
      setNewUsername('');
      setNewPassword('');
      setNewRole('editor');
      setNewDisplayInAgenda(true);
      setShowCreateModal(false);
    } catch (err) {
      setError(err.message || 'Failed to create user.');
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (!resetPassInput) return;

    try {
      await onResetPassword(resetTargetUser.id, resetPassInput);
      setSuccess(`Password for "${resetTargetUser.username}" reset successfully!`);
      setResetTargetUser(null);
      setResetPassInput('');
    } catch (err) {
      setError(err.message || 'Failed to reset password.');
    }
  };

  const roleBadges = {
    admin: { label: 'Admin', class: 'admin', icon: Shield },
    editor: { label: 'Editor', class: 'editor', icon: UserCheck },
    reader: { label: 'Reader', class: 'reader', icon: Eye }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-card" style={{ maxWidth: '750px', padding: '1.75rem' }} onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Users size={24} color="var(--accent-primary)" />
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>User Management</h2>
              <p style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>Admin control for roles, passwords & agenda visibility</p>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-primary btn-sm" onClick={() => { setError(''); setSuccess(''); setShowCreateModal(true); }}>
              <UserPlus size={15} />
              <span>Create User</span>
            </button>
            <button className="btn btn-secondary btn-sm" onClick={onClose} style={{ padding: '0.4rem' }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#fca5a5', padding: '0.6rem 0.8rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div style={{ background: 'rgba(16, 185, 129, 0.2)', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#6ee7b7', padding: '0.6rem 0.8rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Check size={16} />
            <span>{success}</span>
          </div>
        )}

        {/* User Table */}
        <div style={{ overflowX: 'auto', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Username</th>
                <th style={{ padding: '0.75rem 1rem' }}>Role</th>
                <th style={{ padding: '0.75rem 1rem' }}>Agenda Visibility</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const isSelf = u.id === currentUser.id;
                const rBadge = roleBadges[u.role] || roleBadges.reader;
                const RoleIcon = rBadge.icon;

                return (
                  <tr key={u.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    
                    {/* Username */}
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span>{u.username}</span>
                        {isSelf && <span style={{ fontSize: '0.7rem', color: 'var(--accent-secondary)' }}>(You)</span>}
                      </div>
                    </td>

                    {/* Role Selector / Badge */}
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <select 
                        className="input-field" 
                        value={u.role}
                        disabled={isSelf}
                        onChange={(e) => onUpdateUser(u.id, { role: e.target.value })}
                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', width: '110px' }}
                      >
                        <option value="admin">Admin</option>
                        <option value="editor">Editor</option>
                        <option value="reader">Reader</option>
                      </select>
                    </td>

                    {/* Display in Agenda Toggle */}
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <button 
                        className={`btn btn-sm ${u.display_in_agenda ? 'btn-secondary' : 'btn-danger'}`}
                        onClick={() => onUpdateUser(u.id, { display_in_agenda: !u.display_in_agenda })}
                        style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                      >
                        {u.display_in_agenda ? (
                          <>
                            <Eye size={13} color="#34d399" />
                            <span>Displayed in Agenda</span>
                          </>
                        ) : (
                          <>
                            <EyeOff size={13} color="#fca5a5" />
                            <span>Hidden from Agenda</span>
                          </>
                        )}
                      </button>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                        
                        {/* Reset Password */}
                        <button 
                          className="btn btn-secondary btn-sm"
                          onClick={() => { setError(''); setSuccess(''); setResetTargetUser(u); }}
                          title="Reset user password"
                        >
                          <Key size={14} />
                          <span>Reset</span>
                        </button>

                        {/* Delete User */}
                        {!isSelf && (
                          <button 
                            className="btn btn-danger btn-sm"
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to delete user "${u.username}"?`)) {
                                onDeleteUser(u.id);
                              }
                            }}
                            title="Delete user"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}

                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Modal: Create User Sub-dialog */}
        {showCreateModal && (
          <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => setShowCreateModal(false)}>
            <div className="modal-content glass-card" style={{ maxWidth: '420px', padding: '1.5rem' }} onClick={(e) => e.stopPropagation()}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem' }}>
                Create New User
              </h3>
              <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                    Username *
                  </label>
                  <input 
                    type="text" 
                    className="input-field" 
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    required 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                    Initial Password *
                  </label>
                  <input 
                    type="password" 
                    className="input-field" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                    User Role *
                  </label>
                  <select 
                    className="input-field" 
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                  >
                    <option value="admin">Admin (Full Control & User Management)</option>
                    <option value="editor">Editor (Create & Edit Projects)</option>
                    <option value="reader">Reader (View Agenda Only)</option>
                  </select>
                </div>

                {/* Agenda Display Option */}
                <div style={{ background: 'rgba(15, 23, 42, 0.4)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                    <input 
                      type="checkbox" 
                      checked={newDisplayInAgenda}
                      onChange={(e) => setNewDisplayInAgenda(e.target.checked)}
                      style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                    />
                    <span>Display this user in the Agenda view</span>
                  </label>
                  <p style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '0.25rem', marginLeft: '1.6rem' }}>
                    If unchecked, this user will be hidden from the calendar timeline lanes and default assignment dropdowns.
                  </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary btn-sm">
                    Create User
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Reset Password Sub-dialog */}
        {resetTargetUser && (
          <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => setResetTargetUser(null)}>
            <div className="modal-content glass-card" style={{ maxWidth: '400px', padding: '1.5rem' }} onClick={(e) => e.stopPropagation()}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.5rem' }}>
                Reset Password for "{resetTargetUser.username}"
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Enter the new password for this user account.
              </p>
              <form onSubmit={handleResetSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <input 
                  type="password" 
                  className="input-field" 
                  placeholder="Enter new password"
                  value={resetPassInput}
                  onChange={(e) => setResetPassInput(e.target.value)}
                  required 
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setResetTargetUser(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary btn-sm">
                    Reset Password
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
