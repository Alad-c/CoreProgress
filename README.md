# 💪 CoreProgress | Fitness & Activity Tracker

CoreProgress is a full-stack web application designed to track physical activities, visualize progress, and manage workout logs. The project emphasizes responsive UI and a robust cloud-based backend architecture.

## ✨ Features
* **Interactive Analytics (New):** Visual data representation of user activity distribution using Chart.js.
* **Squash Match & Rivals Stats (New):** Keep score of current matches, record opponent names, and track advanced win/loss statistics against specific rivals.
* **Street Workout:** Track the number of sets and use a built-in rest timer (3 minutes).
* **Running:** Log 5km runs and track progress towards a 20km weekly goal.
* **User Authentication:** Secure registration and login system with password hashing.
* **Leaderboard & Personal History:** View the Top 5 athletes globally and track your own chronological workout log.

## 🛠️ Technologies Used
* **Frontend:** HTML5, CSS3, Vanilla JavaScript, Chart.js
* **Backend:** Node.js, Express.js
* **Database:** PostgreSQL (hosted on Supabase)
* **Security:** bcrypt (for password hashing)
* **Deployment:** Render

## 🚀 How to Run Locally

1. Clone the repository:
   ```bash
   git clone [https://github.com/Alad-c/CoreProgress.git](https://github.com/Alad-c/CoreProgress.git)
2. Install dependencies: npm install
3. Set up the Database Connection:
Since the app uses PostgreSQL, you need to provide a connection string. Set the environment variable DATABASE_URL in your terminal or use a .env file before running.
(Note: For the academic review, the live version on Render is fully configured and operational).
4. Start the server: node server.js
5. Open your browser and go to http://localhost:3000

   Developed by Vladyslav Holub
