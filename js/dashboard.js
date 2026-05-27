// js/dashboard.js

document.addEventListener('DOMContentLoaded', async () => {
    // Force authorization
    const user = await checkUserSession();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    // UI elements references
    const avatar = document.getElementById('profile-avatar');
    const username = document.getElementById('profile-username');
    const email = document.getElementById('profile-email');
    const roleBadge = document.getElementById('profile-role');
    const joinedDate = document.getElementById('profile-joined');

    // Stats Highlights
    const uploadsCount = document.getElementById('highlight-uploads');
    const likesReceived = document.getElementById('highlight-likes');
    const bookmarksCount = document.getElementById('highlight-bookmarks');

    // Tabs
    const tabUploads = document.getElementById('tab-uploads');
    const tabBookmarks = document.getElementById('tab-bookmarks');
    const itemsContainer = document.getElementById('dashboard-items-container');

    // Data Cache Arrays
    let userUploads = [];
    let userBookmarks = [];

    // Set initial loading placeholders
    renderSkeleton(itemsContainer, 3, 'card');

    try {
        // 1. Fetch user Profile details
        const profileRes = await apiGet('/users/profile.php');
        if (profileRes && profileRes.success) {
            const data = profileRes.data;
            const u = data.user;
            
            // Populate profile sidebar
            username.textContent = u.username;
            email.textContent = u.email;
            roleBadge.textContent = u.role.charAt(0).toUpperCase() + u.role.slice(1);
            joinedDate.textContent = formatDate(u.created_at);
            
            const initials = getInitials(u.username);
            avatar.innerHTML = u.avatar 
                ? `<img src="${u.avatar}" alt="${escapeHtml(u.username)}">`
                : initials;

            // Populate counts
            uploadsCount.textContent = data.stats.uploads;
            likesReceived.textContent = data.stats.likes_received;
            bookmarksCount.textContent = data.stats.bookmarks;
        }

        // 2. Fetch both datasets in parallel
        const [uploadsRes, bookmarksRes] = await Promise.all([
            apiGet('/users/uploads.php'),
            apiGet('/users/bookmarks.php')
        ]);

        if (uploadsRes && uploadsRes.success) userUploads = uploadsRes.data;
        if (bookmarksRes && bookmarksRes.success) userBookmarks = bookmarksRes.data;

        // Render default tab
        renderUploadsTab();

    } catch (err) {
        showToast(err.message || 'Failed to load dashboard profile.', 'error');
    }

    // Tab bindings events
    tabUploads.addEventListener('click', () => {
        tabUploads.classList.add('active');
        tabBookmarks.classList.remove('active');
        renderUploadsTab();
    });

    tabBookmarks.addEventListener('click', () => {
        tabBookmarks.classList.add('active');
        tabUploads.classList.remove('active');
        renderBookmarksTab();
    });

    // ==========================================
    // RENDER TAB VIEWERS
    // ==========================================
    function renderUploadsTab() {
        if (userUploads.length === 0) {
            renderEmptyState(itemsContainer, {
                icon: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="1.5" style="margin-bottom: var(--space-md);"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`,
                title: 'No Contributions Yet',
                message: 'You have not uploaded any study guides or notes. Support your peers by uploading one today!',
                actionText: 'Upload Resource',
                actionUrl: 'upload.html'
            });
            return;
        }

        let html = '<div class="card-grid animate-fadeIn">';
        userUploads.forEach(res => {
            const typeText = res.resource_type === 'pdf' ? 'PDF File' : (res.resource_type === 'link' ? 'External Link' : 'Text Note');
            const examText = res.exam_type.toUpperCase();
            
            // Create download button based on resource type
            let actionButton = '';
            if (res.resource_type === 'pdf' && res.file_path) {
                actionButton = `<a href="${res.file_path}" download class="btn btn-primary btn-sm" style="margin-top: var(--space-md); display: inline-block;">📥 Download PDF</a>`;
            } else if (res.resource_type === 'link' && res.external_link) {
                actionButton = `<a href="${res.external_link}" target="_blank" class="btn btn-primary btn-sm" style="margin-top: var(--space-md); display: inline-block;">🔗 Open Link</a>`;
            } else if (res.resource_type === 'note') {
                actionButton = `<span class="badge badge-info" style="margin-top: var(--space-md); display: inline-block;">📝 View Note</span>`;
            }

            const coverStyle = res.cover_image 
                ? `background-image: url('${res.cover_image}'); background-size: cover; background-position: center;`
                : `background: ${generateGradient(res.gradient_seed || res.title)};`;

            html += `
                <div class="card">
                    <div class="card-cover" style="${coverStyle}">
                        <span class="badge badge-secondary card-badge">${escapeHtml(typeText)}</span>
                        <span class="badge badge-warning card-badge">${escapeHtml(examText)}</span>
                    </div>
                    <div class="card-body">
                        <h3 class="card-title">${escapeHtml(res.title)}</h3>
                        <p class="card-text">${escapeHtml(res.description || 'No description.')} (${escapeHtml(res.course_name)})</p>
                        ${actionButton}
                    </div>
                    <div class="card-footer">
                        <div style="display: flex; gap: var(--space-md); font-size: var(--text-xs); color: var(--text-secondary);">
                            <span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-right: 2px;"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> ${res.like_count || 0}</span>
                            <span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-right: 2px;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> ${res.view_count || 0}</span>
                        </div>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        itemsContainer.innerHTML = html;
    }

    function renderBookmarksTab() {
        if (userBookmarks.length === 0) {
            renderEmptyState(itemsContainer, {
                icon: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="1.5" style="margin-bottom: var(--space-md);"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`,
                title: 'No Saved Bookmarks',
                message: 'Bookmark resources for quick access during exam seasons. They will show up here.',
                actionText: 'Browse Resources',
                actionUrl: 'browse.html'
            });
            return;
        }

        let html = '<div class="card-grid animate-fadeIn">';
        userBookmarks.forEach(res => {
            const typeText = res.resource_type === 'pdf' ? 'PDF File' : (res.resource_type === 'link' ? 'External Link' : 'Text Note');
            const examText = res.exam_type.toUpperCase();
            
            // Create download button based on resource type
            let actionButton = '';
            if (res.resource_type === 'pdf' && res.file_path) {
                actionButton = `<a href="${res.file_path}" download class="btn btn-primary btn-sm" style="margin-top: var(--space-md); display: inline-block;">📥 Download PDF</a>`;
            } else if (res.resource_type === 'link' && res.external_link) {
                actionButton = `<a href="${res.external_link}" target="_blank" class="btn btn-primary btn-sm" style="margin-top: var(--space-md); display: inline-block;">🔗 Open Link</a>`;
            } else if (res.resource_type === 'note') {
                actionButton = `<span class="badge badge-info" style="margin-top: var(--space-md); display: inline-block;">📝 View Note</span>`;
            }

            const coverStyle = res.cover_image 
                ? `background-image: url('${res.cover_image}'); background-size: cover; background-position: center;`
                : `background: ${generateGradient(res.gradient_seed || res.title)};`;

            html += `
                <div class="card">
                    <div class="card-cover" style="${coverStyle}">
                        <span class="badge badge-secondary card-badge">${escapeHtml(typeText)}</span>
                        <span class="badge badge-warning card-badge">${escapeHtml(examText)}</span>
                    </div>
                    <div class="card-body">
                        <h3 class="card-title">${escapeHtml(res.title)}</h3>
                        <p class="card-text">${escapeHtml(res.description || 'No description.')} (by ${escapeHtml(res.uploader_name || 'Anonymous')})</p>
                        ${actionButton}
                    </div>
                    <div class="card-footer">
                        <div style="display: flex; gap: var(--space-md); font-size: var(--text-xs); color: var(--text-secondary);">
                            <span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-right: 2px;"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> ${res.like_count || 0}</span>
                            <span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-right: 2px;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> ${res.view_count || 0}</span>
                        </div>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        itemsContainer.innerHTML = html;
    }
});
