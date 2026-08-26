// ============================================
// Djuniors - Login JavaScript
// ============================================

const API_BASE = window.API_BASE || (window.location.origin && window.location.origin.includes(':8787') ? '' : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:8787' : ''));

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const togglePassword = document.getElementById('toggle-password');
    const loginBtn = document.getElementById('login-btn');
    const errorDiv = document.getElementById('login-error');

    // Toggle password visibility
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', () => {
            const type = passwordInput.type === 'password' ? 'text' : 'password';
            passwordInput.type = type;
            togglePassword.textContent = type === 'password' ? '👁️' : '🙈';
        });
    }

    // Handle form submission
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = emailInput?.value.trim();
            const password = passwordInput?.value;

            if (!email || !password) {
                showError('Mohon isi email dan password');
                return;
            }

            // Show loading state
            if (loginBtn) {
                loginBtn.disabled = true;
                loginBtn.textContent = '⏳ Masuk...';
            }

            hideError();

            try {
                const response = await fetch(`${API_BASE}/api/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (data.success) {
                    // Store token and user data
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));

                    // Redirect to dashboard or home
                    window.location.href = '/';
                } else {
                    showError(data.error || 'Login gagal');
                }
            } catch (error) {
                showError('Terjadi kesalahan. Silakan coba lagi.');
            } finally {
                if (loginBtn) {
                    loginBtn.disabled = false;
                    loginBtn.textContent = '🚀 Masuk';
                }
            }
        });
    }

    function showError(message) {
        if (errorDiv) {
            errorDiv.textContent = '⚠️ ' + message;
            errorDiv.classList.remove('hidden');
        }
    }

    function hideError() {
        if (errorDiv) {
            errorDiv.classList.add('hidden');
        }
    }
});
