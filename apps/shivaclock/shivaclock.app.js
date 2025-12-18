// Shiva Clock – Panchang + Hora + Nakshatra – Bangle.js 2
// Fully RAM-safe streaming JSON implementation

const Storage = require("Storage");

/* -------------------------------------------------------
   GLOBALS
--------------------------------------------------------*/
let panchangData;
let nakData;
let sunriseData;

let currentMasa = "";
let currentNak = "";
let currentVishnu = "";
let currentHora = "--";
let ekadashiIn = "--";
let lastMinute = -1;
let cachedDateKey = "";

const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/* -------------------------------------------------------
   TITHI CONSTANTS
--------------------------------------------------------*/
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

/* -------------------------------------------------------
   HORA CONSTANTS
--------------------------------------------------------*/
// Classical Hora sequence start
const PLANETS = ["SU","VE","ME","MO","SA","JU","MA"];
const WEEKDAY_LORD = ["SU","MO","MA","ME","JU","VE","SA"];

/* -------------------------------------------------------
   DATE KEY
--------------------------------------------------------*/
function getDateKey(d) {
  return d.getFullYear() + "-" +
         ("0"+(d.getMonth()+1)).slice(-2) + "-" +
         ("0"+d.getDate()).slice(-2);
}

/* -------------------------------------------------------
   STREAMING JSON LOADER (RAM SAFE)
--------------------------------------------------------*/
function loadBigJSONEntry(filename, dateKey) {
  let file = Storage.read(filename);
  if (!file) return null;

  let keyStr = `"${dateKey}":`;
  let pos = file.indexOf(keyStr);
  if (pos < 0) return null;

  let start = file.indexOf("{", pos);
  if (start < 0) return null;

  let depth = 0;
  let end = start;

  for (let i = start; i < file.length; i++) {
    let c = file[i];
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }

  try {
    return JSON.parse(file.slice(start, end));
  } catch (e) {
    return null;
  }
}

/* -------------------------------------------------------
   LOADERS
--------------------------------------------------------*/
function loadPanchang(d) {
  return loadBigJSONEntry("vedic-data.json", getDateKey(d));
}
function loadNakshatra(d) {
  return loadBigJSONEntry("nakshatra.json", getDateKey(d));
}

function loadSunrise() {
  if (!sunriseData)
    sunriseData = Storage.readJSON("sunrise.json", 1);
  return sunriseData;
}

function getVishnuList() {
  return Storage.readJSON("vedic-names.json", 1) || [];
}

/* -------------------------------------------------------
   VISHNU 20-MINUTE ROTATION
--------------------------------------------------------*/
function getVishnuRotated() {
  let list = getVishnuList();
  if (!list.length) return "";

  // each day rotates through 3 names  
  // minute/20 gives slot number (0,1,2)
  let now = new Date();
  let slot = Math.floor(now.getMinutes() / 20);  // 0–2

  // day index for stability
  let startOfYear = new Date(now.getFullYear(),0,1);
  let doy = Math.floor((now - startOfYear)/86400000);

  let idx = (doy*3 + slot) % list.length;
  return list[idx];
}

/* -------------------------------------------------------
   HORA
--------------------------------------------------------*/
function getHora() {
  let now = new Date();
  let key = getDateKey(now);
  let sun = loadSunrise();
  if (!sun || !sun[key]) return "--";

  let sr = sun[key].sr;
  let nowSec = now.getHours()*3600 + now.getMinutes()*60 + now.getSeconds();
  let delta = nowSec - sr;
  if (delta < 0) delta += 86400;

  let horaCount = Math.floor(delta/3600);
  if (horaCount > 23) horaCount = 23;

  let startIdx = PLANETS.indexOf(WEEKDAY_LORD[now.getDay()]);
  return PLANETS[(startIdx + horaCount) % 7];
}

/* -------------------------------------------------------
   TITHI
--------------------------------------------------------*/
function getCurrentTithi(slots) {
  let now = new Date();
  let nowMin = now.getHours()*60 + now.getMinutes();
  let cur = slots[0];

  for (let s of slots) {
    let parts = s.start.split(":");
    let t = (+parts[0])*60 + (+parts[1]);
    if (t <= nowMin) cur = s;
  }
  return cur;
}

function formatTithi(slot) {
  let paksha = slot.type[0].toUpperCase();
  let num = TITHI_NUM[slot.name] || "?";
  let nat = TITHI_NATURE[num] || "---";
  return paksha + num + "(" + nat + ")";
}

