# WebProgramming25-1

This repository is for collaborative work in the **Web Programming (Spring 2025)** course.

📌 Please read this README and **create your personal branch** from the `main` branch.  
If you have any questions, feel free to contact the team leader or the instructor.

---

## ✅ Branching Guide (main → personal branch)

### 1️⃣ Clone the repository

git clone https://github.com/yg2127/DL_study.git  
cd DL_study

### 2️⃣ Switch to `main` and update it

git checkout main  
git pull origin main

### 3️⃣ Create and push your personal branch

git checkout -b yourname   # e.g., minji  
git push -u origin yourname

- `-b` creates a new branch  
- `-u` sets upstream tracking to the remote branch

---

## 🧠 Collaboration Tips

- ❌ **Do NOT push directly to `main`**
- ✅ Use **Pull Requests (PRs)** to merge changes into `main`
- 🔄 Before starting any work, **always sync with the latest `main`** to avoid conflicts:

git checkout main  
git pull origin main  
git checkout your-branch  
git merge main   # or use rebase if preferred

---

## 🧩 Git Concepts Summary

| Command         | Description                                                                 |
|-----------------|-----------------------------------------------------------------------------|
| pull            | Fetches and merges changes from the remote branch into your current branch |
| fetch           | Downloads changes from the remote branch without applying them locally     |
| merge           | Merges changes from another branch into your current branch                |
| commit          | Saves your current changes to the local repository                         |
| push            | Uploads your local commits to the remote repository                        |
| branch          | Creates a separate line of development for isolated work                   |

---