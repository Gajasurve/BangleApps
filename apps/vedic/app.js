// Vedic Panchang Clock for Bangle.js 2
// Battery optimized Hindu calendar watchface
// Shows: Time, Date, Masa, Tithi, Ekadashi, Vishnu Sahasranama

const Storage = require("Storage");

let panchangData;
let tithiTimeout;
let currentVishnu = "Vishvam";
let currentMasa = "Margashirsha";

const SAMPLE_DATA = {
  tithi: [
    { start: "00:00", name: "Panchami", type: "Shukla", nature: "Prn" }
  ],
  masa: "Margashirsha"
};

const COLORS = {
  widget: "#FFFFFF",
  masa: "#FFA500",
  time: "#FF9933",
  date: "#FFFFFF",
  tithi: "#FFFFFF",
  vishnu: "#FFD700",
  ekTop: "#FF6B6B",
  ekRight: "#4ECDC4",
  ekBottom: "#FFD93D",
  ekLeft: "#95E1D3",
  ekNumber: "#FFFFFF"
};

const TITHI_NUM = {
  "Pratipada": 1, "Dwitiya": 2, "Tritiya": 3, "Chaturthi": 4,
  "Panchami": 5, "Shashthi": 6, "Saptami": 7, "Ashtami": 8,
  "Navami": 9, "Dashami": 10, "Ekadashi": 11, "Dwadashi": 12,
  "Trayodashi": 13, "Chaturdashi": 14, "Purnima": 15, "Amavasya": 30
};

const TITHI_NATURE = {
  1: "Nan", 6: "Nan", 11: "Nan",
  2: "Bhd", 7: "Bhd", 12: "Bhd",
  3: "Jay", 8: "Jay", 13: "Jay",
  4: "Rkt", 9: "Rkt", 14: "Rkt",
  5: "Prn", 10: "Prn", 15: "Prn", 30: "Prn"
};

function loadTodayData() {
  let today = new Date().toISOString().slice(0, 10);
  let json = Storage.readJSON("vedic-data.json", 1);
  
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
  return 5;
}

function formatTithi(slot) {
  let paksha = slot.type.charAt(0).toUpperCase();
  let num = TITHI_NUM[slot.name] || "?";
  let nature = slot.nature || TITHI_NATURE[num] || "---";
  if (nature.length > 3) nature = nature.substring(0, 3);
  return paksha + num + "(" + nature + ")";
}

function getVishnuNameOfDay() {
  let now = new Date();
  let start = new Date(now.getFullYear(), 0, 0);
  let diff = now - start;
  let oneDay = 1000 * 60 * 60 * 24;
  let dayOfYear = Math.floor(diff / oneDay);
  
  let names = Storage.readJSON("vedic-names.json", 1);
  if (!names || !Array.isArray(names)) {
    return currentVishnu;
  }
  
  let index = (dayOfYear - 1) % names.length;
  return names[index];
}

function scheduleNextVibration() {
  let now = new Date();
  let minInHour = now.getMinutes();
  let nextVibMin;
  
  if (minInHour < 30) {
    nextVibMin = 30 - minInHour;
  } else {
    nextVibMin = 60 - minInHour;
  }
  
  let msUntilVib = nextVibMin * 60 * 1000;
  
  setTimeout(() => {
    let m = new Date().getMinutes();
    
    if (m === 0) {
      Bangle.buzz(200, 0.5).then(() => {
        return new Promise(resolve => setTimeout(resolve, 100));
      }).then(() => {
        return Bangle.buzz(200, 0.5);
      });
    } else if (m === 30) {
      Bangle.buzz(150, 0.4);
    }
    
    scheduleNextVibration();
  }, msUntilVib);
}

function setupVibrationAlerts() {
  scheduleNextVibration();
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
  
  let h = ("0" + now.getHours()).substr(-2);
  let m = ("0" + now.getMinutes()).substr(-2);
  let timeStr = h + ":" + m;
  
  g.setColor(COLORS.time);
  g.setFont("Vector", 50);
  g.setFontAlign(0, 0);
  g.drawString(timeStr, 88, 74);
  
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
  
  let tithiCur = getCurrentSlot(panchangData.tithi);
  let tithiText = formatTithi(tithiCur.slot);
  
  g.setColor(COLORS.tithi);
  g.setFont("Vector", 20);
  g.setFontAlign(-1, 0);
  g.drawString(tithiText, 10, 130);
  
  let daysToEkadashi = findNextEkadashi(panchangData.tithi);
  let boxX = 135, boxY = 117, boxW = 32, boxH = 26;
  
  g.setColor("#000000");
  g.fillRect(boxX, boxY, boxX + boxW, boxY + boxH);
  
  g.setColor(COLORS.ekTop);
  g.fillRect(boxX, boxY, boxX + boxW, boxY + 2);
  
  g.setColor(COLORS.ekRight);
  g.fillRect(boxX + boxW - 2, boxY, boxX + boxW, boxY + boxH);
  
  g.setColor(COLORS.ekBottom);
  g.fillRect(boxX, boxY + boxH - 2, boxX + boxW, boxY + boxH);
  
  g.setColor(COLORS.ekLeft);
  g.fillRect(boxX, boxY, boxX + 2, boxY + boxH);
  
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
  
  Bangle.setOptions({ 
    wakeOnTwist: true,
    twistThreshold: 600,
    twistMaxY: -600,
    twistTimeout: 1000
  });
  
  Bangle.setLCDTimeout(5);
  Bangle.setUI();

  panchangData = loadTodayData();
  
  if (panchangData.masa) {
    currentMasa = panchangData.masa;
  }
  
  currentVishnu = getVishnuNameOfDay();
  
  redrawAll();
  
  tithiTimeout = scheduleNextChange(panchangData.tithi, updateTithi);
  
  setInterval(() => {
    drawWidgets();
    drawTimeAndDate();
  }, 60000);
  
  setupVibrationAlerts();
  
  E.on("midnight", () => {
    panchangData = loadTodayData();
    if (panchangData.masa) currentMasa = panchangData.masa;
    currentVishnu = getVishnuNameOfDay();
    redrawAll();
  });
  
  setWatch(() => load(), BTN1, { edge: "rising", repeat: false });
}

init();
