// backend/server.js
const express = require('express');
const app = express();
// ── CORS 설정 ────────────────────────────────────────────────────────────────

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

require('dotenv').config();                  // ─ .env 로딩
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const { GoogleGenAI } = require('@google/genai');  // Gemini용 SDK
const PORT = 3001;

// ───────── 1) Multer 설정 ───────────────────────────────────────────────────
// 업로드된 파일을 `backend/uploads/` 폴더에 임시 저장
const upload = multer({
    dest: path.join(__dirname, 'uploads/'),
    limits: { fileSize: 10 * 1024 * 1024 }       // 최대 10MB
});

// ───────── 2) Gemini 클라이언트 초기화 ───────────────────────────────────────
// .env의 GOOGLE_API_KEY를 사용
const gemini = new GoogleGenAI({
    apiKey: process.env.GOOGLE_API_KEY
});

// ───────── 3) CORS 설정 (필요 시) ───────────────────────────────────────────
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');  
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

// ───────── 4) JSON Body 파싱 (필요하다면) ────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ───────── 5) 업로드 + Gemini 분석 엔드포인트 (/api/upload) ─────────────────────
/*
    - 프론트엔드에서는 FormData를 만들어서 'file' 필드 하나에 File 객체를 담아 POST 전송
    - upload.single('file')로 Multer가 req.file에 업로드된 파일 객체를 넣어줌
*/
app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
    // 1) 파일이 제대로 업로드됐는지 확인
    if (!req.file) {
        return res.status(400).json({
        success: false,
        message: '파일이 업로드되지 않았습니다.'
        });
    }

    // 2) Multer가 저장한 임시 파일 경로(path)와 원본 파일명(originalname), MIME 타입(mimetype) 추출
    const { path: tempFilePath, originalname, mimetype } = req.file;

    // 3) 파일을 Buffer로 읽어서 Gemini Files API에 업로드
    const fileBuffer = fs.readFileSync(tempFilePath);
    const uploadedFile = await gemini.files.upload({
        file: fileBuffer,
        config: { mimeType: mimetype }
    });

    // 4) Gemini 모델 호출: 업로드한 파일 참조와 프롬프트를 함께 넘김
    //    ↓ 필요한 모델 이름(예: 'gemini-2.5-flash')로 바꿔 사용하세요
    const modelName = 'gemini-2.5-flash';
    const userPrompt = 
        "이 이미지를 분석하여, 진단서에 적힌 환자 정보와 주요 임상 소견(진단명·처방약 등)을 한국어로 요약해줘.";

    const geminiResponse = await gemini.models.generateContent({
        model: modelName,
        contents: [
        uploadedFile,    // ─ 업로드된 이미지 파일 참조 객체
        userPrompt       // ─ 이미지 분석/요약을 요청하는 한국어 프롬프트
        ]
    });

    // 5) Gemini 응답에서 텍스트 부분만 꺼내서 합치기
    let analysisText = "";
    const candidates = geminiResponse.candidates;
    if (Array.isArray(candidates) && candidates.length > 0) {
        for (const part of candidates[0].content.parts) {
        if (part.text) {
            analysisText += part.text;
        }
        }
    }

    // 6) 클라이언트에게 최종 분석 결과 반환
    return res.json({
        success: true,
        data: {
        filename: originalname,
        analysis: analysisText.trim()
        }
    });

    } catch (err) {
    console.error('Gemini 분석 중 오류:', err);
    return res.status(500).json({
        success: false,
        message: '서버 내부 오류가 발생했습니다.'
    });
    } finally {
    // 7) Multer 임시 파일 삭제 (디스크 누수 방지)
    if (req.file && req.file.path) {
        fs.unlink(req.file.path, ()=>{});
    }
    }
});

// ───────── 6) 서버 실행 ──────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`백엔드 서버 실행 중: http://localhost:${PORT}`);
});