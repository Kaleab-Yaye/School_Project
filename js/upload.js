// js/upload.js

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Force authorization check on entry
    const user = await checkUserSession();
    if (!user) {
        showToast('Please log in to upload academic materials.', 'warning');
        setTimeout(() => { window.location.href = 'login.html'; }, 1000);
        return;
    }

    // Step state tracking variables
    let currentStep = 1;
    const totalSteps = 5;

    // Form elements references
    const form = document.getElementById('upload-wizard-form');
    const prevBtn = document.getElementById('wizard-prev-btn');
    const nextBtn = document.getElementById('wizard-next-btn');
    const progressBar = document.getElementById('wizard-progress-bar');

    // Step panels and progress tags
    const stepsElements = document.querySelectorAll('.wizard-step');
    const stepPanels = document.querySelectorAll('.wizard-step-panel');

    // Category selectors
    const deptSelect = document.getElementById('dept-select');
    const yearSelect = document.getElementById('year-select');
    const semesterSelect = document.getElementById('semester-select');
    const courseSelect = document.getElementById('course-select');

    // Dynamic creations panels
    const newDeptGroup = document.getElementById('new-dept-group');
    const newCourseGroup = document.getElementById('new-course-group');

    // Searchable Select references
    const deptSearchInput = document.getElementById('dept-search-input');
    const deptSearchDropdown = document.getElementById('dept-search-dropdown');

    let departmentsData = [];

    // Initial Load - fill departments dropdown
    await loadDepartmentsList();

    // Check if pre-filled course_id query parameter exists
    const prefilledCourseId = Router.getParam('course_id');
    if (prefilledCourseId) {
        await handlePrefilledCourse(prefilledCourseId);
    }

    // Bind dropdown selectors on-change actions
    deptSelect.addEventListener('change', async () => {
        const val = deptSelect.value;
        if (val === 'new') {
            newDeptGroup.style.display = 'block';
            resetDropdown(yearSelect);
            resetDropdown(semesterSelect);
            resetDropdown(courseSelect);
            const selectHtml = `
                <option value="">-- Choose Class Year --</option>
                <option value="Year 1">Year 1</option>
                <option value="Year 2">Year 2</option>
                <option value="Year 3">Year 3</option>
                <option value="Year 4">Year 4</option>
                <option value="Year 5">Year 5</option>
            `;
            yearSelect.innerHTML = selectHtml;
        } else {
            newDeptGroup.style.display = 'none';
            if (val) {
                await loadYearsList(val);
            } else {
                resetDropdown(yearSelect);
            }
        }
    });

    yearSelect.addEventListener('change', async () => {
        const val = yearSelect.value;
        resetDropdown(semesterSelect);
        resetDropdown(courseSelect);
        if (val) {
            if (deptSelect.value === 'new') {
                const selectHtml = `
                    <option value="">-- Choose Semester --</option>
                    ${val === 'Year 1' ? '' : '<option value="Semester 1">Semester 1</option>'}
                    <option value="Semester 2">Semester 2</option>
                `;
                semesterSelect.innerHTML = selectHtml;
            } else {
                await loadSemestersList(val);
            }
        }
    });

    semesterSelect.addEventListener('change', async () => {
        const val = semesterSelect.value;
        resetDropdown(courseSelect);
        if (val) {
            if (deptSelect.value === 'new') {
                courseSelect.innerHTML = `
                    <option value="">-- Choose Course --</option>
                    <option value="new">+ Create New Course...</option>
                `;
            } else {
                await loadCoursesList(val);
            }
        }
    });

    courseSelect.addEventListener('change', () => {
        const val = courseSelect.value;
        if (val === 'new') {
            newCourseGroup.style.display = 'block';
        } else {
            newCourseGroup.style.display = 'none';
        }
    });

    // Custom searchable dropdown render and handling
    function renderCustomDeptDropdown(items, filterText = '') {
        const filtered = items.filter(d => 
            d.name.toLowerCase().includes(filterText.toLowerCase())
        );

        let html = '';
        
        if (filtered.length === 0) {
            html += `<div class="searchable-select-item" style="color: var(--text-tertiary); cursor: default;">No departments found</div>`;
        } else {
            filtered.forEach(d => {
                html += `<div class="searchable-select-item" data-value="${d.id}">${escapeHtml(d.name)}</div>`;
            });
        }
        
        // Add create new option
        html += `<div class="searchable-select-item create-new" data-value="new">+ Create New Department...</div>`;
        
        deptSearchDropdown.innerHTML = html;

        // Bind clicks on items
        deptSearchDropdown.querySelectorAll('.searchable-select-item').forEach(item => {
            if (item.classList.contains('create-new') || item.dataset.value) {
                item.addEventListener('click', () => {
                    const val = item.dataset.value;
                    const text = item.textContent;
                    
                    if (val === 'new') {
                        deptSelect.value = 'new';
                        deptSearchInput.value = 'Create New Department';
                    } else {
                        deptSelect.value = val;
                        deptSearchInput.value = text;
                    }
                    
                    deptSelect.dispatchEvent(new Event('change'));
                    deptSearchDropdown.classList.remove('active');
                });
            }
        });
    }

    deptSearchInput.addEventListener('focus', () => {
        deptSearchDropdown.classList.add('active');
        renderCustomDeptDropdown(departmentsData, deptSearchInput.value === 'Create New Department' ? '' : deptSearchInput.value);
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('#dept-searchable-container')) {
            deptSearchDropdown.classList.remove('active');
        }
    });

    deptSearchInput.addEventListener('input', () => {
        deptSearchDropdown.classList.add('active');
        renderCustomDeptDropdown(departmentsData, deptSearchInput.value);
    });

    // ==========================================
    // DATA BINDINGS LOADER FUNCTIONS
    // ==========================================
    async function loadDepartmentsList() {
        try {
            const res = await apiGet('/departments/list.php');
            if (res && res.success) {
                departmentsData = res.data;
                const selectHtml = `
                    <option value="">-- Choose Department --</option>
                    ${res.data.map(d => `<option value="${d.id}">${escapeHtml(d.name)}</option>`).join('')}
                    <option value="new">+ Create New Department...</option>
                `;
                deptSelect.innerHTML = selectHtml;
                renderCustomDeptDropdown(departmentsData);
            }
        } catch (e) {
            showToast('Failed to load departments listing.', 'error');
        }
    }

    async function loadYearsList(deptId) {
        try {
            const res = await apiGet(`/years/list.php?department_id=${deptId}`);
            if (res && res.success) {
                const selectHtml = `
                    <option value="">-- Choose Class Year --</option>
                    ${res.data.map(y => `<option value="${y.id}">${escapeHtml(y.name)}</option>`).join('')}
                `;
                yearSelect.innerHTML = selectHtml;
            }
        } catch (e) {
            showToast('Failed to load year options.', 'error');
        }
    }

    async function loadSemestersList(yearId) {
        try {
            const res = await apiGet(`/semesters/list.php?year_id=${yearId}`);
            if (res && res.success) {
                const selectHtml = `
                    <option value="">-- Choose Semester --</option>
                    ${res.data.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('')}
                `;
                semesterSelect.innerHTML = selectHtml;
            }
        } catch (e) {
            showToast('Failed to load semester options.', 'error');
        }
    }

    async function loadCoursesList(semId) {
        try {
            const res = await apiGet(`/courses/list.php?semester_id=${semId}`);
            if (res && res.success) {
                const selectHtml = `
                    <option value="">-- Choose Course --</option>
                    ${res.data.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}
                    <option value="new">+ Create New Course...</option>
                `;
                courseSelect.innerHTML = selectHtml;
            }
        } catch (e) {
            showToast('Failed to load course options.', 'error');
        }
    }

    function resetDropdown(selectElement) {
        const placeholderName = selectElement.id.replace('-select', '');
        selectElement.innerHTML = `<option value="">-- Choose ${placeholderName.charAt(0).toUpperCase() + placeholderName.slice(1)} --</option>`;
        selectElement.dispatchEvent(new Event('change'));
    }

    // Auto-traverse to step 5 if preselected course exists
    async function handlePrefilledCourse(courseId) {
        try {
            const res = await apiGet(`/courses/get.php?id=${courseId}`);
            if (res && res.success) {
                const c = res.data.course;
                
                // 1. Force inject select options
                deptSelect.innerHTML = `<option value="${c.department_id}">${escapeHtml(c.department_name)}</option>`;
                yearSelect.innerHTML = `<option value="${c.year_id}">${escapeHtml(c.year_name)}</option>`;
                semesterSelect.innerHTML = `<option value="${c.semester_id}">${escapeHtml(c.semester_name)}</option>`;
                courseSelect.innerHTML = `<option value="${c.id}">${escapeHtml(c.name)}</option>`;

                deptSelect.value = c.department_id;
                yearSelect.value = c.year_id;
                semesterSelect.value = c.semester_id;
                courseSelect.value = c.id;

                // Move directly to upload step
                currentStep = 5;
                updateWizardView();
            }
        } catch (err) {
            showToast('Could not resolve prefilled course.', 'error');
        }
    }

    // ==========================================
    // STEP NAVIGATION CONTROLLERS
    // ==========================================
    prevBtn.addEventListener('click', () => {
        if (currentStep > 1) {
            currentStep--;
            updateWizardView();
        }
    });

    nextBtn.addEventListener('click', () => {
        if (validateStep(currentStep)) {
            if (currentStep < totalSteps) {
                currentStep++;
                updateWizardView();
            } else {
                // Final submission
                submitResourceForm();
            }
        }
    });

    function updateWizardView() {
        // Update Step visual bubbles
        stepsElements.forEach((step, idx) => {
            const stepNum = idx + 1;
            step.className = 'wizard-step';
            if (stepNum < currentStep) {
                step.classList.add('completed');
            } else if (stepNum === currentStep) {
                step.classList.add('active');
            }
        });

        // Update progress bar width percentage
        const progressPercent = ((currentStep - 1) / (totalSteps - 1)) * 100;
        progressBar.style.width = `${progressPercent}%`;

        // Toggle active panels
        stepPanels.forEach(panel => {
            panel.classList.remove('active');
            if (parseInt(panel.dataset.step) === currentStep) {
                panel.classList.add('active');
            }
        });

        // Set buttons availability
        prevBtn.disabled = currentStep === 1;
        if (currentStep === totalSteps) {
            nextBtn.textContent = 'Upload & Publish';
            nextBtn.classList.add('btn-secondary'); // change style to highlight submission
        } else {
            nextBtn.textContent = 'Next Step';
            nextBtn.classList.remove('btn-secondary');
        }
    }

    function validateStep(step) {
        if (step === 1) {
            if (deptSelect.value === 'new') {
                const newName = document.getElementById('new-dept-name').value.trim();
                if (!newName) { showToast('Please enter new department name.', 'warning'); return false; }
            } else if (!deptSelect.value) {
                showToast('Please select a department.', 'warning');
                return false;
            }
        } else if (step === 2) {
            if (!yearSelect.value) {
                showToast('Please choose an academic year.', 'warning');
                return false;
            }
        } else if (step === 3) {
            if (!semesterSelect.value) {
                showToast('Please select a semester.', 'warning');
                return false;
            }
        } else if (step === 4) {
            if (courseSelect.value === 'new') {
                const newName = document.getElementById('new-course-name').value.trim();
                if (!newName) { showToast('Please type course class name.', 'warning'); return false; }
            } else if (!courseSelect.value) {
                showToast('Please select a course.', 'warning');
                return false;
            }
        }
        return true;
    }

    // ==========================================
    // TYPE SWITCH & FILE DRAG CONTROLLERS
    // ==========================================
    const switchBtns = document.querySelectorAll('.type-switch-btn');
    const typeInput = document.getElementById('resource-type-input');
    const typePanels = document.querySelectorAll('.upload-type-panel');

    switchBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            switchBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const selectedType = btn.dataset.type;
            typeInput.value = selectedType;

            typePanels.forEach(panel => {
                panel.classList.remove('active');
                if (panel.id === `panel-${selectedType}`) {
                    panel.classList.add('active');
                }
            });
        });
    });

    // PDF File Selection & Drag over dropzone
    const dropzone = document.getElementById('pdf-dropzone');
    const fileInput = document.getElementById('pdf-file-input');
    const dropzoneText = document.getElementById('pdf-dropzone-text');
    let selectedFile = null;

    dropzone.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
        }
    });

    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    });

    function handleFileSelect(file) {
        if (file.type !== 'application/pdf') {
            showToast('Only PDF documents can be uploaded.', 'error');
            return;
        }
        if (file.size > UPLOAD_MAX_SIZE) {
            showToast('File size exceeds the 50MB limit.', 'error');
            return;
        }
        selectedFile = file;
        dropzoneText.innerHTML = `📄 <strong>${escapeHtml(file.name)}</strong> (${formatFileSize(file.size)}) selected`;
        dropzone.style.borderColor = 'var(--accent-secondary)';
    }

    // ==========================================
    // RESOURCE SUBMISSION WRAPPER
    // ==========================================
    async function submitResourceForm() {
        const title = document.getElementById('res-title').value.trim();
        const description = document.getElementById('res-desc').value.trim();
        const examType = document.getElementById('exam-type').value;
        const resourceType = typeInput.value;

        if (!title) { showToast('Please enter resource title.', 'warning'); return; }

        // Prep form payload
        const formData = new FormData();
        
        // Add dynamic categories values
        if (deptSelect.value === 'new') {
            formData.append('department_name', document.getElementById('new-dept-name').value.trim());
        } else {
            formData.append('department_id', deptSelect.value);
        }

        if (isNaN(parseInt(yearSelect.value))) {
            formData.append('year_name', yearSelect.value);
        } else {
            formData.append('year_id', yearSelect.value);
        }

        if (isNaN(parseInt(semesterSelect.value))) {
            formData.append('semester_name', semesterSelect.value);
        } else {
            formData.append('semester_id', semesterSelect.value);
        }

        if (courseSelect.value === 'new') {
            formData.append('course_name', document.getElementById('new-course-name').value.trim());
            formData.append('course_code', document.getElementById('new-course-code').value.trim());
            formData.append('course_desc', document.getElementById('new-course-desc').value.trim());
        } else {
            formData.append('course_id', courseSelect.value);
        }

        formData.append('title', title);
        formData.append('description', description);
        formData.append('resource_type', resourceType);
        formData.append('exam_type', examType);

        // Add file, link or content based on type selection
        if (resourceType === 'pdf') {
            if (!selectedFile) { showToast('Please select a PDF file to upload.', 'warning'); return; }
            formData.append('file', selectedFile);
        } else if (resourceType === 'link') {
            const link = document.getElementById('res-link').value.trim();
            if (!link) { showToast('Please enter link URL address.', 'warning'); return; }
            formData.append('external_link', link);
        } else if (resourceType === 'text') {
            const textVal = document.getElementById('res-text').value.trim();
            if (!textVal) { showToast('Please write the note content.', 'warning'); return; }
            formData.append('content', textVal);
        }

        // Toggle submit button loader
        setSubmittingState(true);

        try {
            const res = await apiUpload('/resources/create.php', formData);
            if (res.success) {
                showToast('Material uploaded successfully!', 'success');
                setTimeout(() => {
                    window.location.href = `course.html?id=${res.data.course_id}`;
                }, 1000);
            }
        } catch (err) {
            showToast(err.message || 'Upload failed. Title duplicate might exist.', 'error');
        } finally {
            setSubmittingState(false);
        }
    }

    function setSubmittingState(submitting) {
        if (submitting) {
            nextBtn.disabled = true;
            nextBtn.textContent = 'Uploading...';
            prevBtn.disabled = true;
        } else {
            nextBtn.disabled = false;
            nextBtn.textContent = 'Upload & Publish';
            prevBtn.disabled = false;
        }
    }
});
