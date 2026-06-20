// js/api.js

async function apiFetch(endpoint, options = {}) {
    const url = API_BASE + endpoint;
    const config = {
        headers: {},
        credentials: 'same-origin', // send cookies/session
        ...options
    };
    
    // If body is FormData, don't set Content-Type (browser sets boundary)
    // If body is object, JSON.stringify and set Content-Type
    if (config.body && !(config.body instanceof FormData)) {
        config.headers['Content-Type'] = 'application/json';
        config.body = JSON.stringify(config.body);
    }
    
    try {
        const response = await fetch(url, config);
        
        let data;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            const rawText = await response.text();
            data = { success: response.ok, message: rawText };
        }
        
        if (!response.ok) {
            // If 401 Unauthorized, redirect to login unless already on login or register or index pages
            if (response.status === 401) {
                const currentPage = window.location.pathname;
                if (!currentPage.includes('login.html') && !currentPage.includes('register.html') && !currentPage.endsWith('/') && !currentPage.includes('index.html')) {
                    window.location.href = 'login.html';
                    return;
                }
            }
            throw { 
                status: response.status, 
                message: data.message || 'Something went wrong', 
                data 
            };
        }
        
        return data;
    } catch (error) {
        if (error.status !== undefined) throw error; // re-throw API errors
        throw { 
            status: 0, 
            message: 'Network error or backend is offline. Please verify WAMP is running.' 
        };
    }
}

async function apiGet(endpoint) {
    return apiFetch(endpoint, { method: 'GET' });
}

async function apiPost(endpoint, body) {
    return apiFetch(endpoint, {
        method: 'POST',
        body: body
    });
}

async function apiDelete(endpoint, body = null) {
    return apiFetch(endpoint, {
        method: 'DELETE',
        body: body
    });
}

async function apiUpload(endpoint, formData) {
    return apiFetch(endpoint, {
        method: 'POST',
        body: formData
    });
}
