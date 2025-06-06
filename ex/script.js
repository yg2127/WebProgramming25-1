// JavaScript: 웹페이지의 동작을 담당합니다

// HTML 요소들을 가져옵니다.
const fileInput = document.getElementById('fileInput');
const thumbnail = document.getElementById('thumbnail');
const modal = document.getElementById('myModal');
const modalImg = document.getElementById('img01');
const closeBtn = document.getElementsByClassName('close')[0];

// 1. 파일 입력(input)에 변화가 생겼을 때 실행될 함수를 연결합니다.
fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0]; // 사용자가 선택한 파일
    
    if (file) {
        const reader = new FileReader(); // 파일을 읽는 객체 생성

        // 파일 읽기가 완료되면 실행될 함수
        reader.onload = (e) => {
            thumbnail.src = e.target.result; // img 태그의 src를 읽은 파일 데이터로 설정
            thumbnail.style.display = 'block'; // 숨겨져 있던 img 태그를 보여줌
        };
        
        reader.readAsDataURL(file); // 파일을 Data URL 형태로 읽기 시작
    }
});

// 2. 썸네일 이미지를 클릭했을 때 실행될 함수를 연결합니다.
thumbnail.addEventListener('click', () => {
    modal.style.display = 'flex'; // 숨겨져 있던 모달 창을 보여줌
    modalImg.src = thumbnail.src; // 모달의 이미지 소스를 썸네일 이미지 소스로 설정
});

// 3. 모달의 닫기(X) 버튼을 클릭했을 때 실행될 함수를 연결합니다.
closeBtn.addEventListener('click', () => {
    modal.style.display = 'none'; // 모달 창을 다시 숨김
});

// 4. 모달 창 바깥의 어두운 부분을 클릭했을 때도 닫히게 합니다.
modal.addEventListener('click', (event) => {
    if (event.target === modal) { // 만약 클릭된 요소가 모달 자신이라면
        modal.style.display = 'none';
    }
});
// ... 기존 코드 ...

// 'AI 분석' 버튼을 눌렀을 때의 로직
const analyzeButton = document.getElementById('analyze-btn');
const imageInput = document.getElementById('fileInput');
const resultsDiv = document.getElementById('results');

analyzeButton.addEventListener('click', async () => {
    const file = imageInput.files[0];
    if (!file) {
        return alert('분석할 이미지를 먼저 선택해주세요!');
    }

    // FormData 객체를 사용해 파일을 서버로 전송할 준비
    const formData = new FormData();
    formData.append('image', file);

    resultsDiv.innerHTML = 'AI가 이미지를 분석하고 있습니다... 🧐';

    try {
        // 우리 백엔드 서버의 /analyze 엔드포인트로 POST 요청
        const response = await fetch('/analyze', {
            method: 'POST',
            body: formData,
        });

        const data = await response.json();

        // 서버로부터 받은 분석 결과를 화면에 표시
        displayResults(data);

    } catch (error) {
        console.error('분석 중 오류 발생:', error);
        resultsDiv.innerHTML = '오류가 발생했습니다. 다시 시도해주세요.';
    }
});

function displayResults(data) {
    if (!data.labels || data.labels.length === 0) {
        resultsDiv.innerHTML = '분석된 결과가 없습니다.';
        return;
    }

    let html = '<h3>🔍 AI 분석 결과</h3><ul>';
    data.labels.forEach(label => {
        // toFixed(2) : 소수점 2자리까지만 표시
        const score = (label.score * 100).toFixed(2);
        html += `<li>${label.description} (정확도: ${score}%)</li>`;
    });
    html += '</ul>';
    resultsDiv.innerHTML = html;
}