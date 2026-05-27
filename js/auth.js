// js/auth.js

document.addEventListener('DOMContentLoaded', async () => {
    // 1. If user is already logged in, redirect them away from login/register pages
    try {
        const session = await apiGet('/auth/session.php');
        if (session && session.success) {
            // Already logged in, go to dashboard
            window.location.href = 'dashboard.html';
            return;
        }
    } catch (e) {
        // Session endpoint error, let them log in anyway
    }

    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    // 2. Handle Login Form Submit
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const emailInput = document.getElementById('email');
            const passwordInput = document.getElementById('password');
            
            let isValid = true;
            
            // Validate email/username
            if (!emailInput.value.trim()) {
                showError('email', 'Email or Username is required.');
                isValid = false;
            } else {
                hideError('email');
            }
            
            // Validate password
            if (!passwordInput.value) {
                showError('password', 'Password is required.');
                isValid = false;
            } else {
                hideError('password');
            }
            
            if (!isValid) return;
            
            setSubmitting(true);
            
            try {
                const res = await apiPost('/auth/login.php', {
                    email: emailInput.value.trim(),
                    password: passwordInput.value
                });
                
                if (res.success) {
                    showToast('Logged in successfully! Redirecting...', 'success');
                    setTimeout(() => {
                        window.location.href = 'dashboard.html';
                    }, 1000);
                }
            } catch (err) {
                showToast(err.message || 'Login failed. Invalid credentials.', 'error');
                // Shake the form
                const container = document.querySelector('.auth-container');
                container.classList.add('animate-shake');
                container.addEventListener('animationend', () => {
                    container.classList.remove('animate-shake');
                });
            } finally {
                setSubmitting(false);
            }
        });
    }

    // 3. Handle Register Form Submit
    if (registerForm) {
        const usernameInput = document.getElementById('username');
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        const confirmInput = document.getElementById('confirm-password');
        const strengthMeter = document.getElementById('strength-meter');
        
        // Real-time password strength check
        passwordInput.addEventListener('input', () => {
            const passVal = passwordInput.value;
            const strength = validatePassword(passVal);
            
            const bar1 = document.getElementById('strength-bar-1');
            const bar2 = document.getElementById('strength-bar-2');
            const bar3 = document.getElementById('strength-bar-3');
            
            // Clear styles
            bar1.className = 'password-strength-bar';
            bar2.className = 'password-strength-bar';
            bar3.className = 'password-strength-bar';
            
            if (passVal.length === 0) return;
            
            if (strength.strength === 'weak') {
                bar1.classList.add('strength-weak');
            } else if (strength.strength === 'medium') {
                bar1.classList.add('strength-medium');
                bar2.classList.add('strength-medium');
            } else if (strength.strength === 'strong') {
                bar1.classList.add('strength-strong');
                bar2.classList.add('strength-strong');
                bar3.classList.add('strength-strong');
            }
        });

        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            let isValid = true;
            
            // Validate username
            if (usernameInput.value.trim().length < 3) {
                showError('username', 'Username must be at least 3 characters.');
                isValid = false;
            } else {
                hideError('username');
            }
            
            // Validate email
            if (!validateEmail(emailInput.value.trim())) {
                showError('email', 'Please enter a valid email address.');
                isValid = false;
            } else {
                hideError('email');
            }
            
            // Validate password complexity
            const passCheck = validatePassword(passwordInput.value);
            if (!passCheck.valid) {
                showError('password', passCheck.message);
                isValid = false;
            } else {
                hideError('password');
            }
            
            // Validate password match
            if (passwordInput.value !== confirmInput.value) {
                showError('confirm-password', 'Passwords do not match.');
                isValid = false;
            } else {
                hideError('confirm-password');
            }
            
            if (!isValid) return;
            
            setSubmitting(true);
            
            try {
                const res = await apiPost('/auth/register.php', {
                    username: usernameInput.value.trim(),
                    email: emailInput.value.trim(),
                    password: passwordInput.value
                });
                
                if (res.success) {
                    showToast('Account created successfully! Logging you in...', 'success');
                    setTimeout(() => {
                        window.location.href = 'dashboard.html';
                    }, 1000);
                }
            } catch (err) {
                showToast(err.message || 'Registration failed. Try a different username/email.', 'error');
                const container = document.querySelector('.auth-container');
                container.classList.add('animate-shake');
                container.addEventListener('animationend', () => {
                    container.classList.remove('animate-shake');
                });
            } finally {
                setSubmitting(false);
            }
        });
    }
});

// Help functions to manage states in auth UI
function showError(fieldId, message) {
    const group = document.getElementById(`group-${fieldId}`);
    const errDiv = document.getElementById(`error-${fieldId}`);
    if (group && errDiv) {
        group.classList.add('has-error');
        errDiv.textContent = message;
    }
}

function hideError(fieldId) {
    const group = document.getElementById(`group-${fieldId}`);
    if (group) {
        group.classList.remove('has-error');
    }
}

function setSubmitting(isSubmitting) {
    const btn = document.getElementById('btn-submit');
    if (!btn) return;
    if (isSubmitting) {
        btn.disabled = true;
        btn.dataset.originalHtml = btn.innerHTML;
        btn.innerHTML = `<span class="spinner" style="width:16px; height:16px; display:inline-block; border-width:1.5px;"></span> Submitting...`;
    } else {
        btn.disabled = false;
        btn.innerHTML = btn.dataset.originalHtml || btn.innerHTML;
    }
}
