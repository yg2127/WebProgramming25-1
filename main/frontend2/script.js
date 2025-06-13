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

    // ================ 최후의 디버깅 코드 ================
    // fileInput의 원래 click 함수를 백업해두고, 새로운 함수로 감싼다.
    const originalFileInputClick = fileInput.click.bind(fileInput);
    fileInput.click = function () {
        // click이 호출될 때마다, 콘솔에 기록을 남긴다.
        console.log("%c fileInput.click()가 호출됨! 호출 스택 추적:", "color: red; font-weight: bold;");
        console.trace(); // 누가 호출했는지 상세한 경로를 보여줌
        originalFileInputClick(); // 원래의 click 기능 실행
    };
    // ================================================

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
        // uploadBox.addEventListener('click', () => fileInput.click());
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
        console.log("1. handleAnalyze 함수 실행됨! 버튼 클릭 성공!");

        if (!state.loggedIn) {
            console.log("2. 로그인 상태가 아니라서 여기서 종료!");
            alert('Please log in to analyze documents.');
            document.getElementById('login').scrollIntoView({ behavior: 'smooth' });
            return;
        }

        const file = fileInput.files[0];
        if (!file) {
            console.log("3. 선택된 파일이 없어서 여기서 종료!");
            alert('Please select a file first.');
            return;
        }

        console.log("4. 모든 검사 통과! 이제 진짜 분석을 시작합니다!");

        try {
            console.log("5. 'try' 블록에 진입했습니다."); // <-- 추가

            const formData = new FormData();
            formData.append('image', file);

            console.log("6. statusMessage를 'analyzing'으로 바꾸려고 합니다."); // <-- 추가
            statusMessage.innerHTML = '<span style="color: #bb86fc;">AI is analyzing... 🧐</span>';
            console.log("7. statusMessage를 성공적으로 바꿨습니다."); // <-- 추가

            console.log("8. 이제 fetch를 호출합니다! 서버로 요청 전송!"); // <-- 추가
            const response = await fetch('/analyze', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${state.token}` },
                body: formData
            });
            console.log("9. fetch가 응답을 받았습니다! response.ok:", response.ok); // <-- 추가

            const data = await response.json();
            console.log("10. 응답을 JSON으로 파싱했습니다."); // <-- 추가

            if (!response.ok) {
                console.log("11. 응답이 'ok'가 아니어서 에러를 던집니다."); // <-- 추가
                throw new Error(data.error_message || 'Server error');
            }

            statusMessage.innerHTML = '<span style="color: #03dac6;">✓ Analysis Complete!</span>';
            setTimeout(() => { statusMessage.innerHTML = ''; }, 4000);
            displayResults(data);

        } catch (error) {
            console.error("🔥🔥🔥 CRITICAL ERROR CATCHED: 🔥🔥🔥", error); // <-- catch의 로그를 더 눈에 띄게 변경
        }
    }

    function displayResults(data) {
        console.log("A. displayResults 시작");

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

        console.log("B. 카드 내용 채우기 성공");

        // Medications
        console.log("C. renderMedicationList 호출 직전");
        renderMedicationList(data.medications);
        console.log("D. renderMedicationList 호출 성공");

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
            state.events.sort((a, b) => a.date - b.date);
            navDate = new Date(state.events[0].date);
        }

        console.log("E. renderCalendar 호출 직전");
        renderCalendar();
        console.log("F. displayResults 모든 작업 완료!");

        resultsDisplayWrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
    // in script.js
    // 기존 renderMedicationList 함수를 찾아서 아래 코드로 교체

    function renderMedicationList(medications) {
        // 1. 컨테이너를 먼저 깨끗하게 비운다.
        medicationListContainer.innerHTML = '';

        if (medications && medications.length > 0) {
            // 2. 약물 목록을 카드 그리드로 만들기 위해 부모 컨테이너에 클래스 추가
            medicationListContainer.classList.add('medication-grid');

            medications.forEach(med => {
                // 3. 각 약물 정보를 담을 카드(div)를 생성
                const medCard = document.createElement('div');
                medCard.className = 'medication-card'; // result-card와 비슷한 새로운 클래스 부여

                // 4. 카드 안에 들어갈 HTML 내용을 정의
                medCard.innerHTML = `
                <h3><i class="fas fa-pills"></i> ${med.name}</h3>
                <ul>
                    <li><strong>Dosage:</strong> ${med.dosage || 'Not specified'}</li>
                    <li><strong>Duration:</strong> ${med.duration || 'Not specified'}</li>
                </ul>
            `;

                // 5. 완성된 카드를 목록에 추가
                medicationListContainer.appendChild(medCard);
            });
        } else {
            // 약물이 없을 때를 대비해 그리드 클래스 제거
            medicationListContainer.classList.remove('medication-grid');
            medicationListContainer.innerHTML = '<p style="text-align: center; width: 100%;">No medication details found.</p>';
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
// in script.js
// 기존 renderCalendar 함수를 아래의 '이벤트 위임' 버전으로 교체!

function renderCalendar() {
    if (!currentMonthEl || !calendarDaysContainer) return;

    const date = new Date(navDate);
    const year = date.getFullYear();
    const month = date.getMonth();
    const today = new Date();

    currentMonthEl.innerText = `${date.toLocaleString('en-US', { month: 'long' })} ${year}`;
    calendarDaysContainer.innerHTML = '';

    const lastDay = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay();

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
            return eventDate.getFullYear() === year && eventDate.getMonth() === month && eventDate.getDate() === i;
        });

        if (dayEvents.length > 0) {
            const eventsContainer = document.createElement('div');
            eventsContainer.classList.add('calendar-events');
            
            // 1. 그날의 모든 이벤트를 HTML 문자열로 만들어서 한 번에 추가
            let eventsHtml = '';
            dayEvents.forEach((event, index) => {
                // 각 이벤트 '알약'에 data-event-index 라는 고유 표식을 남김
                eventsHtml += `<div class="calendar-event ${event.type}" data-event-index="${index}">${event.title}</div>`;
            });
            eventsContainer.innerHTML = eventsHtml;
            
            // 2. ★★★ 부모 컨테이너에 단 하나의 클릭 리스너만 추가! (이벤트 위임) ★★★
            eventsContainer.addEventListener('click', (e) => {
                // 클릭된 것이 'calendar-event' 클래스를 가진 요소인지 확인
                const clickedEventDiv = e.target.closest('.calendar-event');
                if (!clickedEventDiv) return; // 아니라면 무시

                // 이전에 열려있던 팝오버가 있다면 제거
                const existingPopover = dayDiv.querySelector('.event-popover');
                if (existingPopover) {
                    existingPopover.remove();
                }

                // 클릭된 이벤트의 정보 가져오기
                const eventIndex = clickedEventDiv.dataset.eventIndex;
                const eventData = dayEvents[eventIndex];

                // 팝오버 생성
                const popover = document.createElement('div');
                popover.className = 'event-popover';
                
                const eventDate = new Date(eventData.date);
                const eventTime = !isNaN(eventDate) ? eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A';

                popover.innerHTML = `
                    <button class="popover-close">&times;</button>
                    <h4>Appointment Details</h4>
                    <ul>
                        <li><strong>Title:</strong> ${eventData.title || 'N/A'}</li>
                        <li><strong>Time:</strong> ${eventTime}</li>
                        ${eventData.doctor ? `<li><strong>Doctor:</strong> ${eventData.doctor}</li>` : ''}
                        ${eventData.location ? `<li><strong>Location:</strong> ${eventData.location}</li>` : ''}
                    </ul>
                `;

                dayDiv.appendChild(popover);
                popover.querySelector('.popover-close').addEventListener('click', () => popover.remove());
                
                setTimeout(() => popover.classList.add('visible'), 10);
            });

            dayDiv.appendChild(eventsContainer);
        }

        calendarDaysContainer.appendChild(dayDiv);
    }
}

    // Run on load
    initialize();
});

// setupEventListeners 함수 안에 추가
document.querySelector('.hero-buttons .btn-primary').addEventListener('click', () => {
    document.getElementById('upload-results-section').scrollIntoView({ behavior: 'smooth' });
});