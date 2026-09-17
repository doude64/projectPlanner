# 🗓️ Projects Planner

A modern, full-stack web application designed for interactive project planning, priority tracking, and timeline scheduling over time.

---

## 🌟 Overview & Features

**Projects Planner** provides an intuitive calendar timeline where project managers and team members can graphically organize projects, adjust schedules, and monitor progress.

### 🚀 Key Capabilities

- 📅 **Interactive Calendar Timeline**:
  - **Default 30-Day View**: Displays projects on a 30-day timeline by default.
  - **Flexible View Modes**: Switch between 30 days, 14 days, 7 days, or a **Custom Date Range** selector (`From:` and `To:` date pickers).
  - **Graphical Drag & Drop**: Drag handles to adjust start dates, end dates, or body shift schedules with live visual updates.

- 👤 **User Sections Layout**:
  - Primary agenda view groups projects into dedicated sections for each user displayed in the agenda (plus an *Unassigned Projects* lane).
  - Easily re-assign projects between users using vertical drag-and-drop or the 1-click user selector dropdown.
  - Prioritize tasks within user sections with 1-click `▲` / `▼` controls.

- 🏷️ **Narrow Bar Title Readability**:
  - Automatically detects when a project progress bar is narrow or too small to contain its name.
  - Places the project title **outside to the left of the bar** inside a high-contrast dark backdrop badge with a directional indicator (`➔`).

- 📊 **Progress Gauge & Status Tracking**:
  - Visual percentage fill (0-100%) color-coded by progress tier (emerald green for high progress, amber yellow for mid progress).
  - Automatic timestamping (`progress_updated_at`) tracking relative update time (e.g. *"Just now"*, *"2h ago"*, *"Yesterday"*).

- 🔐 **Role-Based Access Control (RBAC)**:
  - **`admin`**: Full system permissions — create/manage users, toggle agenda visibility, reset user passwords, create projects, and assign projects to any user.
  - **`editor`**: Create projects, edit assigned projects (start/end dates, progress percentage), and reassign projects to self.
  - **`reader`**: Read-only access to view calendar agenda and timeline schedules.

- 👁️ **Agenda Visibility Control**:
  - Option on user creation (`display_in_agenda`) to show or hide a user from the calendar agenda timeline.

- 🔑 **Account Security**:
  - Self-service password change modal for logged-in users + admin password reset capability.

---

## 🔑 Default Accounts

Upon database initialization, the following seed accounts are created:

| Username | Password | Role | Display in Agenda |
| :--- | :--- | :--- | :--- |
| **`admin`** | **`didier`** | `admin` | `YES` |
| **`editor_john`** | `editor123` | `editor` | `YES` |
| **`reader_sarah`** | `reader123` | `reader` | `YES` |
| **`editor_hidden`** | `hidden123` | `editor` | `NO` |

---

## 🛠️ Technology Stack

- **Frontend**: React (Vite), Lucide-React Icons, Vanilla CSS (Glassmorphism design system with modern HSL tokens).
- **Backend**: Node.js, Express.js.
- **Database**: SQLite (`better-sqlite3`) initialized automatically in `data/projects_planner.db`.
- **Authentication**: JWT (JSON Web Tokens) with HTTP Authorization headers and bcryptjs password hashing.

---

## 💻 Installation & Quick Start

### 1. Prerequisites
- Node.js (v18+ recommended)
- npm

### 2. Install Dependencies
```bash
npm install
```

### 3. Build & Run Application

#### Production Mode (Single Port 3001)
Build the Vite bundle and start the Node Express server (which serves the frontend dist and backend APIs):
```bash
npm run build
npm run server
```
Access the application in your browser at:  
👉 **[http://localhost:3001](http://localhost:3001)**

#### Development Mode
Run the backend server and Vite dev server concurrently:
```bash
# Terminal 1: Start Backend API
npm run server

# Terminal 2: Start Vite Dev Server
npm run dev
```

---

## 📁 Project Structure

```
projectsPlaner/
├── data/                    # SQLite database storage (projects_planner.db)
├── dist/                    # Production Vite build artifacts
├── server/
│   ├── index.js             # Express server entrypoint & static middleware
│   ├── db.js                # SQLite database connection & seed initialization
│   ├── auth.js              # JWT authentication & RBAC middleware
│   └── routes/
│       ├── auth.js          # Login & password change routes
│       ├── users.js         # Admin user CRUD & agenda visibility routes
│       └── projects.js      # Project CRUD, reassign, & move endpoints
├── src/
│   ├── components/
│   │   ├── Navbar.jsx       # Header & quick user status actions
│   │   ├── CalendarTimeline.jsx  # Interactive calendar, user sections & narrow bar titles
│   │   ├── ProjectModal.jsx # Project creation & editing form
│   │   ├── AdminUsersPanel.jsx   # Admin user management panel
│   │   ├── ChangePasswordModal.jsx # User password update modal
│   │   └── LoginModal.jsx   # Authentication modal
│   ├── App.jsx              # Main React state & modal router
│   ├── main.jsx             # React DOM entry point
│   └── index.css            # Dark glassmorphism styling & tokens
├── index.html               # Main HTML entrypoint
├── package.json             # Scripts & dependencies
└── vite.config.js           # Vite build configuration
```

---

## 👥 Role Permissions Matrix

| Capability / Action | Admin | Editor | Reader |
| :--- | :---: | :---: | :---: |
| View Calendar Agenda & Timeline | ✅ | ✅ | ✅ |
| Change Own Password | ✅ | ✅ | ✅ |
| Create Projects | ✅ | ✅ | ❌ |
| Edit Assigned Projects (start, end, progress %, assign to self) | ✅ | ✅ | ❌ |
| Assign Projects to Anyone | ✅ | ❌ | ❌ |
| Create Users (with `display_in_agenda` flag) | ✅ | ❌ | ❌ |
| Reset Any User's Password | ✅ | ❌ | ❌ |

---

## 📜 License

MIT License.
