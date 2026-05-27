# Smart Student Resource Hub

A locally-hosted college academic knowledge base website built with **pure HTML, CSS, JavaScript** on the frontend, and **vanilla PHP + MySQL** on the backend. Designed for college students to collaboratively build a course database, upload study materials (PDFs, links, or text notes), and write discussion comments.

---

## 🛠️ Technology Stack
- **Frontend:** HTML5, CSS3 (variables, animations, grids, glassmorphism), JavaScript (vanilla fetch API, AJAX type-ahead search, debounced key inputs)
- **Backend:** PHP 7+ (no frameworks, pure PDO prepared statements)
- **Database:** MySQL (relational constraints, indexing, fulltext index search matching)
- **Stack Platform:** WAMP Server on Windows

---

## ⚙️ WAMP Installation & Setup

Follow these steps to deploy and run the project locally on your WAMP server:

### 1. Copy Project to htdocs
Copy the entire `school_project` folder into your local WAMP root directory (typically `C:\wamp64\www\`).
Your final path should look like:
`C:\wamp64\www\school_project\`

### 2. Startup WAMP Services
Make sure your WAMP Server is running. The WAMP tray icon in the Windows taskbar must be **green** (Apache and MySQL services are active).

### 3. Create & Initialize MySQL Database
Open your web browser and execute the database installer script by visiting:
👉 **[http://localhost/school_project/api/setup/install.php](http://localhost/school_project/api/setup/install.php)**

This script will automatically:
1. Create a MySQL database named `student_resource_hub`.
2. Create all relational tables (`users`, `departments`, `years`, `semesters`, `courses`, `resources`, `comments`, `likes`, `bookmarks`) with proper foreign keys, cascade deletes, and unique constraint tags.
3. Configure full-text search indexes on resources title/description and comments text.
4. Seed the default admin profile credentials.
5. Setup file directories under `/uploads/` for files storage.

### 4. Admin Credentials
The installation script creates a default administrator account:
- **Email:** `admin@hub.local`
- **Password:** `Admin123!`
- **Username:** `admin`

---

## 📁 Key Folder Structure

```
school_project/
├── api/                  # PHP REST-ish API endpoints
│   ├── auth/             # Session logins, registrations, and logouts
│   ├── departments/      # Category profiles lists, retrievals, and additions
│   ├── years/            # Class year endpoints
│   ├── semesters/        # Semester listings
│   ├── courses/          # Course lists and autocompletes
│   ├── resources/        # Material uploads, likes, bookmarks, and views
│   ├── comments/         # Forum comments additions and removals
│   ├── admin/            # Statistics, users listing and bans toggles
│   ├── config/           # PDO DB singleton database.php
│   ├── middleware/       # Session auth checks and role admin checks
│   └── setup/            # Installer database creation script
├── css/                  # Frontend Styles sheets
│   ├── variables.css     # Dark-mode HSL colors variables and tokens
│   ├── base.css          # Resets, scrollbar, typography, alignment utilities
│   ├── components.css    # Buttons, cards, modals, toast popups, skeletons
│   ├── layout.css        # Navbar, footers, responsive grid layout system
│   ├── animations.css    # Fade-ins, slide-ups, heart-beats, shimmer skeletons
│   └── pages/            # Page-scoped styles (auth, upload, dashboard, search)
├── js/                   # Frontend Modules JavaScript
│   ├── config.js         # Endpoint URLs settings
│   ├── api.js            # Standard Fetch HTTP API wrapper (apiGet, apiPost...)
│   ├── utils.js          # Debounce, formatDate, validateEmail, generateGradient
│   ├── components.js     # Responsive navbar loader, modal popups, toast notifications
│   ├── auth.js           # Signup validations, strength indicators, logins AJAX
│   ├── search.js         # Type-ahead autocompletes matching inputs dropdown
│   └── browse.js         # Category listings, modal creation calls
├── uploads/              # Local server files directory (gitignored)
│   ├── resources/        # Uploaded PDF files
│   ├── covers/           # Cover images overrides
│   └── avatars/          # Profile avatars
├── index.html            # Public landing page with type-ahead search
├── login.html            # Registration logins card
├── register.html         # Signup cards with password meters
├── browse.html           # Main browsing index page
├── department.html       # Department detail container
├── year.html             # Academic year semesters
├── semester.html         # Semester course classes directory
├── course.html           # Courses resource sheets listing
├── resource.html         # PDF embeds, link actions, scroll note box viewer
├── search.html           # Full-text results page with checkboxes filter sidebars
├── dashboard.html        # Student uploads and bookmarks panel
└── admin.html            # Moderations page for banning users or deleting content
```

---

## 🔒 Security Features
1. **Prepared SQL Statements:** All MySQL operations use PDO parameters binding, preventing SQL injection vulnerabilities.
2. **Password Cryptography:** User passwords are encrypted using PHP `password_hash()` with the bcrypt algorithm.
3. **Upload Guard Policies:** The `/uploads/` directory contains a secondary `.htaccess` block prohibiting direct script executions of uploaded PHP or script files.
4. **Session Token Guards:** Middleware checks verifying sessions and banned statuses operate on every writing database endpoint.
