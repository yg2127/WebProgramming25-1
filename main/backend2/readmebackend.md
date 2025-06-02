방법 B(프론트엔드와 백엔드를 서로 다른 포트에서 띄우는)로 개발하시려면, 다음과 같은 순서로 진행하시면 됩니다.

⸻

1. 전체 폴더 구조 예시

/프로젝트_루트
│
├─ frontend2/
│   ├─ index.html
│   ├─ config.js       ← UPLOAD_ENDPOINT: 'http://localhost:3001/api/upload'
│   ├─ script.js
│   └─ styles.css
│
└─ backend2/
    ├─ server.js       ← API 엔드포인트 /api/upload, CORS 허용
    ├─ package.json
    ├─ uploads/        ← Multer 임시파일 저장 폴더
    └─ .env            ← GOOGLE_API_KEY=… (Gemini 키)

이제 backend2는 http://localhost:3001에서 API만 제공하고,
frontend2는 http://localhost:8080(혹은 다른 포트)에서 정적 파일(HTML/JS/CSS)만 제공합니다.

⸻

2. 백엔드(backend2) 실행
	1.	터미널을 열고 backend2 폴더로 이동:

cd /Users/yugeon/WebProgramming25-1/main/backend2


	2.	(아직 한 번도 설치하지 않았다면) 의존성 설치:

npm install

	•	express, multer, @google/genai, axios, dotenv 등이 설치됩니다.

	3.	.env 파일 내용이 올바른지 확인:

# backend2/.env
GOOGLE_API_KEY=your-real-gemini-api-key-here

	•	Gemini API 키가 정확히 입력되어 있어야 합니다.

	4.	서버 실행:

npm start

또는

node server.js

	•	성공적으로 실행되면 터미널에

서버 실행 중: http://localhost:3001

혹은 이와 유사한 메시지가 뜹니다.

	•	이제 백엔드가 /api/upload 엔드포인트를 열었고, CORS도 허용(Access-Control-Allow-Origin: *) 되어 있어야 합니다.

⸻

3. 프론트엔드(frontend2) 실행

프론트엔드는 정적 파일만 있기 때문에, 로컬에서 간단히 HTTP 서버를 띄워주면 됩니다. 대표적인 방법 두 가지를 소개합니다.

3.1. 방법 1: http-server (Node.js 기반)
	1.	터미널을 열고 frontend2 폴더로 이동:

cd /Users/yugeon/WebProgramming25-1/main/frontend2


	2.	http-server가 없다면 한 번만 글로벌 설치:

npm install -g http-server

(또는 글로벌 설치 없이 npx를 쓸 수도 있습니다.)

	3.	정적 서버 실행:

http-server -c-1 .

	•	기본적으로 http://127.0.0.1:8080 (혹은 http://localhost:8080)에 해당 폴더를 서빙합니다.
	•	-c-1 옵션은 캐시를 끄는 역할이니, 개발 중에 파일 수정할 때 캐시 때문에 화면이 꼬이는 걸 방지해 줍니다.

	4.	브라우저에서 http://localhost:8080 혹은 http://127.0.0.1:8080에 접속:
	•	index.html이 열리고,
	•	<script src="/script.js"> 같은 경로가 http://localhost:8080/script.js로 로드됩니다.
	•	파일 업로드 버튼을 클릭하거나 드래그하면, fetch('http://localhost:3001/api/upload', …) 요청이 정상적으로 백엔드로 전송됩니다.

3.2. 방법 2: VS Code Live Server 확장
	1.	VS Code에서 frontend2 폴더를 워크스페이스로 열기.
	2.	화면 왼쪽 하단 또는 index.html 파일을 우클릭 → “Open with Live Server” 선택.
	3.	그러면 자동으로 기본 브라우저가 열리며 http://127.0.0.1:5500 (혹은 Live Server가 할당한 다른 포트)로 정적 서버가 켜집니다.
	4.	이때도 마찬가지로 내부 스크립트가 fetch('http://localhost:3001/api/upload') 요청을 날리면, 백엔드에서 처리됩니다.

⸻

4. 핵심 체크리스트
	1.	config.js의 UPLOAD_ENDPOINT 경로

