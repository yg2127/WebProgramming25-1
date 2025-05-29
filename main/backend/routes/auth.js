// backend/routes/auth.js
const express = require('express');
const router = express.Router();
const db = require('../db'); // DB 객체 가져오기

// const bcrypt = require('bcrypt'); // 실제로는 비밀번호 해싱을 위해 필요!
// const saltRounds = 10;

// 회원가입 API
router.post('/signup', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: '사용자 이름과 비밀번호를 모두 입력해주세요.' });
    }

    const plainPassword = password; // 실제로는 해싱: const hashedPassword = await bcrypt.hash(password, saltRounds);
    const stmt = db.prepare(`INSERT INTO users (username, password) VALUES (?, ?)`);
    stmt.run(username, plainPassword, function (err) {
        if (err) {
            if (err.message.includes("UNIQUE constraint failed")) {
                return res.status(409).json({ error: '이미 사용 중인 사용자 이름입니다.' });
            }
            console.error("회원가입 DB 저장 오류:", err.message);
            return res.status(500).json({ error: '회원가입 중 오류가 발생했습니다.' });
        }
        res.status(201).json({ message: '회원가입 성공!', userId: this.lastID, username: username });
    });
    stmt.finalize();
});

// 로그인 API
router.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: '사용자 이름과 비밀번호를 모두 입력해주세요.' });
    }

    db.get("SELECT * FROM users WHERE username = ?", [username], async (err, user) => {
        if (err) {
            console.error("로그인 DB 조회 오류:", err.message);
            return res.status(500).json({ error: '로그인 중 오류가 발생했습니다.' });
        }
        if (!user) {
            return res.status(401).json({ error: '사용자 이름 또는 비밀번호가 올바르지 않습니다.' });
        }

        const passwordMatch = (password === user.password); // 실제로는 해시 비교: const passwordMatch = await bcrypt.compare(password, user.password);
        if (passwordMatch) {
            res.json({ message: '로그인 성공!', userId: user.id, username: user.username });
        } else {
            res.status(401).json({ error: '사용자 이름 또는 비밀번호가 올바르지 않습니다.' });
        }
    });
});

module.exports = router; // 라우터 객체 export