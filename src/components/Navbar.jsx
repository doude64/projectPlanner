import React from 'react';
import { Calendar, Shield, Users, Key, LogOut, PlusCircle, UserCheck } from 'lucide-react';

export default function Navbar({ currentUser, onOpenNewProject, onOpenAdminUsers, onOpenChangePassword, onLogout }) {
  if (!currentUser) return null;

  const roleLabels = {
    admin: { label: 'Admin', icon: Shield, class: 'admin' },
    editor: { label: 'Editor', icon: UserCheck, class: 'editor' },
    reader: { label: 'Reader', icon: Calendar, class: 'reader' }
  };

  const roleInfo = roleLabels[currentUser.role] || roleLabels.reader;
  const RoleIcon = roleInfo.icon;

  return (
    <header className="glass-card" style={{ borderRadius: 0, borderTop: 0, borderLeft: 0, borderRight: 0, padding: '0.9rem 1.5rem', marginBottom: '1.5rem' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        
        {/* Brand Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ 
            width: '38px', height: '38px', borderRadius: '10px', 
            background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)' 
          }}>
            <Calendar size={22} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #fff 0%, #cbd5e1 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Projects Planner
            </h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Interactive Priority & Schedule Agenda</p>
          </div>
        </div>

        {/* User Info & Role Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255, 255, 255, 0.04)', padding: '0.4rem 0.8rem', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{currentUser.username}</span>
            <span className={`badge-role ${roleInfo.class}`}>
              <RoleIcon size={12} />
              {roleInfo.label}
            </span>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            
            {/* New Project Button (Admin & Editor) */}
            {currentUser.role !== 'reader' && (
              <button className="btn btn-primary btn-sm" onClick={onOpenNewProject}>
                <PlusCircle size={15} />
                <span>New Project</span>
              </button>
            )}

            {/* Admin User Management Panel (Admin only) */}
            {currentUser.role === 'admin' && (
              <button className="btn btn-secondary btn-sm" onClick={onOpenAdminUsers} title="Manage Users">
                <Users size={15} />
                <span>Users</span>
              </button>
            )}

            {/* Change Password (All Users) */}
            <button className="btn btn-secondary btn-sm" onClick={onOpenChangePassword} title="Change Password">
              <Key size={15} />
              <span>Password</span>
            </button>

            {/* Logout */}
            <button className="btn btn-secondary btn-sm" onClick={onLogout} title="Sign Out">
              <LogOut size={15} />
            </button>

          </div>

        </div>

      </div>
    </header>
  );
}
