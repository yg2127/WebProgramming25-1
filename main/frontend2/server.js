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

function parsePrescription(text) {
    let prescriptionDate = "Not Found";
    let followupDate = "Not Found";
    const datePattern = /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s\d{1,2},\s\d{4}|\d{1,2}\/\d{1,2}\/\d{4}/gi;
    const allDates = text.match(datePattern) || [];

    if (text.toLowerCase().includes('follow-up')) {
        if (allDates.length > 1) followupDate = allDates[allDates.length - 1];
        else if (allDates.length === 1) followupDate = allDates[0];
    }
    if (text.toLowerCase().includes('date of issue')) {
        if (allDates.length > 0) prescriptionDate = allDates[0];
    }
    if (prescriptionDate === "Not Found" && allDates.length > 0) {
        prescriptionDate = allDates[0];
    }
    return { prescriptionDate, followupDate };
}