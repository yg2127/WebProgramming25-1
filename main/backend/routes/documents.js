// backend/routes/documents.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const { HumanMessage } = require("@langchain/core/messages"); // SystemMessage는 Gemini 프롬프트에 직접 통합
const db = require('../db'); // DB 객체 가져오기

console.log("documents.js 에서 읽은 GOOGLE_API_KEY:", process.env.GOOGLE_API_KEY);
console.log("Attempting to initialize LLM with model: gemini-1.5-flash-latest"); // 이것도 같이 넣어두면 좋아


// LLM 초기화 (이 파일에서 직접 수행)
const llm = new ChatGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_API_KEY, // .env 파일은 server.js에서 로드되므로 process.env로 접근 가능
    model: "gemini-1.5-flash",
    temperature: 0.2,
});

// Multer 설정 (이 파일에서 직접 수행)
const uploadDir = path.join(__dirname, '../uploads'); // backend/uploads
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer.diskStorage({
    destination: function (req, file, cb) { cb(null, uploadDir); },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) { cb(null, true); }
        else { cb(new Error('이미지 파일만 업로드 가능합니다!'), false); }
    },
    limits: { fileSize: 10 * 1024 * 1024 }
});


// 이미지 업로드 -> Gemini로 OCR + 정보 추출/요약
router.post('/upload-and-process', upload.single('medicalDocument'), async (req, res) => {
    const { userId } = req.body;
    if (!userId) {
        return res.status(401).json({ error: '인증되지 않은 사용자입니다. userId를 포함해주세요.' });
    }
    if (!req.file) {
        return res.status(400).json({ error: '업로드된 파일이 없습니다.' });
    }

    const filePath = req.file.path;
    try {
        console.log(`Gemini 처리 요청 (사용자 ID: ${userId}): ${filePath}`);
        const imageBase64 = fs.readFileSync(filePath, { encoding: 'base64' });
        const dataUri = `data:${req.file.mimetype};base64,${imageBase64}`;

        const promptText = `주어진 의료 문서 이미지에서 모든 텍스트를 정확하게 추출하고, 그 추출된 전체 텍스트를 바탕으로 주요 의료 정보를 요약 및 구조화해주세요. 결과는 반드시 다음 JSON 형식으로만 응답해야 합니다:
{
  "ocr_full_text": "이미지에서 추출된 모든 텍스트 내용 전체입니다. 줄바꿈은 \\n으로 표시해주세요.",
  "structured_summary": {
    "diagnosis": "주요 진단명",
    "medications": "처방된 주요 약물 (배열 또는 쉼표로 구분된 문자열)",
    "summary": "핵심 치료 내용 및 의사 소견 요약"
  }
}
다른 부가적인 설명이나 인사 없이, 요청한 JSON 객체만 정확히 반환해주세요.`;

        const messages = [
            new HumanMessage({ content: [{ type: "text", text: promptText }, { type: "image_url", image_url: dataUri }] }),
        ];
        const llmResponse = await llm.invoke(messages);
        const rawResponseContent = llmResponse.content;
        console.log("Gemini 원본 응답 (ID: " + userId + "):", rawResponseContent);

        let parsedResult, ocrTextFromGemini = "OCR 실패", structuredInfoForDb = "{}";
        try {
            const cleanedJsonString = rawResponseContent.replace(/^```json\s*|```\s*$/g, '').trim();
            parsedResult = JSON.parse(cleanedJsonString);
            if (parsedResult && parsedResult.ocr_full_text && parsedResult.structured_summary) {
                ocrTextFromGemini = parsedResult.ocr_full_text;
                structuredInfoForDb = JSON.stringify(parsedResult.structured_summary);
            } else {
                ocrTextFromGemini = rawResponseContent; structuredInfoForDb = JSON.stringify({ error: "구조 오류", details: rawResponseContent });
                parsedResult = { ocr_full_text: ocrTextFromGemini, structured_summary: { diagnosis: "구조 오류", medications: "구조 오류", summary: "Gemini 응답 구조 오류" }};
            }
        } catch (parseError) {
            ocrTextFromGemini = rawResponseContent; structuredInfoForDb = JSON.stringify({ error: "파싱 실패", details: rawResponseContent });
            parsedResult = { ocr_full_text: ocrTextFromGemini, structured_summary: { diagnosis: "파싱 오류", medications: "파싱 오류", summary: "Gemini 응답 파싱 오류" }};
        }

        const stmt = db.prepare(`INSERT INTO documents (user_id, filename, ocr_text, extracted_info) VALUES (?, ?, ?, ?)`);
        stmt.run(userId, req.file.originalname, ocrTextFromGemini, structuredInfoForDb, function (err) {
            if (err) {
                console.error("DB 저장 오류 (ID: " + userId + "):", err.message);
                return res.status(500).json({ error: 'DB 저장 중 오류', details: err.message });
            }
            const documentId = this.lastID;
            res.json({ message: 'Gemini 처리 성공!', documentId: documentId, userId: userId, data: parsedResult });
        });
        stmt.finalize();

    } catch (error) {
        console.error('Gemini API 처리 오류 (ID: ' + userId + '):', error);
        res.status(500).json({ error: 'Gemini 처리 중 서버 오류', details: error.toString() });
    } finally {
        fs.unlink(filePath, (err) => { if (err) console.error("임시 파일 삭제 오류:", filePath, err.message); });
    }
});

// 특정 사용자의 문서 목록 가져오기
router.get('/', (req, res) => { // '/api/documents/'로 요청이 옴
    const userId = req.query.userId || req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ error: '사용자 ID(userId)가 필요합니다.' });

    db.all("SELECT id, filename, uploaded_at, substr(ocr_text, 1, 100) as ocr_text_preview, extracted_info FROM documents WHERE user_id = ? ORDER BY uploaded_at DESC LIMIT 10",
        [userId], (err, rows) => {
        if (err) return res.status(500).json({ "error": err.message });
        const processedRows = rows.map(row => {
            try { return { ...row, extracted_info: row.extracted_info ? JSON.parse(row.extracted_info) : null }; }
            catch (e) { return { ...row, extracted_info: { error: "저장된 요약 형식 오류" } }; }
        });
        res.json({ message: `사용자 ID ${userId}의 최근 문서 목록`, data: processedRows });
    });
});

// 특정 사용자의 특정 문서 상세 정보 가져오기
router.get('/:id', (req, res) => { // '/api/documents/:id'로 요청이 옴
    const documentId = req.params.id;
    const userId = req.query.userId || req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ error: '사용자 ID(userId)가 필요합니다.' });

    db.get("SELECT id, filename, uploaded_at, ocr_text, extracted_info FROM documents WHERE id = ? AND user_id = ?",
        [documentId, userId], (err, row) => {
        if (err) return res.status(500).json({ "error": err.message });
        if (row) {
            try { row.extracted_info = row.extracted_info ? JSON.parse(row.extracted_info) : null; }
            catch (e) { row.extracted_info = { error: "저장된 요약 형식 오류" }; }
            res.json({ message: "문서 상세 정보", data: row });
        } else {
            res.status(404).json({ message: "문서를 찾을 수 없거나 접근 권한이 없습니다." });
        }
    });
});

module.exports = router; // 라우터 객체 export