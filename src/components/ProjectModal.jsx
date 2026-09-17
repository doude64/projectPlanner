import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, User, Trash2, CheckCircle2, Sliders, AlertCircle } from 'lucide-react';

export default function ProjectModal({ 
  project, 
  users, 
  currentUser, 
  onSave, 
  onDelete, 
  onClose 
}) {
  const isEditing = Boolean(project && project.id);

  // Helper to format ISO date string for datetime-local input
  const formatForInput = (isoStr) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const defaultStart = new Date();
  const defaultEnd = new Date();
  defaultEnd.setDate(defaultEnd.getDate() + 7);

  const [title, setTitle] = useState(project?.title || '');
  const [description, setDescription] = useState(project?.description || '');
  const [startTime, setStartTime] = useState(project ? formatForInput(project.start_time) : formatForInput(defaultStart.toISOString()));
  const [endTime, setEndTime] = useState(project ? formatForInput(project.end_time) : formatForInput(defaultEnd.toISOString()));
  const [priority, setPriority] = useState(project?.priority || 1);
  const [progressPercentage, setProgressPercentage] = useState(project?.progress_percentage || 0);
  const [assignedUserId, setAssignedUserId] = useState(project?.assigned_user_id || '');
  
  const [error, setError] = useState('');

  // Filtering assignable users based on role and display_in_agenda flag
  // Readers cannot create/edit.
  // Editors can only assign to themselves or leave unassigned.
  // Admins can assign to anyone.
  const assignableUsers = users.filter(u => {
    if (currentUser.role === 'editor') {
      return u.id === currentUser.id;
    }
    // Admins can see all users, but agenda-visible users are prioritized
    return true;
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Project title is required.');
      return;
    }

    if (!startTime || !endTime) {
      setError('Start time and end time are required.');
      return;
    }

    if (new Date(endTime) < new Date(startTime)) {
      setError('End time cannot be earlier than start time.');
      return;
    }

    onSave({
      id: project?.id,
      title: title.trim(),
      description: description.trim(),
      start_time: new Date(startTime).toISOString(),
      end_time: new Date(endTime).toISOString(),
      priority: parseInt(priority),
      progress_percentage: parseInt(progressPercentage),
      assigned_user_id: assignedUserId || null
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-card" style={{ padding: '1.75rem' }} onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={22} color="var(--accent-primary)" />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>
              {isEditing ? 'Edit Project' : 'Create New Project'}
            </h2>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onClose} style={{ padding: '0.4rem' }}>
            <X size={18} />
          </button>
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#fca5a5', padding: '0.6rem 0.8rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Title */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
              Project Title *
            </label>
            <input 
              type="text" 
              className="input-field"
              placeholder="e.g. Website Redesign Phase 1"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          {/* Description */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
              Description
            </label>
            <textarea 
              className="input-field"
              rows={3}
              placeholder="Brief details regarding project goals and scope..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* Start & End Dates */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Start Time *
              </label>
              <input 
                type="datetime-local" 
                className="input-field"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                End Time *
              </label>
              <input 
                type="datetime-local" 
                className="input-field"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Priority & Assigned User */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            
            {/* Priority */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Priority Rank
              </label>
              <select 
                className="input-field"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value={1}>P1 - High (Critical)</option>
                <option value={2}>P2 - High</option>
                <option value={3}>P3 - Medium</option>
                <option value={4}>P4 - Normal</option>
                <option value={5}>P5 - Low</option>
              </select>
            </div>

            {/* Assigned User */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Assigned To
              </label>
              <select 
                className="input-field"
                value={assignedUserId}
                onChange={(e) => setAssignedUserId(e.target.value)}
              >
                <option value="">Unassigned</option>
                {assignableUsers.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.username} {!u.display_in_agenda ? '(Hidden from Agenda)' : ''}
                  </option>
                ))}
              </select>
            </div>

          </div>

          {/* Progress Gauge Slider */}
          <div style={{ background: 'rgba(15, 23, 42, 0.4)', padding: '0.85rem', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Sliders size={14} color="var(--accent-secondary)" />
                <span>Progress Percentage Gauge</span>
              </label>
              <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--accent-secondary)' }}>
                {progressPercentage}%
              </span>
            </div>

            <input 
              type="range" 
              min={0} 
              max={100}
              value={progressPercentage}
              onChange={(e) => setProgressPercentage(e.target.value)}
              style={{ width: '100%', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
            />

            {/* Visual Gauge Preview */}
            <div style={{ height: '10px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '999px', marginTop: '0.5rem', overflow: 'hidden' }}>
              <div style={{ 
                height: '100%', 
                width: `${progressPercentage}%`, 
                background: progressPercentage >= 75 ? '#34d399' : progressPercentage >= 35 ? '#fbbf24' : 'var(--accent-gradient)',
                transition: 'width 0.2s ease' 
              }} />
            </div>

            {isEditing && project.progress_updated_at && (
              <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Clock size={12} />
                <span>Last progress update timestamp: {new Date(project.progress_updated_at).toLocaleString()}</span>
              </div>
            )}
          </div>

          {/* Footer Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem' }}>
            {isEditing && onDelete ? (
              <button 
                type="button" 
                className="btn btn-danger btn-sm"
                onClick={() => {
                  if (window.confirm('Are you sure you want to delete this project?')) {
                    onDelete(project.id);
                  }
                }}
              >
                <Trash2 size={15} />
                <span>Delete</span>
              </button>
            ) : <div />}

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary btn-sm">
                <CheckCircle2 size={15} />
                <span>{isEditing ? 'Save Changes' : 'Create Project'}</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
}
