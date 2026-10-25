# Central Game Station - Admin Portal

This is the standalone **Central Game Station** website for viewing all student scores, downloading Excel sheets, inspecting 17-goal breakdowns, and managing student entries for the UN Sustainable Development Goals Challenge.

---

## 🚀 How to Host this Website on Vercel (Separate Website)

Follow these simple steps to deploy this Central Game Station as its own independent website:

### Step 1: Create a New GitHub Repository
1. Go to [github.com/new](https://github.com/new).
2. Name the repository (e.g. `central-game-station` or `sdg-admin`).
3. Set it to **Public** and click **Create repository**.

### Step 2: Push this folder to GitHub
Open your terminal and run:
```powershell
cd C:\Users\Sripriyan\.gemini\antigravity\scratch\central-game-station
git init
git add .
git commit -m "Initial commit for Central Game Station"
git branch -M main
git remote add origin <YOUR_NEW_GITHUB_REPO_URL>
git push -u origin main
```

### Step 3: Deploy on Vercel
1. Go to [vercel.com](https://vercel.com) and log in.
2. Click **Add New > Project**.
3. Select your new `central-game-station` repository and click **Deploy**.
4. You will get a live URL (e.g. `https://central-game-station.vercel.app`)!

---

## ⚡ Connecting Game & Central Station across Devices
Both websites communicate in real time via a free Google Firebase Realtime Database:
1. Go to [console.firebase.google.com](https://console.firebase.google.com) and create a free project.
2. Click **Build > Realtime Database > Create Database**.
3. Select **Start in test mode** (allows instant read & write).
4. Copy your database URL (e.g. `https://your-project-default-rtdb.firebaseio.com`).
5. In **Central Game Station**, click **⚙️ Cloud DB Settings** and paste the URL.
6. In **SDG Game**, open `script.js` and paste the same URL at the top (Line 15).
