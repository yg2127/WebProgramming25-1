⸻

✅ Goal

We aim to build a website to support elderly healthcare using the following stack:
	•	LangChain.js for backend AI logic
	•	SQLite as a lightweight database
	•	Gemini API (by Google) to handle medical-related natural language understanding

⸻

🏗️ Project Structure

WP25-1/main/
│
├── backend/
│   ├── db/
│   │   └── database.js          # SQLite setup
│   ├── routes/
│   │   └── ai.js                # AI route using Gemini
│   ├── langchain/
│   │   └── geminiChain.js       # LangChain + Gemini logic
│   └── server.js                # Express server entrypoint
│
├── public/
│   └── index.html               # Frontend (simple UI)
│
├── .env                         # Environment variables
├── package.json
└── README.md


⸻

📦 Step 1: Install dependencies

cd /Users/yugeon/WP25-1/main/
npm init -y
npm install express sqlite3 dotenv langchain @google/generative-ai cors


⸻

🗂️ Step 2: backend/db/database.js

const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.resolve(__dirname, "healthcare.db");
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            age INTEGER,
            symptoms TEXT,
            last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
});

module.exports = db;


⸻

🤖 Step 3: backend/langchain/geminiChain.js

const { ChatGoogleGenerativeAI } = require("langchain/chat_models/googlevertexai");
const { PromptTemplate } = require("langchain/prompts");
require("dotenv").config();

const model = new ChatGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY,
    modelName: "gemini-pro",
    temperature: 0.7
});

const template = new PromptTemplate({
    template: "Please explain the following medical information in simple terms for an elderly user:\n\n{input}",
    inputVariables: ["input"]
});

async function getExplanation(input) {
    const prompt = await template.format({ input });
    const res = await model.call(prompt);
    return res.content;
}

module.exports = { getExplanation };


⸻

🔄 Step 4: backend/routes/ai.js

const express = require("express");
const router = express.Router();
const { getExplanation } = require("../langchain/geminiChain");
const db = require("../db/database");

router.post("/ask", async (req, res) => {
    const { name, age, symptoms } = req.body;

    try {
        const response = await getExplanation(symptoms);

        db.run(
            `INSERT INTO users (name, age, symptoms) VALUES (?, ?, ?)`,
            [name, age, symptoms],
            (err) => {
                if (err) return res.status(500).json({ error: "DB Error" });
                return res.json({ result: response });
            }
        );
    } catch (e) {
        res.status(500).json({ error: "AI Error", detail: e.message });
    }
});

module.exports = router;


⸻

🚀 Step 5: backend/server.js

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const aiRoute = require("./routes/ai");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api", aiRoute);

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});


⸻

🌍 Step 6: public/index.html

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Senior Health Assistant</title>
</head>
<body>
    <h2>Senior Health Assistant</h2>
    <form id="health-form">
        Name: <input type="text" id="name"><br>
        Age: <input type="number" id="age"><br>
        Describe your symptoms: <textarea id="symptoms"></textarea><br>
        <button type="submit">Submit</button>
    </form>
    <div id="response"></div>

    <script>
        document.getElementById("health-form").onsubmit = async (e) => {
            e.preventDefault();
            const name = document.getElementById("name").value;
            const age = document.getElementById("age").value;
            const symptoms = document.getElementById("symptoms").value;

            const res = await fetch("http://localhost:3000/api/ask", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, age, symptoms })
            });

            const data = await res.json();
            document.getElementById("response").innerText = data.result || "An error occurred";
        };
    </script>
</body>
</html>


⸻

🔐 .env

GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE


⸻