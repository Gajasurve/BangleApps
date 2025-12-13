# Panchang App - Installation Guide

## 📦 BangleApps Format Structure

Your Panchang watchface is now properly formatted as a BangleApps application!

```
panchang_app/
├── metadata.json         # App metadata for BangleApps loader
├── app.js               # Main watchface code
├── panchang-data.json   # Panchang data (Dec 2025 + Full 2026)
├── vishnu-names.json    # Vishnu Sahasranama names
├── panchang.img         # App icon (heatshrink compressed)
├── panchang.png         # App icon (PNG for reference)
├── interface.html       # Settings page (optional)
├── README.md            # App documentation
└── ChangeLog            # Version history
```

## 🚀 Installation Methods

### Method 1: Via BangleApps App Loader (Recommended)

**To add to official BangleApps:**

1. Fork https://github.com/espruino/BangleApps
2. Create folder `apps/panchang/`
3. Copy all files from `panchang_app/` into it
4. Create pull request

**To use your own App Loader:**

1. Fork https://github.com/espruino/BangleApps
2. Create folder `apps/panchang/`
3. Copy all files into it
4. Your app loader will be at: `https://YOUR_USERNAME.github.io/BangleApps/`
5. Connect watch and install from your app loader

### Method 2: Manual Upload (Quick & Easy)

**Step 1: Connect to Web IDE**
- Go to https://banglejs.com/ide/
- Connect your Bangle.js 2

**Step 2: Upload Main App**
1. Open `app.js`
2. Copy all code
3. Paste in IDE (right side)
4. Click **Storage** icon (looks like discs, top right)
5. Click "Upload a file"
6. Name it: `panchang.app.js`
7. Paste the code and save

**Step 3: Upload Data Files**
1. Still in Storage view
2. Upload `panchang-data.json` → save as `panchang-2025.json`
3. Upload `vishnu-names.json` → save as `vishnu-1000.json`

**Step 4: Set as Clock**
1. In Storage, find `panchang.app.js`
2. Rename to `panchang.boot.js` (makes it default clock)
3. Reboot watch (long-press BTN1+BTN2)

Done! Your Panchang clock is now running!

### Method 3: Via Loader HTML (Advanced)

If you want to create a standalone installer:

1. Create a simple HTML page with App Loader code
2. Reference your JSON files
3. Host on GitHub pages
4. Install directly from web

## 📝 File Size Requirements

Bangle.js storage limits:
- Filename: Max 28 characters ✅
- Total storage: ~4MB available
- Our app uses: ~85KB total

**Files:**
- app.js: ~9KB
- panchang-2025.json: 75KB
- vishnu-1000.json: 1.5KB
- Totall: ~85.5KB ✅ (Well within limits!)

## 🔧 Customizing the App

### Change App ID (if needed):
In `metadata.json`, change `"id": "panchang"` to your unique 7-char ID

### Update Data:
- Replace `panchang-data.json` with updated panchang
- Replace `vishnu-names.json` with more names (up to 1000)

### Modify Settings:
Edit `interface.html` to add more settings options

## 📱 App Behavior

**On Install:**
- Uploads app.js as `panchang.app.js`
- Uploads panchang data as `panchang-2025.json`
- Uploads Vishnu names as `vishnu-1000.json`
- Creates app icon

**On Run:**
- Loads widgets
- Reads panchang data from storage
- Displays current time, tithi, and Vishnu name
- Auto-updates at tithi changes and midnight

**On Uninstall:**
- Removes all app files
- Optionally removes data files (panchang-2025.json, vishnu-1000.json)

## 🎯 Testing Before Upload

**In Web IDE:**
```javascript
// Test if files load correctly
var panchang = Storage.readJSON("panchang-2025.json", 1);
console.log(panchang["2025-12-13"]);

var names = Storage.readJSON("vishnu-1000.json", 1);
console.log(names[0]);
```

## 📤 Publishing Your App

If you want to share this app with others:

1. Create folder in BangleApps repo: `apps/panchang/`
2. Add all files
3. Create pull request
4. After merge, anyone can install from https://banglejs.com/apps/

## 🐛 Troubleshooting

**App doesn't appear in launcher:**
- Check filename is `panchang.app.js` (not `.boot.js` for launcher visibility)
- Or use `.boot.js` to make it default clock

**"No Panchang data" error:**
- Verify `panchang-2025.json` is in Storage
- Check JSON format is valid
- Ensure today's date exists in JSON

**Vishnu name doesn't change:**
- Check `vishnu-1000.json` is uploaded
- Verify it's a valid JSON array

## 📚 References

- [BangleApps Documentation](https://github.com/espruino/BangleApps)
- [Creating Apps](https://www.espruino.com/Bangle.js+App+Loader)
- [App Loader Custom](https://www.espruino.com/Bangle.js+App+Loader+Custom)

Jai Shri Vishnu! 🙏 🚩
