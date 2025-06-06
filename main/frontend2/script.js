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

// 성공 결과를 표시하는 함수 (업그레이드 버전)
function displayResults(data) {
    const prescriptionDate = data.prescriptionDate || "Not found";
    const followupDate = data.revisitDate || "Not found";

    // 약 목록 부분을 동적으로 생성
    let medicationListHtml = '';
    if (data.medications && data.medications.length > 0) {
        data.medications.forEach(med => {
            medicationListHtml += `
                <div class="medication-item" style="border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 10px;">
                    <strong>${med.name}</strong>
                    <ul style="margin: 5px 0 0 20px; padding: 0;">
                        <li>Dosage: ${med.dosage}</li>
                        <li>Duration: ${med.duration}</li>
                    </ul>
                </div>
            `;
        });
    } else {
        medicationListHtml = '<p>No medication details found.</p>';
    }

    // 최종 HTML 조합
    let html = `
        <h3>📋 Prescription Analysis Results</h3>
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px;">
            <p><strong>Issued Date:</strong> ${prescriptionDate}</p>
            <p><strong>Follow-up Date:</strong> ${followupDate}</p>
            <hr>
            <h4>Medication Details</h4>
            ${medicationListHtml}
        </div>
    `;
    resultsDiv.innerHTML = html;
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