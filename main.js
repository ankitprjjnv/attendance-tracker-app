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
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, query, getDocs, doc, getDoc, deleteDoc, where } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
let currentUserId = null;

// --- CHART COLORS ---
const presentColor = '#22c55e';
const absentColor = '#ef4444';

// --- DOM ELEMENTS ---
const greetingEl = document.getElementById('greeting');
const userNameDisplayEl = document.getElementById('user-name-display');
const dashboardPercentageEl = document.getElementById('dashboard-percentage');
const dashboardSubjectsTrackedEl = document.getElementById('dashboard-subjects-tracked');
let dashboardChartInstance = null;

// --- AUTHENTICATION & INITIALIZATION ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUserId = user.uid;
        initializeHomepage(); 
    } else {
        window.location.href = 'login.html';
    }
});

document.getElementById('logout-button').addEventListener('click', () => {
    signOut(auth);
});

// --- MASTER FUNCTION TO LOAD ALL DATA ---
const initializeHomepage = async () => {
    if (!currentUserId) return;
    const userDocRef = doc(db, 'users', currentUserId);
    const subjectsRef = collection(db, 'users', currentUserId, 'subjects');
    const attendanceRef = collection(db, 'users', currentUserId, 'attendance');

    const [userDoc, subjectsSnapshot, attendanceSnapshot] = await Promise.all([
        getDoc(userDocRef), getDocs(subjectsRef), getDocs(attendanceRef)
    ]);

    if (userDoc.exists()) {
        const userData = userDoc.data();
        const hour = new Date().getHours();
        greetingEl.textContent = hour < 12 ? "Good Morning," : (hour < 18 ? "Good Afternoon," : "Good Evening,");
        userNameDisplayEl.textContent = userData.name;
    } else {
        userNameDisplayEl.textContent = 'User';
    }

    const totalSubjects = subjectsSnapshot.size;
    const totalClasses = attendanceSnapshot.size;
    let presentClasses = 0;
    attendanceSnapshot.forEach(doc => {
        if (doc.data().status === 'Present') presentClasses++;
    });
    const overallPercentage = totalClasses > 0 ? Math.round((presentClasses / totalClasses) * 100) : 0;
    
    dashboardSubjectsTrackedEl.textContent = totalSubjects;
    dashboardPercentageEl.textContent = `${overallPercentage}%`;
    renderDashboardChart(presentClasses, totalClasses - presentClasses);
    loadSubjectsForDropdown(subjectsSnapshot);
};

// --- DASHBOARD CHART RENDERING ---
const renderDashboardChart = (presentCount, absentCount) => {
    const ctx = document.getElementById('dashboard-overall-chart')?.getContext('2d');
    if (!ctx) return;
    if (dashboardChartInstance) dashboardChartInstance.destroy();
    dashboardChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: { datasets: [{ data: [presentCount, absentCount], backgroundColor: [presentColor, absentColor], borderWidth: 0, borderRadius: 2 }] },
        options: { cutout: '75%', plugins: { tooltip: { enabled: false } }, responsive: true, maintainAspectRatio: false }
    });
};

// --- SCREEN NAVIGATION LOGIC ---
const allScreens = document.querySelectorAll('.screen');
const allNavButtons = document.querySelectorAll('.nav-button, .back-button');

const showScreen = (screenId) => {
    allScreens.forEach(screen => screen.classList.add('hidden'));
    const targetScreenElement = document.getElementById(screenId);
    if (targetScreenElement) targetScreenElement.classList.remove('hidden');
    
    if (screenId === 'status-screen') renderStatusScreen();
    if (screenId === 'manage-subjects-screen') renderManageSubjectsScreen();
    if (screenId === 'home-screen') initializeHomepage(); 
};

allNavButtons.forEach(button => {
    button.addEventListener('click', () => {
        const targetScreenId = button.dataset.target;
        if (targetScreenId) showScreen(targetScreenId);
    });
});

// --- SUBJECT MANAGEMENT ---
const addSubjectForm = document.getElementById('add-subject-form');
const subjectNameInput = document.getElementById('subject-name');
const subjectDropdown = document.getElementById('subject-dropdown');

addSubjectForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const subjectName = subjectNameInput.value.trim();
    if (subjectName && currentUserId) {
        try {
            await addDoc(collection(db, 'users', currentUserId, 'subjects'), { name: subjectName, createdAt: new Date() });
            subjectNameInput.value = '';
            initializeHomepage();
        } catch (error) { console.error("Error adding subject: ", error); }
    }
});

const loadSubjectsForDropdown = (subjectsSnapshot) => {
    const subjectsList = [];
    subjectsSnapshot.forEach(doc => subjectsList.push({ id: doc.id, ...doc.data() }));
    subjectsList.sort((a, b) => a.name.localeCompare(b.name));
    subjectDropdown.innerHTML = '<option value="">Select Subject</option>';
    subjectsList.forEach(subject => {
        const option = document.createElement('option');
        option.value = subject.id;
        option.textContent = subject.name;
        subjectDropdown.appendChild(option);
    });
};

// --- ATTENDANCE MANAGEMENT ---
const addAttendanceForm = document.getElementById('add-attendance-form');
addAttendanceForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const subjectId = subjectDropdown.value;
    const subjectName = subjectDropdown.options[subjectDropdown.selectedIndex].text;
    const date = document.getElementById('attendance-date').value;
    const startTime = document.getElementById('start-time').value;
    const endTime = document.getElementById('end-time').value;
    const status = document.getElementById('attendance-status').value;
    if (!subjectId || !date || !startTime || !endTime) { alert('Please fill all fields'); return; }
    try {
        await addDoc(collection(db, 'users', currentUserId, 'attendance'), { subjectId, subjectName, date, startTime, endTime, status, createdAt: new Date() });
        alert('Attendance updated!');
        addAttendanceForm.reset();
        showScreen('home-screen');
    } catch (error) { console.error("Error adding attendance: ", error); }
});

