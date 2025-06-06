// HTML 문서 로딩이 완료되면, 모든 코드를 실행합니다.
document.addEventListener('DOMContentLoaded', () => {

    // ======================================================
    // 전역 변수 및 HTML 요소 가져오기 (빠진 부분 추가!)
    // ======================================================
    let navDate = new Date();
    let events = [];

    // 달력 관련 요소
    const calendarDaysContainer = document.getElementById('calendar-days');
    const currentMonthEl = document.getElementById('current-month');
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');

    // ★★★ 바로 이 부분들이 빠져있었습니다! ★★★
    // AI 분석기 관련 요소
    const fileInput = document.getElementById('file-input');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const thumbnail = document.getElementById('thumbnail');
    const statusMessage = document.getElementById('status-message');
    // ★★★★★★★★★★★★★★★★★★★★★★★★★

    // ======================================================
    // 파일 미리보기 기능
    // ======================================================
    // fileInput이 null이 아닌지 확인 후 이벤트 리스너 추가
    if(fileInput) {
        fileInput.addEventListener('change', () => {
            const file = fileInput.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    thumbnail.src = e.target.result;
                    thumbnail.style.display = 'block';
                }
                reader.readAsDataURL(file);
            } else {
                thumbnail.style.display = 'none';
            }
        });
    }

    // ======================================================
    // 달력 렌더링 함수
    // ======================================================
    function renderCalendar() {
        if (!currentMonthEl || !calendarDaysContainer) return; // 요소가 없으면 실행 중단

        const date = new Date(navDate);
        const year = date.getFullYear();
        const month = date.getMonth();

        currentMonthEl.innerText = `${date.toLocaleString('en-US', { month: 'long' })} ${year}`;
        
        const lastDay = new Date(year, month + 1, 0).getDate();
        const firstDayIndex = new Date(year, month, 1).getDay();

        calendarDaysContainer.innerHTML = '';

        for (let i = 0; i < firstDayIndex; i++) {
            calendarDaysContainer.innerHTML += `<div class="calendar-day empty"></div>`;
        }

        for (let i = 1; i <= lastDay; i++) {
            const dayDiv = document.createElement('div');
            dayDiv.classList.add('calendar-day');
            dayDiv.innerText = i;
            
            events.forEach(eventDate => {
                if (eventDate.getFullYear() === year && eventDate.getMonth() === month && eventDate.getDate() === i) {
                    dayDiv.classList.add('event-day');
                }
            });

            calendarDaysContainer.appendChild(dayDiv);
        }
    }

    // ======================================================
    // AI 분석 및 UI 업데이트 로직
    // ======================================================
    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', async () => {
            const file = fileInput.files[0];
            if (!file) return alert('Please select an image!');

            const formData = new FormData();
            formData.append('image', file);
            
            if(statusMessage) statusMessage.innerHTML = '<span style="color: #007bff;">AI is analyzing... 🧐</span>';
            
            const medListContainer = document.querySelector('#medications .medication-list');
            if(medListContainer) medListContainer.innerHTML = '';
            const appointmentsContainer = document.querySelector('.upcoming-appointments');
            if(appointmentsContainer) appointmentsContainer.innerHTML = '<h4>Upcoming Appointments</h4>';

            try {
                const response = await fetch('/analyze', { method: 'POST', body: formData });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error_message || 'Server error');
                
                if(statusMessage) statusMessage.innerHTML = '<span style="color: #198754;">✓ Analysis Complete!</span>';
                setTimeout(() => { if(statusMessage) statusMessage.innerHTML = ''; }, 3000);

                displayResults(data);
            } catch (error) {
                console.error('Fetch failed:', error);
                if(statusMessage) statusMessage.innerHTML = `<span style="color: red;">🚨 Error: ${error.message}</span>`;
            }
        });
    }

function displayResults(data) {
    console.log("displayResults 시작. 받은 데이터:", data);

    // 1. 분석된 날짜 데이터를 events 배열에 저장
    events = [];
    if (data.prescriptionDate !== 'Not Found') events.push(new Date(data.prescriptionDate));
    if (data.revisitDate !== 'Not Found') events.push(new Date(data.revisitDate));

    // 2. 달력을 분석된 처방일이 있는 달로 점프시키기
    if (events.length > 0) {
        navDate = new Date(events[0]);
    }
    
    // 3. 변경된 날짜 기준으로 달력을 다시 그리기 (하이라이트 포함)
    renderCalendar();
    
    // 4. 약품 목록 UI 업데이트 (안전장치 포함)
    const medicationListContainer = document.querySelector('#medications .medication-list');
    if (medicationListContainer) {
        medicationListContainer.innerHTML = ''; 
        if (data.medications && data.medications.length > 0) {
            data.medications.forEach(med => {
                medicationListContainer.innerHTML += `
                    <div class="medication-item">
                        <div class="medication-info">
                            <h4>${med.name}</h4><p>${med.dosage}</p>
                            <span class="next-dose">Duration: ${med.duration}</span>
                        </div>
                        <div class="medication-status pending"><i class="fas fa-clock"></i><span>Pending</span></div>
                    </div>`;
            });
        } else {
            medicationListContainer.innerHTML = '<p style="text-align: center;">No medication details found.</p>';
        }
    } else {
        console.error("'medication-list' 컨테이너를 찾을 수 없습니다.");
    }

    // 5. 'Upcoming Appointments' 목록 업데이트 (안전장치 포함)
    const appointmentsContainer = document.querySelector('.upcoming-appointments');
    if (appointmentsContainer) {
        appointmentsContainer.innerHTML = '<h4>Upcoming Appointments</h4>';
        events.forEach(eventDate => {
            const type = (eventDate.getTime() === new Date(data.prescriptionDate).getTime()) ? 'Prescription Issued' : 'Follow-up Appointment';
            appointmentsContainer.innerHTML += `
                <div class="appointment-item">
                    <div class="appointment-date">
                        <span class="day">${eventDate.getDate()}</span>
                        <span class="month">${eventDate.toLocaleString('en-US', { month: 'short' })}</span>
                    </div>
                    <div class="appointment-info"><h5>${type}</h5></div>
                </div>`;
        });
    } else {
        console.error("'upcoming-appointments' 컨테이너를 찾을 수 없습니다.");
    }

    console.log("displayResults 모든 작업 완료.");
}

    // ======================================================
    // 달력 네비게이션 이벤트 리스너
    // ======================================================
    if (prevMonthBtn && nextMonthBtn) {
        prevMonthBtn.addEventListener('click', () => {
            navDate.setMonth(navDate.getMonth() - 1);
            renderCalendar();
        });

        nextMonthBtn.addEventListener('click', () => {
            navDate.setMonth(navDate.getMonth() + 1);
            renderCalendar();
        });
    }

    // ======================================================
    // 초기 달력 렌더링
    // ======================================================
    renderCalendar();
});