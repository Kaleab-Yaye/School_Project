// js/components.js

// Global user session cache to avoid duplicate checks
let currentUserSession = null;
let sessionChecked = false;

async function checkUserSession() {
    if (sessionChecked) return currentUserSession;
    try {
        const response = await apiGet('/auth/session.php');
        if (response && response.success) {
            currentUserSession = response.data;
        } else {
            currentUserSession = null;
        }
    } catch (e) {
        currentUserSession = null;
    }
    sessionChecked = true;
    return currentUserSession;
}

async function renderNavbar() {
    const header = document.querySelector('header');
    if (!header) return;

    header.className = 'navbar';
    
    const user = await checkUserSession();
    
    let actionsHtml = '';
    if (user) {
        const initials = getInitials(user.username);
        const avatarHtml = user.avatar 
            ? `<img src="${user.avatar}" alt="${escapeHtml(user.username)}">`
            : initials;

        actionsHtml = `
            <div class="navbar-user" id="nav-user-menu">
                <div class="avatar avatar-sm">${avatarHtml}</div>
                <div class="navbar-dropdown" id="nav-user-dropdown">
                    <div style="padding: var(--space-sm) var(--space-lg); font-size: var(--text-xs); color: var(--text-tertiary);">
                        Logged in as <strong style="color: var(--text-primary);">${escapeHtml(user.username)}</strong>
                    </div>
                    <div class="navbar-dropdown-divider"></div>
                    <a href="dashboard.html" class="navbar-dropdown-item">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> Dashboard
                    </a>
                    ${user.role === 'admin' ? `
                    <a href="admin.html" class="navbar-dropdown-item">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> Admin Panel
                    </a>` : ''}
                    <div class="navbar-dropdown-divider"></div>
                    <a href="#" class="navbar-dropdown-item" id="nav-logout-btn">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg> Logout
                    </a>
                </div>
            </div>
        `;
    } else {
        actionsHtml = `
            <a href="login.html" class="btn btn-ghost btn-sm">Login</a>
            <a href="register.html" class="btn btn-primary btn-sm">Register</a>
        `;
    }

    const currentFilename = window.location.pathname.split('/').pop() || 'index.html';

    header.innerHTML = `
        <div class="container navbar-container">
            <a href="index.html" class="navbar-brand">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5"/></svg>
                <span>StudentHub</span>
            </a>
            
            <nav>
                <ul class="navbar-nav" id="navbar-nav">
                    <li><a href="index.html" class="navbar-link ${currentFilename === 'index.html' || currentFilename === '' ? 'active' : ''}">Home</a></li>
                    <li><a href="browse.html" class="navbar-link ${['browse.html', 'department.html', 'year.html', 'semester.html', 'course.html'].includes(currentFilename) ? 'active' : ''}">Browse</a></li>
                    <li><a href="upload.html" class="navbar-link ${currentFilename === 'upload.html' ? 'active' : ''}">Upload</a></li>
                    <li><a href="search.html" class="navbar-link ${currentFilename === 'search.html' ? 'active' : ''}">Search</a></li>
                </ul>
            </nav>

            <div class="navbar-actions" id="navbar-actions">
                ${actionsHtml}
            </div>

            <button class="navbar-mobile-toggle" id="nav-toggle" aria-label="Toggle navigation">
                ☰
            </button>
        </div>
    `;

    // Bind event listeners for dropdowns and toggles
    initNavbarListeners();
}

function initNavbarListeners() {
    const navToggle = document.getElementById('nav-toggle');
    const navList = document.getElementById('navbar-nav');
    const actions = document.getElementById('navbar-actions');
    const userMenu = document.getElementById('nav-user-menu');
    const userDropdown = document.getElementById('nav-user-dropdown');
    const logoutBtn = document.getElementById('nav-logout-btn');

    if (navToggle) {
        navToggle.addEventListener('click', () => {
            navList.classList.toggle('active');
            // Duplicate action items on mobile menu
            if (navList.classList.contains('active')) {
                navToggle.textContent = '✕';
            } else {
                navToggle.textContent = '☰';
            }
        });
    }

    if (userMenu && userDropdown) {
        userMenu.addEventListener('click', (e) => {
            e.stopPropagation();
            userDropdown.classList.toggle('active');
        });
        
        document.addEventListener('click', () => {
            userDropdown.classList.remove('active');
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                const res = await apiPost('/auth/logout.php');
                if (res.success) {
                    currentUserSession = null;
                    sessionChecked = true;
                    showToast('Logged out successfully.', 'success');
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 1000);
                }
            } catch (err) {
                showToast(err.message || 'Logout failed.', 'error');
            }
        });
    }
}

