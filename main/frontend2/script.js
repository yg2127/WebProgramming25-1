// 이 파일의 코드는 index.html이 로드될 때 자동으로 실행됩니다.

// AI 분석 기능에 필요한 HTML 요소들을 가져옵니다.
// index.html에 이미 있는 ID들을 사용합니다.
const fileInputForAI = document.getElementById('file-input'); 
const analyzeBtn = document.getElementById('analyzeBtn'); // 우리가 추가했던 분석 버튼
const thumbnail = document.getElementById('thumbnail'); // 우리가 추가했던 미리보기 이미지
const resultsDiv = document.getElementById('analysis-results'); // index.html에 이미 있던 결과 div

// 파일이 선택되면, 썸네일 이미지를 보여주는 이벤트 리스너
fileInputForAI.addEventListener('change', () => {
    const file = fileInputForAI.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            thumbnail.src = e.target.result;
            thumbnail.style.display = 'block'; // 숨겨져 있던 이미지 보이기
        }
        reader.readAsDataURL(file);
    }
});

// 'Analyze with AI' 버튼을 클릭했을 때의 동작
analyzeBtn.addEventListener('click', async () => {
    const file = fileInputForAI.files[0];
    if (!file) return alert('Please select an image to analyze first!');

    const formData = new FormData();
    formData.append('image', file);

    resultsDiv.innerHTML = 'AI is analyzing the image... 🧐';

    try {
        // 우리 백엔드 서버의 '/analyze' 창구로 데이터를 보냅니다.
        const response = await fetch('/analyze', {
            method: 'POST',
            body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
            displayDetailedError(data);
        } else {
            displayResults(data);
        }
    } catch (error) {
        console.error('Fetch failed:', error);
        resultsDiv.innerHTML = 'Could not connect to the server. Please check if the server is running.';
    }
});

function displayResults(data) {
    // 1. 숨겨져 있는 달력 섹션을 찾습니다.
    const calendarSection = document.getElementById('calendar');
    // 2. 만약 숨겨져 있다면, 다시 보이도록 스타일을 변경합니다.
    if (calendarSection) {
        calendarSection.style.display = 'block';
    }

     // ★★★ 새로운 부분 시작 ★★★
    // 2. AI가 분석한 처방일(prescriptionDate)이 유효한지 확인합니다.
    if (data.prescriptionDate && data.prescriptionDate !== 'Not Found') {
        
        // a. 날짜 문자열로 JavaScript Date 객체를 만듭니다.
        const prescriptionDateObj = new Date(data.prescriptionDate);

        // b. 달력 헤더(h3 태그)를 찾습니다.
        const currentMonthEl = document.getElementById('current-month');
        
        if (currentMonthEl) {
            // c. 'June 2025' 같은 형식으로 변환해서 헤더 텍스트를 업데이트합니다.
            const newHeaderText = prescriptionDateObj.toLocaleString('en-US', {
                month: 'long', // 'June'
                year: 'numeric'  // '2025'
            });
            currentMonthEl.innerText = newHeaderText;
            console.log(`달력 헤더를 '${newHeaderText}' (으)로 업데이트했습니다.`);
        }
    }
    // ★★★ 새로운 부분 끝 ★★★

    const dates = {
        prescriptionDate: data.prescriptionDate,
        revisitDate: data.revisitDate
    };

    // 1. 'Medication Management' UI를 업데이트합니다.
    const medicationListContainer = document.querySelector('#medications .medication-list');
    if (medicationListContainer) {
        medicationListContainer.innerHTML = ''; // 목록 비우기
        if (data.medications && data.medications.length > 0) {
            data.medications.forEach(med => {
                const medicationItemHtml = `
                    <div class="medication-item">
                        <div class="medication-info">
                            <h4>${med.name}</h4><p>${med.dosage}</p>
                            <span class="next-dose">Duration: ${med.duration}</span>
                        </div>
                        <div class="medication-status pending">
                            <i class="fas fa-clock"></i><span>Pending</span>
                        </div>
                    </div>`;
                medicationListContainer.innerHTML += medicationItemHtml;
            });
        } else {
            medicationListContainer.innerHTML = '<p style="text-align: center;">No medication details found.</p>';
        }
    }

    // 2. ★★★ 달력 관련 기능 호출! ★★★
    updateAppointmentsList(dates);      // 'Upcoming Appointments' 목록 업데이트
    highlightDatesOnCalendar(dates);    // 달력에 하이라이트 표시
}

/**
 * AI가 분석한 날짜 정보로 'Upcoming Appointments' 목록을 업데이트하는 함수
 * @param {object} dates - { prescriptionDate: '날짜', revisitDate: '날짜' }
 */
function updateAppointmentsList(dates) {
    const container = document.querySelector('.upcoming-appointments');
    if (!container) return; // 컨테이너가 없으면 함수 종료

    // 기존에 있던 가짜 약속 목록을 지우기 위해 자식 노드를 선택합니다.
    const existingItems = container.querySelectorAll('.appointment-item');
    existingItems.forEach(item => item.remove());

    // 1. 처방일(Issued Date) 아이템 추가
    if (dates.prescriptionDate && dates.prescriptionDate !== 'Not Found') {
        const dateObj = new Date(dates.prescriptionDate);
        const day = dateObj.getDate();
        const month = dateObj.toLocaleString('en-US', { month: 'short' }); // 'Jan', 'Feb' 등

        const prescriptionItemHtml = `
            <div class="appointment-item">
                <div class="appointment-date">
                    <span class="day">${day}</span>
                    <span class="month">${month}</span>
                </div>
                <div class="appointment-info">
                    <h5>Prescription Issued</h5>
                    <p>Medication starts</p>
                    <span class="location">From Hospital</span>
                </div>
            </div>
        `;
        container.innerHTML += prescriptionItemHtml;
    }

    // 2. 재방문일(Follow-up Date) 아이템 추가
    if (dates.revisitDate && dates.revisitDate !== 'Not Found') {
        const dateObj = new Date(dates.revisitDate);
        const day = dateObj.getDate();
        const month = dateObj.toLocaleString('en-US', { month: 'short' });

        const revisitItemHtml = `
            <div class="appointment-item">
                <div class="appointment-date">
                    <span class="day">${day}</span>
                    <span class="month">${month}</span>
                </div>
                <div class="appointment-info">
                    <h5>Follow-up Appointment</h5>
                    <p>Check-up with your doctor</p>
                    <span class="location">At Hospital</span>
                </div>
            </div>
        `;
        container.innerHTML += revisitItemHtml;
    }
}

/**
 * 달력 그리드에서 특정 날짜들에 하이라이트 효과를 주는 함수
 * @param {object} dates - { prescriptionDate: '날짜', revisitDate: '날짜' }
 */

function highlightDatesOnCalendar(dates) {
    const currentMonthEl = document.getElementById('current-month');
    const dayElements = document.querySelectorAll('.calendar-grid .calendar-day:not(.header)');

    if (!currentMonthEl || dayElements.length === 0) return;

    // 현재 달력에 표시된 월과 연도를 가져옵니다. (예: "June 2025")
    const currentCalendarDate = new Date(currentMonthEl.innerText);
    const currentYear = currentCalendarDate.getFullYear();
    const currentMonth = currentCalendarDate.getMonth();

    const datesToHighlight = [];
    if (dates.prescriptionDate && dates.prescriptionDate !== 'Not Found') {
        datesToHighlight.push(new Date(dates.prescriptionDate));
    }
    if (dates.revisitDate && dates.revisitDate !== 'Not Found') {
        datesToHighlight.push(new Date(dates.revisitDate));
    }

    // 먼저 모든 하이라이트를 초기화
    dayElements.forEach(dayEl => dayEl.classList.remove('event-day'));
    
    // 하이라이트할 날짜들을 순회
    datesToHighlight.forEach(eventDate => {
        // 이벤트 날짜가 현재 달력의 연도/월과 일치하는지 확인
        if (eventDate.getFullYear() === currentYear && eventDate.getMonth() === currentMonth) {
            const eventDay = eventDate.getDate();
            // 달력의 모든 날짜(div)를 순회하며 일치하는 날짜를 찾음
            dayElements.forEach(dayEl => {
                if (parseInt(dayEl.innerText) === eventDay) {
                    dayEl.classList.add('event-day'); // 찾았으면 스타일 적용!
                }
            });
        }
    });
}

// 에러를 표시하는 함수
function displayDetailedError(errorData) {
    let html = `
        <h3><font color="red">🚨 An Error Occurred!</font></h3>
        <pre style="white-space: pre-wrap; text-align: left; background-color: #fdd; padding: 10px;">
<b>Error:</b> ${errorData.error_message || 'Unknown error'}
        </pre>`;
    resultsDiv.innerHTML = html;
}