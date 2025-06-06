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

// 5. 처방전 분석 로직 (더욱 강력해진 버전)
function parsePrescription(text) {
    console.log("--- Analyzing Text Line by Line ---");
    
    const results = {
        prescriptionDate: "Not Found",
        revisitDate: "Not Found",
        medications: []
    };

    const datePattern = /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s\d{1,2},\s\d{4}|\d{1,2}\/\d{1,2}\/\d{4}/gi;
    const drugPattern = /^\d+\.\s(.+mg.+)$/i;
    const sigPattern = /Sig:\s(.+)/i;
    const durationPattern = /for\s(\d+)\sday/i;

    const lines = text.split('\n');
    let currentMedication = null;

    for (const line of lines) {
        // ★★★ 이 부분을 더 강력하게 수정! ★★★
        const lowercasedLine = line.toLowerCase(); // 모든 줄을 소문자로 변환해서 비교

        // 1. 약 이름 패턴 확인
        let match = line.match(drugPattern); // 약 이름 자체는 원본에서 추출
        if (match) {
            if (currentMedication) {
                results.medications.push(currentMedication);
            }
            currentMedication = {
                name: match[1].trim(),
                dosage: "Not specified",
                duration: "Not specified"
            };
            continue;
        }

        // 2. 복용법 패턴 확인
        match = line.match(sigPattern);
        if (match && currentMedication) {
            currentMedication.dosage = match[1].trim();
            const durationMatch = match[1].match(durationPattern);
            if (durationMatch) {
                currentMedication.duration = `${durationMatch[1]} days`;
            }
        }
        
        // 3. 처방일 또는 재방문일 찾기 (키워드 추가!)
        // ★★★ 이 부분을 수정합니다 ★★★
        if (lowercasedLine.includes('date of issue') || lowercasedLine.includes('date prescribed')) { // 'date prescribed' 추가
            results.prescriptionDate = line.match(datePattern)?.[0] || "Not Found";
        }
        if (lowercasedLine.includes('follow-up appointment') || lowercasedLine.includes('return for check-up')) { // 'return for check-up' 추가
            results.revisitDate = line.match(datePattern)?.[0] || "Not Found";
        }
    }

    if (currentMedication) {
        results.medications.push(currentMedication);
    }

    console.log("--- Analysis Complete ---", results);
    return results;
}