// js/utils.js

function debounce(fn, delay) {
    let timeoutId;
    return function (...args) {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
            fn.apply(this, args);
        }, delay);
    };
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatRelativeTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 30) return `${diffDays}d ago`;
    
    return formatDate(dateString);
}

function formatFileSize(bytes) {
    if (bytes === 0 || !bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function slugify(text) {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
        .replace(/\-\-+/g, '-');        // Replace multiple - with single -
}

function hashString(str) {
    let hash = 0;
    if (str.length === 0) return hash;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash);
}

function generateGradient(seed) {
    const hash = hashString(seed || 'default');
    const lightness1 = 20 + (hash % 20);  // 20-40% dark cherry
    const lightness2 = 12 + (hash % 15);  // 12-27% darker cherry
    const hue = 345 + (hash % 15);        // 345-360 cherry range only
    return `linear-gradient(135deg, hsl(${hue}, 75%, ${lightness1}%), hsl(${hue}, 65%, ${lightness2}%))`;
}

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substr(0, maxLength) + '...';
}

function getInitials(name) {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validatePassword(password) {
    if (!password || password.length < 8) {
        return { valid: false, strength: 'weak', message: 'Password must be at least 8 characters long.' };
    }
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    
    if (hasUppercase && hasNumber) {
        return { valid: true, strength: 'strong', message: 'Strong password.' };
    } else if (hasUppercase || hasNumber) {
        return { valid: true, strength: 'medium', message: 'Medium strength. Add both numbers and uppercase characters to make it stronger.' };
    } else {
        return { valid: false, strength: 'weak', message: 'Password must contain at least one uppercase letter or number.' };
    }
}

async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (err) {
        return false;
    }
}

function getParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

function setParam(name, value) {
    const urlParams = new URLSearchParams(window.location.search);
    if (value === null || value === undefined || value === '') {
        urlParams.delete(name);
    } else {
        urlParams.set(name, value);
    }
    const newRelativePathQuery = window.location.pathname + '?' + urlParams.toString();
    window.history.pushState(null, '', newRelativePathQuery);
}

function animateCounter(element, target, duration) {
    if (!element) return;
    let start = 0;
    const stepTime = Math.abs(Math.floor(duration / target));
    
    // Fallback if target is 0 or stepTime is too small
    if (target === 0) {
        element.textContent = '0';
        return;
    }
    
    const timer = setInterval(() => {
        start += 1;
        element.textContent = start;
        if (start >= target) {
            element.textContent = target;
            clearInterval(timer);
        }
    }, Math.max(stepTime, 20));
}
