// server.js 파일 전체 내용입니다. 이 코드로 덮어쓰세요!
require('dotenv').config();
const express = require('express');
const path = require('path');
const multer = require('multer');
const vision = require('@google-cloud/vision');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./database');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'your_super_secret_key'; // In production, use environment variables

// Middleware
app.use(express.static(path.join(__dirname)));
app.use(express.json()); // To parse JSON bodies

const upload = multer({ storage: multer.memoryStorage() });
const visionClient = new vision.ImageAnnotatorClient();

// A middleware to verify JWT
const authenticateToken = (req, res, next) => {
    // ★★★ 1. 인증 검문소 로그 ★★★
    console.log("--- authenticateToken 미들웨어 실행됨 ---");

    const authHeader = req.headers['authorization'];
    console.log("받은 Authorization 헤더:", authHeader); // 헤더가 잘 왔는지 확인
    
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) {
        console.log("토큰이 없습니다. 401 Unauthorized 반환.");
        return res.sendStatus(401); // Unauthorized
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.log("JWT 토큰 검증 실패:", err.message);
            return res.sendStatus(403); // Forbidden
        }
        console.log("토큰 검증 성공! user:", user);
        req.user = user;
        next(); // 검문소 통과! 다음 단계로 이동
    });
};

// Main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Auth Routes
app.post('/register', async (req, res) => {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const sql = 'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)';
        db.run(sql, [name, email, hashedPassword, role], function(err) {
            if (err) {
                return res.status(500).json({ message: 'Email already exists', error: err.message });
            }
            res.status(201).json({ message: 'User registered successfully', userId: this.lastID });
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error during registration' });
    }
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;
    const sql = 'SELECT * FROM users WHERE email = ?';
    db.get(sql, [email], async (err, user) => {
        if (err || !user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '8h' }); // '1h' -> '8h' (8시간) 등으로 수정
        res.json({ message: 'Login successful', token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    });
});

// API Routes (Protected)
app.get('/api/appointments', authenticateToken, (req, res) => {
    const sql = "SELECT * FROM appointments WHERE user_id = ?";
    db.all(sql, [req.user.id], (err, rows) => {
        if (err) {
            return res.status(500).json({ message: 'Failed to fetch appointments' });
        }
        res.json(rows);
    });
});

app.post('/api/appointments', authenticateToken, (req, res) => {
    const { title, date, time, doctor, location } = req.body;
    const sql = 'INSERT INTO appointments (user_id, title, date, time, doctor, location) VALUES (?, ?, ?, ?, ?, ?)';
    db.run(sql, [req.user.id, title, date, time, doctor, location], function(err) {
        if (err) {
            return res.status(500).json({ message: 'Failed to add appointment' });
        }
        res.status(201).json({ message: 'Appointment added', appointmentId: this.lastID });
    });
});

app.get('/api/medications', authenticateToken, (req, res) => {
    const sql = "SELECT * FROM medications WHERE user_id = ?";
    db.all(sql, [req.user.id], (err, rows) => {
        if (err) {
            return res.status(500).json({ message: 'Failed to fetch medications' });
        }
        res.json(rows);
    });
});

// Vision AI Analysis Route (디버깅 로그 추가 버전)
app.post('/analyze', authenticateToken, upload.single('image'), async (req, res) => {
    // ★★★ 2. analyze 라우트 진입 로그 ★★★
    console.log("\n--- /analyze 라우트 핸들러 실행됨 ---");
    console.log("인증 검문소 통과 후 req.user:", req.user); // 로그인한 유저 정보 확인

    if (!req.file) {
        console.log("파일이 없습니다. 400 Bad Request 반환.");
        return res.status(400).send('No file uploaded.');
    }
    console.log("파일 수신 성공:", req.file.originalname);


    try {
        // ★★★ 3. Vision AI 호출 직전 로그 ★★★
        console.log("--- Google Vision AI API 호출 시도... ---");

        const [result] = await visionClient.textDetection(req.file.buffer);
        
        console.log("--- Vision AI 응답 수신 성공! ---");

        // ... (이하 로직은 일단 그대로) ...
        const detections = result.textAnnotations;
        
        if (!detections || detections.length === 0) {
            return res.status(400).json({ error_message: 'No text found in the image.' });
        }
        const text = detections[0].description;
        
        // ★★★ 4. 최종 분석 직전 로그 ★★★
        console.log("--- AI가 추출한 전체 텍스트 ---");
        console.log(text.substring(0, 200) + "..."); // 너무 기니까 앞부분만 출력
        console.log("---------------------------------");
        console.log("parsePrescription 함수 호출 시도...");

        const analyzedData = parsePrescription(text);

        console.log("parsePrescription 함수 실행 완료. 클라이언트에 결과 전송 시도...");

        res.json(analyzedData);
        
    } catch (error) {
        console.error('🔥🔥🔥 /analyze 경로에서 심각한 에러 발생: 🔥🔥🔥', error);
        res.status(500).json({ error_message: 'Failed to analyze the image.' });
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