/* -------------------------------------------------------
   NAKSHATRA
--------------------------------------------------------*/
function getCurrentNakFromSlots(slots) {
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

/* -------------------------------------------------------
   EKADASHI
--------------------------------------------------------*/
function findNextEkadashi() {
  let base = new Date();
  base.setHours(0,0,0,0);

  for (let i=0; i<=15; i++) {
    let d = new Date(base.getTime());
    d.setDate(base.getDate()+i);
    let data = loadPanchang(d);
    if (!data || !data.tithi) continue;

    for (let t of data.tithi) {
      if (t.name === "Ekadashi") return i;
    }
  }
  return "--";
}

/* -------------------------------------------------------
   DRAW UI
--------------------------------------------------------*/
function drawAll() {
  if (!Bangle.isLCDOn()) return;

  g.clear();

  // Top: Battery | Hora | Steps
  g.setFont("6x8",2);
  g.setColor("#FFFFFF");
  g.setFontAlign(-1,-1);
  g.drawString(E.getBattery()+"%",4,2);

  g.setFontAlign(0,-1);
  g.drawString(currentHora,88,2);

  g.setFontAlign(1,-1);
  g.drawString(Bangle.getHealthStatus("day").steps||0,172,2);

  // Masa ↔ Nak alternate every minute
  let min = (new Date()).getMinutes();
  let header = (min % 2 == 0) ? currentMasa : currentNak;

  g.setColor("#FFA500");
  g.setFontAlign(0,-1);
  g.drawString(header,88,22);

  // TIME
  let d = new Date();
  let t = ("0"+d.getHours()).slice(-2)+":"+
          ("0"+d.getMinutes()).slice(-2);

  g.setFont("Vector",50);
  g.setColor("#FF9933");
  g.setFontAlign(0,0);
  g.drawString(t,88,70);

  // DATE + DAY
  g.setFont("6x8",2);
  g.setColor("#FFFFFF");
  g.drawString(
    d.getDate()+" "+
    MONTHS[d.getMonth()]+" "+
    DAYS[d.getDay()],
    88,104
  );

  // TITHI
  if (panchangData && panchangData.tithi) {
    g.setFont("Vector",18);
    g.setFontAlign(-1,0);
    g.drawString(
      formatTithi(getCurrentTithi(panchangData.tithi)),
      6,135
    );
  }

  // EKADASHI
  g.setColor("#000000");
  g.fillRect(128,120,175,152);
  g.setColor("#FFFFFF");
  g.setFont("Vector",18);
  g.setFontAlign(0,0);
  g.drawString(ekadashiIn.toString(),151,134);
  g.setFont("6x8",1);
  g.drawString("EKA",151,150);

  // VISHNU NAME (rotates every 20 min)
  g.setFont("6x8",2);
  g.setColor("#FFD700");
  g.setFontAlign(0,0);
  g.drawString(currentVishnu,88,168);
}

/* -------------------------------------------------------
   MINUTE TICK
--------------------------------------------------------*/
function onMinute() {
  let m = new Date().getMinutes();
  if (m !== lastMinute) {
    lastMinute = m;

    // vibrations
    if (m === 0) {
      Bangle.buzz(350,1.0);
      setTimeout(()=>Bangle.buzz(350,1.0),450);
      setTimeout(()=>Bangle.buzz(350,1.0),900);
    } else if (m === 30) {
      Bangle.buzz(300,0.9);
    }

    currentHora = getHora();
    currentVishnu = getVishnuRotated();
    drawAll();
  }
}

/* -------------------------------------------------------
   INIT
--------------------------------------------------------*/
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

  // load today's panchang + nak from streaming JSON
  panchangData = loadPanchang(now);
  nakData = loadNakshatra(now);

  currentNak = nakData ? getCurrentNakFromSlots(nakData) : "";
  currentMasa = panchangData ? panchangData.masa : "";
  currentVishnu = getVishnuRotated();
  currentHora = getHora();
  ekadashiIn = findNextEkadashi();

  drawAll();
  setInterval(onMinute,60000);

  E.on("midnight",()=>{
    let d = new Date();
    cachedDateKey = getDateKey(d);

    panchangData = loadPanchang(d);
    nakData = loadNakshatra(d);

    currentNak = nakData ? getCurrentNakFromSlots(nakData) : "";
    currentMasa = panchangData ? panchangData.masa : "";
    currentVishnu = getVishnuRotated();
    currentHora = getHora();
    ekadashiIn = findNextEkadashi();

    drawAll();
  });
}

init();
