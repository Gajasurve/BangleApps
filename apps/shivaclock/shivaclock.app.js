// Shiva Clock – Panchang Watchface with Hora + Nakshatra + Vishnu Cycling
// Bangle.js 2

const Storage = require("Storage");

/* ------------ GLOBAL STATE ------------ */

let panchangData;
let sunriseData;

let currentMasa = "";
let currentVishnu = "";
let currentHora = "--";
let currentNak = "";
let showMasa = true;   // flip flag: masa ↔ nak each minute
let lastMinute = -1;
let ekadashiIn = "--";

let cachedDateKey = "";

/* ------------ CONSTANTS ------------ */

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

// Hora proper sequential list
const PLANETS = ["SU","VE","ME","MO","SA","JU","MA"];
const WEEKDAY_LORD = ["SU","MO","MA","ME","JU","VE","SA"];

const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/* ------------ DATE HELP ------------ */

function getDateKey(d) {
  return d.getFullYear() + "-" +
    ("0" + (d.getMonth()+1)).slice(-2) + "-" +
    ("0" + d.getDate()).slice(-2);
}

/* ------------ STREAMING JSON LOADERS ------------ */

function loadDayData(date) {
  let json = Storage.readJSON("vedic-data.json", 1);
  let key = getDateKey(date);
  return json ? json[key] : null;
}

function loadSunriseData() {
  if (!sunriseData)
    sunriseData = Storage.readJSON("sunrise.json", 1);
  return sunriseData;
}

/* ---- Safe streaming Nakshatra loader ---- */

function loadDayNakshatra(dateKey) {
  let file = require("Storage").read("nakshatra.json");
  if (!file) return null;

  let search = '"' + dateKey + '"';
  let pos = file.indexOf(search);
  if (pos < 0) return null;

  let start = file.indexOf("[", pos);
  if (start < 0) return null;

  let depth = 0, end = start;

  while (end < file.length) {
    let c = file[end];
    if (c === "[") depth++;
    if (c === "]") {
      depth--;
      if (depth === 0) break;
    }
    end++;
  }

  if (depth !== 0) return null;

  let chunk = file.slice(start, end + 1);
  chunk = chunk.replace(/,\s*]$/, "]");

  try {
    return JSON.parse(chunk);
  } catch(e) {
    return null;
  }
}

/* ------------ VISHNU NAME ------------ */

function getVishnuNameOfDay() {
  let names = Storage.readJSON("vedic-names.json", 1);
  if (!names || !names.length) return "";
  let now = new Date();
  let start = new Date(now.getFullYear(),0,1);
  let dayOfYear = Math.floor((now - start)/86400000);
  return names[dayOfYear % names.length];
}

/* ------------ HORA ------------ */

function getHora() {
  let now = new Date();
  let dateKey = getDateKey(now);
  let sun = loadSunriseData();
  if (!sun || !sun[dateKey]) return "--";

  let srSec = sun[dateKey].sr;
  let nowSec = now.getHours()*3600 + now.getMinutes()*60 + now.getSeconds();

  let delta = nowSec - srSec;
  if (delta < 0) delta += 86400;

  let horaIndex = Math.floor(delta / 3600);
  if (horaIndex > 23) horaIndex = 23;

  let lord = WEEKDAY_LORD[now.getDay()];
  let base = PLANETS.indexOf(lord);

  return PLANETS[(base + horaIndex) % 7];
}

/* ------------ NAKSHATRA ------------ */

function getCurrentNakFromSlots(slots) {
  if (!slots || !slots.length) return "";
  let now = new Date();
  let nowMin = now.getHours()*60 + now.getMinutes();

  let cur = slots[0];

  for (let s of slots) {
    let p = s.start.split(":");
    let hm = (+p[0])*60 + (+p[1]);
    if (hm <= nowMin) cur = s;
  }
  return cur.name;
}

/* ------------ TITHI ------------ */

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
  let paksha = slot.type[0].toUpperCase();
  let num = TITHI_NUM[slot.name] || "?";
  let nat = TITHI_NATURE[num] || "---";
  return paksha + num + "(" + nat + ")";
}

/* ------------ EKADASHI ------------ */

