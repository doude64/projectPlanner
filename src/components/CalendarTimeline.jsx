import React, { useState, useRef, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, 
  User, SlidersHorizontal, Filter, GripVertical, Settings2, Shield, UserCheck, Eye,
  ArrowUp, ArrowDown, ChevronUp, ChevronDown, UserPlus, ArrowRightLeft
} from 'lucide-react';

export default function CalendarTimeline({ 
  projects, 
  users, 
  currentUser, 
  onUpdateProject, 
  onMoveProject, 
  onSelectProject 
}) {
  // Default display mode is 30 days ('month')
  const [viewMode, setViewMode] = useState('month'); // '7day', '14day', 'month', 'custom'

  // Default start date (today minus 2 days)
  const [currentStartDate, setCurrentStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 2);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  // Custom date range state for 'custom' view mode
  const [customDaysCount, setCustomDaysCount] = useState(45);
  const [customStartDateInput, setCustomStartDateInput] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 2);
    return d.toISOString().split('T')[0];
  });
  const [customEndDateInput, setCustomEndDateInput] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 43);
    return d.toISOString().split('T')[0];
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [filterUser, setFilterUser] = useState('all');

  // User Sections view is default layout
  const [groupByUser, setGroupByUser] = useState(true);

  // Dragging & Dropzone Target State
  const [draggedProjectId, setDraggedProjectId] = useState(null);
  const [dragOverUserLaneId, setDragOverUserLaneId] = useState(null);

  // Calculate days count depending on view mode
  let daysCount = 30; // Default 30 days
  if (viewMode === '7day') daysCount = 7;
  else if (viewMode === '14day') daysCount = 14;
  else if (viewMode === 'month') daysCount = 30;
  else if (viewMode === 'custom') {
    const s = new Date(customStartDateInput);
    const e = new Date(customEndDateInput);
    if (!isNaN(s.getTime()) && !isNaN(e.getTime()) && e >= s) {
      const diffTime = Math.abs(e - s);
      daysCount = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);
    } else {
      daysCount = parseInt(customDaysCount) || 30;
    }
  }

  // Active Start & End Dates for timeline rendering
  const activeStartDate = viewMode === 'custom' && customStartDateInput 
    ? new Date(customStartDateInput + 'T00:00:00') 
    : currentStartDate;

  const timelineDays = Array.from({ length: daysCount }, (_, i) => {
    const d = new Date(activeStartDate);
    d.setDate(d.getDate() + i);
    return d;
  });

  const timelineEndDate = new Date(activeStartDate);
  timelineEndDate.setDate(timelineEndDate.getDate() + daysCount);

  // Navigation handlers
  const handlePrev = () => {
    const newDate = new Date(activeStartDate);
    newDate.setDate(newDate.getDate() - Math.max(3, Math.floor(daysCount / 2)));
    setCurrentStartDate(newDate);
    if (viewMode === 'custom') {
      const eDate = new Date(newDate);
      eDate.setDate(eDate.getDate() + daysCount - 1);
      setCustomStartDateInput(newDate.toISOString().split('T')[0]);
      setCustomEndDateInput(eDate.toISOString().split('T')[0]);
    }
  };

  const handleNext = () => {
    const newDate = new Date(activeStartDate);
    newDate.setDate(newDate.getDate() + Math.max(3, Math.floor(daysCount / 2)));
    setCurrentStartDate(newDate);
    if (viewMode === 'custom') {
      const eDate = new Date(newDate);
      eDate.setDate(eDate.getDate() + daysCount - 1);
      setCustomStartDateInput(newDate.toISOString().split('T')[0]);
      setCustomEndDateInput(eDate.toISOString().split('T')[0]);
    }
  };

  const handleToday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 2);
    d.setHours(0, 0, 0, 0);
    setCurrentStartDate(d);
    if (viewMode === 'custom') {
      const eDate = new Date(d);
      eDate.setDate(eDate.getDate() + daysCount - 1);
      setCustomStartDateInput(d.toISOString().split('T')[0]);
      setCustomEndDateInput(eDate.toISOString().split('T')[0]);
    }
  };

  // Agenda-visible users list for displaying individual user sections
  const agendaUsers = users.filter(u => u.display_in_agenda);

  // Filter projects
  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    let matchesUser = true;
    if (filterUser === 'unassigned') {
      matchesUser = !p.assigned_user_id;
    } else if (filterUser !== 'all') {
      matchesUser = p.assigned_user_id === filterUser;
    }

    return matchesSearch && matchesUser;
  });

  // Calculate position & width percentage for a project bar
  const getProjectStyle = (proj) => {
    const pStart = new Date(proj.start_time);
    const pEnd = new Date(proj.end_time);

    const timelineStartMs = activeStartDate.getTime();
    const timelineEndMs = timelineEndDate.getTime();
    const totalDurationMs = timelineEndMs - timelineStartMs;

    const startMs = Math.max(timelineStartMs, pStart.getTime());
    const endMs = Math.min(timelineEndMs, pEnd.getTime());

    if (endMs < timelineStartMs || startMs > timelineEndMs) {
      return { display: 'none', isNarrow: false }; // Outside view bounds
    }

    const leftPercent = ((startMs - timelineStartMs) / totalDurationMs) * 100;
    const rawWidthPercent = ((endMs - startMs) / totalDurationMs) * 100;
    const widthPercent = Math.max(2.5, rawWidthPercent);

    // Determine if the bar is narrow relative to its title length
    const isNarrow = rawWidthPercent < 18 || proj.title.length > (rawWidthPercent * 1.8);

    return {
      left: `${leftPercent}%`,
      width: `${widthPercent}%`,
      isNarrow
    };
  };

  // Helper to format relative time for progress updates
  const formatRelativeTime = (isoString) => {
    if (!isoString) return 'Not updated';
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 5) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 30) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Permission helper to check if user can move/edit a project
  const canModifyProject = (proj) => {
    if (currentUser.role === 'admin') return true;
    if (currentUser.role === 'editor') {
      return proj.assigned_user_id === currentUser.id || proj.created_by_user_id === currentUser.id;
    }
    return false;
  };

  // Drag Handlers for vertical user section drop
  const handleDragStart = (e, project) => {
    if (!canModifyProject(project)) return;
    e.stopPropagation();
    setDraggedProjectId(project.id);
    if (e.dataTransfer) {
      e.dataTransfer.setData('text/plain', project.id);
      e.dataTransfer.effectAllowed = 'move';
    }
  };

  const handleDragOverLane = (e, laneUserId) => {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    const laneIdKey = laneUserId || 'unassigned';
    if (dragOverUserLaneId !== laneIdKey) {
      setDragOverUserLaneId(laneIdKey);
    }
  };

  const handleDragLeaveLane = () => {
    setDragOverUserLaneId(null);
  };

  const handleDropUserLane = (e, targetUserId) => {
    e.preventDefault();
    setDragOverUserLaneId(null);
    
    const projId = draggedProjectId || (e.dataTransfer ? e.dataTransfer.getData('text/plain') : null);
    if (!projId) return;
    
    const proj = projects.find(p => p.id === projId);
    if (proj && canModifyProject(proj)) {
      if (currentUser.role === 'editor' && targetUserId && targetUserId !== currentUser.id) {
        alert('Editors can only assign projects to themselves.');
        setDraggedProjectId(null);
        return;
      }

      if (proj.assigned_user_id !== targetUserId) {
        onUpdateProject({
          ...proj,
          assigned_user_id: targetUserId
        });
      }
    }
    setDraggedProjectId(null);
  };

  const handleDropOnProject = (e, targetProject) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverUserLaneId(null);

    const projId = draggedProjectId || (e.dataTransfer ? e.dataTransfer.getData('text/plain') : null);
    if (!projId || projId === targetProject.id) return;

    const sourceProject = projects.find(p => p.id === projId);
    if (!sourceProject || !canModifyProject(sourceProject)) return;

    const newAssignedId = targetProject.assigned_user_id;
    const newPriority = targetProject.priority;

    if (currentUser.role === 'editor' && newAssignedId && newAssignedId !== currentUser.id) {
      alert('Editors can only assign projects to themselves.');
      setDraggedProjectId(null);
      return;
    }

    onUpdateProject({
      ...sourceProject,
      assigned_user_id: newAssignedId,
      priority: newPriority
    });

    setDraggedProjectId(null);
  };

  const handleQuickReassign = (proj, newUserId) => {
    if (!canModifyProject(proj)) return;
    if (currentUser.role === 'editor' && newUserId && newUserId !== currentUser.id) {
      alert('Editors can only assign projects to themselves.');
      return;
    }

    onUpdateProject({
      ...proj,
      assigned_user_id: newUserId || null
    });
  };

  const handleShiftPriority = (proj, delta) => {
    if (!canModifyProject(proj)) return;
    const newPriority = Math.max(1, Math.min(5, proj.priority + delta));
    if (newPriority !== proj.priority) {
      onMoveProject(proj.id, {
        start_time: proj.start_time,
        end_time: proj.end_time,
        priority: newPriority
      });
    }
  };

  const handleShiftDays = (proj, days) => {
    if (!canModifyProject(proj)) return;
    const s = new Date(proj.start_time);
    const e = new Date(proj.end_time);
    s.setDate(s.getDate() + days);
    e.setDate(e.getDate() + days);
    onMoveProject(proj.id, {
      start_time: s.toISOString(),
      end_time: e.toISOString(),
      priority: proj.priority
    });
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Top Filter & View Controls Bar */}
      <div className="glass-card" style={{ padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          
          {/* Navigation & View Mode Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            
            {/* Today / Prev / Next */}
            <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '10px', padding: '2px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <button className="btn btn-secondary btn-sm" onClick={handlePrev} title="Previous">
                <ChevronLeft size={16} />
              </button>
              <button className="btn btn-secondary btn-sm" onClick={handleToday} style={{ fontSize: '0.8rem' }}>
                Today
              </button>
              <button className="btn btn-secondary btn-sm" onClick={handleNext} title="Next">
                <ChevronRight size={16} />
              </button>
            </div>

            {/* View Mode Buttons (Default: 30 Days) */}
            <div style={{ display: 'flex', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '10px', padding: '2px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <button 
                className={`btn btn-sm ${viewMode === 'month' ? 'btn-primary' : 'btn-secondary'}`} 
                style={{ borderRadius: '8px', border: 'none' }}
                onClick={() => setViewMode('month')}
              >
                30 Days (Default)
              </button>
              <button 
                className={`btn btn-sm ${viewMode === '14day' ? 'btn-primary' : 'btn-secondary'}`} 
                style={{ borderRadius: '8px', border: 'none' }}
                onClick={() => setViewMode('14day')}
              >
                14 Days
              </button>
              <button 
                className={`btn btn-sm ${viewMode === '7day' ? 'btn-primary' : 'btn-secondary'}`} 
                style={{ borderRadius: '8px', border: 'none' }}
                onClick={() => setViewMode('7day')}
              >
                7 Days
              </button>
              <button 
                className={`btn btn-sm ${viewMode === 'custom' ? 'btn-primary' : 'btn-secondary'}`} 
                style={{ borderRadius: '8px', border: 'none' }}
                onClick={() => setViewMode('custom')}
              >
                <Settings2 size={13} />
                <span>Custom Range</span>
              </button>
            </div>

          </div>

          {/* Right Controls: Search, Filter, View Mode Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            
            <input 
              type="text" 
              className="input-field" 
              placeholder="Search projects..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '180px', padding: '0.4rem 0.8rem', fontSize: '0.825rem' }}
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Filter size={14} color="var(--text-muted)" />
              <select 
                className="input-field"
                value={filterUser}
                onChange={(e) => setFilterUser(e.target.value)}
                style={{ width: '150px', padding: '0.4rem 0.8rem', fontSize: '0.825rem', cursor: 'pointer' }}
              >
                <option value="all">All Users</option>
                <option value="unassigned">Unassigned</option>
                {agendaUsers.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.username}
                  </option>
                ))}
              </select>
            </div>

            <button 
              className={`btn btn-sm ${groupByUser ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setGroupByUser(!groupByUser)}
              title="Toggle view between User Sections and Priority Groups"
            >
              <User size={14} />
              <span>{groupByUser ? 'User Sections (Default)' : 'Priority Grouping'}</span>
            </button>

          </div>

        </div>

        {/* Custom Date Range Selector */}
        {viewMode === 'custom' && (
          <div style={{ marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-secondary)' }}>
              Custom Timeline Range:
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>From:</label>
              <input 
                type="date" 
                className="input-field"
                value={customStartDateInput}
                onChange={(e) => setCustomStartDateInput(e.target.value)}
                style={{ width: '145px', padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>To:</label>
              <input 
                type="date" 
                className="input-field"
                value={customEndDateInput}
                onChange={(e) => setCustomEndDateInput(e.target.value)}
                style={{ width: '145px', padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
              />
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              ({daysCount} days displayed on calendar timeline)
            </span>
          </div>
        )}

      </div>

      {/* Main Calendar Timeline Container */}
      <div className="glass-card" style={{ padding: '1.25rem', overflowX: 'auto' }}>
        <div style={{ minWidth: daysCount > 15 ? `${daysCount * 38 + 240}px` : '1000px' }}>
          
          {/* Calendar Grid Header: Column Dates */}
          <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '1rem', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <SlidersHorizontal size={16} />
              <span>{groupByUser ? 'USER SECTIONS' : 'PRIORITY GROUPS'}</span>
            </div>

            {/* Timeline Header Columns */}
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${daysCount}, 1fr)`, gap: '2px', textAlign: 'center' }}>
              {timelineDays.map((d, idx) => {
                const isToday = new Date().toDateString() === d.toDateString();
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                return (
                  <div 
                    key={idx} 
                    style={{ 
                      padding: '0.35rem 0.1rem',
                      borderRadius: '6px',
                      background: isToday ? 'rgba(99, 102, 241, 0.25)' : isWeekend ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
                      border: isToday ? '1px solid var(--accent-primary)' : '1px solid transparent'
                    }}
                  >
                    <div style={{ fontSize: '0.625rem', textTransform: 'uppercase', color: isToday ? '#a5b4fc' : 'var(--text-muted)', fontWeight: 700 }}>
                      {d.toLocaleDateString('en-US', { weekday: 'short' })}
                    </div>
                    <div style={{ fontSize: '0.8rem', fontWeight: isToday ? 800 : 600, color: isToday ? '#ffffff' : 'var(--text-primary)' }}>
                      {d.getDate()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* MAIN LAYOUT: USER SECTIONS */}
          {groupByUser ? (
            agendaUsers.concat([{ id: null, username: 'Unassigned Projects', role: 'none' }]).map(userGroup => {
              const isUnassigned = userGroup.id === null;
              const laneKey = userGroup.id || 'unassigned';
              const isDragOver = dragOverUserLaneId === laneKey;

              const userProjects = filteredProjects
                .filter(p => isUnassigned ? !p.assigned_user_id : p.assigned_user_id === userGroup.id)
                .sort((a, b) => a.priority - b.priority || new Date(a.start_time) - new Date(b.start_time));

              return (
                <div 
                  key={userGroup.id || 'unassigned-section'}
                  onDragOver={(e) => handleDragOverLane(e, userGroup.id)}
                  onDragLeave={handleDragLeaveLane}
                  onDrop={(e) => handleDropUserLane(e, userGroup.id)}
                  style={{ 
                    marginBottom: '1.25rem',
                    background: isDragOver ? 'rgba(99, 102, 241, 0.2)' : 'rgba(15, 23, 42, 0.45)',
                    borderRadius: '14px',
                    border: isDragOver ? '2px dashed var(--accent-primary)' : '1px solid rgba(255, 255, 255, 0.06)',
                    padding: '0.85rem',
                    transition: 'all 0.2s ease',
                    boxShadow: isDragOver ? '0 0 20px rgba(99, 102, 241, 0.3)' : 'none'
                  }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '1rem', alignItems: 'center' }}>
                    
                    {/* Left User Header Section */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', paddingRight: '0.5rem', borderRight: '1px solid rgba(255, 255, 255, 0.06)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ 
                          width: '32px', height: '32px', borderRadius: '10px', 
                          background: isUnassigned ? 'rgba(107, 114, 128, 0.2)' : 'var(--accent-gradient)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <User size={16} color="white" />
                        </div>

                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#ffffff', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {userGroup.username}
                          </div>
                          {!isUnassigned && (
                            <span className={`badge-role ${userGroup.role}`} style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>
                              {userGroup.role}
                            </span>
                          )}
                        </div>
                      </div>

                      <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.2rem' }}>
                        <span>{userProjects.length} project{userProjects.length !== 1 ? 's' : ''}</span>
                        {draggedProjectId ? (
                          <span style={{ color: 'var(--accent-secondary)', fontWeight: 700, fontSize: '0.7rem' }}>
                            {isDragOver ? 'Release to Move Here' : 'Drop project here'}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>
                            Drag to reassign
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right Timeline Track */}
                    <div style={{ position: 'relative', minHeight: '54px', display: 'flex', flexDirection: 'column', gap: '0.5rem', justifyContent: 'center' }}>
                      {userProjects.length === 0 ? (
                        <div style={{ fontSize: '0.75rem', color: isDragOver ? 'var(--accent-secondary)' : 'var(--text-muted)', fontStyle: 'italic', padding: '0.6rem 0', textAlign: 'center', fontWeight: isDragOver ? 700 : 400 }}>
                          {isDragOver ? `Drop project to assign to ${userGroup.username}` : `No projects assigned to ${userGroup.username}`}
                        </div>
                      ) : (
                        userProjects.map((proj) => (
                          <div key={proj.id} onDrop={(e) => handleDropOnProject(e, proj)}>
                            <ProjectTimelineItem 
                              project={proj}
                              users={agendaUsers}
                              style={getProjectStyle(proj)}
                              activeStartDate={activeStartDate}
                              daysCount={daysCount}
                              canModify={canModifyProject(proj)}
                              formatRelativeTime={formatRelativeTime}
                              onSelectProject={onSelectProject}
                              onShiftDays={handleShiftDays}
                              onShiftPriority={handleShiftPriority}
                              onQuickReassign={handleQuickReassign}
                              onMoveProject={onMoveProject}
                              onDragStart={handleDragStart}
                            />
                          </div>
                        ))
                      )}
                    </div>

                  </div>
                </div>
              );
            })
          ) : (
            /* PRIORITY GROUPS MODE */
            [1, 2, 3, 4, 5].map(prioLevel => {
              const prioProjects = filteredProjects.filter(p => p.priority === prioLevel);
              const prioLabels = {
                1: { title: 'Priority 1 (Critical)', badgeClass: 'p1' },
                2: { title: 'Priority 2 (High)', badgeClass: 'p2' },
                3: { title: 'Priority 3 (Medium)', badgeClass: 'p3' },
                4: { title: 'Priority 4 (Normal)', badgeClass: 'p3' },
                5: { title: 'Priority 5 (Low)', badgeClass: 'p3' }
              };

              if ((prioLevel === 4 || prioLevel === 5) && prioProjects.length === 0) return null;
              const labelObj = prioLabels[prioLevel];

              return (
                <div 
                  key={prioLevel} 
                  style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '220px 1fr', 
                    gap: '1rem', 
                    marginBottom: '1rem',
                    padding: '0.75rem',
                    borderRadius: '12px',
                    background: 'rgba(15, 23, 42, 0.4)',
                    border: '1px solid rgba(255, 255, 255, 0.05)'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '0.3rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span className={`badge-priority ${labelObj.badgeClass}`}>P{prioLevel}</span>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{labelObj.title}</span>
                    </div>
                  </div>

                  <div style={{ position: 'relative', minHeight: '54px', display: 'flex', flexDirection: 'column', gap: '0.5rem', justifyContent: 'center' }}>
                    {prioProjects.map(proj => (
                      <ProjectTimelineItem 
                        key={proj.id}
                        project={proj}
                        users={agendaUsers}
                        style={getProjectStyle(proj)}
                        activeStartDate={activeStartDate}
                        daysCount={daysCount}
                        canModify={canModifyProject(proj)}
                        formatRelativeTime={formatRelativeTime}
                        onSelectProject={onSelectProject}
                        onShiftDays={handleShiftDays}
                        onShiftPriority={handleShiftPriority}
                        onQuickReassign={handleQuickReassign}
                        onMoveProject={onMoveProject}
                        onDragStart={handleDragStart}
                      />
                    ))}
                  </div>
                </div>
              );
            })
          )}

        </div>
      </div>

    </div>
  );
}

// Sub-component for individual project bar on the calendar timeline with mouse drag start/end date handlers
function ProjectTimelineItem({ 
  project, 
  users,
  style, 
  activeStartDate,
  daysCount,
  canModify, 
  formatRelativeTime, 
  onSelectProject, 
  onShiftDays, 
  onShiftPriority,
  onQuickReassign,
  onMoveProject,
  onDragStart
}) {
  const barRef = useRef(null);
  const [isResizing, setIsResizing] = useState(false);
  const [dragMode, setDragMode] = useState(null); // 'move-body', 'resize-left', 'resize-right'

  const getGaugeClass = (pct) => {
    if (pct >= 75) return 'high-progress';
    if (pct >= 35) return 'mid-progress';
    return '';
  };

  // Mouse Drag Handlers for Graphical Start Date & End Date Movement / Resizing
  const handleMouseDown = (e, mode) => {
    if (!canModify) return;
    e.stopPropagation();
    e.preventDefault();

    setIsResizing(true);
    setDragMode(mode);

    const startX = e.clientX;
    const initialStart = new Date(project.start_time);
    const initialEnd = new Date(project.end_time);

    // Get timeline track container width to calculate pixel-to-days conversion
    const trackWidth = barRef.current ? barRef.current.parentElement.offsetWidth : 1000;
    const pxPerDay = trackWidth / daysCount;

    const handleMouseMove = (moveEvent) => {
      moveEvent.preventDefault();
      const deltaPx = moveEvent.clientX - startX;
      const deltaDays = Math.round(deltaPx / pxPerDay);

      if (deltaDays === 0) return;

      if (mode === 'move-body') {
        const newStart = new Date(initialStart);
        newStart.setDate(newStart.getDate() + deltaDays);
        const newEnd = new Date(initialEnd);
        newEnd.setDate(newEnd.getDate() + deltaDays);

        onMoveProject(project.id, {
          start_time: newStart.toISOString(),
          end_time: newEnd.toISOString(),
          priority: project.priority
        });
      } else if (mode === 'resize-left') {
        const newStart = new Date(initialStart);
        newStart.setDate(newStart.getDate() + deltaDays);

        if (newStart <= initialEnd) {
          onMoveProject(project.id, {
            start_time: newStart.toISOString(),
            end_time: project.end_time,
            priority: project.priority
          });
        }
      } else if (mode === 'resize-right') {
        const newEnd = new Date(initialEnd);
        newEnd.setDate(newEnd.getDate() + deltaDays);

        if (newEnd >= initialStart) {
          onMoveProject(project.id, {
            start_time: project.start_time,
            end_time: newEnd.toISOString(),
            priority: project.priority
          });
        }
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setDragMode(null);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const isHiddenUser = project.user_display_in_agenda === false;
  const startDateStr = new Date(project.start_time).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' });
  const endDateStr = new Date(project.end_time).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' });

  // Extract isNarrow flag computed by getProjectStyle
  const isNarrow = Boolean(style?.isNarrow);

  return (
    <div 
      ref={barRef}
      className={`project-bar ${isResizing ? 'dragging' : ''}`}
      style={{
        ...style,
        position: 'relative',
        opacity: style.display === 'none' ? 0 : 1
      }}
      draggable={canModify && !isResizing}
      onDragStart={(e) => onDragStart(e, project)}
      onClick={() => {
        if (!isResizing) onSelectProject(project);
      }}
      title={`${project.title} (Start: ${startDateStr} - End: ${endDateStr} - ${project.progress_percentage}% completed)`}
    >
      {/* NARROW BAR FEATURE: IF PROGRESS BAR IS TOO SMALL, WRITE NAME TO THE OUTSIDE LEFT OF THE BAR */}
      {isNarrow && (
        <div 
          className="outside-title-left"
          style={{
            position: 'absolute',
            right: 'calc(100% + 8px)',
            top: '50%',
            transform: 'translateY(-50%)',
            whiteSpace: 'nowrap',
            zIndex: 25,
            pointerEvents: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem'
          }}
        >
          <span 
            className="project-title-badge"
            style={{ 
              background: 'rgba(15, 23, 42, 0.95)',
              border: '1px solid var(--accent-primary)',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.6)',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '0.8rem',
              padding: '0.2rem 0.6rem',
              borderRadius: '6px'
            }}
          >
            {project.title}
          </span>
          <span style={{ color: 'var(--accent-primary)', fontWeight: 800, fontSize: '0.9rem' }}>➔</span>
        </div>
      )}

      {/* Graphical Drag Handles for Start Date (Left) and End Date (Right) */}
      {canModify && (
        <>
          <div 
            className="drag-handle-left"
            onMouseDown={(e) => handleMouseDown(e, 'resize-left')}
            title="Drag left handle to change START date"
          />
          <div 
            className="drag-handle-right"
            onMouseDown={(e) => handleMouseDown(e, 'resize-right')}
            title="Drag right handle to change END date"
          />
        </>
      )}

      {/* Progress Color Gauge Background Fill */}
      <div className="progress-gauge-container">
        <div 
          className={`progress-gauge-fill ${getGaugeClass(project.progress_percentage)}`}
          style={{ width: `${project.progress_percentage}%` }}
        />
      </div>

      {/* Project Bar Content */}
      <div className="project-bar-content">
        
        {/* Project Title & Grip Handle */}
        <div 
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', overflow: 'hidden', whiteSpace: 'nowrap', flexGrow: 1 }}
          onMouseDown={(e) => {
            if (canModify && e.button === 0 && !e.target.closest('button') && !e.target.closest('select')) {
              handleMouseDown(e, 'move-body');
            }
          }}
        >
          {canModify && <GripVertical size={13} color="var(--text-muted)" style={{ cursor: 'ew-resize', flexShrink: 0 }} title="Drag body to shift schedule start & end date" />}
          
          {/* Display title inside bar if NOT narrow */}
          {!isNarrow && (
            <span 
              className="project-title-text"
              title={project.title}
            >
              {project.title}
            </span>
          )}

          {/* Start and End Date Badge */}
          <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.85)', background: 'rgba(0,0,0,0.45)', padding: '0.1rem 0.35rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
            {startDateStr} - {endDateStr}
          </span>

          {/* Quick User Re-assign Dropdown Selector */}
          {canModify && onQuickReassign && users && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }} onClick={(e) => e.stopPropagation()}>
              <select
                className="input-field"
                value={project.assigned_user_id || ''}
                onChange={(e) => onQuickReassign(project, e.target.value)}
                style={{
                  padding: '0.1rem 0.3rem',
                  fontSize: '0.65rem',
                  height: '20px',
                  borderRadius: '4px',
                  background: 'rgba(15, 23, 42, 0.85)',
                  color: 'var(--accent-secondary)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  cursor: 'pointer'
                }}
                title="Move project to another user"
              >
                <option value="">Move to: Unassigned</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    Move to: {u.username}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Priority Controls */}
          {canModify && onShiftPriority && (
            <div style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(0,0,0,0.5)', borderRadius: '4px', padding: '1px' }} onClick={(e) => e.stopPropagation()}>
              <button 
                className="btn btn-secondary btn-sm"
                style={{ padding: '1px 3px', fontSize: '0.6rem', border: 'none' }}
                onClick={() => onShiftPriority(project, -1)}
                title="Move up in priority"
                disabled={project.priority <= 1}
              >
                <ChevronUp size={11} color={project.priority <= 1 ? '#64748b' : '#34d399'} />
              </button>
              <button 
                className="btn btn-secondary btn-sm"
                style={{ padding: '1px 3px', fontSize: '0.6rem', border: 'none' }}
                onClick={() => onShiftPriority(project, 1)}
                title="Move down in priority"
                disabled={project.priority >= 5}
              >
                <ChevronDown size={11} color={project.priority >= 5 ? '#64748b' : '#fca5a5'} />
              </button>
            </div>
          )}

          <span className={`badge-priority p${project.priority}`} style={{ fontSize: '0.625rem', padding: '0.1rem 0.35rem' }}>
            P{project.priority}
          </span>
        </div>

        {/* Gauge Percentage & Last Updated Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
          
          {/* Quick Schedule Shift controls */}
          {canModify && (
            <div style={{ display: 'flex', gap: '2px' }} onClick={(e) => e.stopPropagation()}>
              <button 
                className="btn btn-secondary btn-sm" 
                style={{ padding: '2px 4px', fontSize: '0.625rem' }} 
                onClick={() => onShiftDays(project, -1)}
                title="Shift schedule -1 day"
              >
                -1d
              </button>
              <button 
                className="btn btn-secondary btn-sm" 
                style={{ padding: '2px 4px', fontSize: '0.625rem' }} 
                onClick={() => onShiftDays(project, 1)}
                title="Shift schedule +1 day"
              >
                +1d
              </button>
            </div>
          )}

          {/* Progress Percentage Badge */}
          <span style={{ 
            fontSize: '0.725rem', 
            fontWeight: 800,
            padding: '0.1rem 0.45rem',
            borderRadius: '5px',
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: project.progress_percentage >= 75 ? '#34d399' : project.progress_percentage >= 35 ? '#fbbf24' : '#a5b4fc'
          }}>
            {project.progress_percentage}%
          </span>

          {/* Last Progress Updated Timestamp */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
            <Clock size={10} />
            <span>{formatRelativeTime(project.progress_updated_at)}</span>
          </div>

        </div>

      </div>
    </div>
  );
}
