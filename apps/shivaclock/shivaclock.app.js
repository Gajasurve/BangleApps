// Shiva Clock – Panchang Watchface with Hora (Hyderabad)
// Bangle.js 2

const Storage = require("Storage");

let panchangData;
let sunriseData;
let currentMasa = "";
let currentVishnu = "";
let currentHora = "--";
let ekadashiIn = "--";
let lastMinute = -1;
let cachedDateKey = "";

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

// Hora constants (Shastric order)
const PLANETS = ["SA","JU","MA","SU","VE","ME","MO"];
const WEEKDAY_LORD = ["SU","MO","MA","ME","JU","VE","SA"];

const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/* -------------------- DATE KEY -------------------- */

function getDateKey(d) {
  return d.getFullYear() + "-" +
    ("0" + (d.getMonth() + 1)).slice(-2) + "-" +
    ("0" + d.getDate()).slice(-2);
}

/* -------------------- DATA -------------------- */

function loadDayData(date) {
  let json = Storage.readJSON("vedic-data.json", 1);
  let key = getDateKey(date);
  return (json && json[key]) ? json[key] : null;
}

function getVishnuNameOfDay() {
  let names = Storage.readJSON("vedic-names.json", 1);
  if (!names || !names.length) return "";

  let today = new Date();
  let start = new Date(today.getFullYear(), 0, 1);
  let dayOfYear = Math.floor((today - start) / 86400000);
  return names[dayOfYear % names.length];
}

function loadSunriseData() {
  if (!sunriseData)
    sunriseData = Storage.readJSON("sunrise.json", 1);
  return sunriseData;
}

/* -------------------- HORA (FIXED) -------------------- */

function getHora() {
  let now = new Date();
  let key = getDateKey(now);
  let sun = loadSunriseData();
  if (!sun || !sun[key]) return "--";

  let sr = sun[key].sr;
  let ss = sun[key].ss;

  let min = now.getHours() * 60 + now.getMinutes();

  let dayLen = ss - sr;
  let nightLen = 1440 - dayLen;

  let horaLenDay = dayLen / 12;
  let horaLenNight = nightLen / 12;

  let horaCount;

  if (min >= sr && min < ss) {
    // Day hora: count from sunrise
    horaCount = Math.floor((min - sr) / horaLenDay);
  } else {
    // Night hora: continue after day horas
    let nightMin = (min >= ss) ? (min - ss) : (min + 1440 - ss);
    horaCount = 12 + Math.floor(nightMin / horaLenNight);
  }

  if (horaCount < 0) horaCount = 0;
  if (horaCount > 23) horaCount = 23;

  let lord = WEEKDAY_LORD[now.getDay()];
  let startIdx = PLANETS.indexOf(lord);

  return PLANETS[(startIdx + horaCount) % 7];
}

/* -------------------- EKADASHI -------------------- */

function findNextEkadashi() {
  let base = new Date();
  base.setHours(0,0,0,0);

  for (let i = 0; i <= 15; i++) {
    let d = new Date(base.getTime());
    d.setDate(base.getDate() + i);

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
  let nowMin = now.getHours() * 60 + now.getMinutes();
  let cur = slots[0];

  for (let s of slots) {
    let p = s.start.split(":");
    let m = (+p[0]) * 60 + (+p[1]);
    if (m <= nowMin) cur = s;
  }
  return cur;
}

function formatTithi(slot) {
  let paksha = slot.type[0].toUpperCase();
  let num = TITHI_NUM[slot.name] || "?";
  let nat = TITHI_NATURE[num] || "---";
  return paksha + num + "(" + nat + ")";
}

/* -------------------- DRAW -------------------- */

function drawAll() {
  if (!Bangle.isLCDOn()) return;
  g.clear();

  // Top bar: Battery | Hora | Steps
  g.setFont("6x8", 2);
  g.setColor("#FFFFFF");

  g.setFontAlign(-1, -1);
  g.drawString(E.getBattery() + "%", 4, 2);

  g.setFontAlign(0, -1);
  g.drawString(currentHora, 88, 2);

  g.setFontAlign(1, -1);
  g.drawString(Bangle.getHealthStatus("day").steps || 0, 172, 2);

  // Masa
  g.setColor("#FFA500");
  g.setFontAlign(0, -1);
  g.drawString(currentMasa, 88, 22);

  // Time
  let d = new Date();
  let time =
    ("0" + d.getHours()).slice(-2) + ":" +
    ("0" + d.getMinutes()).slice(-2);

  g.setFont("Vector", 50);
  g.setColor("#FF9933");
  g.setFontAlign(0, 0);
  g.drawString(time, 88, 70);

  // Date + Day (e.g. 16 Dec Tue)
  g.setFont("6x8", 2);
  g.setColor("#FFFFFF");
  g.drawString(
    d.getDate() + " " +
    MONTHS[d.getMonth()] + " " +
    DAYS[d.getDay()],
    88, 104
  );

  // Tithi
  if (panchangData && panchangData.tithi) {
    g.setFont("Vector", 18);
    g.setFontAlign(-1, 0);
    g.drawString(
      formatTithi(getCurrentTithi(panchangData.tithi)),
      6, 135
    );
  }

  // Ekadashi box
  g.setColor("#000000");
  g.fillRect(128, 120, 175, 152);
  g.setColor("#FFFFFF");
  g.setFont("Vector", 18);
  g.setFontAlign(0, 0);
  g.drawString(ekadashiIn.toString(), 151, 134);
  g.setFont("6x8", 1);
  g.drawString("EKA", 151, 150);

  // Vishnu name
  g.setFont("6x8", 2);
  g.setColor("#FFD700");
  g.setFontAlign(0, 0);
  g.drawString(currentVishnu, 88, 168);
}

/* -------------------- TICK -------------------- */

function onMinute() {
  let m = new Date().getMinutes();
  if (m !== lastMinute) {
    lastMinute = m;

    if (m === 0) {
      Bangle.buzz(200, 0.8);
      setTimeout(() => Bangle.buzz(200, 0.8), 120);
    } else if (m === 30) {
      Bangle.buzz(120, 0.4);
    }

    currentHora = getHora();
    drawAll();
  }
}

/* -------------------- INIT -------------------- */

function init() {
  Bangle.setUI("clock");

  Bangle.setOptions({
    wakeOnTwist: true,
    twistThreshold: 1500,
    twistMaxY: -1500,
    twistTimeout: 800
  });

  Bangle.setLCDTimeout(10);

  let now = new Date();
  cachedDateKey = getDateKey(now);

  panchangData = loadDayData(now);
  currentMasa = panchangData ? panchangData.masa : "";
  currentVishnu = getVishnuNameOfDay();
  currentHora = getHora();
  ekadashiIn = findNextEkadashi();

  drawAll();
  setInterval(onMinute, 60000);

  E.on("midnight", () => {
    let d = new Date();
    cachedDateKey = getDateKey(d);
    panchangData = loadDayData(d);
    currentMasa = panchangData ? panchangData.masa : "";
    currentVishnu = getVishnuNameOfDay();
    ekadashiIn = findNextEkadashi();
    currentHora = getHora();
    drawAll();
  });
}

init();
