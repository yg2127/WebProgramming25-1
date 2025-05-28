// backend/db.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// DB 파일 경로 (backend 폴더 기준, backend 폴더 내에 mydatabase.sqlite 생성)
const dbPath = path.join(__dirname, 'mydatabase.sqlite');
// 또는 프로젝트 루트에 만들고 싶다면: const dbPath = path.resolve(__dirname, '../mydatabase.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("SQLite DB 연결 오류:", err.message);
        // DB 연결 실패 시 프로세스 종료 또는 적절한 오류 처리
        process.exit(1);
    } else {
        console.log(`SQLite DB에 성공적으로 연결되었습니다: ${dbPath}`);
        initializeDatabase();
    }
});

function initializeDatabase() {
    db.serialize(() => { // 순차적 실행 보장
        // users 테이블 생성
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL -- !!! 실제로는 해시된 비밀번호를 저장해야 함 !!!
        )`, (err) => {
            if (err) console.error("'users' 테이블 생성 오류:", err.message);
            else console.log("'users' 테이블이 준비되었습니다.");
        });

        // documents 테이블 생성 (user_id 추가)
        db.run(`CREATE TABLE IF NOT EXISTS documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            filename TEXT,
            ocr_text TEXT,
            extracted_info TEXT,
            uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )`, (err) => {
            if (err) console.error("'documents' 테이블 생성 오류:", err.message);
            else console.log("'documents' 테이블 (user_id 포함)이 준비되었습니다.");
        });
    });
}

// 다른 파일에서 db 객체를 사용할 수 있도록 export
module.exports = db;