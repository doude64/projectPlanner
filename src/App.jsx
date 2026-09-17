import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import CalendarTimeline from './components/CalendarTimeline';
import ProjectModal from './components/ProjectModal';
import AdminUsersPanel from './components/AdminUsersPanel';
import ChangePasswordModal from './components/ChangePasswordModal';
import LoginModal from './components/LoginModal';

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('pp_token') || '');
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Data States
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);

  // Modal States
  const [activeModal, setActiveModal] = useState(null); // 'project', 'adminUsers', 'changePassword'
  const [selectedProject, setSelectedProject] = useState(null);

  // Helper headers for authenticated requests
  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  });

  // Check auth session on startup
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    fetch('/api/auth/me', { headers: getAuthHeaders() })
      .then(res => {
        if (!res.ok) throw new Error('Session expired');
        return res.json();
      })
      .then(user => {
        setCurrentUser(user);
        setLoading(false);
      })
      .catch(() => {
        handleLogout();
        setLoading(false);
      });
  }, [token]);

  // Fetch projects and users when logged in
  const fetchData = async () => {
    if (!token) return;
    try {
      const [projRes, usersRes] = await Promise.all([
        fetch('/api/projects', { headers: getAuthHeaders() }),
        fetch('/api/users', { headers: getAuthHeaders() })
      ]);

      if (projRes.ok) {
        const projData = await projRes.json();
        setProjects(projData);
      }
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData);
      }
    } catch (err) {
      console.error('Error loading data:', err);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser]);

  // Auth Handlers
  const handleLogin = async ({ username, password }) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Login failed.');
    }

    localStorage.setItem('pp_token', data.token);
    setToken(data.token);
    setCurrentUser(data.user);
  };

  const handleLogout = () => {
    localStorage.removeItem('pp_token');
    setToken('');
    setCurrentUser(null);
    setProjects([]);
    setUsers([]);
    setActiveModal(null);
  };

  // Project Handlers
  const handleSaveProject = async (projectData) => {
    const isEdit = Boolean(projectData.id);
    const url = isEdit ? `/api/projects/${projectData.id}` : '/api/projects';
    const method = isEdit ? 'PUT' : 'POST';

    // Optimistic UI update if editing an existing project
    if (isEdit) {
      const assignedUserObj = users.find(u => u.id === projectData.assigned_user_id);
      setProjects(prev => prev.map(p => {
        if (p.id === projectData.id) {
          return {
            ...p,
            ...projectData,
            assigned_username: assignedUserObj ? assignedUserObj.username : (projectData.assigned_user_id ? p.assigned_username : null),
            user_display_in_agenda: assignedUserObj ? assignedUserObj.display_in_agenda : true
          };
        }
        return p;
      }));
    }

    const res = await fetch(url, {
      method,
      headers: getAuthHeaders(),
      body: JSON.stringify(projectData)
    });

    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Failed to save project.');
      fetchData(); // Rollback on error
      return;
    }

    fetchData(); // Sync with server joined fields
    setActiveModal(null);
    setSelectedProject(null);
  };

  const handleMoveProject = async (id, { start_time, end_time, priority }) => {
    // Optimistic UI update
    setProjects(prev => prev.map(p => {
      if (p.id === id) {
        return {
          ...p,
          start_time,
          end_time,
          priority
        };
      }
      return p;
    }));

    const res = await fetch(`/api/projects/${id}/move`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ start_time, end_time, priority })
    });

    if (!res.ok) {
      const data = await res.json();
      alert(data.error || 'Failed to update schedule.');
      fetchData(); // Rollback to server state
    } else {
      fetchData(); // Refresh joined fields
    }
  };

  const handleDeleteProject = async (id) => {
    const res = await fetch(`/api/projects/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    if (!res.ok) {
      const data = await res.json();
      alert(data.error || 'Failed to delete project.');
      return;
    }

    fetchData();
    setActiveModal(null);
    setSelectedProject(null);
  };

  // User Management Handlers (Admin)
  const handleCreateUser = async (userData) => {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(userData)
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to create user.');
    }

    fetchData();
  };

  const handleUpdateUser = async (id, updateFields) => {
    const res = await fetch(`/api/users/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updateFields)
    });

    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Failed to update user.');
      return;
    }

    fetchData();
  };

  const handleResetPassword = async (id, newPassword) => {
    const res = await fetch(`/api/users/${id}/reset-password`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ newPassword })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to reset password.');
    }
  };

  const handleDeleteUser = async (id) => {
    const res = await fetch(`/api/users/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Failed to delete user.');
      return;
    }

    fetchData();
  };

  // Change Own Password
  const handleChangePassword = async ({ currentPassword, newPassword }) => {
    const res = await fetch('/api/users/change-password', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ currentPassword, newPassword })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to change password.');
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--accent-secondary)', fontWeight: 700, fontSize: '1.1rem' }}>
          Loading Projects Planner...
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginModal onLogin={handleLogin} />;
  }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '3rem' }}>
      
      {/* Navigation Header */}
      <Navbar 
        currentUser={currentUser}
        onOpenNewProject={() => {
          setSelectedProject(null);
          setActiveModal('project');
        }}
        onOpenAdminUsers={() => setActiveModal('adminUsers')}
        onOpenChangePassword={() => setActiveModal('changePassword')}
        onLogout={handleLogout}
      />

      {/* Main Interactive Calendar Timeline */}
      <main style={{ padding: '0 1.5rem' }}>
        <CalendarTimeline 
          projects={projects}
          users={users}
          currentUser={currentUser}
          onUpdateProject={handleSaveProject}
          onMoveProject={handleMoveProject}
          onSelectProject={(proj) => {
            if (currentUser.role !== 'reader') {
              setSelectedProject(proj);
              setActiveModal('project');
            }
          }}
        />
      </main>

      {/* Modals */}
      {activeModal === 'project' && (
        <ProjectModal 
          project={selectedProject}
          users={users}
          currentUser={currentUser}
          onSave={handleSaveProject}
          onDelete={handleDeleteProject}
          onClose={() => {
            setActiveModal(null);
            setSelectedProject(null);
          }}
        />
      )}

      {activeModal === 'adminUsers' && currentUser.role === 'admin' && (
        <AdminUsersPanel 
          users={users}
          currentUser={currentUser}
          onCreateUser={handleCreateUser}
          onUpdateUser={handleUpdateUser}
          onResetPassword={handleResetPassword}
          onDeleteUser={handleDeleteUser}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'changePassword' && (
        <ChangePasswordModal 
          onChangePassword={handleChangePassword}
          onClose={() => setActiveModal(null)}
        />
      )}

    </div>
  );
}
