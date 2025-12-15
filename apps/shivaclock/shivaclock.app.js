// Shiva Clock – Panchang Watchface
// Bangle.js 2

const Storage = require("Storage");

let panchangData;
let currentMasa = "";
let currentVishnu = "";
let ekadashiIn = "--";
let lastMinute = -1;

/* -------------------- CONSTANTS -------------------- */

const TITHI_NUM = {
  "Pratipada":1,"Dwitiya":2,"Tritiya":3,"Chaturthi":4,"Panchami":5,
  "Shashthi":6,"Saptami":7,"Ashtami":8,"Navami":9,"Dashami":10,
  "Ekadashi":11,"Dwadashi":12,"Trayodashi":13,"Chaturdashi":14,
  "Purnima":15,"Amavasya":30
};

const TITHI_NATURE = {
  1:"NAN",6:"NAN",11:"NAN",
  2:"BHD",7:"BHD",12:"BHD",
  3:"JAY",8:"JAY",13:"JAY",
  4:"RKT",9:"RKT",14:"RKT",
  5:"PRN",10:"PRN",15:"PRN",30:"PRN"
};

/* -------------------- DATA -------------------- */

function loadDayData(date) {
  let key = date.toISOString().slice(0,10);
  let json = Storage.readJSON("shivaclock/vedic-data.json",1);
  return (json && json[key]) ? json[key] : null;
}

function getVishnuNameOfDay() {
  let names = Storage.readJSON("shivaclock/vedic-names.json",1);
  if (!names || !names.length) return "";
  let day = Math.floor(Date.now()/86400000);
  return names[day % names.length];
}

/* -------------------- EKADASHI -------------------- */

function findNextEkadashi() {
  let base = new Date();
  base.setHours(0,0,0,0);

  for (let i=0;i<=15;i++) {
    let d = new Date(base.getTime());
    d.setDate(base.getDate()+i);
    let data = loadDayData(d);
    if (!data || !data.tithi) continue;
    for (let t of data.tithi) {
      if (t.name === "Ekadashi") return i;
    }
  }
  return "--";
}

/* -------------------- TITHI -------------------- */

function getCurrentTithi(slots) {
  let now = new Date();
  let nowMin = now.getHours()*60 + now.getMinutes();
  let cur = slots[0];

  for (let s of slots) {
    let p = s.start.split(":");
    let m = (+p[0])*60 + (+p[1]);
    if (m <= nowMin) cur = s;
  }
  return cur;
}

function formatTithi(slot) {
  let paksha = slot.type[0].toUpperCase(); // S / K
  let num = TITHI_NUM[slot.name] || "?";
  let nat = TITHI_NATURE[num] || "---";
  return paksha + num + "(" + nat + ")";
}

/* -------------------- DRAW -------------------- */

function drawAll() {
  if (!Bangle.isLCDOn()) return;

  g.clear();

  // Battery + steps
  g.setFont("6x8",2);
  g.setColor("#FFFFFF");
  g.setFontAlign(-1,-1);
  g.drawString(E.getBattery()+"%",4,2);

  let steps = Bangle.getHealthStatus("day").steps || 0;
  g.setFontAlign(1,-1);
  g.drawString(steps,172,2);

  // Masa
  g.setColor("#FFA500");
  g.setFontAlign(0,-1);
  g.drawString(currentMasa,88,22);

  // Time
  let d = new Date();
  let time =
    ("0"+d.getHours()).slice(-2) + ":" +
    ("0"+d.getMinutes()).slice(-2);

  g.setFont("Vector",50);
  g.setColor("#FF9933");
  g.setFontAlign(0,0);
  g.drawString(time,88,70);

  // Date
  g.setFont("6x8",2);
  g.setColor("#FFFFFF");
  g.drawString(
    d.getDate()+" "+
    ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()],
    88,104
  );

  // Tithi
  if (panchangData && panchangData.tithi) {
    g.setFont("Vector",18);
    g.setFontAlign(-1,0);
    g.drawString(formatTithi(getCurrentTithi(panchangData.tithi)),6,135);
  }

  // Ekadashi box
  g.setColor("#000000");
  g.fillRect(128,120,175,152);
  g.setColor("#FFFFFF");
  g.setFont("Vector",18);
  g.setFontAlign(0,0);
  g.drawString(ekadashiIn.toString(),151,134);
  g.setFont("6x8",1);
  g.drawString("EKA",151,150);

  // Vishnu name
  g.setFont("6x8",2);
  g.setColor("#FFD700");
  g.setFontAlign(0,0);
  g.drawString(currentVishnu,88,168);
}

/* -------------------- TICK -------------------- */

function onMinute() {
  let m = new Date().getMinutes();
  if (m !== lastMinute) {
    lastMinute = m;

    if (m === 0) {
      Bangle.buzz(200,0.8);
      setTimeout(()=>Bangle.buzz(200,0.8),120);
    } else if (m === 30) {
      Bangle.buzz(120,0.4);
    }

    drawAll();
  }
}

/* -------------------- INIT -------------------- */

function init() {
  Bangle.setOptions({
    wakeOnTwist: true,
    twistThreshold: 1500,
    twistMaxY: -1500,
    twistTimeout: 800
  });
  Bangle.setLCDTimeout(10);

  panchangData = loadDayData(new Date());
  currentMasa = panchangData ? panchangData.masa : "";
  currentVishnu = getVishnuNameOfDay();
  ekadashiIn = findNextEkadashi();

  drawAll();
  setInterval(onMinute, 60000);

  E.on("midnight", () => {
    panchangData = loadDayData(new Date());
    currentMasa = panchangData ? panchangData.masa : "";
    currentVishnu = getVishnuNameOfDay();
    ekadashiIn = findNextEkadashi();
    drawAll();
  });

  Bangle.on("kill", () => clearInterval());
}

init();

