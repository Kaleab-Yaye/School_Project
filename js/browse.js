// js/browse.js

document.addEventListener('DOMContentLoaded', async () => {
    const filename = Router.getCurrentPage();
    const container = document.getElementById('browse-content-container');
    const pageHeader = document.getElementById('browse-page-header');
    
    // Check if user is logged in to show "Add/Create" buttons
    const user = await checkUserSession();

    if (filename === 'browse.html') {
        renderBrowseDepartments();
    } else if (filename === 'department.html') {
        const id = Router.getParam('id');
        if (!id) { window.location.href = 'browse.html'; return; }
        renderBrowseYears(id);
    } else if (filename === 'year.html') {
        const id = Router.getParam('id');
        if (!id) { window.location.href = 'browse.html'; return; }
        renderBrowseSemesters(id);
    } else if (filename === 'semester.html') {
        const id = Router.getParam('id');
        if (!id) { window.location.href = 'browse.html'; return; }
        renderBrowseCourses(id);
    } else if (filename === 'course.html') {
        const id = Router.getParam('id');
        if (!id) { window.location.href = 'browse.html'; return; }
        renderBrowseResources(id);
    }

    // ==========================================
    // 1. RENDER DEPARTMENTS
    // ==========================================
    async function renderBrowseDepartments() {
        renderSkeleton(container, 3, 'card');
        
        renderActionBar({
            title: 'Browse Departments',
            desc: 'Choose a department to start exploring resources.',
            actionText: user ? 'New Department' : '',
            actionId: 'create-dept-btn',
            actionIcon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>'
        });

        try {
            const res = await apiGet('/departments/list.php');
            if (res && res.success && res.data.length > 0) {
                let html = '<div class="card-grid animate-fadeIn">';
                res.data.forEach(dept => {
                    const grad = generateGradient(dept.gradient_seed || dept.name);
                    html += createCard({
                        cover: dept.cover_image,
                        coverGradient: grad,
                        title: dept.name,
                        subtitle: dept.description || 'Access past exams and resources uploaded by students.',
                        badges: [{ text: 'Department', type: 'primary' }],
                        url: `department.html?id=${dept.id}`,
                        stats: [
                            { icon: '', value: `${dept.course_count || 0} Courses` }
                        ]
                    });
                });
                html += '</div>';
                container.innerHTML = html;
            } else {
                renderEmptyState(container, {
                    icon: '',
                    title: 'No Departments Yet',
                    message: 'Be the first to add an academic department and start building the resource library.',
                    actionText: user ? 'Create Department' : 'Login to Create',
                    actionUrl: user ? '#' : 'login.html'
                });
                
                if (user) {
                    const emptyAct = container.querySelector('.empty-state .btn');
                    if (emptyAct) emptyAct.addEventListener('click', (e) => { e.preventDefault(); triggerCreateDeptModal(); });
                }
            }
        } catch (e) {
            showToast(e.message || 'Error loading departments.', 'error');
        }

        const createBtn = document.getElementById('create-dept-btn');
        if (createBtn) createBtn.addEventListener('click', triggerCreateDeptModal);
    }

    function triggerCreateDeptModal() {
        const bodyHtml = `
            <form id="modal-create-dept-form">
                <div class="form-group">
                    <label class="form-label" for="dept-name">Department Name</label>
                    <input type="text" id="dept-name" class="form-input" placeholder="e.g. Computer Science" required>
                </div>
                <div class="form-group">
                    <label class="form-label" for="dept-desc">Description</label>
                    <textarea id="dept-desc" class="form-textarea" placeholder="Describe this department (majors, tracks, etc.)..."></textarea>
                </div>
                <p class="form-hint" style="margin-top: -8px;">Years 1–5 with Semester 1 & 2 will be created automatically.</p>
            </form>
        `;

        showModal({
            title: 'Create Department',
            body: bodyHtml,
            confirmText: 'Create',
            cancelText: 'Cancel'
        }).then(async (confirmed) => {
            if (confirmed) {
                const name = document.getElementById('dept-name').value.trim();
                const description = document.getElementById('dept-desc').value.trim();
                if (!name) return;

                try {
                    const res = await apiPost('/departments/create.php', { name, description });
                    if (res.success) {
                        showToast('Department created successfully!', 'success');
                        renderBrowseDepartments();
                    }
                } catch (err) {
                    showToast(err.message || 'Failed to create department.', 'error');
                }
            }
        });
    }

    // ==========================================
    // 2. RENDER YEARS (Single Department view)
    // ==========================================
    async function renderBrowseYears(deptId) {
        renderSkeleton(container, 4, 'card');

        try {
            const res = await apiGet(`/departments/get.php?id=${deptId}`);
            if (res && res.success) {
                const dept = res.data.department;
                const years = res.data.years;

                renderEntityBanner({
                    title: dept.name,
                    desc: dept.description || 'Select an academic year to browse semester materials.',
                    seed: dept.gradient_seed || dept.name,
                    breadcrumbs: [
                        { label: 'Browse', url: 'browse.html' },
                        { label: dept.name }
                    ]
                });

                renderActionBar({
                    title: 'Academic Years',
                    desc: 'Select your class year to find related materials.'
                });

                if (years.length > 0) {
                    let html = '<div class="card-grid animate-fadeIn">';
                    years.forEach(year => {
                        const grad = generateGradient(year.gradient_seed || year.name);
                        html += createCard({
                            cover: year.cover_image,
                            coverGradient: grad,
                            title: year.name,
                            subtitle: `Browse courses and resources for ${year.name}.`,
                            badges: [{ text: 'Year', type: 'secondary' }],
                            url: `year.html?id=${year.id}`,
                            stats: [
                                { icon: '', value: `${year.course_count || 0} Courses` }
                            ]
                        });
                    });
                    html += '</div>';
                    container.innerHTML = html;
                } else {
                    renderEmptyState(container, {
                        icon: '',
                        title: 'No Years Available',
                        message: 'This department has no academic years configured yet.'
                    });
                }
            }
        } catch (e) {
            showToast(e.message || 'Department page failed to load.', 'error');
            window.location.href = 'browse.html';
        }
    }

    // ==========================================
    // 3. RENDER SEMESTERS (Single Year view)
    // ==========================================
    async function renderBrowseSemesters(yearId) {
        renderSkeleton(container, 2, 'card');

        try {
            const res = await apiGet(`/years/get.php?id=${yearId}`);
            if (res && res.success) {
                const year = res.data.year;
                const semesters = res.data.semesters;

                renderEntityBanner({
                    title: `${year.department_name} — ${year.name}`,
                    desc: 'Select a semester below to view course materials.',
                    seed: year.gradient_seed || year.name,
                    breadcrumbs: [
                        { label: 'Browse', url: 'browse.html' },
                        { label: year.department_name, url: `department.html?id=${year.department_id}` },
                        { label: year.name }
                    ]
                });

                renderActionBar({
                    title: 'Semesters',
                    desc: 'Pick a semester to find courses and resources.'
                });

                if (semesters.length > 0) {
                    let html = '<div class="card-grid animate-fadeIn">';
                    semesters.forEach(sem => {
                        const grad = generateGradient(sem.name + year.name);
                        html += createCard({
                            coverGradient: grad,
                            title: sem.name,
                            subtitle: `Courses offered during ${sem.name}.`,
                            badges: [{ text: 'Semester', type: 'secondary' }],
                            url: `semester.html?id=${sem.id}`,
                            stats: [
                                { icon: '', value: `${sem.course_count || 0} Courses` }
                            ]
                        });
                    });
                    html += '</div>';
                    container.innerHTML = html;
                } else {
                    renderEmptyState(container, {
                        icon: '',
                        title: 'No Semesters Available',
                        message: 'This year has no semesters configured yet.'
                    });
                }
            }
        } catch (e) {
            showToast(e.message || 'Year page failed to load.', 'error');
            window.location.href = 'browse.html';
        }
    }

    // ==========================================
    // 4. RENDER COURSES (Single Semester view)
    // ==========================================
    async function renderBrowseCourses(semId) {
        renderSkeleton(container, 3, 'card');

        try {
            const res = await apiGet(`/semesters/get.php?id=${semId}`);
            if (res && res.success) {
                const sem = res.data.semester;
                const courses = res.data.courses;

                renderEntityBanner({
                    title: `${sem.department_name} — ${sem.year_name}`,
                    desc: `${sem.name} course directory. Add courses and browse resource materials.`,
                    seed: sem.name,
                    breadcrumbs: [
                        { label: 'Browse', url: 'browse.html' },
                        { label: sem.department_name, url: `department.html?id=${sem.department_id}` },
                        { label: sem.year_name, url: `year.html?id=${sem.year_id}` },
                        { label: sem.name }
                    ]
                });

                renderActionBar({
                    title: 'Course Directory',
                    desc: 'Pick a course to see exams, notes and study materials.',
                    actionText: user ? 'Add Course' : '',
                    actionId: 'create-course-btn',
                    actionIcon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>'
                });

                if (courses.length > 0) {
                    let html = '<div class="card-grid animate-fadeIn">';
                    courses.forEach(course => {
                        const grad = generateGradient(course.gradient_seed || course.name);
                        html += createCard({
                            cover: course.cover_image,
                            coverGradient: grad,
                            title: course.name,
                            subtitle: `${course.course_code ? `[${course.course_code}] ` : ''}${course.description || 'Browse resource contributions.'}`,
                            badges: [{ text: 'Course', type: 'secondary' }],
                            url: `course.html?id=${course.id}`,
                            stats: [
                                { icon: '', value: `${course.resource_count || 0} Resources` }
                            ]
                        });
                    });
                    html += '</div>';
                    container.innerHTML = html;
                } else {
                    renderEmptyState(container, {
                        icon: '',
                        title: 'No Courses Yet',
                        message: 'Help your classmates by adding courses for this semester.',
                        actionText: user ? 'Add Course' : '',
                        actionUrl: '#'
                    });
                    if (user) {
                        const emptyAct = container.querySelector('.empty-state .btn');
                        if (emptyAct) emptyAct.addEventListener('click', (e) => { e.preventDefault(); triggerCreateCourseModal(semId); });
                    }
                }

                const createCourseBtn = document.getElementById('create-course-btn');
                if (createCourseBtn) createCourseBtn.addEventListener('click', () => triggerCreateCourseModal(semId));
            }
        } catch (e) {
            showToast(e.message || 'Semester page failed to load.', 'error');
            window.location.href = 'browse.html';
        }
    }

    function triggerCreateCourseModal(semId) {
        const bodyHtml = `
            <form id="modal-create-course-form">
                <div class="form-group">
                    <label class="form-label" for="course-name">Course Name</label>
                    <input type="text" id="course-name" class="form-input" placeholder="e.g. Data Structures" required>
                </div>
                <div class="form-group">
                    <label class="form-label" for="course-code">Course Code (Optional)</label>
                    <input type="text" id="course-code" class="form-input" placeholder="e.g. CS201">
                </div>
                <div class="form-group">
                    <label class="form-label" for="course-desc">Description</label>
                    <textarea id="course-desc" class="form-textarea" placeholder="Brief topics, reference materials etc..."></textarea>
                </div>
            </form>
        `;

        showModal({
            title: 'Add Course',
            body: bodyHtml,
            confirmText: 'Add',
            cancelText: 'Cancel'
        }).then(async (confirmed) => {
            if (confirmed) {
                const name = document.getElementById('course-name').value.trim();
                const code = document.getElementById('course-code').value.trim();
                const description = document.getElementById('course-desc').value.trim();
                if (!name) return;

                try {
                    const res = await apiPost('/courses/create.php', {
                        semester_id: semId,
                        name: name,
                        course_code: code,
                        description: description
                    });
                    if (res.success) {
                        showToast('Course added successfully!', 'success');
                        renderBrowseCourses(semId);
                    }
                } catch (err) {
                    showToast(err.message || 'Failed to add course.', 'error');
                }
            }
        });
    }

    // ==========================================
    // 5. RENDER RESOURCES (Single Course view)
    // ==========================================
    async function renderBrowseResources(courseId) {
        renderSkeleton(container, 3, 'card');

        try {
            const res = await apiGet(`/courses/get.php?id=${courseId}`);
            if (res && res.success) {
                const course = res.data.course;
                const resources = res.data.resources;

                renderEntityBanner({
                    title: `${course.name} ${course.course_code ? `(${course.course_code})` : ''}`,
                    desc: course.description || 'Browse and download study materials uploaded by students.',
                    seed: course.gradient_seed || course.name,
                    breadcrumbs: [
                        { label: 'Browse', url: 'browse.html' },
                        { label: course.department_name, url: `department.html?id=${course.department_id}` },
                        { label: course.year_name, url: `year.html?id=${course.year_id}` },
                        { label: course.semester_name, url: `semester.html?id=${course.semester_id}` },
                        { label: course.name }
                    ]
                });

                // Course filters tabs for types
                renderCourseFiltersBar();

                renderActionBar({
                    title: 'Course Resources',
                    desc: 'Download PDFs, view notes or open study links.',
                    actionText: user ? 'Upload Material' : '',
                    actionId: 'upload-res-btn',
                    actionIcon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>'
                });

                window.currentCourseResources = resources;
                applyResourceFiltersAndRender('all');

                const uploadResBtn = document.getElementById('upload-res-btn');
                if (uploadResBtn) {
                    uploadResBtn.addEventListener('click', () => {
                        window.location.href = `upload.html?course_id=${courseId}`;
                    });
                }
            }
        } catch (e) {
            showToast(e.message || 'Course page failed to load.', 'error');
            window.location.href = 'browse.html';
        }
    }

    function renderCourseFiltersBar() {
        const bar = document.createElement('div');
        bar.className = 'course-filters';
        bar.innerHTML = `
            <button class="btn btn-secondary btn-sm active" data-filter="all">All</button>
            <button class="btn btn-secondary btn-sm" data-filter="midterm">Midterms</button>
            <button class="btn btn-secondary btn-sm" data-filter="final">Finals</button>
            <button class="btn btn-secondary btn-sm" data-filter="quiz">Quizzes</button>
            <button class="btn btn-secondary btn-sm" data-filter="notes">Lecture Notes</button>
            <button class="btn btn-secondary btn-sm" data-filter="other">Other</button>
        `;
        
        container.parentNode.insertBefore(bar, container);

        bar.querySelectorAll('.btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                bar.querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                applyResourceFiltersAndRender(btn.dataset.filter);
            });
        });
    }

    function applyResourceFiltersAndRender(filterType) {
        const resources = window.currentCourseResources || [];
        
        let filtered = resources;
        if (filterType !== 'all') {
            filtered = resources.filter(r => r.exam_type === filterType);
        }

        if (filtered.length > 0) {
            let html = '<div class="card-grid animate-fadeIn">';
            filtered.forEach(res => {
                const typeLabel = res.resource_type === 'pdf' ? 'PDF' : (res.resource_type === 'link' ? 'Link' : 'Note');
                const examLabel = res.exam_type.charAt(0).toUpperCase() + res.exam_type.slice(1);
                
                // Create resource card with download button
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
                            <span class="badge badge-${res.resource_type === 'pdf' ? 'secondary' : (res.resource_type === 'link' ? 'secondary' : 'secondary')} card-badge">${escapeHtml(typeLabel)}</span>
                            <span class="badge badge-warning card-badge">${escapeHtml(examLabel)}</span>
                        </div>
                        <div class="card-body">
                            <h3 class="card-title">${escapeHtml(res.title)}</h3>
                            <p class="card-text">${escapeHtml(res.description || 'No description provided.')}</p>
                            ${actionButton}
                        </div>
                        <div class="card-footer">
                            <div style="display: flex; gap: var(--space-md); font-size: var(--text-xs); color: var(--text-secondary);">
                                <span>${res.like_count || 0} Likes</span>
                                <span>${res.view_count || 0} Views</span>
                            </div>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
            container.innerHTML = html;
        } else {
            renderEmptyState(container, {
                icon: '',
                title: 'No resources found',
                message: `No materials uploaded under "${filterType}" for this course yet.`,
                actionText: user ? 'Upload Material' : '',
                actionUrl: user ? `upload.html?course_id=${Router.getParam('id')}` : ''
            });
        }
    }

    // ==========================================
    // HELPER LAYOUT RENDERERS
    // ==========================================
    function renderActionBar({ title, desc, actionText, actionId, actionIcon }) {
        let bar = document.getElementById('browse-action-bar');
        if (!bar) {
            bar = document.createElement('div');
            bar.id = 'browse-action-bar';
            bar.className = 'browse-action-bar';
            container.parentNode.insertBefore(bar, container);
        }

        const iconHtml = actionIcon ? actionIcon : '';

        bar.innerHTML = `
            <div>
                <h2 style="margin: 0; font-size: var(--text-2xl); font-family: var(--font-heading);">${escapeHtml(title)}</h2>
                <p style="margin: 0; color: var(--text-secondary); font-size: var(--text-sm);">${escapeHtml(desc)}</p>
            </div>
            ${actionText ? `<button class="btn btn-primary btn-lg" id="${actionId}">${iconHtml} ${escapeHtml(actionText)}</button>` : ''}
        `;
    }

    function renderEntityBanner({ title, desc, seed, breadcrumbs }) {
        if (!pageHeader) return;
        
        const grad = generateGradient(seed);
        
        pageHeader.className = 'entity-banner';
        pageHeader.innerHTML = `
            <div class="entity-banner-bg" style="background: ${grad}; opacity: 0.12;"></div>
            <div class="entity-banner-content animate-fadeInUp">
                <nav><ol id="breadcrumbs-container"></ol></nav>
                <h1 class="entity-banner-title">${escapeHtml(title)}</h1>
                <p class="entity-banner-desc">${escapeHtml(desc)}</p>
            </div>
        `;

        renderBreadcrumb(document.getElementById('breadcrumbs-container'), breadcrumbs);
    }
});
