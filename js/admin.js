// js/admin.js

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Force Admin access authorization check
    const user = await checkUserSession();
    if (!user || user.role !== 'admin') {
        showToast('Unauthorized access. Admin privileges required.', 'error');
        setTimeout(() => {
            window.location.href = user ? 'dashboard.html' : 'login.html';
        }, 1000);
        return;
    }

    // Tabs
    const tabUsers = document.getElementById('tab-users');
    const tabDepts = document.getElementById('tab-depts');
    const tabResources = document.getElementById('tab-resources');
    const tableWrapper = document.getElementById('admin-table-wrapper');

    // Data Cache lists
    let cacheUsers = [];
    let cacheDepts = [];
    let cacheResources = [];

    // Initial load
    renderSkeleton(tableWrapper, 4, 'list');
    await loadUsersTab();

    // Bind tab clicks
    tabUsers.addEventListener('click', async () => {
        switchTab(tabUsers);
        renderSkeleton(tableWrapper, 4, 'list');
        await loadUsersTab();
    });

    tabDepts.addEventListener('click', async () => {
        switchTab(tabDepts);
        renderSkeleton(tableWrapper, 4, 'list');
        await loadDeptsTab();
    });

    tabResources.addEventListener('click', async () => {
        switchTab(tabResources);
        renderSkeleton(tableWrapper, 4, 'list');
        await loadResourcesTab();
    });

    function switchTab(activeTab) {
        [tabUsers, tabDepts, tabResources].forEach(t => t.classList.remove('active'));
        activeTab.classList.add('active');
    }

    // ==========================================
    // 1. USERS MODERATION
    // ==========================================
    async function loadUsersTab() {
        try {
            const res = await apiGet('/admin/users.php');
            if (res && res.success) {
                cacheUsers = res.data;
                renderUsersTable();
            }
        } catch (e) {
            showToast('Failed to load users list.', 'error');
        }
    }

    function renderUsersTable() {
        if (cacheUsers.length === 0) {
            tableWrapper.innerHTML = `<div style="padding: var(--space-xl); text-align:center; color: var(--text-tertiary);">No users registered.</div>`;
            return;
        }

        let html = `
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Username</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Joined</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
        `;

        cacheUsers.forEach(u => {
            const statusClass = u.is_banned ? 'status-banned' : 'status-active';
            const statusText = u.is_banned ? 'Banned' : 'Active';
            
            // Disable self action button
            const isSelf = u.id === user.id;

            html += `
                <tr>
                    <td style="font-weight:600; color:var(--text-primary);">${escapeHtml(u.username)}</td>
                    <td>${escapeHtml(u.email)}</td>
                    <td><span class="badge ${u.role === 'admin' ? 'badge-primary' : 'badge-secondary'}">${u.role}</span></td>
                    <td><span class="status-indicator ${statusClass}">${statusText}</span></td>
                    <td>${formatDate(u.created_at)}</td>
                    <td class="admin-actions-cell">
                        ${isSelf ? `
                            <span style="font-size: var(--text-xs); color: var(--text-tertiary);">Logged In</span>
                        ` : `
                            <button class="btn ${u.is_banned ? 'btn-secondary' : 'btn-danger'} btn-sm ban-toggle-btn" data-id="${u.id}">
                                ${u.is_banned ? '🟢 Unban' : '🚫 Ban'}
                            </button>
                        `}
                    </td>
                </tr>
            `;
        });

        html += `
                </tbody>
            </table>
        `;
        tableWrapper.innerHTML = html;

        // Bind ban toggles events
        tableWrapper.querySelectorAll('.ban-toggle-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                toggleUserBan(parseInt(btn.dataset.id));
            });
        });
    }

    async function toggleUserBan(userId) {
        const u = cacheUsers.find(item => item.id === userId);
        if (!u) return;

        const actionText = u.is_banned ? 'unban' : 'ban';
        const confirmBan = await showModal({
            title: `${actionText.charAt(0).toUpperCase() + actionText.slice(1)} User`,
            body: `Are you sure you want to ${actionText} student user <strong>${escapeHtml(u.username)}</strong>?`,
            confirmText: actionText.charAt(0).toUpperCase() + actionText.slice(1),
            cancelText: 'Cancel',
            danger: !u.is_banned
        });

        if (confirmBan) {
            try {
                const res = await apiPost('/admin/users.php', { user_id: userId });
                if (res.success) {
                    showToast(res.message, 'success');
                    await loadUsersTab();
                }
            } catch (err) {
                showToast(err.message || 'Action failed.', 'error');
            }
        }
    }

    // ==========================================
    // 2. DEPARTMENTS MODERATION
    // ==========================================
    async function loadDeptsTab() {
        try {
            const res = await apiGet('/departments/list.php');
            if (res && res.success) {
                cacheDepts = res.data;
                renderDeptsTable();
            }
        } catch (e) {
            showToast('Failed to load departments list.', 'error');
        }
    }

    function renderDeptsTable() {
        if (cacheDepts.length === 0) {
            tableWrapper.innerHTML = `<div style="padding: var(--space-xl); text-align:center; color: var(--text-tertiary);">No departments found.</div>`;
            return;
        }

        let html = `
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Department Name</th>
                        <th>Slug</th>
                        <th>Course Count</th>
                        <th>Created At</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
        `;

        cacheDepts.forEach(d => {
            html += `
                <tr>
                    <td style="font-weight:600; color:var(--text-primary);">${escapeHtml(d.name)}</td>
                    <td>${escapeHtml(d.slug)}</td>
                    <td>${d.course_count} Courses</td>
                    <td>${formatDate(d.created_at)}</td>
                    <td class="admin-actions-cell">
                        <button class="btn btn-danger btn-sm delete-dept-btn" data-id="${d.id}">
                            🗑️ Delete
                        </button>
                    </td>
                </tr>
            `;
        });

        html += `
                </tbody>
            </table>
        `;
        tableWrapper.innerHTML = html;

        // Bind delete dept click events
        tableWrapper.querySelectorAll('.delete-dept-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                deleteDepartment(parseInt(btn.dataset.id));
            });
        });
    }

    async function deleteDepartment(deptId) {
        const d = cacheDepts.find(item => item.id === deptId);
        if (!d) return;

        const confirmDelete = await showModal({
            title: 'Delete Department',
            body: `⚠️ Warning: Deleting department <strong>${escapeHtml(d.name)}</strong> will permanently remove all nested Class Years, Semesters, Courses, Resources, and Comments (Cascading deletion). Proceed?`,
            confirmText: 'Delete All',
            cancelText: 'Cancel',
            danger: true
        });

        if (confirmDelete) {
            try {
                const res = await apiPost('/departments/delete.php', { id: deptId });
                if (res.success) {
                    showToast('Department and all children removed.', 'success');
                    await loadDeptsTab();
                }
            } catch (err) {
                showToast(err.message || 'Deletion failed.', 'error');
            }
        }
    }

    // ==========================================
    // 3. RESOURCES MODERATION
    // ==========================================
    async function loadResourcesTab() {
        try {
            const res = await apiGet('/resources/search.php?limit=100');
            if (res && res.success) {
                cacheResources = res.data;
                renderResourcesTable();
            }
        } catch (e) {
            showToast('Failed to load resources list.', 'error');
        }
    }

    function renderResourcesTable() {
        if (cacheResources.length === 0) {
            tableWrapper.innerHTML = `<div style="padding: var(--space-xl); text-align:center; color: var(--text-tertiary);">No uploaded resources found.</div>`;
            return;
        }

        let html = `
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Resource Title</th>
                        <th>Type</th>
                        <th>Category</th>
                        <th>Uploader</th>
                        <th>Upload Date</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
        `;

        cacheResources.forEach(r => {
            const typeText = r.resource_type === 'pdf' ? 'PDF File' : (r.resource_type === 'link' ? 'URL Link' : 'Text Note');
            
            // Create download/open button based on resource type
            let actionButton = '';
            if (r.resource_type === 'pdf' && r.file_path) {
                actionButton = `<a href="${r.file_path}" download class="btn btn-primary btn-xs" target="_blank">📥 Download</a>`;
            } else if (r.resource_type === 'link' && r.external_link) {
                actionButton = `<a href="${r.external_link}" target="_blank" class="btn btn-primary btn-xs">🔗 Open</a>`;
            } else if (r.resource_type === 'note') {
                actionButton = `<span class="badge badge-info">📝 Note</span>`;
            }
            
            html += `
                <tr>
                    <td style="font-weight:600; color:var(--text-primary);">
                        ${escapeHtml(r.title)} ${actionButton}
                    </td>
                    <td><span class="badge badge-secondary">${typeText}</span></td>
                    <td><span class="badge badge-warning">${r.exam_type.toUpperCase()}</span></td>
                    <td>${escapeHtml(r.uploader_name || 'Anonymous')}</td>
                    <td>${formatDate(r.created_at)}</td>
                    <td class="admin-actions-cell">
                        <button class="btn btn-danger btn-sm delete-res-btn" data-id="${r.id}">
                            🗑️ Delete
                        </button>
                    </td>
                </tr>
            `;
        });

        html += `
                </tbody>
            </table>
        `;
        tableWrapper.innerHTML = html;

        // Bind delete resource clicks
        tableWrapper.querySelectorAll('.delete-res-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                deleteResource(parseInt(btn.dataset.id));
            });
        });
    }

    async function deleteResource(resId) {
        const r = cacheResources.find(item => item.id === resId);
        if (!r) return;

        const confirmDelete = await showModal({
            title: 'Delete Resource',
            body: `Are you sure you want to permanently delete resource <strong>${escapeHtml(r.title)}</strong>? If it is a PDF file, it will be deleted from the server filesystem.`,
            confirmText: 'Delete',
            cancelText: 'Cancel',
            danger: true
        });

        if (confirmDelete) {
            try {
                const res = await apiPost('/resources/delete.php', { id: resId });
                if (res.success) {
                    showToast('Resource deleted successfully.', 'success');
                    await loadResourcesTab();
                }
            } catch (err) {
                showToast(err.message || 'Deletion failed.', 'error');
            }
        }
    }
});
