# RS Stock Management - Deployment Guide

## 🚀 Quick Start

### Option 1: Web App (Development)
```bash
cd "c:\Users\hp\Desktop\RS Stock"
npm run dev
```
- Opens at `http://localhost:5173` (or next available port)
- Ideal for: Local network access, cloud hosting, mobile browsers

### Option 2: Desktop App (Development)
```bash
# Terminal 1: Start Vite dev server
npm run dev

# Terminal 2: Start Electron app
npm run dev:electron
```
- Launches native desktop window
- Ideal for: Standalone Windows/Mac/Linux application

---

## 📦 Production Builds

### Build Web App for Hosting
```bash
npm run build
```
**Output:** `dist/` folder
- Deploy to: Netlify, Vercel, GitHub Pages, AWS, Azure, shared server
- No installation needed - just open in browser
- File size: ~100-200 KB (compressed)

### Build Desktop App (Windows)
```bash
npm run build:electron
```
**Output:** 
- `dist/RS-Stock-0.1.0.exe` (Portable - single file executable)
- `dist/RS Stock Setup 0.1.0.exe` (Installer - traditional setup)

**Features:**
- ✅ Standalone executable
- ✅ Auto-update ready
- ✅ Desktop shortcuts
- ✅ Start menu integration
- ✅ File size: ~150-200 MB (includes Electron runtime)

---

## 🌐 Deployment Options

### 1. Web Hosting (Recommended for Multi-user)
```bash
# Build
npm run build

# Upload 'dist' folder to:
# - Netlify (drag & drop)
# - Vercel (git integration)
# - GitHub Pages (static site)
# - AWS S3 + CloudFront
# - Traditional web server
```

### 2. Desktop Distribution (Recommended for Standalone)
```bash
npm run build:electron

# Share the .exe file or setup installer
# Users can run directly without installation
```

### 3. Hybrid: Both Web + Desktop
```bash
# Build both
npm run build
npm run build:electron

# Deploy:
# - 'dist' folder to web hosting
# - .exe files as release downloads
```

---

## 🔧 Configuration

### Change App Version
Edit `package.json`:
```json
"version": "0.2.0"
```

### Change App Name
Edit `package.json`:
```json
"displayName": "My Stock App"
```

### Add App Icon
Place `icon.png` (512x512) in `public/` folder
Then update `package.json` build → win → icon

### Change Window Size (Desktop)
Edit `electron.js`:
```javascript
width: 1400,  // Desktop window width
height: 900   // Desktop window height
```

---

## 📊 Current Capabilities

✅ **Stock Management**: Add/edit/delete items with categories
✅ **Daily Transactions**: Track stock in/out
✅ **User Roles**: Admin and Staff permissions
✅ **Reports**: Export as PNG (high quality) or PDF (A4 formatted)
✅ **Data Persistence**: Local storage (localStorage)
✅ **Responsive**: Works on desktop, tablet, mobile

---

## ⚙️ Development Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Start Vite dev server (web) |
| `npm run dev:electron` | Start Electron app (desktop dev) |
| `npm run build` | Build for web production |
| `npm run build:electron` | Build for desktop production |
| `npm run preview` | Preview production build locally |
| `npm run test` | Run unit tests |

---

## 🔐 Security Notes

## 💾 Storage Notes (Web)

### What “updates won’t affect storage” means
When you deploy a new version to Vercel, existing data in the same browser/profile is not deleted automatically.
Data is saved in the browser under stable keys (see `src/utils/localStore.js`).

### Important limitation
Browser storage can still be cleared by:
- Clearing site data / cache
- Incognito/private windows
- Browser policies, profile resets, or OS cleanup tools

### Recommendation
Use the built-in Backup/Export regularly if the data is important.

---

**Current (Local-only):**
- ✅ Client-side only (no server)
- ✅ All data in localStorage (web) or via desktop bridge (Electron)
- ⚠️ Passwords stored plaintext (simple local login)

**For Production (Recommended):**
1. **Add Backend**: Node.js + Express + MongoDB
   - Server-side authentication
   - Data persistence
   - Multi-device sync
   - Password hashing

2. **Use HTTPS**: Required for web deployment

3. **Add Database**: Not just localStorage

4. **Implement JWT**: For secure user sessions

---

## 📱 Browser Support

✅ Chrome, Edge (latest)
✅ Firefox (latest)
✅ Safari (latest)
✅ Mobile browsers

---

## 🚢 Vercel Workflow (Deploy only when you say)

Goal: use localhost for testing, and update the Vercel site only when you intentionally deploy.

1. In Vercel Project Settings → Git:
   - Set **Production Branch** to `release`
2. Development flow:
   - Work locally and test on `http://localhost:5173` with `npm run dev`
3. Deploy flow:
   - Merge/Push changes to the `release` branch → Vercel deploys production
4. Optional (recommended):
   - Use Pull Requests to get Preview Deployments before merging to `release`

---

## 🎯 Next Steps

### For Web App:
1. Add Node.js backend for data sync
2. Deploy to Netlify/Vercel
3. Set up custom domain
4. Add authentication server

### For Desktop App:
1. Code signing (for Windows SmartScreen bypass)
2. Auto-update mechanism
3. Offline capability (already works)
4. Native menus

---

## 📞 Support

For issues with deployment:
- Check Vite docs: https://vitejs.dev
- Check Electron docs: https://www.electronjs.org
- Check electron-builder: https://www.electron.build
