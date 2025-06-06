// server.js 파일 전체 내용입니다. 이 코드로 덮어쓰세요!
require('dotenv').config();
const express = require('express');
const path = require('path');
const multer = require('multer');
const vision = require('@google-cloud/vision');

const app = express();
const PORT = 3000;

const upload = multer({ storage: multer.memoryStorage() });

const visionClient = new vision.ImageAnnotatorClient();

// 현재 폴더(__dirname)를 '정적 파일 제공' 폴더로 지정합니다.
// 이제 이 폴더 안의 .js, .css, 이미지 파일 등을 브라우저가 요청하면 서버가 자동으로 찾아서 보내줍니다.
app.use(express.static(path.join(__dirname)));
// ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★

// 메인 페이지 접속 요청 시, index.html을 보내줍니다.
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// AI 분석 API는 그대로 유지합니다.
app.post('/analyze', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No image file.' });

        const [result] = await visionClient.documentTextDetection(req.file.buffer);
        const fullText = result.fullTextAnnotation;

        if (!fullText) return res.status(400).json({ error: 'Could not extract text.' });

        const extractedData = parsePrescription(fullText.text);
        res.json(extractedData);

    } catch (error) {
        console.error('ERROR DURING AI ANALYSIS:', error);
        res.status(500).json({ error_message: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});

// 5. 처방전 분석 로직 (업그레이드 버전)
function parsePrescription(text) {
    console.log("--- Analyzing Text Line by Line ---");
    
    // 최종적으로 프론트엔드에 보낼 구조화된 데이터 객체
    const results = {
        prescriptionDate: "Not Found",
        revisitDate: "Not Found",
        medications: [] // 약 정보를 담을 배열
    };

    // 정규 표현식 패턴들
    const datePattern = /(June|July|August)\s\d{1,2},\s\d{4}/gi; // 예시: June 6, 2025
    const drugPattern = /^\d+\.\s(.+mg.+)$/i; // 예시: 1. Gemmycin 250mg Tab
    const sigPattern = /Sig:\s(.+)/i; // 예시: Sig: 1 tablet, 3 times a day...
    const durationPattern = /for\s(\d+)\sday/i; // 예시: for 7 days

    // 텍스트를 한 줄씩 쪼개서 배열로 만듦
    const lines = text.split('\n');
    let currentMedication = null; // 현재 처리 중인 약 정보를 임시 저장할 변수

    // 모든 줄을 하나씩 순회
    for (const line of lines) {
        // 1. 약 이름 패턴에 해당하는 줄인지 확인
        let match = line.match(drugPattern);
        if (match) {
            // 이전에 처리하던 약 정보가 있었다면 결과에 추가
            if (currentMedication) {
                results.medications.push(currentMedication);
            }
            // 새로운 약 정보 객체 시작
            currentMedication = {
                name: match[1].trim(), // 약 이름 (예: Gemmycin 250mg Tab)
                dosage: "Not specified",
                duration: "Not specified"
            };
            continue; // 다음 줄로 이동
        }

        // 2. 복용법(Sig) 패턴에 해당하는 줄인지 확인
        match = line.match(sigPattern);
        if (match && currentMedication) {
            // 현재 처리 중인 약이 있을 때만 복용법을 추가
            currentMedication.dosage = match[1].trim();
            
            // 복용법 안에서 '복약 주기'를 추가로 추출
            const durationMatch = match[1].match(durationPattern);
            if (durationMatch) {
                currentMedication.duration = `${durationMatch[1]} days`;
            }
        }
        
        // 3. 처방일 또는 재방문일 찾기 (기존 로직 활용)
        if (line.includes('Date of Issue:')) {
            results.prescriptionDate = line.match(datePattern)?.[0] || "Not Found";
        }
        if (line.includes('Follow-up appointment:')) {
            results.revisitDate = line.match(datePattern)?.[0] || "Not Found";
        }
    }

    // 마지막으로 처리 중이던 약 정보를 결과에 추가
    if (currentMedication) {
        results.medications.push(currentMedication);
    }

    console.log("--- Analysis Complete ---", results);
    return results;
}