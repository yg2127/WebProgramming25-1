// HTML 문서 로딩이 완료되면, 모든 코드를 실행합니다.
document.addEventListener('DOMContentLoaded', () => {

    // ======================================================
    // Global State & Selectors
    // ======================================================
    let state = {
        loggedIn: false,
        token: null,
        user: null,
        events: [] // { date: Date, title: string, type: 'prescription' | 'revisit' | 'manual' }
    };

    const calendarDaysContainer = document.getElementById('calendar-days');
    const currentMonthEl = document.getElementById('current-month');
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
    
    // Auth selectors
    const loginTab = document.querySelector('.tab-link[data-tab="login"]');
    const registerTab = document.querySelector('.tab-link[data-tab="register"]');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const loginTabContent = document.getElementById('login-tab');
    const registerTabContent = document.getElementById('register-tab');

    // Upload selectors
    const uploadBox = document.querySelector('.upload-box');
    const fileInput = document.getElementById('file-input');
    const filePreview = document.getElementById('file-preview');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const statusMessage = document.getElementById('status-message');

    // Results display selectors
    const summaryCard = document.getElementById('ai-summary-card');
    const suggestionsCard = document.getElementById('ai-suggestions-card');
    const termsContainer = document.getElementById('medical-terms-container');
    const medicationListContainer = document.querySelector('#medications .medication-list');

    // Appointment form
    const appointmentForm = document.getElementById('appointment-form');
    
    // Theme switcher
    const themeToggle = document.getElementById('theme-toggle');

    let navDate = new Date();

    // ======================================================
    // INITIALIZATION
    // ======================================================
    const initialize = () => {
        setupEventListeners();
        applySavedTheme();
        checkLoginStatus();
        renderCalendar();
    };

    const setupEventListeners = () => {
        // Auth
        loginTab.addEventListener('click', () => switchTab('login'));
        registerTab.addEventListener('click', () => switchTab('register'));
        loginForm.addEventListener('submit', handleLogin);
        registerForm.addEventListener('submit', handleRegister);

        // Upload
        uploadBox.addEventListener('click', () => fileInput.click());
        uploadBox.addEventListener('dragover', handleDragOver);
        uploadBox.addEventListener('dragleave', handleDragLeave);
        uploadBox.addEventListener('drop', handleDrop);
        fileInput.addEventListener('change', handleFileSelect);
        analyzeBtn.addEventListener('click', handleAnalyze);

        // Calendar
        prevMonthBtn.addEventListener('click', () => {
            navDate.setMonth(navDate.getMonth() - 1);
            renderCalendar();
        });
        nextMonthBtn.addEventListener('click', () => {
            navDate.setMonth(navDate.getMonth() + 1);
            renderCalendar();
        });

        // Appointment Form
        appointmentForm.addEventListener('submit', handleAddAppointment);
        
        // Theme Switcher
        themeToggle.addEventListener('change', toggleTheme);

        // Feature card navigation
        document.querySelectorAll('.feature-card').forEach(card => {
            card.addEventListener('click', () => {
                const targetId = card.dataset.target;
                const targetElement = document.getElementById(targetId);
                if (targetElement) {
                    targetElement.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });
    };

    // ======================================================
    // THEME SWITCHER
    // ======================================================
    const toggleTheme = () => {
        if (themeToggle.checked) { // Dark mode is checked
            document.body.classList.remove('light-mode');
            localStorage.setItem('theme', 'dark');
        } else { // Light mode is unchecked
            document.body.classList.add('light-mode');
            localStorage.setItem('theme', 'light');
        }
    };

    const applySavedTheme = () => {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'light') {
            document.body.classList.add('light-mode');
            themeToggle.checked = false;
        } else {
            // Default to dark mode
            document.body.classList.remove('light-mode');
            themeToggle.checked = true;
        }
    };

    // ======================================================
    // AUTHENTICATION
    // ======================================================
     const switchTab = (tab) => {
        if (tab === 'login') {
            loginTab.classList.add('active');
            registerTab.classList.remove('active');
            loginTabContent.classList.add('active');
            registerTabContent.classList.remove('active');
        } else {
            loginTab.classList.remove('active');
            registerTab.classList.add('active');
            loginTabContent.classList.remove('active');
            registerTabContent.classList.add('active');
        }
    };
    
    async function handleRegister(e) {
        e.preventDefault();
        const formData = new FormData(registerForm);
        const data = Object.fromEntries(formData.entries());
        
        try {
            const response = await fetch('/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            alert('Registration successful! Please log in.');
            switchTab('login');
            registerForm.reset();
        } catch (error) {
            alert(`Registration failed: ${error.message}`);
        }
    }

    async function handleLogin(e) {
        e.preventDefault();
        const data = {
            email: loginForm.querySelector('#login-email').value,
            password: loginForm.querySelector('#login-password').value
        };

        try {
            const response = await fetch('/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            
            state.loggedIn = true;
            state.token = result.token;
            state.user = result.user;
            localStorage.setItem('authToken', result.token);
            localStorage.setItem('userInfo', JSON.stringify(result.user));

            updateUIAfterLogin();
        } catch (error) {
            alert(`Login failed: ${error.message}`);
        }
    }

    const checkLoginStatus = () => {
        const token = localStorage.getItem('authToken');
        const userInfo = localStorage.getItem('userInfo');

        if (token && userInfo) {
            state.token = token;
            state.user = JSON.parse(userInfo);
            state.loggedIn = true;
            updateUIAfterLogin();
        }
    };
    
    const updateUIAfterLogin = () => {
        alert(`Welcome, ${state.user.name}!`);
        // Change login section to a "logged in" view or hide it
        const loginSection = document.getElementById('login');
        loginSection.innerHTML = `<div class="container"><h2 class="section-title">Welcome, ${state.user.name}</h2><p style="text-align:center;"><button id="logoutBtn" class="btn btn-secondary">Logout</button></p></div>`;
        document.getElementById('logoutBtn').addEventListener('click', handleLogout);
        
        // Fetch user data
        fetchUserAppointments();
        fetchUserMedications();
    };

    const handleLogout = () => {
        state.loggedIn = false;
        state.token = null;
        state.user = null;
        state.events = [];
        localStorage.removeItem('authToken');
        localStorage.removeItem('userInfo');
        
        // This will reload the page and reset everything to its initial state
        window.location.reload();
    };

    // ======================================================
    // FILE UPLOAD & ANALYSIS
    // ======================================================
    const handleDragOver = (e) => {
        e.preventDefault();
        uploadBox.classList.add('dragover');
    };
    const handleDragLeave = () => {
        uploadBox.classList.remove('dragover');
    };
    const handleDrop = (e) => {
        e.preventDefault();
        uploadBox.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length) {
            fileInput.files = files;
            displayFilePreview(files[0]);
        }
    };
    const handleFileSelect = () => {
        const file = fileInput.files[0];
        if (file) {
            displayFilePreview(file);
        }
    };
    const displayFilePreview = (file) => {
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                filePreview.innerHTML = `<img src="${e.target.result}" alt="File preview">`;
            };
            reader.readAsDataURL(file);
        } else {
            filePreview.innerHTML = `<p>${file.name}</p>`;
        }
    };
    
    async function handleAnalyze() {
        if (!state.loggedIn) {
            alert('Please log in to analyze documents.');
            document.getElementById('login').scrollIntoView({ behavior: 'smooth' });
            return;
        }
        const file = fileInput.files[0];
        if (!file) {
            alert('Please select a file first.');
            return;
        }

        const formData = new FormData();
        formData.append('image', file);

        statusMessage.innerHTML = '<span style="color: #bb86fc;">AI is analyzing... 🧐</span>';
        
        try {
            const response = await fetch('/analyze', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${state.token}` },
                body: formData
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error_message || 'Server error');
            
            statusMessage.innerHTML = '<span style="color: #03dac6;">✓ Analysis Complete!</span>';
            setTimeout(() => { statusMessage.innerHTML = ''; }, 4000);

            displayResults(data);

        } catch (error) {
            console.error('Fetch failed:', error);
            statusMessage.innerHTML = `<span style="color: #cf6679;">🚨 Error: ${error.message}</span>`;
        }
    }

    function displayResults(data) {
        // AI Summary
        let summaryHtml = `<h3><i class="fas fa-file-invoice"></i> Analysis Summary</h3>`;
        summaryHtml += `<ul>
            <li><strong>Prescription Date:</strong> ${data.prescriptionDate || 'Not Found'}</li>
            <li><strong>Follow-up Date:</strong> ${data.revisitDate || 'Not Found'}</li>
        </ul>`;
        summaryCard.innerHTML = summaryHtml;
        
        // AI Suggestions
        let suggestionsHtml = `<h3><i class="fas fa-lightbulb"></i> AI Suggestions</h3>`;
        if (data.suggestions && data.suggestions.length > 0) {
            suggestionsHtml += `<ul>${data.suggestions.map(s => `<li>${s}</li>`).join('')}</ul>`;
        } else {
            suggestionsHtml += `<p>No specific suggestions were generated.</p>`;
        }
        suggestionsCard.innerHTML = suggestionsHtml;
        
        // Medical Terms
        let termsHtml = `<h3><i class="fas fa-book-medical"></i> Simplified Medical Terms</h3>`;
        if (data.medicalTerms && data.medicalTerms.length > 0) {
            termsHtml += `<ul>${data.medicalTerms.map(t => `<li><strong>${t.term}:</strong> ${t.explanation}</li>`).join('')}</ul>`;
        } else {
            termsHtml += `<p>No medical terms were extracted.</p>`;
        }
        termsContainer.innerHTML = termsHtml;

        // Medications
        renderMedicationList(data.medications);

        // Update Calendar
        const newEvents = [];
        if (data.prescriptionDate && data.prescriptionDate !== 'Not Found') {
            newEvents.push({ date: new Date(data.prescriptionDate), title: 'Prescription', type: 'prescription' });
        }
        if (data.revisitDate && data.revisitDate !== 'Not Found') {
            newEvents.push({ date: new Date(data.revisitDate), title: 'Follow-up', type: 'revisit' });
        }
        
        // Merge AI events with existing manual events
        const manualEvents = state.events.filter(e => e.source === 'manual');
        state.events = [...manualEvents, ...newEvents];

        if (state.events.length > 0) {
            // Sort events by date just in case
            state.events.sort((a,b) => a.date - b.date);
            navDate = new Date(state.events[0].date);
        }
        renderCalendar();
    }

    // ======================================================
    // DATA FETCHING & RENDERING
    // ======================================================

    async function fetchUserAppointments() {
        try {
            const response = await fetch('/api/appointments', {
                headers: { 'Authorization': `Bearer ${state.token}` }
            });
            if (!response.ok) throw new Error('Could not fetch appointments');
            const appointments = await response.json();
            const appointmentEvents = appointments.map(a => ({
                date: new Date(a.date),
                title: a.title,
                type: 'manual' // Or a type from the DB
            }));
            // Add to global events state
            state.events = [...state.events, ...appointmentEvents];
            renderCalendar();
        } catch (error) {
            console.error('Failed to fetch appointments:', error);
        }
    }

    async function fetchUserMedications() {
         try {
            const response = await fetch('/api/medications', {
                headers: { 'Authorization': `Bearer ${state.token}` }
            });
            if (!response.ok) throw new Error('Could not fetch medications');
            const medications = await response.json();
            renderMedicationList(medications);
        } catch (error) {
            console.error('Failed to fetch medications:', error);
        }
    }

    function renderMedicationList(medications) {
        medicationListContainer.innerHTML = ''; 
        if (medications && medications.length > 0) {
            medications.forEach(med => {
                const medItem = document.createElement('div');
                medItem.className = 'medication-item';
                medItem.innerHTML = `
                    <div class="medication-info">
                        <h4>${med.name}</h4><p>${med.dosage}</p>
                        <span class="next-dose">Duration: ${med.duration}</span>
                    </div>
                    <div class="medication-status pending"><i class="fas fa-clock"></i><span>Pending</span></div>`;
                medicationListContainer.appendChild(medItem);
            });
        } else {
            medicationListContainer.innerHTML = '<p style="text-align: center;">No medication details found.</p>';
        }
    }
    
    async function handleAddAppointment(e) {
        e.preventDefault();
        if (!state.loggedIn) {
            alert('Please log in to add appointments.');
            return;
        }

        const formData = new FormData(appointmentForm);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await fetch('/api/appointments', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${state.token}` 
                },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);

            alert('Appointment added successfully!');
            appointmentForm.reset();
            
            // Add to calendar display
            const newEvent = { date: new Date(data.date), title: data.title, type: 'manual' };
            state.events.push(newEvent);
            navDate = new Date(newEvent.date);
            renderCalendar();

        } catch (error) {
            alert(`Failed to add appointment: ${error.message}`);
        }
    }


    // ======================================================
    // CALENDAR
    // ======================================================
    function renderCalendar() {
        if (!currentMonthEl || !calendarDaysContainer) return;

        const date = new Date(navDate);
        const year = date.getFullYear();
        const month = date.getMonth();
        const today = new Date();

        currentMonthEl.innerText = `${date.toLocaleString('en-US', { month: 'long' })} ${year}`;
        
        const lastDay = new Date(year, month + 1, 0).getDate();
        const firstDayIndex = new Date(year, month, 1).getDay();
        const lastDayIndex = new Date(year, month, lastDay).getDay();
        const nextDays = 7 - lastDayIndex - 1;

        calendarDaysContainer.innerHTML = '';

        for (let i = 0; i < firstDayIndex; i++) {
            calendarDaysContainer.innerHTML += `<div class="calendar-day empty"></div>`;
        }

        for (let i = 1; i <= lastDay; i++) {
            const dayDiv = document.createElement('div');
            dayDiv.classList.add('calendar-day');
            
            const dayNumber = document.createElement('div');
            dayNumber.classList.add('day-number');
            dayNumber.innerText = i;
            dayDiv.appendChild(dayNumber);

            if (i === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
                dayDiv.classList.add('today');
            }

            const dayEvents = state.events.filter(e => {
                const eventDate = new Date(e.date);
                return eventDate.getFullYear() === year &&
                       eventDate.getMonth() === month &&
                       eventDate.getDate() === i;
            });

            if (dayEvents.length > 0) {
                const eventsContainer = document.createElement('div');
                eventsContainer.classList.add('calendar-events');
                dayEvents.forEach(event => {
                    const eventDiv = document.createElement('div');
                    eventDiv.classList.add('calendar-event', event.type);
                    eventDiv.innerText = event.title;
                    eventsContainer.appendChild(eventDiv);
                });
                dayDiv.appendChild(eventsContainer);
            }

            calendarDaysContainer.appendChild(dayDiv);
        }

        for (let j = 1; j <= nextDays; j++) {
            calendarDaysContainer.innerHTML += `<div class="calendar-day empty"></div>`;
        }
    }

    // Run on load
    initialize();
});