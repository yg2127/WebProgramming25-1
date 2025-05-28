// backend/server.js
require('dotenv').config({ path: '../.env' }); // .env 파일 경로를 프로젝트 루트로 지정
const express = require('express');
const cors = require('cors');
const path = require('path'); // 경로 관련 작업에 필요

// DB 초기화 (db.js를 require하는 것만으로도 연결 및 테이블 생성 시도)
const db = require('./db'); // 이 시점에 db.js의 코드가 실행됨

// 라우터 가져오기
const authRoutes = require('./routes/auth');
const documentRoutes = require('./routes/documents');

const app = express();
const port = 3001;

// 미들웨어 설정
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 정적 파일 제공 (uploads 폴더 안의 파일에 직접 접근해야 할 경우, 선택 사항)
// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API 라우트 연결
app.use('/api/auth', authRoutes);         // '/api/auth/signup', '/api/auth/login' 등으로 요청
app.use('/api/documents', documentRoutes); // '/api/documents/upload-and-process', '/api/documents/' 등으로 요청

// 기본 라우트 (서버 상태 확인용)
app.get('/api', (req, res) => {
    res.json({ message: 'AI 주치의 백엔드 서버가 실행 중입니다!' });
});

// 서버 시작
app.listen(port, () => {
    console.log(`백엔드 서버가 http://localhost:${port} 에서 실행 중입니다.`);
    if (!process.env.GOOGLE_API_KEY) { // 여기서도 한번 더 체크
        console.error("주의: .env 파일에 GOOGLE_API_KEY가 설정되지 않았거나 로드되지 않았습니다!");
    }
    // db.js에서 DB 연결 메시지 출력됨
});

// 서버 종료 시 DB 연결 닫기 (선택적)
process.on('SIGINT', () => {
    console.log("\n서버 종료 중...");
    if (db && typeof db.close === 'function') { // db 객체가 있고 close 함수가 있다면
        db.close((err) => {
            if (err) console.error("DB 연결 종료 중 오류:", err.message);
            else console.log("SQLite DB 연결이 성공적으로 닫혔습니다.");
            process.exit(0);
        });
    } else {
        process.exit(0);
    }
});