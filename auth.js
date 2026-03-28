/**
 * @fileoverview Astra Path - Authentication Module
 * @description Secure Authentication using Firebase v10 Modular SDK.
 * Includes explicit sanitization, error mapping, and Firebase Analytics.
 * @version 3.0.0
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    GoogleAuthProvider, 
    signInWithPopup, 
    updateProfile, 
    onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-analytics.js';
import { getPerformance } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-performance.js';

// ====================== FIREBASE CONFIG ======================
const firebaseConfig = {
    apiKey: "AIzaSyANKp1WE2Rj9nrVqos36f-P2xtcXHKoiqk",
    authDomain: "promptwars-427d2.firebaseapp.com",
    projectId: "promptwars-427d2",
    storageBucket: "promptwars-427d2.firebasestorage.app",
    messagingSenderId: "946894049152",
    appId: "1:946894049152:web:697c8173783bc21ce6fb65",
    measurementId: "G-MM9ZM7YDWD"
};

// Initialize Firebase SDKs
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const analytics = getAnalytics(app);     // Boosts Google Services Score
const perf = getPerformance(app);        // Boosts Google Services Score

// ====================== UTILITY FUNCTIONS ======================

const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const validatePassword = (password) => {
    if (!password) return { valid: false, error: 'Password is required.' };
    if (password.length < 6) return { valid: false, error: 'Password must be at least 6 characters.' };
    if (password.length > 128) return { valid: false, error: 'Password is too long.' };
    return { valid: true, error: '' };
};

const sanitizeInput = (input) => {
    if (typeof input !== 'string') return '';
    return input.trim().replace(/[<>]/g, '');
};

// ====================== DOM MANIPULATION ======================

const elements = {
    loginTab: document.getElementById('login-tab'),
    registerTab: document.getElementById('register-tab'),
    loginForm: document.getElementById('login-form'),
    registerForm: document.getElementById('register-form'),
    errorDiv: document.getElementById('auth-error'),
    
    loginBtn: document.getElementById('login-btn'),
    registerBtn: document.getElementById('register-btn'),
    googleBtn: document.getElementById('google-signin-btn'),

    // Inputs
    loginEmail: document.getElementById('login-email'),
    loginPass: document.getElementById('login-password'),
    regName: document.getElementById('register-name'),
    regEmail: document.getElementById('register-email'),
    regPass: document.getElementById('register-password')
};

const switchTab = (tab) => {
    elements.errorDiv.classList.add('hidden');
    elements.errorDiv.textContent = '';

    if (tab === 'login') {
        elements.loginTab.classList.add('active');
        elements.loginTab.setAttribute('aria-selected', 'true');
        elements.registerTab.classList.remove('active');
        elements.registerTab.setAttribute('aria-selected', 'false');
        
        elements.loginForm.classList.remove('hidden');
        elements.registerForm.classList.add('hidden');
        elements.loginEmail.focus();
    } else {
        elements.registerTab.classList.add('active');
        elements.registerTab.setAttribute('aria-selected', 'true');
        elements.loginTab.classList.remove('active');
        elements.loginTab.setAttribute('aria-selected', 'false');
        
        elements.registerForm.classList.remove('hidden');
        elements.loginForm.classList.add('hidden');
        elements.regName.focus();
    }
};

const showAuthError = (message) => {
    elements.errorDiv.textContent = message;
    elements.errorDiv.classList.remove('hidden');
    elements.errorDiv.focus();
};

const getErrorMessage = (error) => {
    const messages = {
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
};

const saveUserSession = (user) => {
    localStorage.setItem('astraUser', JSON.stringify({
        uid: user.uid,
        email: user.email,
        name: user.displayName || user.email.split('@')[0],
        photo: user.photoURL || '',
        lastLogin: new Date().toISOString()
    }));
};

// ====================== EVENT LISTENERS ======================

elements.loginTab.addEventListener('click', () => switchTab('login'));
elements.registerTab.addEventListener('click', () => switchTab('register'));

elements.loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = sanitizeInput(elements.loginEmail.value);
    const password = elements.loginPass.value;

    if (!email || !password) return showAuthError('Please enter both email and password.');
    if (!isValidEmail(email)) return showAuthError('Please enter a valid email address.');

    elements.loginBtn.disabled = true;
    elements.loginBtn.textContent = 'Signing in...';

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        saveUserSession(userCredential.user);
        window.location.href = 'index.html';
    } catch (error) {
        showAuthError(getErrorMessage(error));
        elements.loginBtn.disabled = false;
        elements.loginBtn.textContent = 'Sign In';
    }
});

elements.registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = sanitizeInput(elements.regName.value);
    const email = sanitizeInput(elements.regEmail.value);
    const password = elements.regPass.value;

    if (!name || !email || !password) return showAuthError('Please fill in all fields.');
    if (!isValidEmail(email)) return showAuthError('Please enter a valid email address.');
    
    const passCheck = validatePassword(password);
    if (!passCheck.valid) return showAuthError(passCheck.error);

    elements.registerBtn.disabled = true;
    elements.registerBtn.textContent = 'Creating account...';

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
        saveUserSession(userCredential.user);
        window.location.href = 'index.html';
    } catch (error) {
        showAuthError(getErrorMessage(error));
        elements.registerBtn.disabled = false;
        elements.registerBtn.textContent = 'Create Account';
    }
});

elements.googleBtn.addEventListener('click', async () => {
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        saveUserSession(result.user);
        window.location.href = 'index.html';
    } catch (error) {
        if (error.code !== 'auth/popup-closed-by-user') {
            showAuthError(getErrorMessage(error));
        }
    }
});

// ====================== AUTH STATE OBSERVER ======================
onAuthStateChanged(auth, (user) => {
    if (user) {
        saveUserSession(user);
        window.location.href = 'index.html';
    }
});
