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
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
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

        const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
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

// Vision AI Analysis Route
app.post('/analyze', upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    try {
        const [result] = await visionClient.textDetection(req.file.buffer);
        const detections = result.textAnnotations;
        const text = detections[0] ? detections[0].description : '';

        // Mock AI processing to extract data and generate suggestions
        const analyzedData = {
            prescriptionDate: "2024-06-15",
            revisitDate: "2024-07-15",
            medications: [
                { name: "Metformin", dosage: "500mg, twice a day", duration: "30 days" },
                { name: "Lisinopril", dosage: "10mg, once a day", duration: "30 days" }
            ],
            medicalTerms: [
                { term: "Metformin", explanation: "A medication used to treat type 2 diabetes." },
                { term: "Lisinopril", explanation: "A medication used to treat high blood pressure." }
            ],
            suggestions: [
                "Remember to take Metformin with meals to reduce stomach upset.",
                "Monitor your blood pressure regularly while taking Lisinopril.",
                "Ensure you have a follow-up appointment scheduled around July 15th."
            ]
        };

        // Here you would save the data to the DB, associated with the logged-in user
        // For now, we just return it. A proper implementation would require passing user token.

        res.json(analyzedData);
    } catch (error) {
        console.error('Error during AI analysis:', error);
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