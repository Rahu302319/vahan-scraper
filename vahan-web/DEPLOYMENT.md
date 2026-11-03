# 🚀 Deployment Guide — Vahan 4 Dashboard (Next.js)

This Next.js web application is built to be deployed on any modern cloud hosting platform: **Vercel**, **Netlify**, **Railway**, **Render**, or **Docker (Cloud Run / AWS / VPS)**.

---

## Option 1: Deploy to Vercel (Recommended)

Vercel is the creator of Next.js and provides zero-config, global deployment with automatic HTTPS.

### Method A: Via Vercel CLI (Fastest)

1. Open PowerShell or terminal in the `vahan-web` folder:
   ```powershell
   cd "c:\Users\Rah\Desktop\NEW VAHAN\vahan-web"
   ```
2. Run:
   ```powershell
   npx vercel
   ```
3. Follow the simple prompts:
   - Set up and deploy? **Yes**
   - Which scope? **Your Account**
   - Link to existing project? **No**
   - What's your project's name? **vahan-kerala-scraper**
   - In which directory is your code located? **./**
   - Want to modify settings? **No**
4. Deploy to production:
   ```powershell
   npx vercel --prod
   ```
5. You will get an instant live production URL: e.g. `https://vahan-kerala-scraper.vercel.app`!

### Method B: Via GitHub / GitLab Import

1. Push your code or the `vahan-web` folder to a GitHub repository:
   ```powershell
   git init
   git add .
   git commit -m "Initial Vahan Next.js application"
   git branch -M main
   git remote add origin https://github.com/<your-username>/vahan-kerala-scraper.git
   git push -u origin main
   ```
2. Go to [vercel.com/new](https://vercel.com/new) and log in.
3. Select your repository and click **Import**.
4. If `vahan-web` is in a subfolder, set **Root Directory** to `vahan-web`.
5. Click **Deploy**!

---

## Option 2: Deploy to Netlify

Netlify officially supports Next.js 14 App Router. A pre-configured `netlify.toml` file is included in `vahan-web`.

### Method A: Via Netlify CLI (Fastest)

1. Open PowerShell in `vahan-web`:
   ```powershell
   cd "c:\Users\Rah\Desktop\NEW VAHAN\vahan-web"
   ```
2. Run Netlify CLI directly:
   ```powershell
   npx netlify deploy --build
   ```
3. Follow the prompt to log in and select **Create & configure a new site**.
4. When tested, publish to production:
   ```powershell
   npx netlify deploy --prod
   ```
5. You will get a live URL (e.g. `https://vahan-kerala-scraper.netlify.app`).

### Method B: Via Git / GitHub

1. Push your repository to GitHub:
   ```powershell
   cd "c:\Users\Rah\Desktop\NEW VAHAN\vahan-web"
   git init
   git add .
   git commit -m "Deploy Vahan Scraper to Netlify"
   git branch -M main
   git remote add origin https://github.com/<your-username>/vahan-kerala-scraper.git
   git push -u origin main
   ```
2. Log into [app.netlify.com](https://app.netlify.com).
3. Click **Add new site** -> **Import an existing project** -> **GitHub**.
4. Select your repository.
5. Netlify will auto-detect Next.js and read `netlify.toml`:
   - **Build command**: `npm run build`
   - **Publish directory**: `.next`
6. Click **Deploy Site**!

---

## Option 3: Deploy to Railway / Render

Both Railway and Render support instant deployment using the included `Dockerfile` or native Node.js runtime.

### On Railway:
1. Go to [railway.app](https://railway.app) and create a new project.
2. Select **Deploy from GitHub repo**.
3. Select this repository.
4. Railway will automatically detect the `Dockerfile` and deploy the application.
5. In **Settings -> Networking**, click **Generate Domain** to get your public URL.

### On Render:
1. Go to [render.com](https://render.com) and create a **New Web Service**.
2. Connect your GitHub repository.
3. Select **Docker** or **Node**:
   - Build Command: `npm run build`
   - Start Command: `npm start`
4. Click **Create Web Service**.

---

## Option 3: Deploy with Docker (Cloud Run, AWS, DigitalOcean, VPS)

A multi-stage production `Dockerfile` is included in this repository.

1. **Build the Docker Image**:
   ```powershell
   docker build -t vahan-kerala-scraper:latest .
   ```

2. **Run Locally or on a Server**:
   ```powershell
   docker run -d -p 3000:3000 --name vahan-app vahan-kerala-scraper:latest
   ```
   Open `http://localhost:3000` in your browser.

3. **Deploy to Google Cloud Run**:
   ```powershell
   gcloud run deploy vahan-kerala-scraper \
     --source . \
     --platform managed \
     --region asia-south1 \
     --allow-unauthenticated
   ```

---

## Features & Endpoints

- **`GET /api/rtos?state=KL`**: Dynamically queries the Vahan portal to return all 87 Kerala RTOs.
- **`POST /api/scrape-rto`**: Fetches Maker Month-Wise vehicle registration data for a single RTO with dynamic JSF component ID resolution and auto-retry.
- **`POST /api/export-master`**: Consolidates all fetched RTOs into a 3-sheet Excel workbook (`All_Kerala_Data`, `RTO_Summary`, `Maker_Market_Share`) and downloads it directly to your browser.