function renderFooter() {
    const footer = document.querySelector('footer');
    if (!footer) return;

    footer.className = 'footer';
    footer.innerHTML = `
        <div class="container footer-container">
            <div class="footer-brand">
                <div class="footer-logo"><span>StudentHub</span></div>
                <p class="footer-desc">A premium collaborative resource hub built by students, for students. Share study guides, exam sheets, and lecture notes.</p>
            </div>
            <div>
                <h4 class="footer-links-title">Explore</h4>
                <ul class="footer-links">
                    <li class="footer-link"><a href="index.html">Home</a></li>
                    <li class="footer-link"><a href="browse.html">Browse Resources</a></li>
                    <li class="footer-link"><a href="upload.html">Upload File</a></li>
                </ul>
            </div>
            <div>
                <h4 class="footer-links-title">Legal</h4>
                <ul class="footer-links">
                    <li class="footer-link"><a href="#">Terms of Service</a></li>
                    <li class="footer-link"><a href="#">Privacy Policy</a></li>
                    <li class="footer-link"><a href="#">DCMA / Copyright Claims</a></li>
                </ul>
            </div>
        </div>
        <div class="container footer-bottom">
            <div>© ${new Date().getFullYear()} StudentHub. All rights reserved.</div>
            <div>Designed for academic excellence. Built locally with HTML, CSS, JS, PHP & MySQL.</div>
        </div>
    `;
}

function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = '';
    if (type === 'success') icon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-success)" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>';
    if (type === 'error') icon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-warning)" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
    if (type === 'warning') icon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="orange" stroke-width="2.5" stroke-linecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
    if (type === 'info') icon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-secondary)" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';

    toast.innerHTML = `
        <div class="toast-body">
            <span style="margin-right: var(--space-sm); display: inline-flex; align-items: center;">${icon}</span>${escapeHtml(message)}
        </div>
        <button class="toast-close">✕</button>
    `;

    container.appendChild(toast);

    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
        dismissToast(toast);
    });

    // Auto-dismiss
    setTimeout(() => {
        dismissToast(toast);
    }, TOAST_DURATION_MS);
}

function dismissToast(toast) {
    toast.style.animation = 'toastSlideOut 300ms ease forwards';
    toast.addEventListener('animationend', () => {
        toast.remove();
        const container = document.getElementById('toast-container');
        if (container && container.childNodes.length === 0) {
            container.remove();
        }
    });
}

let modalResolve = null;
let modalReject = null;

