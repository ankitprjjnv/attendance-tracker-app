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
import { getFirestore, collection, addDoc, onSnapshot, query, getDocs, doc, getDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
let currentUserId = null;

// --- DOM ELEMENTS ---
const allScreens = document.querySelectorAll('.screen');
const allNavButtons = document.querySelectorAll('.nav-button, .back-button');
const userNameEl = document.getElementById('user-name');
const greetingEl = document.getElementById('greeting');
const dashboardPercentageEl = document.getElementById('dashboard-percentage');
const totalSubjectsEl = document.getElementById('total-subjects');
const dashboardGoalMessageEl = document.getElementById('dashboard-goal-message');
const addSubjectForm = document.getElementById('add-subject-form');
const subjectNameInput = document.getElementById('subject-name');
const subjectDropdown = document.getElementById('subject-dropdown');
const addAttendanceForm = document.getElementById('add-attendance-form');
const statusCardsContainer = document.getElementById('status-cards-container');
const subjectsListContainer = document.getElementById('subjects-list-container');

// --- APP INITIALIZATION ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUserId = user.uid;
        initializeHomepage();
    } else {
        window.location.href = 'login.html';
    }
});

const initializeHomepage = async () => {
    try {
        const [userData, dashboardData] = await Promise.all([
            loadUserData(),
            getDashboardData()
        ]);

        // Welcome message
        const hour = new Date().getHours();
        if (hour < 12) greetingEl.textContent = 'Good Morning,';
        else if (hour < 18) greetingEl.textContent = 'Good Afternoon,';
        else greetingEl.textContent = 'Good Evening,';
        userNameEl.textContent = userData.name.split(' ')[0];

        // Dashboard
        dashboardPercentageEl.textContent = `${dashboardData.overallAttendance}%`;
        totalSubjectsEl.textContent = dashboardData.totalSubjects;
        renderDashboardChart(dashboardData.overallAttendance);

        const goal = calculateGoal(dashboardData.presentClasses, dashboardData.totalClasses);
        dashboardGoalMessageEl.innerHTML = goal.message;
        dashboardGoalMessageEl.className = `dashboard-goal-message ${goal.class}`;

        loadSubjectsForDropdown();

    } catch (error) {
        console.error("Initialization failed:", error);
        userNameEl.textContent = 'User';
        dashboardPercentageEl.textContent = '--%';
        totalSubjectsEl.textContent = '--';
        dashboardGoalMessageEl.textContent = 'Could not load data.';
    }
};

// --- DATA FETCHING ---
const loadUserData = async () => {
    const docRef = doc(db, "users", currentUserId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return docSnap.data();
    } else {
        throw new Error("User data not found!");
    }
};

const getDashboardData = async () => {
    const subjectsRef = collection(db, 'users', currentUserId, 'subjects');
    const attendanceRef = collection(db, 'users', currentUserId, 'attendance');

    const [subjectsSnapshot, attendanceSnapshot] = await Promise.all([
        getDocs(subjectsRef),
        getDocs(attendanceRef)
    ]);

    const totalSubjects = subjectsSnapshot.size;
    let totalClasses = 0;
    let presentClasses = 0;

    attendanceSnapshot.forEach(doc => {
        totalClasses++;
        if (doc.data().status === 'Present') {
            presentClasses++;
        }
    });

    const overallAttendance = totalClasses > 0 ? Math.round((presentClasses / totalClasses) * 100) : 0;
    return { overallAttendance, totalSubjects, presentClasses, totalClasses };
};


// --- GOAL CALCULATION ---
const calculateGoal = (present, total, target = 0.80) => {
    const currentPercentage = total > 0 ? (present / total) : 1;
    if (currentPercentage >= target) {
        if(currentPercentage === 1 && total === 0) return { message: 'Start by attending a class!', class: 'perfect' };
        if(currentPercentage === 1) return { message: 'You have a perfect record!', class: 'perfect' };
        const canMiss = Math.floor((present - target * total) / target);
        if (canMiss === 0) return { message: 'You are on the edge, don\'t miss the next class.', class: 'danger' };
        return { message: `You can safely miss the next <strong>${canMiss}</strong> class(es).`, class: 'safe' };
    } else {
        const mustAttend = Math.ceil((target * total - present) / (1 - target));
        return { message: `You need to attend the next <strong>${mustAttend}</strong> class(es) continuously.`, class: 'danger' };
    }
};


// --- SCREEN NAVIGATION ---
const showScreen = (screenId) => {
    allScreens.forEach(screen => screen.classList.add('hidden'));
    document.getElementById(screenId)?.classList.remove('hidden');

    if (screenId === 'status-screen') renderStatusScreen();
    if (screenId === 'manage-subjects-screen') renderManageSubjectsScreen();
};

allNavButtons.forEach(button => {
    button.addEventListener('click', () => {
        const targetScreenId = button.dataset.target;
        if (targetScreenId) showScreen(targetScreenId);
    });
});

// --- UI RENDERING ---
let dashboardChart = null;
const renderDashboardChart = (percentage) => {
    const ctx = document.getElementById('dashboard-chart')?.getContext('2d');
    if (!ctx) return;

    // YAHAN BADLAV KIYA GAYA HAI
    let chartColor;
    if (percentage >= 80) {
        chartColor = '#22c55e'; // Green
    } else if (percentage >= 75) {
        chartColor = '#f59e0b'; // Yellow
    } else {
        chartColor = '#ef4444'; // Red
    }

    if (dashboardChart) dashboardChart.destroy();
    dashboardChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [percentage, 100 - percentage],
                backgroundColor: [chartColor, '#333333'],
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
};

