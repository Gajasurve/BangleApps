// Bangle.js 2 Panchang Watch Face - Final Version
// Battery optimized, clean design
// Features: Time, Date, Tithi, Next Ekadashi, Vishnu Sahasranama name

const Storage = require("Storage");

let panchangData;
let tithiTimeout;
let currentVishnu = "Vishvam";
let currentMasa = "Margashirsha";

// Sample panchang data for testing (will be replaced with real data from JSON)
const SAMPLE_DATA = {
  tithi: [
    { start: "00:00", name: "Panchami", type: "Shukla", nature: "Purna" },
    { start: "14:30", name: "Saptami", type: "Krishna", nature: "Bhadra" }
  ],
  vara: { lord: "SA" },
  masa: "Margashirsha"
};

// Colors
const COLORS = {
  widget: "#FFFFFF",
  masa: "#FFA500",      // Orange
  time: "#FF9933",      // Saffron
  date: "#FFFFFF",      // White
  tithi: "#FFFFFF",     // White
  vishnu: "#FFD700",    // Golden
  ekTop: "#FF6B6B",     // Red
  ekRight: "#4ECDC4",   // Cyan
  ekBottom: "#FFD93D",  // Yellow
  ekLeft: "#95E1D3",    // Green
  ekNumber: "#FFFFFF"   // White number
};

// Tithi name to number mapping
const TITHI_NUM = {
  "Pratipada": 1, "Dwitiya": 2, "Tritiya": 3, "Chaturthi": 4,
  "Panchami": 5, "Shashthi": 6, "Saptami": 7, "Ashtami": 8,
  "Navami": 9, "Dashami": 10, "Ekadashi": 11, "Dwadashi": 12,
  "Trayodashi": 13, "Chaturdashi": 14, "Purnima": 15, "Amavasya": 30
};

// Tithi nature mapping based on number
const TITHI_NATURE = {
  1: "Nan", 6: "Nan", 11: "Nan",  // Nanda
  2: "Bhd", 7: "Bhd", 12: "Bhd",  // Bhadra
  3: "Jay", 8: "Jay", 13: "Jay",  // Jaya
  4: "Rkt", 9: "Rkt", 14: "Rkt",  // Rikta
  5: "Prn", 10: "Prn", 15: "Prn", 30: "Prn"  // Purna
};

function loadTodayData() {
  let today = new Date().toISOString().slice(0, 10);
  let json = Storage.readJSON("panchang-2025.json", 1);
  
  if (!json || !json[today]) {
    return SAMPLE_DATA;
  }
  return json[today];
}

function getCurrentSlot(slots) {
  let now = new Date();
  let curMin = now.getHours() * 60 + now.getMinutes();
  let idx = -1;
  
  for (let i = 0; i < slots.length; i++) {
    let parts = slots[i].start.split(":");
    let h = parseInt(parts[0]), m = parseInt(parts[1]);
    let slotMin = h * 60 + m;
    if (slotMin <= curMin) idx = i;
  }
  
  if (idx === -1) idx = slots.length - 1;
  return { idx: idx, slot: slots[idx] };
}

function scheduleNextChange(slots, handler) {
  let now = new Date();
  let curMin = now.getHours() * 60 + now.getMinutes();

  let next = slots
    .map(s => {
      let parts = s.start.split(":");
      let h = parseInt(parts[0]), m = parseInt(parts[1]);
      let t = h * 60 + m;
      if (t <= curMin) t += 24 * 60;
      return { timeMin: t, s: s };
    })
    .sort((a, b) => a.timeMin - b.timeMin)[0];

  let diffMs = (next.timeMin - curMin) * 60 * 1000;
  return setTimeout(handler, diffMs + 500);
}

function findNextEkadashi(tithiSlots) {
  let now = new Date();
  let curMin = now.getHours() * 60 + now.getMinutes();
  
  for (let i = 0; i < tithiSlots.length; i++) {
    if (tithiSlots[i].name === "Ekadashi") {
      let parts = tithiSlots[i].start.split(":");
      let h = parseInt(parts[0]), m = parseInt(parts[1]);
      let slotMin = h * 60 + m;
      
      if (slotMin > curMin) {
        return 0;
      }
    }
  }
  
  // Check future days in panchang data
  // For now, return sample value
  // TODO: Implement proper multi-day lookup
  return 5;
}

function formatTithi(slot) {
  let paksha = slot.type.charAt(0).toUpperCase();
  let num = TITHI_NUM[slot.name] || "?";
  
  // Get nature from mapping if not provided
  let nature = slot.nature || TITHI_NATURE[num] || "---";
  if (nature.length > 3) nature = nature.substring(0, 3);
  
  return paksha + num + "(" + nature + ")";
}

function getVishnuNameOfDay() {
  // Get day of year (1-365/366)
  let now = new Date();
  let start = new Date(now.getFullYear(), 0, 0);
  let diff = now - start;
  let oneDay = 1000 * 60 * 60 * 24;
  let dayOfYear = Math.floor(diff / oneDay);
  
  // Load Vishnu names from storage
  let names = Storage.readJSON("vishnu-1000.json", 1);
  if (!names || !Array.isArray(names)) {
    return currentVishnu; // Fallback to current
  }
  
  // Cycle through 1000 names using day of year
  let index = (dayOfYear - 1) % names.length;
  return names[index];
}

// Vibrate watch on 30 min and hour marks
function setupVibrationAlerts() {
  setInterval(() => {
    let now = new Date();
    let min = now.getMinutes();
    
    if (min === 0) {
      // On the hour - longer vibration
      Bangle.buzz(200, 0.5).then(() => {
        return new Promise(resolve => setTimeout(resolve, 100));
      }).then(() => {
        return Bangle.buzz(200, 0.5);
      });
    } else if (min === 30) {
      // On 30 minutes - single short vibration
      Bangle.buzz(150, 0.4);
    }
  }, 60000); // Check every minute
}

