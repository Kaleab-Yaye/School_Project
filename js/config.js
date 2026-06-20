// js/config.js

const getApiBase = () => {
    let path = window.location.pathname;
    if (!path.endsWith('/') && !path.includes('.')) {
        path += '/';
    }
    const pathParts = path.split('/');
    const baseParts = pathParts.slice(0, -1);
    return baseParts.join('/') + '/api';
};
const API_BASE = getApiBase();
const UPLOAD_MAX_SIZE = 50 * 1024 * 1024; // 50MB
const SEARCH_DEBOUNCE_MS = 300;
const TOAST_DURATION_MS = 4000;
const ITEMS_PER_PAGE = 12;
