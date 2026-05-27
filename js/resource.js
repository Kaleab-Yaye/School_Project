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
    function renderContentViewer(resource) {
        if (resource.resource_type === 'pdf') {
            viewerContainer.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: var(--space-3xl) var(--space-xl); text-align: center; min-height: 280px;">
                    <div style="font-size: 4rem; margin-bottom: var(--space-lg);">📄</div>
                    <h3 style="font-family: var(--font-heading); margin-bottom: var(--space-xs);">${escapeHtml(resource.title)}</h3>
                    <p style="color: var(--text-secondary); font-size: var(--text-sm); margin-bottom: var(--space-xl);">
                        This resource is available as a PDF document. Click below to download and view it.
                    </p>
                    <a href="${resource.file_path}" download class="btn btn-primary" style="padding: var(--space-sm) var(--space-xl);">
                        📥 Download PDF File
                    </a>
                </div>
            `;

            // Also add download button in sidebar
            downloadWrapper.innerHTML = `
                <a href="${resource.file_path}" download class="btn btn-primary" style="width: 100%; margin-top: var(--space-sm);">
                    📥 Download PDF File
                </a>
            `;
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
