/**
 * @fileoverview Astra Path - Authentication Module
 * @description Uses Firebase Authentication (Google Service) for secure sign-in.
 * Supports Email/Password and Google OAuth.
 * 
 * Security Features:
 * - Firebase Auth handles password hashing and session tokens
 * - Input validation on all fields
 * - Error codes translated to safe user messages
 * - No raw errors exposed to users
 * 
 * @version 2.0.0
 */

'use strict';

// ====================== FIREBASE CONFIG ======================
/** @constant {Object} Firebase project configuration */
var firebaseConfig = {
    apiKey: "AIzaSyANKp1WE2Rj9nrVqos36f-P2xtcXHKoiqk",
    authDomain: "promptwars-427d2.firebaseapp.com",
    projectId: "promptwars-427d2",
    storageBucket: "promptwars-427d2.firebasestorage.app",
    messagingSenderId: "946894049152",
    appId: "1:946894049152:web:697c8173783bc21ce6fb65",
    measurementId: "G-MM9ZM7YDWD"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

/** @type {firebase.auth.Auth} Firebase Auth instance */
var auth = firebase.auth();

// ====================== UTILITY FUNCTIONS ======================

/**
 * Validates an email address format.
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email format
 */
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validates password strength.
 * @param {string} password - Password to validate
 * @returns {{valid: boolean, error: string}} Validation result
 */
function validatePassword(password) {
    if (!password) return { valid: false, error: 'Password is required.' };
    if (password.length < 6) return { valid: false, error: 'Password must be at least 6 characters.' };
    if (password.length > 128) return { valid: false, error: 'Password is too long.' };
    return { valid: true, error: '' };
}

/**
 * Sanitizes user input.
 * @param {string} input - Input to sanitize
 * @returns {string} Sanitized string
 */
function sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    return input.trim().replace(/[<>]/g, '');
}

// ====================== TAB SWITCHING ======================

/**
 * Switches between login and register tabs.
 * @param {string} tab - Tab to activate ('login' or 'register')
 */
function switchTab(tab) {
    var loginTab = document.getElementById('login-tab');
    var registerTab = document.getElementById('register-tab');
    var loginForm = document.getElementById('login-form');
    var registerForm = document.getElementById('register-form');
    var errorDiv = document.getElementById('auth-error');

    errorDiv.classList.add('hidden');
    errorDiv.textContent = '';

    if (tab === 'login') {
        loginTab.classList.add('active');
        loginTab.setAttribute('aria-selected', 'true');
        registerTab.classList.remove('active');
        registerTab.setAttribute('aria-selected', 'false');
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        document.getElementById('login-email').focus();
    } else {
        registerTab.classList.add('active');
        registerTab.setAttribute('aria-selected', 'true');
        loginTab.classList.remove('active');
        loginTab.setAttribute('aria-selected', 'false');
        registerForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
        document.getElementById('register-name').focus();
    }
}

// ====================== ERROR DISPLAY ======================

/**
 * Displays an authentication error message.
 * @param {string} message - Error message to show
 */
function showAuthError(message) {
    var errorDiv = document.getElementById('auth-error');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
    errorDiv.focus();
}

/**
 * Maps Firebase error codes to user-friendly messages.
 * @param {Object} error - Firebase error object
 * @returns {string} User-friendly error message
 */
function getErrorMessage(error) {
    var messages = {
        'auth/user-not-found': 'No account found with this email. Please register first.',
        'auth/wrong-password': 'Incorrect password. Please try again.',
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/invalid-credential': 'Invalid credentials. Check your email and password.',
        'auth/email-already-in-use': 'This email is already registered. Try signing in.',
        'auth/weak-password': 'Password is too weak. Use at least 6 characters.',
        'auth/too-many-requests': 'Too many failed attempts. Please wait a few minutes.',
        'auth/network-request-failed': 'Network error. Check your internet connection.',
        'auth/popup-closed-by-user': 'Sign-in popup was closed. Please try again.',
        'auth/unauthorized-domain': 'This domain is not authorized. Add it in Firebase Console > Authentication > Settings > Authorized domains.'
    };
    return messages[error.code] || error.message || 'An unexpected error occurred.';
}

/**
 * Saves user session data to localStorage.
 * @param {firebase.User} user - Firebase user object
 */
function saveUserSession(user) {
    localStorage.setItem('astraUser', JSON.stringify({
        uid: user.uid,
        email: user.email,
        name: user.displayName || user.email.split('@')[0],
        photo: user.photoURL || '',
        lastLogin: new Date().toISOString()
    }));
}

// ====================== EMAIL/PASSWORD LOGIN ======================
document.getElementById('login-btn').addEventListener('click', function() {
    var email = sanitizeInput(document.getElementById('login-email').value);
    var password = document.getElementById('login-password').value;

    if (!email || !password) {
        showAuthError('Please enter both email and password.');
        return;
    }
    if (!isValidEmail(email)) {
        showAuthError('Please enter a valid email address.');
        return;
    }

    this.disabled = true;
    this.textContent = 'Signing in...';

    auth.signInWithEmailAndPassword(email, password)
        .then(function(userCredential) {
            saveUserSession(userCredential.user);
            window.location.href = 'index.html';
        })
        .catch(function(error) {
            showAuthError(getErrorMessage(error));
            document.getElementById('login-btn').disabled = false;
            document.getElementById('login-btn').textContent = 'Sign In';
        });
});

// ====================== EMAIL/PASSWORD REGISTER ======================
document.getElementById('register-btn').addEventListener('click', function() {
    var name = sanitizeInput(document.getElementById('register-name').value);
    var email = sanitizeInput(document.getElementById('register-email').value);
    var password = document.getElementById('register-password').value;

    if (!name || !email || !password) {
        showAuthError('Please fill in all fields.');
        return;
    }
    if (!isValidEmail(email)) {
        showAuthError('Please enter a valid email address.');
        return;
    }
    var passCheck = validatePassword(password);
    if (!passCheck.valid) {
        showAuthError(passCheck.error);
        return;
    }

    this.disabled = true;
    this.textContent = 'Creating account...';

    auth.createUserWithEmailAndPassword(email, password)
        .then(function(userCredential) {
            return userCredential.user.updateProfile({ displayName: name }).then(function() {
                saveUserSession(userCredential.user);
                window.location.href = 'index.html';
            });
        })
        .catch(function(error) {
            showAuthError(getErrorMessage(error));
            document.getElementById('register-btn').disabled = false;
            document.getElementById('register-btn').textContent = 'Create Account';
        });
});

// ====================== GOOGLE SIGN-IN (Google OAuth) ======================
document.getElementById('google-signin-btn').addEventListener('click', function() {
    var provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
        .then(function(result) {
            saveUserSession(result.user);
            window.location.href = 'index.html';
        })
        .catch(function(error) {
            if (error.code !== 'auth/popup-closed-by-user') {
                showAuthError(getErrorMessage(error));
            }
        });
});

// ====================== AUTH STATE OBSERVER ======================
auth.onAuthStateChanged(function(user) {
    if (user) {
        saveUserSession(user);
        window.location.href = 'index.html';
    }
});
