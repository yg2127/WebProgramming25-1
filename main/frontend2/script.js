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

// 성공 결과를 표시하는 함수
function displayResults(data) {
    const prescriptionDate = data.prescriptionDate || "Not found";
    const followupDate = data.followupDate || "Not found";
    let html = `
        <h3>📋 Prescription Analysis Results</h3>
        <ul>
            <li><strong>Issued Date:</strong> ${prescriptionDate}</li>
            <li><strong>Follow-up Date:</strong> ${followupDate}</li>
        </ul>`;
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