function findNextEkadashi() {
  let base = new Date();
  base.setHours(0,0,0,0);

  for (let i=0; i<=15; i++) {
    let d = new Date(base);
    d.setDate(base.getDate() + i);

    let data = loadDayData(d);
    if (!data || !data.tithi) continue;

    for (let t of data.tithi)
      if (t.name === "Ekadashi") return i;
  }
  return "--";
}

/* ------------ DRAW ------------ */

function drawAll() {
  if (!Bangle.isLCDOn()) return;

  g.clear();

  // Top Bar
  g.setFont("6x8",2);
  g.setColor("#FFFFFF");
  g.setFontAlign(-1,-1);
  g.drawString(E.getBattery()+"%",4,2);

  g.setFontAlign(0,-1);
  g.drawString(currentHora,88,2);

  g.setFontAlign(1,-1);
  g.drawString(Bangle.getHealthStatus("day").steps||0,172,2);

  // Masa OR Nak
  g.setFont("6x8",2);
  g.setFontAlign(0,-1);
  g.setColor("#FFA500");
  g.drawString(showMasa?currentMasa:currentNak,88,22);

  // Time
  let d=new Date();
  let t=("0"+d.getHours()).slice(-2)+":"+
        ("0"+d.getMinutes()).slice(-2);

  g.setFont("Vector",50);
  g.setFontAlign(0,0);
  g.setColor("#FF9933");
  g.drawString(t,88,70);

  // Date + Day
  g.setFont("6x8",2);
  g.setColor("#FFFFFF");
  g.drawString(
    d.getDate()+" "+
    MONTHS[d.getMonth()]+" "+
    DAYS[d.getDay()],
    88,104);

  // Tithi
  if (panchangData && panchangData.tithi) {
    g.setFont("Vector",18);
    g.setFontAlign(-1,0);
    g.setColor("#FFFFFF");
    g.drawString(
      formatTithi(getCurrentTithi(panchangData.tithi)),
      6,135
    );
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

  // Vishnu
  g.setFont("6x8",2);
  g.setColor("#FFD700");
  g.setFontAlign(0,0);
  g.drawString(currentVishnu,88,168);
}

/* ------------ MINUTE TICK ------------ */

function onMinute() {
  let m = new Date().getMinutes();
  if (m === lastMinute) return;
  lastMinute = m;

  // Vibration
  if (m === 0) {
    Bangle.buzz(350,1.0);
    setTimeout(()=>Bangle.buzz(350,1.0),450);
    setTimeout(()=>Bangle.buzz(350,1.0),900);
  } else if (m === 30) {
    Bangle.buzz(300,0.9);
  }

  // Flip Masa/Nak
  showMasa = !showMasa;

  // Vishnu cycle every 20 min
  if (m % 20 === 0) currentVishnu = getVishnuNameOfDay();

  // Hora update
  currentHora = getHora();

  drawAll();
}

/* ------------ INIT ------------ */

function init() {
  Bangle.setUI("clock");
  Bangle.setOptions({
    wakeOnTwist:true,
    twistThreshold:1500,
    twistMaxY:-1500,
    twistTimeout:800
  });

  Bangle.setLCDTimeout(10);

  let now = new Date();
  cachedDateKey = getDateKey(now);

  // Panchang
  panchangData = loadDayData(now);
  currentMasa   = panchangData ? panchangData.masa : "";

  // Nakshatra
  let nakSlots = loadDayNakshatra(cachedDateKey);
  currentNak = nakSlots ? getCurrentNakFromSlots(nakSlots) : "";

  // Vishnu
  currentVishnu = getVishnuNameOfDay();

  // Ekadashi
  ekadashiIn = findNextEkadashi();

  // Hora
  currentHora = getHora();

  drawAll();
  setInterval(onMinute,60000);

  E.on("midnight",()=>{
    let d=new Date();
    cachedDateKey = getDateKey(d);
    panchangData = loadDayData(d);
    currentMasa = panchangData ? panchangData.masa : "";
    currentVishnu = getVishnuNameOfDay();
    ekadashiIn = findNextEkadashi();
    currentHora = getHora();

    let nak2 = loadDayNakshatra(cachedDateKey);
    currentNak = nak2 ? getCurrentNakFromSlots(nak2) : "";

    drawAll();
  });
}

init();
