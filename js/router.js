// js/router.js

const Router = {
    getParam(name) {
        return getParam(name);
    },
    
    setParam(name, value) {
        setParam(name, value);
    },
    
    navigate(page, params = {}) {
        const query = new URLSearchParams(params).toString();
        window.location.href = page + (query ? '?' + query : '');
    },
    
    getCurrentPage() {
        const path = window.location.pathname;
        const filename = path.substring(path.lastIndexOf('/') + 1) || 'index.html';
        return filename;
    }
};
