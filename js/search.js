// js/search.js

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('global-search-input');
    const dropdown = document.getElementById('global-search-dropdown');

    if (!searchInput || !dropdown) return;

    let activeIndex = -1;
    let items = [];

    // Debounce search function
    const performSearch = debounce(async (query) => {
        if (query.length < 2) {
            dropdown.style.display = 'none';
            dropdown.innerHTML = '';
            return;
        }

        try {
            const res = await apiGet(`/search/global.php?q=${encodeURIComponent(query)}`);
            if (res && res.success && res.data.length > 0) {
                renderDropdown(res.data);
            } else {
                dropdown.innerHTML = '<div style="padding: var(--space-md); text-align: center; color: var(--text-secondary); font-size: var(--text-sm);">No matches found.</div>';
                dropdown.style.display = 'block';
            }
        } catch (e) {
            console.error('Search query failed:', e);
        }
    }, SEARCH_DEBOUNCE_MS);

    searchInput.addEventListener('input', (e) => {
        performSearch(e.target.value.trim());
    });

    // Close dropdown on clicking outside
    document.addEventListener('click', (e) => {
        if (e.target !== searchInput && e.target !== dropdown) {
            dropdown.style.display = 'none';
        }
    });

    searchInput.addEventListener('focus', () => {
        if (searchInput.value.trim().length >= 2 && dropdown.innerHTML !== '') {
            dropdown.style.display = 'block';
        }
    });

    // Keyboard navigation (Arrow keys + Enter)
    searchInput.addEventListener('keydown', (e) => {
        const dropdownItems = dropdown.querySelectorAll('.search-dropdown-item');
        if (!dropdownItems.length) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            activeIndex = (activeIndex + 1) % dropdownItems.length;
            highlightItem(dropdownItems);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            activeIndex = (activeIndex - 1 + dropdownItems.length) % dropdownItems.length;
            highlightItem(dropdownItems);
        } else if (e.key === 'Enter') {
            if (activeIndex >= 0) {
                e.preventDefault();
                dropdownItems[activeIndex].click();
            } else {
                // Perform full search page redirection
                e.preventDefault();
                const q = searchInput.value.trim();
                if (q) {
                    window.location.href = `search.html?q=${encodeURIComponent(q)}`;
                }
            }
        } else if (e.key === 'Escape') {
            dropdown.style.display = 'none';
            searchInput.blur();
        }
    });

    function highlightItem(dropdownItems) {
        dropdownItems.forEach((item, idx) => {
            if (idx === activeIndex) {
                item.classList.add('active');
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.classList.remove('active');
            }
        });
    }

    function renderDropdown(data) {
        dropdown.innerHTML = '';
        activeIndex = -1;

        // Group data by type
        const groups = {
            department: [],
            course: [],
            resource: []
        };

        data.forEach(item => {
            if (groups[item.type]) {
                groups[item.type].push(item);
            }
        });

        let hasResults = false;

        // Render each category group
        Object.keys(groups).forEach(type => {
            const list = groups[type];
            if (list.length > 0) {
                hasResults = true;
                
                const groupContainer = document.createElement('div');
                groupContainer.className = 'search-dropdown-group';
                
                let title = 'Departments';
                if (type === 'course') title = 'Courses';
                if (type === 'resource') title = 'Resources';

                groupContainer.innerHTML = `<div class="search-dropdown-group-title">${title}</div>`;

                list.forEach(item => {
                    const itemDiv = document.createElement('div');
                    itemDiv.className = 'search-dropdown-item';
                    
                    let icon = '🏛️';
                    let action = () => { window.location.href = `department.html?id=${item.id}`; };
                    let sub = '';

                    if (type === 'course') {
                        icon = '📚';
                        action = () => { window.location.href = `course.html?id=${item.id}`; };
                        sub = item.parent ? `in ${item.parent}` : '';
                    } else if (type === 'resource') {
                        icon = '📄';
                        sub = item.parent ? `[${item.parent.toUpperCase()}]` : '';
                        
                        // Handle resource download/open action
                        if (item.resource_type === 'pdf' && item.file_path) {
                            action = () => {
                                const link = document.createElement('a');
                                link.href = item.file_path;
                                link.download = item.name;
                                link.click();
                            };
                        } else if (item.resource_type === 'link' && item.external_link) {
                            action = () => { window.open(item.external_link, '_blank'); };
                        }
                    }

                    itemDiv.innerHTML = `
                        <div class="search-dropdown-item-details">
                            <span style="font-size: var(--text-md);">${icon}</span>
                            <div>
                                <div class="search-dropdown-item-title">${escapeHtml(item.name)}</div>
                                ${sub ? `<div class="search-dropdown-item-subtitle">${escapeHtml(sub)}</div>` : ''}
                            </div>
                        </div>
                        <span class="badge badge-primary">${type}</span>
                    `;

                    itemDiv.addEventListener('click', action);

                    groupContainer.appendChild(itemDiv);
                });

                dropdown.appendChild(groupContainer);
            }
        });

        if (hasResults) {
            dropdown.style.display = 'block';
        } else {
            dropdown.style.display = 'none';
        }
    }
});
