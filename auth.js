// ====================== FIREBASE CONFIG ======================
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
var auth = firebase.auth();

// ====================== TAB SWITCHING ======================
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
        registerTab.classList.remove('active');
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
    } else {
        registerTab.classList.add('active');
        loginTab.classList.remove('active');
        registerForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
    }
}

// ====================== SHOW ERROR ======================
function showAuthError(message) {
    var errorDiv = document.getElementById('auth-error');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
}

// ====================== EMAIL/PASSWORD LOGIN ======================
document.getElementById('login-btn').addEventListener('click', function() {
    var email = document.getElementById('login-email').value.trim();
    var password = document.getElementById('login-password').value;

    if (!email || !password) {
        showAuthError('Please enter both email and password.');
        return;
    }

    this.disabled = true;
    this.textContent = 'Signing in...';

    auth.signInWithEmailAndPassword(email, password)
        .then(function(userCredential) {
            localStorage.setItem('astraUser', JSON.stringify({
                uid: userCredential.user.uid,
                email: userCredential.user.email,
                name: userCredential.user.displayName || email.split('@')[0]
            }));
            window.location.href = 'index.html';
        })
        .catch(function(error) {
            var msg = 'Something went wrong.';
            if (error.code === 'auth/user-not-found') msg = 'No account found with this email. Please register first.';
            else if (error.code === 'auth/wrong-password') msg = 'Incorrect password. Please try again.';
            else if (error.code === 'auth/invalid-email') msg = 'Please enter a valid email address.';
            else if (error.code === 'auth/invalid-credential') msg = 'Invalid credentials. Please check your email and password.';
            else msg = error.message;
            showAuthError(msg);
            document.getElementById('login-btn').disabled = false;
            document.getElementById('login-btn').textContent = 'Sign In';
        });
});

// ====================== EMAIL/PASSWORD REGISTER ======================
document.getElementById('register-btn').addEventListener('click', function() {
    var name = document.getElementById('register-name').value.trim();
    var email = document.getElementById('register-email').value.trim();
    var password = document.getElementById('register-password').value;

    if (!name || !email || !password) {
        showAuthError('Please fill in all fields.');
        return;
    }
    if (password.length < 6) {
        showAuthError('Password must be at least 6 characters.');
        return;
    }

    this.disabled = true;
    this.textContent = 'Creating account...';

    auth.createUserWithEmailAndPassword(email, password)
        .then(function(userCredential) {
            return userCredential.user.updateProfile({ displayName: name }).then(function() {
                localStorage.setItem('astraUser', JSON.stringify({
                    uid: userCredential.user.uid,
                    email: userCredential.user.email,
                    name: name
                }));
                window.location.href = 'index.html';
            });
        })
        .catch(function(error) {
            var msg = 'Something went wrong.';
            if (error.code === 'auth/email-already-in-use') msg = 'This email is already registered. Try signing in instead.';
            else if (error.code === 'auth/weak-password') msg = 'Password is too weak. Use at least 6 characters.';
            else if (error.code === 'auth/invalid-email') msg = 'Please enter a valid email address.';
            else msg = error.message;
            showAuthError(msg);
            document.getElementById('register-btn').disabled = false;
            document.getElementById('register-btn').textContent = 'Create Account';
        });
});

// ====================== GOOGLE SIGN-IN ======================
document.getElementById('google-signin-btn').addEventListener('click', function() {
    var provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
        .then(function(result) {
            var user = result.user;
            localStorage.setItem('astraUser', JSON.stringify({
                uid: user.uid,
                email: user.email,
                name: user.displayName || 'User',
                photo: user.photoURL || ''
            }));
            window.location.href = 'index.html';
        })
        .catch(function(error) {
            if (error.code !== 'auth/popup-closed-by-user') {
                showAuthError(error.message);
            }
        });
});

// ====================== AUTH STATE CHECK ======================
auth.onAuthStateChanged(function(user) {
    if (user) {
        localStorage.setItem('astraUser', JSON.stringify({
            uid: user.uid,
            email: user.email,
            name: user.displayName || user.email.split('@')[0],
            photo: user.photoURL || ''
        }));
        window.location.href = 'index.html';
    }
});