// --- STATUS SCREEN RENDERING ---
const statusCardsContainer = document.getElementById('status-cards-container');
const renderStatusScreen = async () => {
    if (!currentUserId) return;
    statusCardsContainer.innerHTML = '<h2 style="text-align: center; color: var(--text-secondary);">Loading...</h2>';

    const subjects = {};
    const subjectsRef = collection(db, 'users', currentUserId, 'subjects');
    const subjectsSnapshot = await getDocs(subjectsRef);
    subjectsSnapshot.forEach(doc => subjects[doc.id] = { name: doc.data().name, total: 0, present: 0 });

    const attendanceRef = collection(db, 'users', currentUserId, 'attendance');
    const attendanceSnapshot = await getDocs(attendanceRef);
    let overallTotal = 0, overallPresent = 0;
    attendanceSnapshot.forEach(doc => {
        const record = doc.data();
        if (subjects[record.subjectId]) {
            subjects[record.subjectId].total++;
            overallTotal++;
            if (record.status === 'Present') {
                subjects[record.subjectId].present++;
                overallPresent++;
            }
        }
    });

    statusCardsContainer.innerHTML = '';
    const overallAbsent = overallTotal - overallPresent;
    const overallPercentage = overallTotal > 0 ? Math.round((overallPresent / overallTotal) * 100) : 0;
    renderStatusCard('Overall Attendance', overallTotal, overallPresent, overallAbsent, overallPercentage, 'overall-chart');
    
    subjectsSnapshot.docs.sort((a,b) => a.data().name.localeCompare(b.data().name)).forEach(doc => {
        const subject = subjects[doc.id];
        const absent = subject.total - subject.present;
        const percentage = subject.total > 0 ? Math.round((subject.present / subject.total) * 100) : 0;
        renderStatusCard(subject.name, subject.total, subject.present, absent, percentage, `chart-${doc.id}`);
    });
};
const renderStatusCard = (title, total, present, absent, percentage, chartId) => {
    const cardHTML = `
        <div class="card status-card">
            <h3>${title}</h3>
            <div class="status-details">
                <div class="chart-container">
                    <canvas id="${chartId}"></canvas>
                    <div class="chart-percentage">${percentage}%</div>
                </div>
                <div class="stats">
                    <p>Total Classes: <strong>${total}</strong></p>
                    <p>Present: <strong>${present}</strong></p>
                    <p>Absent: <strong>${absent}</strong></p>
                </div>
            </div>
        </div>
    `;
    statusCardsContainer.innerHTML += cardHTML;
    
    setTimeout(() => {
        const ctx = document.getElementById(chartId)?.getContext('2d');
        if (ctx) {
            new Chart(ctx, {
                type: 'doughnut',
                data: {
                    datasets: [{
                        data: [present, absent],
                        backgroundColor: [presentColor, absentColor],
                        borderWidth: 0,
                        borderRadius: 5
                    }]
                },
                options: {
                    cutout: '75%',
                    plugins: { tooltip: { enabled: false } },
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        }
    }, 0);
};

// --- MANAGE SUBJECTS SCREEN LOGIC ---
const manageSubjectsList = document.getElementById('manage-subjects-list');

const renderManageSubjectsScreen = async () => {
    if (!currentUserId) return;
    manageSubjectsList.innerHTML = '<li>Loading subjects...</li>';

    const subjectsRef = collection(db, 'users', currentUserId, 'subjects');
    const subjectsSnapshot = await getDocs(subjectsRef);

    manageSubjectsList.innerHTML = '';

    if (subjectsSnapshot.empty) {
        manageSubjectsList.innerHTML = '<li>Aapne abhi tak koi subject add nahi kiya hai.</li>';
        return;
    }

    subjectsSnapshot.docs.sort((a,b) => a.data().name.localeCompare(b.data().name)).forEach(doc => {
        const subject = doc.data();
        const li = document.createElement('li');
        li.className = 'subject-item';
        li.innerHTML = `
            <span>${subject.name}</span>
            <button class="delete-button" data-id="${doc.id}" data-name="${subject.name}" title="Delete Subject">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            </button>
        `;
        manageSubjectsList.appendChild(li);
    });
};

manageSubjectsList.addEventListener('click', async (e) => {
    const deleteButton = e.target.closest('.delete-button');
    if (deleteButton) {
        const subjectId = deleteButton.dataset.id;
        const subjectName = deleteButton.dataset.name;

        if (confirm(`Kya aap "${subjectName}" ko sach mein delete karna chahte hain? Iske saare attendance records bhi delete ho jayenge.`)) {
            try {
                // Step 1: Subject ko delete karein
                await deleteDoc(doc(db, 'users', currentUserId, 'subjects', subjectId));

                // Step 2: Uske saare attendance records dhoondhein aur delete karein
                const attendanceRef = collection(db, 'users', currentUserId, 'attendance');
                const q = query(attendanceRef, where('subjectId', '==', subjectId));
                const attendanceSnapshot = await getDocs(q);
                
                const deletePromises = [];
                attendanceSnapshot.forEach(recordDoc => {
                    deletePromises.push(deleteDoc(recordDoc.ref));
                });
                await Promise.all(deletePromises);

                alert(`"${subjectName}" aur uske saare records delete ho gaye hain.`);
                renderManageSubjectsScreen(); // List ko refresh karein
            } catch (error) {
                console.error("Error deleting subject and records: ", error);
                alert("Subject delete nahi ho paya. Kripya dobara try karein.");
            }
        }
    }
});