// frontend2/config.js
const CONFIG = {
  UPLOAD: {
    MAX_FILE_SIZE: 10 * 1024 * 1024,
    ALLOWED_TYPES: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
    UPLOAD_ENDPOINT: 'http://localhost:3001/api/upload'
  },
  // …
};
window.CONFIG = CONFIG;

	•	http://localhost:3001/api/upload 로 정확히 설정되어 있어야 합니다.

	2.	No CORS Errors
	•	백엔드 server.js 최상단에 이미 넣어둔 이 부분이 있어야 합니다:

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});


	•	이 설정이 없다면, 프론트엔드(예: 포트 8080)에서 백엔드(포트 3001)로 요청할 때 CORS 오류가 발생합니다.

	3.	index.html 내 스크립트 경로

<!-- frontend2/index.html 하단 예시 -->
…
<script src="/config.js"></script>
<script src="/script.js"></script>
</body>
</html>

	•	src="/…" 처럼 **루트(/)**로 시작하면 http://localhost:8080/config.js, http://localhost:8080/script.js 등으로 불러갑니다.

	4.	백엔드 서버가 정상 실행 중인지
	•	터미널 A: cd backend2 && npm start → http://localhost:3001 열기
	•	터미널 A에 서버 실행 중: http://localhost:3001 메시지가 뜬 상태여야 합니다.
	5.	프론트엔드 서버가 정상 실행 중인지
	•	터미널 B(또는 VS Code Live Server): http://localhost:8080 열기
	•	index.html이 잘 보이고, 개발자 도구 콘솔(F12)에 오류 없이 페이지가 로딩되는지 확인.

⸻

5. 동시 실행 예시

터미널 #1 (백엔드)

cd /Users/yugeon/WebProgramming25-1/main/backend2
npm start

	•	출력 예시:

서버 실행 중: http://localhost:3001



터미널 #2 (프론트엔드)

cd /Users/yugeon/WebProgramming25-1/main/frontend2
http-server -c-1 .

	•	출력 예시:

Starting up http-server, serving ./
Available on:
  http://127.0.0.1:8080
  http://192.168.x.x:8080
Hit CTRL-C to stop the server



브라우저
	1.	http://localhost:8080 열기 → 첫 화면(홈, 기능 등)이 잘 나오는지 확인
	2.	업로드 섹션으로 스크롤 → “Choose Files” 클릭 → 파일 선택
↓
	3.	개발자 도구(Network 탭)에서 POST http://localhost:3001/api/upload 요청이 가는지 확인
↓
	4.	응답 { success: true, data: { filename: ..., analysis: ... } }를 받아와서,
.file-status가 “Analyzed” 로 바뀌는지 확인

⸻

6. 주의사항 & 팁
	•	포트 충돌
	•	이미 다른 프로그램이 8080을 쓰고 있다면, http-server -p 3002 같은 식으로 포트를 지정할 수 있습니다.
	•	예: http-server -c-1 -p 3002 → http://localhost:3002 로 접속.
	•	실시간 리로드
	•	Live Server를 쓰면 HTML/JS를 수정할 때 자동으로 브라우저가 새로고침됩니다.
	•	http-server를 쓸 경우, 파일을 수정한 뒤 브라우저를 직접 새로고침해야 합니다.
	•	CORS 설정이 꼭 필요
	•	http://localhost:8080 → http://localhost:3001/api 형태로 요청할 때 CORS 오류가 없도록, 백엔드에 반드시 헤더를 설정해야 합니다.
	•	엔드포인트 경로 오타 주의
	•	UPLOAD_ENDPOINT를 http://localhost:3001/api/upload로 정확히 적었는지 확인하세요.
	•	fetch(CONFIG.UPLOAD.UPLOAD_ENDPOINT, …)가 404 에러를 내면, 경로 오타일 가능성이 큽니다.
	•	.env 파일
	•	백엔드 GOOGLE_API_KEY가 잘못되었거나 누락되면 Gemini 호출 시 에러가 발생합니다.
	•	.env가 backend2/ 폴더에 있고, require('dotenv').config()가 정상 동작하는지 확인하세요.

⸻

이제 방법 B로 개발 환경을 구성해 두셨으니,
	1.	백엔드(포트 3001) 띄우기
	2.	프론트엔드(포트 8080) 띄우기

→ 두 터미널을 띄워 놓은 상태에서, 브라우저로 http://localhost:8080만 열어두면
“파일 업로드 → http://localhost:3001/api/upload 호출 → 결과 표시” 전체 흐름이 매끄럽게 동작할 것입니다.

추가 질문이나 문제가 생기면 언제든 알려주세요! 😊