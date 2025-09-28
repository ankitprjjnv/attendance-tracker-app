// --- START: IMPORTANT ---
// Aapka Firebase Config object yahan hona chahiye
const firebaseConfig = {
    apiKey: "AIzaSyBArfkJQLDd8oxSq7IvWIPt8S3VmTcFb48",
    authDomain: "custom-attendance-app.firebaseapp.com",
    projectId: "custom-attendance-app",
    storageBucket: "custom-attendance-app.firebasestorage.app",
    messagingSenderId: "48894037709",
    appId: "1:48894037709:web:ae8ca1b52a4d889ea1e384",
    measurementId: "G-TZCZP2RRRK"
};
// --- END: IMPORTANT ---

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
// YAHAN DEKHEIN: Humne Firestore ko import kiya hai
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
// Firestore ko bhi initialize karein
const db = getFirestore(app);

// DOM Elements ko select karein
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const loginContainer = document.getElementById('login-form-container');
const signupContainer = document.getElementById('signup-form-container');
const showSignupLink = document.getElementById('show-signup');
const showLoginLink = document.getElementById('show-login');

// Signup form dikhane ke liye link
showSignupLink.addEventListener('click', (e) => {
    e.preventDefault();
    loginContainer.classList.add('hidden');
    signupContainer.classList.remove('hidden');
});

// Login form dikhane ke liye link
showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    signupContainer.classList.add('hidden');
    loginContainer.classList.remove('hidden');
});

// Signup Logic (YAHAN SABSE ZAROORI BADLAV HAI)
signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('signup-name').value; // Naam ko form se lein
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;

    if (!name) {
        alert('Please apna naam daalein.');
        return;
    }

    createUserWithEmailAndPassword(auth, email, password)
        .then(async (userCredential) => {
            const user = userCredential.user;
            
            // Step 1: User ka account banayein
            // Step 2: Firestore mein user ka naam aur email save karein
            try {
                await setDoc(doc(db, "users", user.uid), {
                    name: name,
                    email: email
                });
                alert("Account ban gaya! Ab aap login kar sakte hain.");
                signupForm.reset();
                showLoginLink.click();
            } catch (error) {
                console.error("Error saving user data: ", error);
                alert("Account ban gaya, lekin data save nahi ho paya.");
            }
        })
        .catch((error) => {
            alert("Error: " + error.message);
        });
});

// Login Logic (Ismein koi badlav nahi hai)
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            window.location.href = 'index.html';
        })
        .catch((error) => {
            alert("Error: " + error.message);
        });
});

