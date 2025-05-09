⸻

WebProgramming25-1

This is the Git repository for collaborative work in the Web Programming course (Spring 2025).
Please read the README and create your personal branch based on main.
If you have any questions, feel free to reach out!

⸻

✅ Team Member Branching Guide (main → personal branch)

1️⃣ Clone the repository from GitHub:

git clone https://github.com/yg2127/DL_study.git
cd DL_study

2️⃣ Switch to the main branch and make sure it’s up-to-date:

git checkout main
git pull origin main

3️⃣ Create your personal branch and push it to GitHub:

git checkout -b yourname   # e.g., minji
git push -u origin yourname

	- -b creates a new branch
	- -u sets the upstream branch (tracks the remote branch)

⸻

🧠 Collaboration Tips
	- Do not push directly to main! → Only merge via Pull Requests (PR)
	- After completing your work, open a PR (Pull Request) on GitHub
	- To avoid conflicts, always pull from main before starting your work:

git checkout main
git pull origin main
git checkout your-branch
git merge main   # or rebase if preferred


⸻

🧩 Git Concepts Summary
	- pull = Fetches changes from a remote branch and merges them into your current local branch
(Only affects main unless you’re on a different branch; your changes on your branch are safe)
	- fetch = Downloads changes from the remote repository without modifying your local branches
	- merge = Combines changes from one branch into your current branch
	- fetch + merge = pull!
	- commit = Saves changes to the local repository (a version snapshot)
	- push = Uploads your committed changes to the remote repository
	- branch = A separate line of development; allows multiple people to work on different features/files independently

⸻