// --- SUBJECT MANAGEMENT ---
addSubjectForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const subjectName = subjectNameInput.value.trim();
    if (!subjectName || !currentUserId) return;
    try {
        await addDoc(collection(db, 'users', currentUserId, 'subjects'), {
            name: subjectName, createdAt: new Date()
        });
        subjectNameInput.value = '';
        initializeHomepage();
    } catch (error) {
        console.error("Error adding subject: ", error);
    }
});

const loadSubjectsForDropdown = () => {
    const subjectsRef = collection(db, 'users', currentUserId, 'subjects');
    onSnapshot(subjectsRef, (snapshot) => {
        const subjectsList = [];
        snapshot.forEach(doc => subjectsList.push({ id: doc.id, ...doc.data() }));
        subjectsList.sort((a, b) => a.name.localeCompare(b.name));
        subjectDropdown.innerHTML = '<option value="">Select Subject</option>';
        subjectsList.forEach(subject => {
            const option = document.createElement('option');
            option.value = subject.id;
            option.textContent = subject.name;
            subjectDropdown.appendChild(option);
        });
    });
};

const renderManageSubjectsScreen = () => {
    const subjectsRef = collection(db, 'users', currentUserId, 'subjects');
    onSnapshot(subjectsRef, (snapshot) => {
        subjectsListContainer.innerHTML = '<h2>Your Subjects</h2>';
        if (snapshot.empty) {
            subjectsListContainer.innerHTML += '<p>No subjects added yet.</p>';
            return;
        }
        snapshot.docs.sort((a,b)=> a.data().name.localeCompare(b.data().name)).forEach(doc => {
            const subject = doc.data();
            subjectsListContainer.innerHTML += `
                <div class="subject-item">
                    <p>${subject.name}</p>
                    <button class="delete-btn" data-id="${doc.id}">Delete</button>
                </div>
            `;
        });
    });
};

subjectsListContainer.addEventListener('click', async (e) => {
    if (e.target.classList.contains('delete-btn')) {
        const docId = e.target.dataset.id;
        if (confirm("Are you sure you want to delete this subject?")) {
            try {
                await deleteDoc(doc(db, 'users', currentUserId, 'subjects', docId));
                initializeHomepage();
            } catch (error) {
                console.error("Error deleting subject:", error);
            }
        }
    }
});

// --- ATTENDANCE MANAGEMENT ---
addAttendanceForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const subjectId = subjectDropdown.value;
    const subjectName = subjectDropdown.options[subjectDropdown.selectedIndex].text;
    const [date, startTime, endTime, status] = [
        document.getElementById('attendance-date').value,
        document.getElementById('start-time').value,
        document.getElementById('end-time').value,
        document.getElementById('attendance-status').value
    ];
    if (!subjectId || !date || !startTime || !endTime) {
        alert('Please fill all fields'); return;
    }
    try {
        await addDoc(collection(db, 'users', currentUserId, 'attendance'), {
            subjectId, subjectName, date, startTime, endTime, status, createdAt: new Date()
        });
        alert('Attendance updated!');
        addAttendanceForm.reset();
        showScreen('home-screen');
        initializeHomepage();
    } catch (error) {
        console.error("Error adding attendance: ", error);
    }
});

// --- STATUS SCREEN ---
const renderStatusScreen = async () => {
    statusCardsContainer.innerHTML = '<h2 style="text-align: center; color: var(--text-secondary);">Loading...</h2>';
    const subjects = {};
    const subjectsRef = collection(db, 'users', currentUserId, 'subjects');
    const attendanceRef = collection(db, 'users', currentUserId, 'attendance');
    const [subjectsSnapshot, attendanceSnapshot] = await Promise.all([getDocs(subjectsRef), getDocs(attendanceRef)]);
    
    subjectsSnapshot.forEach(doc => {
        subjects[doc.id] = { name: doc.data().name, total: 0, present: 0 };
    });

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
    const overallPercentage = overallTotal > 0 ? Math.round((overallPresent / overallTotal) * 100) : 0;
    renderStatusCard('Overall Attendance', overallTotal, overallPresent, overallPercentage, 'overall-chart');

    subjectsSnapshot.docs.sort((a,b) => a.data().name.localeCompare(b.data().name)).forEach(doc => {
        const subject = subjects[doc.id];
        const percentage = subject.total > 0 ? Math.round((subject.present / subject.total) * 100) : 0;
        renderStatusCard(subject.name, subject.total, subject.present, percentage, `chart-${doc.id}`);
    });
};

const renderStatusCard = (title, total, present, percentage, chartId) => {
    const absent = total - present;
    const goal = calculateGoal(present, total);
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
            <div class="goal-section">
                <h4>Attendance Goal (80%)</h4>
                <p class="goal-message ${goal.class}">${goal.message}</p>
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
                        backgroundColor: ['#22c55e', '#ef4444'],
                        borderWidth: 0, borderRadius: 5
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

// --- LOGOUT ---
document.getElementById('logout-button').addEventListener('click', () => signOut(auth));

