// js/resource.js

document.addEventListener('DOMContentLoaded', async () => {
    const resourceId = Router.getParam('id');
    if (!resourceId) { window.location.href = 'browse.html'; return; }

    const layoutContainer = document.getElementById('resource-layout-container');
    const skeletonLoader = document.getElementById('resource-skeleton-loader');

    // UI elements
    const breadcrumbs = document.getElementById('breadcrumbs-container');
    const titleHeader = document.getElementById('resource-title');
    const descText = document.getElementById('resource-desc');
    const badgesContainer = document.getElementById('resource-badges');
    const viewerContainer = document.getElementById('viewer-container');
    
    // Sidebar elements
    const uploaderAvatar = document.getElementById('uploader-avatar');
    const uploaderName = document.getElementById('uploader-name');
    const uploadDate = document.getElementById('upload-date');
    const viewCountText = document.getElementById('view-count-text');
    const likeCountText = document.getElementById('like-count-text');
    const likeBtn = document.getElementById('like-btn');
    const bookmarkBtn = document.getElementById('bookmark-btn');
    const downloadWrapper = document.getElementById('action-download-wrapper');

    // Comments elements
    const commentsList = document.getElementById('comments-list-container');
    const commentsCount = document.getElementById('comments-count');
    const commentFormWrapper = document.getElementById('comment-form-wrapper');

    // Set Skeleton Loader
    renderSkeleton(skeletonLoader, 1, 'card');

    // Global session user state
    const user = await checkUserSession();
    
    try {
        const res = await apiGet(`/resources/get.php?id=${resourceId}`);
        if (res && res.success) {
            const data = res.data;
            const resource = data.resource;
            
            // 1. Populate details
            titleHeader.textContent = resource.title;
            descText.textContent = resource.description || 'No description provided.';
            viewCountText.textContent = resource.view_count;
            likeCountText.textContent = resource.like_count;
            
            // Set uploader info
            uploaderName.textContent = resource.uploader_name || 'Anonymous';
            uploadDate.textContent = formatDate(resource.created_at);
            const initials = getInitials(resource.uploader_name);
            uploaderAvatar.innerHTML = resource.uploader_avatar 
                ? `<img src="${resource.uploader_avatar}" alt="${escapeHtml(resource.uploader_name)}">`
                : initials;

            // Badges
            const typeText = resource.resource_type === 'pdf' ? 'PDF File' : (resource.resource_type === 'link' ? 'External Link' : 'Text Note');
            const examText = resource.exam_type.toUpperCase();
            badgesContainer.innerHTML = `
                <span class="badge badge-secondary" style="margin-right: var(--space-xs);">${typeText}</span>
                <span class="badge badge-warning">${examText}</span>
            `;

            // 2. Render Content Viewer based on type
            renderContentViewer(resource);

            // 3. Render Breadcrumbs
            renderBreadcrumb(breadcrumbs, [
                { label: 'Browse', url: 'browse.html' },
                { label: resource.course_name || 'Course', url: `course.html?id=${resource.course_id}` },
                { label: resource.title }
            ]);

            // 4. Update Social button styles
            updateSocialButtonsStates(data.is_liked, data.is_bookmarked);

            // 5. Bind Social action clicks
            bindSocialClickEvents(resource.id);

            // 6. Render Comments list
            renderComments(data.comments);

            // 7. Render Comment entry form
            renderCommentEntryBox(resource.id);

            // Hide skeleton, show page
            skeletonLoader.style.display = 'none';
            layoutContainer.style.display = 'grid';

        }
    } catch (e) {
        showToast(e.message || 'Resource failed to load.', 'error');
        window.location.href = 'browse.html';
    }

    // ==========================================
    // RENDER CONTENT VIEWER
    // ==========================================
    function getBasePath() {
        // Compute the base path from the current page URL
        // e.g. '/School_Project/resource.html' -> '/School_Project/'
        const path = window.location.pathname;
        return path.substring(0, path.lastIndexOf('/') + 1);
    }

    function renderContentViewer(resource) {
        if (resource.resource_type === 'pdf') {
            viewerContainer.innerHTML = `
                <div class="pdf-toolbar">
                    <div class="pdf-toolbar-group">
                        <button id="pdf-prev-btn" title="Previous Page">◀</button>
                        <span class="pdf-page-info">Page <span id="pdf-page-num">1</span> of <span id="pdf-page-count">-</span></span>
                        <button id="pdf-next-btn" title="Next Page">▶</button>
                    </div>
                    <div class="pdf-toolbar-group">
                        <button id="pdf-zoom-out" title="Zoom Out">➖</button>
                        <span class="pdf-page-info" id="pdf-zoom-percent">100%</span>
                        <button id="pdf-zoom-in" title="Zoom In">➕</button>
                    </div>
                    <div class="pdf-toolbar-group">
                        <button onclick="event.stopPropagation(); window.location.href='${getBasePath()}api/resources/download.php?id=${resource.id}'" class="btn btn-secondary btn-sm" style="display: flex; align-items: center; gap: 4px;">
                            📥 Download
                        </button>
                    </div>
                </div>
                <div class="pdf-pages-wrapper" id="pdf-wrapper">
                    <div class="pdf-loading" id="pdf-loading-spinner">
                        <div class="pdf-loading-spinner"></div>
                        <p>Loading document pages...</p>
                    </div>
                </div>
            `;

            // Also add download button in sidebar
            downloadWrapper.innerHTML = `
                <button onclick="window.location.href='${getBasePath()}api/resources/download.php?id=${resource.id}'" class="btn btn-primary" style="width: 100%; margin-top: var(--space-sm);">
                    📥 Download PDF File
                </button>
            `;

            // PDF.js rendering states
            let pdfDoc = null;
            let pageNum = 1;
            let pageIsRendering = false;
            let pageNumPending = null;
            let scale = 1.2;

            const prevBtn = document.getElementById('pdf-prev-btn');
            const nextBtn = document.getElementById('pdf-next-btn');
            const zoomInBtn = document.getElementById('pdf-zoom-in');
            const zoomOutBtn = document.getElementById('pdf-zoom-out');
            const pageNumText = document.getElementById('pdf-page-num');
            const pageCountText = document.getElementById('pdf-page-count');
            const zoomPercentText = document.getElementById('pdf-zoom-percent');
            const pdfWrapper = document.getElementById('pdf-wrapper');

            // Set worker source path
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

            // Build absolute URL for the PDF file
            const pdfAbsoluteUrl = getBasePath() + resource.file_path;
            console.log('Loading PDF from:', pdfAbsoluteUrl);

            // Load Document
            pdfjsLib.getDocument(pdfAbsoluteUrl).promise.then(pdfDoc_ => {
                pdfDoc = pdfDoc_;
                pageCountText.textContent = pdfDoc.numPages;
                
                // Hide loader and render first page
                const spinner = document.getElementById('pdf-loading-spinner');
                if (spinner) spinner.remove();
                
                renderPage(pageNum);
            }).catch(err => {
                console.error("Error loading PDF document:", err);
                pdfWrapper.innerHTML = `
                    <div class="pdf-error">
                        <div style="font-size: 3rem; margin-bottom: var(--space-md);">⚠️</div>
                        <h3>Failed to load PDF document</h3>
                        <p style="color: var(--text-secondary); font-size: var(--text-sm); max-width: 400px; margin-top: var(--space-xs);">
                            ${escapeHtml(err.message || 'The file may be corrupted or missing on the server.')}
                        </p>
                    </div>
                `;
            });

            function renderPage(num) {
                pageIsRendering = true;
                
                pdfDoc.getPage(num).then(page => {
                    const viewport = page.getViewport({ scale: scale });
                    
                    // Create or find canvas
                    let canvas = pdfWrapper.querySelector('canvas');
                    if (!canvas) {
                        canvas = document.createElement('canvas');
                        pdfWrapper.appendChild(canvas);
                    }
                    
                    const ctx = canvas.getContext('2d');
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;
                    
                    const renderCtx = {
                        canvasContext: ctx,
                        viewport: viewport
                    };
                    
                    const renderTask = page.render(renderCtx);
                    renderTask.promise.then(() => {
                        pageIsRendering = false;
                        if (pageNumPending !== null) {
                            renderPage(pageNumPending);
                            pageNumPending = null;
                        }
                    });
                    
                    // Update text elements
                    pageNumText.textContent = num;
                    zoomPercentText.textContent = `${Math.round(scale * 100)}%`;
                    
                    // Disable/enable navigation buttons
                    prevBtn.disabled = (num <= 1);
                    nextBtn.disabled = (num >= pdfDoc.numPages);
                });
            }

            function queueRenderPage(num) {
                if (pageIsRendering) {
                    pageNumPending = num;
                } else {
                    renderPage(num);
                }
            }

            // Button Event Listeners
            prevBtn.addEventListener('click', () => {
                if (pageNum <= 1) return;
                pageNum--;
                queueRenderPage(pageNum);
            });

            nextBtn.addEventListener('click', () => {
                if (pageNum >= pdfDoc.numPages) return;
                pageNum++;
                queueRenderPage(pageNum);
            });

            zoomInBtn.addEventListener('click', () => {
                if (scale >= 3.0) return;
                scale = Math.min(3.0, scale + 0.2);
                queueRenderPage(pageNum);
            });

            zoomOutBtn.addEventListener('click', () => {
                if (scale <= 0.6) return;
                scale = Math.max(0.6, scale - 0.2);
                queueRenderPage(pageNum);
            });
        } else if (resource.resource_type === 'link') {
            // External URL link card
            viewerContainer.innerHTML = `
                <div class="link-preview-box animate-scaleIn">
                    <div style="font-size: var(--text-5xl); margin-bottom: var(--space-md);">🔗</div>
                    <h3 style="font-family: var(--font-heading);">External Study Material Link</h3>
                    <p style="color: var(--text-secondary); margin-bottom: var(--space-lg); font-size: var(--text-sm);">
                        This resource is hosted externally on Google Drive or Dropbox. Click below to access.
                    </p>
                    <a href="${escapeHtml(resource.external_link)}" target="_blank" class="btn btn-primary">
                        Open Material URL Link ↗
                    </a>
                </div>
            `;
        } else if (resource.resource_type === 'text') {
            // Markdown / Text note container box
            const escapedContent = escapeHtml(resource.content);
            viewerContainer.innerHTML = `
                <div class="text-content-box animate-fadeIn">
                    ${escapedContent}
                </div>
            `;
        }
    }

    // ==========================================
    // LIKE AND BOOKMARK TOGGLES CONTROLLER
    // ==========================================
    function updateSocialButtonsStates(isLiked, isBookmarked) {
        if (isLiked) {
            likeBtn.classList.add('liked');
            likeBtn.innerHTML = `<span>❤️</span> Liked`;
        } else {
            likeBtn.classList.remove('liked');
            likeBtn.innerHTML = `<span>🤍</span> Like`;
        }

        if (isBookmarked) {
            bookmarkBtn.classList.add('bookmarked');
            bookmarkBtn.innerHTML = `<span>🔖</span> Saved`;
        } else {
            bookmarkBtn.classList.remove('bookmarked');
            bookmarkBtn.innerHTML = `<span>💾</span> Save`;
        }
    }

    function bindSocialClickEvents(resId) {
        likeBtn.addEventListener('click', async () => {
            if (!user) { showToast('Please sign in to like materials.', 'warning'); return; }
            try {
                const res = await apiPost('/resources/like.php', { resource_id: resId });
                if (res.success) {
                    likeCountText.textContent = res.data.like_count;
                    updateSocialButtonsStates(res.data.liked, bookmarkBtn.classList.contains('bookmarked'));
                    showToast(res.message, 'success');
                }
            } catch (err) {
                showToast(err.message || 'Action failed.', 'error');
            }
        });

        bookmarkBtn.addEventListener('click', async () => {
            if (!user) { showToast('Please sign in to save materials.', 'warning'); return; }
            try {
                const res = await apiPost('/resources/bookmark.php', { resource_id: resId });
                if (res.success) {
                    updateSocialButtonsStates(likeBtn.classList.contains('liked'), res.data.bookmarked);
                    showToast(res.message, 'success');
                }
            } catch (err) {
                showToast(err.message || 'Action failed.', 'error');
            }
        });
    }

    // ==========================================
    // COMMENTS BOARD VIEW BUILDER
    // ==========================================
    function renderComments(comments) {
        commentsCount.textContent = comments.length;
        commentsList.innerHTML = '';

        if (comments.length === 0) {
            commentsList.innerHTML = `
                <div style="color: var(--text-tertiary); text-align: center; padding: var(--space-xl) 0; font-size: var(--text-sm);">
                    No discussion comments posted yet. Write one below!
                </div>
            `;
            return;
        }

        comments.forEach(comment => {
            const commentCard = document.createElement('div');
            commentCard.className = 'comment-card';
            commentCard.id = `comment-${comment.id}`;
            
            const initials = getInitials(comment.username);
            const avatarHtml = comment.avatar 
                ? `<img src="${comment.avatar}" alt="${escapeHtml(comment.username)}">`
                : initials;

            // Show delete button only if current user is author OR admin
            const showDelete = user && (user.id === comment.user_id || user.role === 'admin');

            commentCard.innerHTML = `
                <div class="avatar avatar-md">${avatarHtml}</div>
                <div style="flex-grow: 1;">
                    <div class="comment-header">
                        <div>
                            <span class="comment-author">${escapeHtml(comment.username)}</span>
                            <span class="comment-time">${formatRelativeTime(comment.created_at)}</span>
                        </div>
                        ${showDelete ? `
                            <button class="comment-delete-btn" data-id="${comment.id}">Delete</button>
                        ` : ''}
                    </div>
                    <div class="comment-body">${escapeHtml(comment.body)}</div>
                </div>
            `;

            // Bind delete comment click
            if (showDelete) {
                commentCard.querySelector('.comment-delete-btn').addEventListener('click', () => {
                    deleteComment(comment.id);
                });
            }

            commentsList.appendChild(commentCard);
        });
    }

    function renderCommentEntryBox(resId) {
        if (user) {
            commentFormWrapper.innerHTML = `
                <form id="comment-form" class="mt-4">
                    <div class="form-group">
                        <label class="form-label" for="comment-text">Join the Discussion</label>
                        <textarea id="comment-text" class="form-input" style="min-height: 80px;" placeholder="Write a comment or ask a question about this material..." required></textarea>
                    </div>
                    <button type="submit" class="btn btn-primary btn-sm">💬 Post Comment</button>
                </form>
            `;
            
            // Bind comment submit
            document.getElementById('comment-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                const textInput = document.getElementById('comment-text');
                const bodyText = textInput.value.trim();
                if (!bodyText) return;

                try {
                    const res = await apiPost('/comments/create.php', {
                        resource_id: resId,
                        body: bodyText
                    });
                    
                    if (res.success) {
                        textInput.value = '';
                        showToast('Comment posted.', 'success');
                        
                        // Re-fetch comments or manually append it to UI
                        // Let's re-fetch to keep it simple and clean
                        const updatedComments = await apiGet(`/comments/list.php?resource_id=${resId}`);
                        if (updatedComments && updatedComments.success) {
                            renderComments(updatedComments.data);
                        }
                    }
                } catch (err) {
                    showToast(err.message || 'Comment post failed.', 'error');
                }
            });

        } else {
            commentFormWrapper.innerHTML = `
                <div style="background: rgba(255,255,255,0.01); border: 1px solid var(--border); padding: var(--space-md); border-radius: var(--radius-md); text-align: center; font-size: var(--text-sm);" class="mt-4">
                    🔑 <a href="login.html" style="color: var(--accent-primary); font-weight: 600;">Sign In</a> to write comments and join the study discussion.
                </div>
            `;
        }
    }

    async function deleteComment(commentId) {
        const confirmDelete = await showModal({
            title: 'Delete Comment',
            body: 'Are you sure you want to permanently remove this comment?',
            confirmText: 'Delete',
            cancelText: 'Cancel',
            danger: true
        });

        if (confirmDelete) {
            try {
                const res = await apiDelete('/comments/delete.php', { id: commentId });
                if (res.success) {
                    showToast('Comment deleted.', 'success');
                    
                    // Remove from DOM
                    const el = document.getElementById(`comment-${commentId}`);
                    if (el) el.remove();
                    
                    // Update counts
                    const count = parseInt(commentsCount.textContent) - 1;
                    commentsCount.textContent = count;
                    if (count === 0) {
                        renderComments([]);
                    }
                }
            } catch (err) {
                showToast(err.message || 'Failed to delete comment.', 'error');
            }
        }
    }
});