function drawWidgets() {
  g.setColor("#000000");
  g.fillRect(0, 0, 176, 22);
  
  g.setColor(COLORS.widget);
  g.setFont("6x8", 2);
  
  let batt = E.getBattery();
  g.setFontAlign(0, -1);
  g.drawString(batt + "%", 44, 2);
  
  let steps = (Bangle.getHealthStatus("day").steps || 0);
  g.setFontAlign(0, -1);
  g.drawString(steps, 132, 2);
}

function drawMasa() {
  g.setColor("#000000");
  g.fillRect(0, 24, 176, 44);
  
  g.setColor(COLORS.masa);
  g.setFont("6x8", 2);
  g.setFontAlign(0, -1);
  g.drawString(currentMasa, 88, 26);
}

function drawTimeAndDate() {
  let now = new Date();
  
  g.setColor("#000000");
  g.fillRect(0, 60, 176, 110);
  
  // TIME
  let h = ("0" + now.getHours()).substr(-2);
  let m = ("0" + now.getMinutes()).substr(-2);
  let timeStr = h + ":" + m;
  
  g.setColor(COLORS.time);
  g.setFont("Vector", 50);
  g.setFontAlign(0, 0);
  g.drawString(timeStr, 88, 74);
  
  // DATE
  let d = new Date();
  let day = d.getDate();
  let suffix = "th";
  if (day === 1 || day === 21 || day === 31) suffix = "st";
  else if (day === 2 || day === 22) suffix = "nd";
  else if (day === 3 || day === 23) suffix = "rd";
  
  let month = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()];
  let dateStr = day + suffix + " " + month;
  
  g.setColor(COLORS.date);
  g.setFont("6x8", 2);
  g.setFontAlign(0, -1);
  g.drawString(dateStr, 88, 97);
}

function drawTithiAndEkadashi() {
  g.setColor("#000000");
  g.fillRect(0, 115, 176, 145);
  
  // Tithi
  let tithiCur = getCurrentSlot(panchangData.tithi);
  let tithiText = formatTithi(tithiCur.slot);
  
  g.setColor(COLORS.tithi);
  g.setFont("Vector", 20);
  g.setFontAlign(-1, 0);
  g.drawString(tithiText, 10, 130);
  
  // Ekadashi box
  let daysToEkadashi = findNextEkadashi(panchangData.tithi);
  let boxX = 135, boxY = 117, boxW = 32, boxH = 26;
  
  g.setColor("#000000");
  g.fillRect(boxX, boxY, boxX + boxW, boxY + boxH);
  
  // 4-color border
  g.setColor(COLORS.ekTop);
  g.fillRect(boxX, boxY, boxX + boxW, boxY + 2);
  
  g.setColor(COLORS.ekRight);
  g.fillRect(boxX + boxW - 2, boxY, boxX + boxW, boxY + boxH);
  
  g.setColor(COLORS.ekBottom);
  g.fillRect(boxX, boxY + boxH - 2, boxX + boxW, boxY + boxH);
  
  g.setColor(COLORS.ekLeft);
  g.fillRect(boxX, boxY, boxX + 2, boxY + boxH);
  
  // Number
  g.setColor(COLORS.ekNumber);
  g.setFont("Vector", 16);
  g.setFontAlign(0, 0);
  g.drawString(daysToEkadashi.toString(), boxX + 16, boxY + 13);
}

function drawVishnuName(name) {
  g.setColor("#000000");
  g.fillRect(0, 150, 176, 175);
  
  g.setColor(COLORS.vishnu);
  g.setFont("6x8", 2);
  g.setFontAlign(0, 0);
  g.drawString(name, 88, 162);
}

function redrawAll() {
  g.clear();
  
  drawWidgets();
  drawMasa();
  drawTimeAndDate();
  drawTithiAndEkadashi();
  drawVishnuName(currentVishnu);
}

function updateTithi() {
  drawTithiAndEkadashi();
  drawVishnuName(currentVishnu);
  tithiTimeout = scheduleNextChange(panchangData.tithi, updateTithi);
}

function init() {
  g.clear();
  
  // Battery-optimized settings
  Bangle.setOptions({ 
    wakeOnTwist: true,
    twistThreshold: 600,    // Sensitive twist
    twistMaxY: -600,
    twistTimeout: 1000
  });
  
  // Screen off after 5 seconds to save battery
  Bangle.setLCDTimeout(5);
  
  Bangle.setUI();

  // Load panchang data
  panchangData = loadTodayData();
  
  if (panchangData.masa) {
    currentMasa = panchangData.masa;
  }
  
  // Load Vishnu name for today
  currentVishnu = getVishnuNameOfDay();
  
  redrawAll();
  
  // Setup auto-update when tithi changes
  tithiTimeout = scheduleNextChange(panchangData.tithi, updateTithi);
  
  // Update time and widgets every minute (battery efficient)
  setInterval(() => {
    drawWidgets();
    drawTimeAndDate();
  }, 60000);
  
  // Setup vibration alerts for 30 min and hour
  setupVibrationAlerts();
  
  // Update at midnight
  E.on("midnight", () => {
    panchangData = loadTodayData();
    if (panchangData.masa) currentMasa = panchangData.masa;
    currentVishnu = getVishnuNameOfDay();
    redrawAll();
  });
  
  // Exit on button press
  setWatch(() => load(), BTN1, { edge: "rising", repeat: false });
}

// Start the watchface
init();
