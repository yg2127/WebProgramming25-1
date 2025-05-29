// backend/server.js
const path = require('path'); // path 모듈을 맨 위에 불러오는 것이 좋음

// .env 파일의 정확한 경로 설정
// __dirname 은 현재 server.js 파일이 있는 'backend' 폴더를 가리킴
// 따라서 '../.env' 는 'backend' 폴더의 부모 폴더(즉, 'main' 폴더)에 있는 '.env' 파일을 가리킴
const envPath = path.resolve(__dirname, '../.env');
require('dotenv').config({ path: envPath });

const express = require('express');
const cors = require('cors');
// const path = require('path'); // 이미 위에서 불러왔음

const db = require('./db');
const authRoutes = require('./routes/auth');
const documentRoutes = require('./routes/documents');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);

app.get('/api', (req, res) => {
    res.json({ message: 'AI 주치의 백엔드 서버가 실행 중입니다!' });
});

app.listen(port, () => {
    console.log(`백엔드 서버가 http://localhost:${port} 에서 실행 중입니다.`);
    console.log(`.env 파일 로드 경로 시도: ${envPath}`); // .env 경로 확인용 로그
    if (process.env.GOOGLE_API_KEY) {
        console.log("GOOGLE_API_KEY 로드 성공!");
    } else {
        console.error("주의: GOOGLE_API_KEY를 .env 파일에서 찾을 수 없거나 로드되지 않았습니다!");
        console.error("확인사항: 1. /WP25-1/main/.env 파일이 정확한 위치에 있는지, 2. 파일 안에 GOOGLE_API_KEY=... 형식이 맞는지 확인해주세요.");
    }
});

process.on('SIGINT', () => {
    console.log("\n서버 종료 중...");
    if (db && typeof db.close === 'function') {
        db.close((err) => {
            if (err) console.error("DB 연결 종료 중 오류:", err.message);
            else console.log("SQLite DB 연결이 성공적으로 닫혔습니다.");
            process.exit(0);
        });
    } else {
        process.exit(0);
    }
});