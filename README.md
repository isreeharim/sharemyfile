# ⚡ ShareMyFile

**ShareMyFile** is a high-speed, local Wi-Fi file and text sharing platform that allows direct, seamless data transfer between **Laptops, iPhones, iPads, and Android devices** connected to the same Wi-Fi network.

Deployable to **Vercel** (`share.sreeharim.site`) as a lightweight gateway bridge, or runnable locally via Node.js. 

> **How it works with Vercel:** The website serves only as a lightweight bridge/gateway (using ~0% of Vercel free credits). When two devices on the same Wi-Fi connect, file transfers happen **100% directly through your local Wi-Fi router** over encrypted WebRTC DataChannels at full LAN speeds (50–100+ MB/s). No files ever touch the cloud!

---

## ✨ Features

- 📱 **Zero Mobile Installation**: Any phone (iPhone or Android) on the same Wi-Fi opens the app directly in Safari or Chrome by scanning an on-screen QR code.
- ⚡ **Full Wi-Fi Speed (WebRTC LAN P2P)**: Streams files directly over your local router at full LAN speeds (30–100+ MB/s) with no file size limits (supports 4K videos, raw photos, large zip files).
- 📡 **Architectural Network Radar**: Live visual detection of nearby connected devices with platform badges (iPhone, Android, Mac, Windows).
- 💬 **Quick Text & Link Sync**: Instant clipboard, code snippet, and link sharing between phone and PC with 1-click copy.
- 🛡️ **Transfer Security & Approvals**: Optional recipient confirmation prompt before receiving files.
- 🎨 **Collegecentre Editorial Aesthetic**: Vermilion (`#fe7141`) brand accents, hairline architectural grid (`BackgroundGrid`), monospace typography, and light/dark theme switcher.
- ☁️ **1-Click Vercel Deployment**: Configured with `vercel.json` for instant zero-config deployment to Vercel and custom domains like `share.sreeharim.site`.

---

## 🚀 Deployment to Vercel (`share.sreeharim.site`)

1. Push your repository to GitHub:
   ```bash
   git add .
   git commit -m "feat: collegecentre theme and webrtc p2p local wifi transfers"
   git push origin main
   ```
2. In your [Vercel Dashboard](https://vercel.com):
   - Click **Add New Project** & import `isreeharim/sharemyfile`.
   - Vercel automatically detects the Vite configuration via `vercel.json`.
   - Click **Deploy**.
3. Under **Project Settings &rarr; Domains**, add your custom domain: `share.sreeharim.site`.
4. Open `https://share.sreeharim.site` on your laptop and scan the QR code with your phone!

---

## 💻 Running Locally

### Option 1: Double-Click Launcher (Windows)
Double-click `run.bat` in the project root folder.

### Option 2: Command Line
```bash
# Start local server
npm start
```

### Development Mode (with Live Reloading)
```bash
# Terminal 1: Backend
npm run dev:server

# Terminal 2: Frontend
npm run dev:client
```

---

## 📲 How to Connect Mobile Devices (iPhone / Android)

1. Make sure your phone is connected to the **same Wi-Fi network** as your computer.
2. Open the web app on your laptop or view the terminal QR code.
3. Open your phone's standard **Camera app** (or QR scanner).
4. Tap the link to open the matching room.
5. That's it! Both devices discover each other instantly on your radar.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS v4, Lucide Icons, Canvas Confetti, PeerJS (WebRTC DataChannels).
- **Theme**: Collegecentre architectural hairline grid & Vermilion editorial styling.
- **Local Server (Optional)**: Node.js, Express 5, WebSockets (`ws`), Multer.
- **Deployment**: Vercel Static Edge CDN (`vercel.json`).
