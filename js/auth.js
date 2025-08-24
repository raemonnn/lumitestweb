console.log("Firebase services initialized:", {
  auth: typeof auth !== 'undefined',
  database: typeof database !== 'undefined'
});

// Email validation function
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Password validation function
function validatePassword(password) {
    // At least 6 characters, 1 number, 1 uppercase
    const re = /^(?=.*\d)(?=.*[A-Z]).{6,}$/;
    return re.test(password);
}

// Check password strength
function checkPasswordStrength(password) {
    let strength = 0;
    
    if (password.length >= 6) strength++;
    if (password.match(/([a-z].*[A-Z])|([A-Z].*[a-z])/)) strength++;
    if (password.match(/([0-9])/)) strength++;
    if (password.match(/([!,%,&,@,#,$,^,*,?,_,~])/)) strength++;
    
    return strength;
}

// Update password strength indicator
function updatePasswordStrength(password) {
    const strength = checkPasswordStrength(password);
    const strengthBar = document.getElementById('password-strength');
    const requirements = document.getElementById('password-requirements');
    
    strengthBar.className = `password-strength strength-${strength}`;
    
    if (strength < 2) {
        strengthBar.style.backgroundColor = '#dc3545';
    } else if (strength < 4) {
        strengthBar.style.backgroundColor = '#ffc107';
    } else {
        strengthBar.style.backgroundColor = '#28a745';
    }
    
    // Update requirements list
    const reqs = [
        {text: 'At least 6 characters', valid: password.length >= 6},
        {text: 'At least 1 number', valid: /[0-9]/.test(password)},
        {text: 'At least 1 uppercase letter', valid: /[A-Z]/.test(password)}
    ];
    
    requirements.innerHTML = reqs.map(req => 
        `<li class="${req.valid ? 'text-success' : 'text-danger'}">${req.text}</li>`
    ).join('');
}

// Handle login form submission
function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    // Show loading state
    const btn = document.querySelector('#login-form button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';

    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            
            // Check if email is verified
            if (!user.emailVerified) {
                // Send verification email if not verified
                return user.sendEmailVerification()
                    .then(() => {
                        showToast(
                            'Verification Required',
                            'Please verify your email first. We\'ve sent a new verification email.',
                            'warning',
                            8000
                        );
                        throw new Error('Email not verified');
                    });
            }
            
            // Update database with verification status
            return database.ref('users/' + user.uid + '/emailVerified').set(true)
                .then(() => {
                    showToast(
                        'Login Successful',
                        'Welcome back to Lumiverse!',
                        'success'
                    );
                    setTimeout(() => {
                        window.location.href = 'dashboard.html';
                    }, 1500);
                });
        })
        .catch((error) => {
            auth.signOut();
            showToast(
                'Login Failed',
                error.message,
                'error'
            );
        })
        .finally(() => {
            btn.disabled = false;
            btn.innerHTML = originalText;
        });
}


// Handle signup form submission
function handleSignup(e) {
    e.preventDefault();
    
    const fullName = document.getElementById('signup-name').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;

    // Show loading state
    const btn = document.querySelector('#signup-form button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';

    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            
            // Save user data to database
            return database.ref('users/' + user.uid).set({
                fullName: fullName,
                email: email,
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                emailVerified: false
            })
            .then(() => {
                // Send verification email
                return user.sendEmailVerification()
                    .then(() => {
                        showToast(
                            'Verification Sent', 
                            'We\'ve sent a verification email to ' + email,
                            'info',
                            8000
                        );
                        return auth.signOut();
                    });
            });
        })
        .then(() => {
            showToast(
                'Account Created', 
                'Please verify your email before logging in',
                'success'
            );
            window.location.href = 'login.html';
        })
        .catch((error) => {
            console.error("Signup error:", error);
            showToast(
                'Signup Failed', 
                error.message,
                'error',
                6000
            );
        })
        .finally(() => {
            btn.disabled = false;
            btn.innerHTML = originalText;
        });
}

// Check auth state
function checkAuthState() {
    auth.onAuthStateChanged((user) => {
        if (user) {
            console.log("Auth state changed - User detected:", user.uid);
            
            // Check if user is on login/signup page
            if (window.location.pathname.includes('login.html') || 
                window.location.pathname.includes('signup.html')) {
                
                // Check email verification status
                user.reload().then(() => {
                    if (user.emailVerified) {
                        showToast(
                            'Session Restored',
                            'Welcome back! Redirecting to dashboard...',
                            'success'
                        );
                        setTimeout(() => {
                            window.location.href = 'dashboard.html';
                        }, 1500);
                    }
                });
            }
        } else {
            // User is signed out
            if (window.location.pathname.includes('dashboard.html')) {
                showToast(
                    'Session Ended',
                    'You have been signed out',
                    'info'
                );
                window.location.href = 'index.html';
            }
        }
    });
}

// Add this to your login page JavaScript
document.getElementById('resend-verification')?.addEventListener('click', () => {
    const email = document.getElementById('login-email').value;
    if (!email) {
        alert('Please enter your email first');
        return;
    }
    
    auth.sendPasswordResetEmail(email)
        .then(() => alert('Verification email resent!'))
        .catch(error => alert('Error: ' + error.message));
});

function showToast(title, message, type = 'info', duration = 5000) {
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-header">
            <div class="toast-title">
                <i class="fas ${icons[type] || 'fa-info-circle'}"></i>
                ${title}
            </div>
            <button class="toast-close">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="toast-body">
            ${message}
        </div>
    `;
    
    // Create container if it doesn't exist
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    
    container.appendChild(toast);
    
    // Show toast
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Auto-remove after duration
    const autoRemove = setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, duration);
    
    // Manual close
    toast.querySelector('.toast-close').addEventListener('click', () => {
        clearTimeout(autoRemove);
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    });
    
    console.log(`[Toast] ${title}: ${message}`); // Keep console logging
}


// Initialize auth listeners
document.addEventListener('DOMContentLoaded', function() {
    // Login page
    if (document.getElementById('login-form')) {
        const loginForm = document.getElementById('login-form');
        const emailInput = document.getElementById('login-email');
        
        loginForm.addEventListener('submit', handleLogin);
        
        emailInput.addEventListener('input', function() {
            if (validateEmail(this.value)) {
                this.classList.add('is-valid');
                this.classList.remove('is-invalid');
            } else {
                this.classList.add('is-invalid');
                this.classList.remove('is-valid');
            }
        });
    }
    
    // Signup page
    if (document.getElementById('signup-form')) {
        const signupForm = document.getElementById('signup-form');
        const emailInput = document.getElementById('signup-email');
        const passwordInput = document.getElementById('signup-password');
        
        signupForm.addEventListener('submit', handleSignup);
        
        emailInput.addEventListener('input', function() {
            if (validateEmail(this.value)) {
                this.classList.add('is-valid');
                this.classList.remove('is-invalid');
            } else {
                this.classList.add('is-invalid');
                this.classList.remove('is-valid');
            }
        });
        
        passwordInput.addEventListener('input', function() {
            updatePasswordStrength(this.value);
            
            if (validatePassword(this.value)) {
                this.classList.add('is-valid');
                this.classList.remove('is-invalid');
            } else {
                this.classList.add('is-invalid');
                this.classList.remove('is-valid');
            }
        });
    }
    
    // Check auth state on all pages
    checkAuthState();
});