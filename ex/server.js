// 1. 필요한 라이브러리들을 불러옵니다.
require('dotenv').config(); // .env 파일의 환경 변수를 불러옴
const express = require('express');
const path = require('path'); // 파일 경로를 쉽게 다루게 도와줌
const multer = require('multer');
const vision = require('@google-cloud/vision');

// 2. Express 앱 생성 및 기본 설정
const app = express();
const PORT = 3000; // 우리 서버가 사용할 포트 번호
const upload = multer({ storage: multer.memoryStorage() }); // 파일을 메모리에 임시 저장

// 3. Google Vision AI 클라이언트 생성
// .env 파일에 GOOGLE_APPLICATION_CREDENTIALS가 설정되어 있으면 자동으로 인증됩니다.
const visionClient = new vision.ImageAnnotatorClient();

// 4. API 엔드포인트(요청을 받는 창구) 설정
// ★★★ 바로 이 부분이 빠졌을 가능성이 높습니다! ★★★
// 루트 경로 ('/')로 GET 요청이 오면, 우리 프론트엔드 파일(index.html)을 보내줌
app.get('/', (req, res) => {
    // path.join을 사용하면 OS에 상관없이 안전하게 파일 경로를 만들 수 있어요.
    // __dirname은 현재 파일(server.js)이 있는 폴더의 절대 경로를 의미해요.
    res.sendFile(path.join(__dirname, 'index.html'));
});
// ★★★ 여기까지 ★★★


// '/analyze' API 엔드포인트 수정
app.post('/analyze', upload.single('image'), async (req, res) => {
    console.log('처방전 분석 요청 받음...');
    try {
        if (!req.file) return res.status(400).json({ error: '이미지 파일이 없습니다.' });

        const imageBuffer = req.file.buffer;
        
        // 1. [수정] Vision API 호출을 labelDetection -> documentTextDetection으로 변경
        const [result] = await visionClient.documentTextDetection(imageBuffer);
        const fullText = result.fullTextAnnotation;

        if (!fullText) {
            return res.status(400).json({ error: '이미지에서 텍스트를 추출할 수 없습니다.' });
        }
        
        console.log('텍스트 추출 성공! 정보 분석 시작...');

        // 2. [추가] 추출된 텍스트에서 원하는 정보를 뽑아내는 함수 호출
        const extractedData = parsePrescription(fullText.text);
        
        // 3. [수정] 가공된 최종 결과를 프론트엔드로 전송
        res.json(extractedData);

    } catch (error) {
        // 터미널에 더 잘 보이도록 강조해서 로그를 찍습니다.
        console.error('!!!!!!!!!! AI 분석 중 명시적 에러 발생 !!!!!!!!!!', error);
        
        // [수정] 에러의 내용을 브라우저로 직접 보냅니다.
        res.status(500).json({
            message: "서버에서 에러가 발생했습니다.",
            error_name: error.name,        // 에러 이름 (예: TypeError)
            error_message: error.message,  // 에러 메시지
            error_stack: error.stack       // 에러가 발생한 위치 (스택 트레이스)
        });
    }

});


/**
 * [새로운 함수] 처방전 텍스트를 분석해 핵심 정보를 추출하는 함수
 * @param {string} text - Vision AI가 추출한 전체 텍스트
 * @returns {object} - { medicationDate: '날짜', revisitDate: '날짜' }
 */
/**


 * [영문 버전] 처방전 텍스트를 분석해 핵심 정보를 추출하는 함수
 * @param {string} text - Vision AI가 추출한 전체 텍스트
 * @returns {object} - { prescriptionDate: '날짜', followupDate: '날짜' }
 */
function parsePrescription(text) {
    console.log("--- Extracted Full Text ---");
    console.log(text);
    console.log("---------------------------");

    let prescriptionDate = "Not Found";
    let followupDate = "Not Found";

    // 정규 표현식: "June 6, 2025" 또는 "06/06/2025" 같은 영어 날짜 형식을 찾는 패턴
    // (?:...)는 그룹으로 묶지만 캡처는 하지 않음, /i는 대소문자 무시
    const datePattern = /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s\d{1,2},\s\d{4}|\d{1,2}\/\d{1,2}\/\d{4}/gi;

    // 전체 텍스트에서 모든 날짜를 찾아 배열로 만듦
    const allDates = text.match(datePattern) || [];

    // "Follow-up", "Return", "Next appointment" 같은 단어 찾기
    const followupKeywords = ['Follow-up', 'Return on', 'Next appointment', 'Revisit on'];
    followupKeywords.forEach(keyword => {
        if (text.toLowerCase().includes(keyword.toLowerCase())) {
            // 키워드가 있다면, 찾은 날짜 중 하나를 재방문일로 가정 (더 복잡한 로직 가능)
            if (allDates.length > 1) {
                // 보통 처방일보다 뒤에 있는 날짜가 재방문일이므로, 마지막 날짜를 선택
                followupDate = allDates[allDates.length - 1];
            } else if (allDates.length === 1) {
                followupDate = allDates[0];
            }
        }
    });

    // "Date of Issue", "Prescription Date" 같은 단어 찾기
    const prescriptionKeywords = ['Date of Issue', 'Prescription Date', 'Date Prescribed'];
    prescriptionKeywords.forEach(keyword => {
        if (text.toLowerCase().includes(keyword.toLowerCase())) {
            if (allDates.length > 0) {
                // 보통 첫 번째 날짜가 처방일
                prescriptionDate = allDates[0];
            }
        }
    });

    // 키워드를 못 찾았더라도 날짜가 하나만 있다면, 그것을 처방일로 간주
    if (prescriptionDate === "Not Found" && allDates.length > 0) {
        prescriptionDate = allDates[0];
    }

    return { prescriptionDate, followupDate };
}

// 5. 서버 실행
app.listen(PORT, () => {
    console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다. 브라우저에서 이 주소로 접속하세요!`);
});