function showModal(options = {}) {
    const {
        title = 'Are you sure?',
        body = 'Do you want to proceed with this action?',
        confirmText = 'Confirm',
        cancelText = 'Cancel',
        danger = false
    } = options;

    // Remove existing modal if any
    hideModal();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'global-modal-overlay';

    overlay.innerHTML = `
        <div class="modal animate-scaleIn">
            <div class="modal-header">
                <h3 class="modal-title">${escapeHtml(title)}</h3>
                <button class="btn btn-ghost btn-icon" id="modal-close-btn" style="border-radius: 50%;">✕</button>
            </div>
            <div class="modal-body">
                <div>${body}</div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" id="modal-cancel-btn">${escapeHtml(cancelText)}</button>
                <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="modal-confirm-btn">${escapeHtml(confirmText)}</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    
    // Force browser reflow to trigger transition
    overlay.offsetHeight;
    overlay.classList.add('active');

    return new Promise((resolve, reject) => {
        modalResolve = resolve;
        modalReject = reject;

        const handleConfirm = () => {
            hideModal();
            resolve(true);
        };

        const handleCancel = () => {
            hideModal();
            resolve(false);
        };

        document.getElementById('modal-confirm-btn').addEventListener('click', handleConfirm);
        document.getElementById('modal-cancel-btn').addEventListener('click', handleCancel);
        document.getElementById('modal-close-btn').addEventListener('click', handleCancel);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) handleCancel();
        });
        
        // Handle ESC key
        overlay._escHandler = (e) => {
            if (e.key === 'Escape') handleCancel();
        };
        document.addEventListener('keydown', overlay._escHandler);
    });
}

function hideModal() {
    const overlay = document.getElementById('global-modal-overlay');
    if (!overlay) return;

    if (overlay._escHandler) {
        document.removeEventListener('keydown', overlay._escHandler);
    }

    overlay.classList.remove('active');
    const modal = overlay.querySelector('.modal');
    if (modal) {
        modal.style.transform = 'scale(0.9)';
    }

    overlay.addEventListener('transitionend', () => {
        overlay.remove();
    });
}

function renderBreadcrumb(container, items = []) {
    if (!container) return;
    
    let html = `
        <li class="breadcrumb-item"><a href="index.html">Home</a></li>
        <span class="breadcrumb-separator">/</span>
    `;

    items.forEach((item, idx) => {
        const isLast = idx === items.length - 1;
        if (isLast) {
            html += `<li class="breadcrumb-item active">${escapeHtml(item.label)}</li>`;
        } else {
            html += `
                <li class="breadcrumb-item"><a href="${item.url}">${escapeHtml(item.label)}</a></li>
                <span class="breadcrumb-separator">/</span>
            `;
        }
    });

    container.className = 'breadcrumb';
    container.innerHTML = html;
}

function renderEmptyState(container, options = {}) {
    if (!container) return;
    const {
        icon = '📂',
        title = 'No resources found',
        message = 'Be the first to upload one for this category!',
        actionText = '',
        actionUrl = ''
    } = options;

    container.innerHTML = `
        <div class="empty-state animate-fadeIn">
            <div class="empty-state-icon">${icon}</div>
            <h3 class="empty-state-title">${escapeHtml(title)}</h3>
            <p class="empty-state-message">${escapeHtml(message)}</p>
            ${actionText && actionUrl ? `
                <a href="${actionUrl}" class="btn btn-primary">${escapeHtml(actionText)}</a>
            ` : ''}
        </div>
    `;
}

function renderSkeleton(container, count = 3, type = 'card') {
    if (!container) return;
    let html = '';
    
    if (type === 'card') {
        html = '<div class="card-grid">';
        for (let i = 0; i < count; i++) {
            html += `
                <div class="card" style="min-height: 250px;">
                    <div class="card-cover skeleton" style="height: 140px;"></div>
                    <div class="card-body">
                        <div class="skeleton" style="height: 20px; width: 70%; margin-bottom: var(--space-sm);"></div>
                        <div class="skeleton" style="height: 14px; width: 90%; margin-bottom: var(--space-xs);"></div>
                        <div class="skeleton" style="height: 14px; width: 50%;"></div>
                    </div>
                </div>
            `;
        }
        html += '</div>';
    } else if (type === 'list') {
        html = '<div style="display: flex; flex-direction: column; gap: var(--space-md);">';
        for (let i = 0; i < count; i++) {
            html += `
                <div class="card" style="padding: var(--space-md); flex-direction: row; gap: var(--space-md); align-items: center;">
                    <div class="skeleton" style="width: 50px; height: 50px; border-radius: var(--radius-md); flex-shrink: 0;"></div>
                    <div style="flex-grow: 1;">
                        <div class="skeleton" style="height: 16px; width: 40%; margin-bottom: var(--space-xs);"></div>
                        <div class="skeleton" style="height: 12px; width: 60%;"></div>
                    </div>
                </div>
            `;
        }
        html += '</div>';
    } else if (type === 'text') {
        for (let i = 0; i < count; i++) {
            html += `
                <div class="skeleton" style="height: 16px; width: ${80 + Math.random() * 20}%; margin-bottom: var(--space-sm); border-radius: 4px;"></div>
            `;
        }
    }

    container.innerHTML = html;
}

function createCard(options = {}) {
    const {
        cover = '',
        coverGradient = '',
        title = '',
        subtitle = '',
        badges = [],
        stats = [],
        url = '#',
        footer = ''
    } = options;

    const badgeHtml = badges.map(b => `<span class="badge badge-${b.type} card-badge">${escapeHtml(b.text)}</span>`).join('');
    const statHtml = stats.map(s => `<span>${s.icon} ${escapeHtml(s.value)}</span>`).join('');

    const coverStyle = cover 
        ? `background-image: url('${cover}'); background-size: cover; background-position: center;`
        : `background: ${coverGradient || 'var(--bg-tertiary)'};`;

    return `
        <a href="${url}" class="card">
            <div class="card-cover" style="${coverStyle}">
                ${badgeHtml}
            </div>
            <div class="card-body">
                <h3 class="card-title">${escapeHtml(title)}</h3>
                <p class="card-text">${escapeHtml(subtitle)}</p>
            </div>
            ${stats.length > 0 || footer ? `
                <div class="card-footer">
                    ${footer ? footer : `<div style="display: flex; gap: var(--space-md); font-size: var(--text-xs); color: var(--text-secondary);">${statHtml}</div>`}
                </div>
            ` : ''}
        </a>
    `;
}

// Call on load
document.addEventListener('DOMContentLoaded', () => {
    // Generate page header placeholder if it's there
    initNavbar();
    renderFooter();
});

async function initNavbar() {
    await renderNavbar();
}
