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
            
            // Reload user to get latest verification status
            return user.reload().then(() => {
                // Check if email is verified
                if (!user.emailVerified) {
                    // Show verification notice
                    document.getElementById('verification-notice').style.display = 'block';
                    
                    showToast(
                        'Verification Required',
                        'Please verify your email before logging in.',
                        'warning',
                        6000
                    );
                    throw new Error('Email not verified');
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
            });
        })
        .catch((error) => {
            console.error("Login error:", error);
            
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                showToast(
                    'Login Failed',
                    'Invalid email or password',
                    'error'
                );
            } else if (error.message === 'Email not verified') {
                // Don't show error toast for unverified email (already handled)
            } else {
                showToast(
                    'Login Failed',
                    error.message,
                    'error'
                );
            }
            
            auth.signOut();
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
            
            // Save user data to database WITH ROLE FIELD (even if null)
            return database.ref('users/' + user.uid).set({
                fullName: fullName,
                email: email,
                role: 'head', // ← This must be included
                status: 'active', // ← This must be included
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
            
            // Check if it's a permission denied error
            if (error.code === 'PERMISSION_DENIED') {
                showToast(
                    'Signup Failed', 
                    'Database validation failed. Please contact support.',
                    'error',
                    6000
                );
            } else {
                showToast(
                    'Signup Failed', 
                    error.message,
                    'error',
                    6000
                );
            }
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
            
            // Check email verification status on every auth state change
            user.reload().then(() => {
                // If user is on login/signup page and email is verified, redirect to dashboard
                if ((window.location.pathname.includes('login.html') || 
                     window.location.pathname.includes('signup.html')) &&
                    user.emailVerified) {
                    
                    showToast(
                        'Email Verified',
                        'Your email has been verified! Redirecting...',
                        'success'
                    );
                    setTimeout(() => {
                        window.location.href = 'dashboard.html';
                    }, 2000);
                }
                
                // If user is on verification page, check status
                if (window.location.pathname.includes('verify-email')) {
                    checkEmailVerification();
                }
            });
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

// Handle resend verification email
function handleResendVerification() {
    const user = auth.currentUser;
    
    if (!user) {
        showToast('Error', 'No user found. Please log in first.', 'error');
        return;
    }
    
    // Show loading state
    const resendBtn = document.getElementById('resend-verification');
    const originalText = resendBtn.innerHTML;
    resendBtn.disabled = true;
    resendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    
    user.sendEmailVerification()
        .then(() => {
            showToast(
                'Verification Sent',
                'A new verification email has been sent to ' + user.email,
                'success',
                6000
            );
            
            // Disable button for 60 seconds to prevent spam
            let countdown = 60;
            const interval = setInterval(() => {
                resendBtn.innerHTML = `Resend in ${countdown}s`;
                countdown--;
                
                if (countdown <= 0) {
                    clearInterval(interval);
                    resendBtn.disabled = false;
                    resendBtn.innerHTML = originalText;
                }
            }, 1000);
        })
        .catch((error) => {
            console.error("Resend verification error:", error);
            showToast(
                'Error',
                'Failed to send verification email: ' + error.message,
                'error'
            );
            resendBtn.disabled = false;
            resendBtn.innerHTML = originalText;
        });
}

// Check email verification status and redirect
function checkEmailVerification() {
    const user = auth.currentUser;
    
    if (user) {
        user.reload().then(() => {
            if (user.emailVerified) {
                showToast(
                    'Email Verified',
                    'Your email has been verified successfully!',
                    'success'
                );
                
                // Update database
                database.ref('users/' + user.uid + '/emailVerified').set(true)
                    .then(() => {
                        // Redirect to login after 2 seconds
                        setTimeout(() => {
                            window.location.href = 'login.html';
                        }, 2000);
                    });
            }
        });
    }
}

// Add password toggle functionality
function setupPasswordToggle() {
    const toggleBtn = document.getElementById('toggle-password');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', function() {
            const passwordInput = document.getElementById('signup-password');
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            
            // Toggle eye icon
            const icon = this.querySelector('i');
            icon.classList.toggle('fa-eye');
            icon.classList.toggle('fa-eye-slash');
        });
    }
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

    setupPasswordToggle();
    
    // Login page
    if (document.getElementById('login-form')) {
        const loginForm = document.getElementById('login-form');
        const emailInput = document.getElementById('login-email');
        const resendBtn = document.getElementById('resend-verification');
        
        loginForm.addEventListener('submit', handleLogin);
        
        if (resendBtn) {
            resendBtn.addEventListener('click', handleResendVerification);
        }
        
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
    
    // Check for email verification redirect
    if (window.location.search.includes('mode=verifyEmail')) {
        checkEmailVerification();
    }
    
    // Check auth state on all pages
    checkAuthState();
});

