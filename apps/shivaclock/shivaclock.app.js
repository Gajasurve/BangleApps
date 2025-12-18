// Shiva Clock – Panchang Watchface with Hora + Nakshatra (Hyderabad)
// Bangle.js 2

const Storage = require("Storage");

/* -------------------- GLOBALS -------------------- */

let panchangData;
let sunriseData;
let nakData;
let todayNakSlots = [];

let currentMasa = "";
let currentNak = "";
let showMasa = true;

let vishnuNamesToday = [];
let vishnuIndex = 0;
let currentVishnu = "";

let currentHora = "--";
let ekadashiIn = "--";

let lastMinute = -1;
let cachedDateKey = "";

/* -------------------- CONSTANTS -------------------- */

const TITHI_NUM = {
  "Pratipada":1,"Dwitiya":2,"Tritiya":3,"Chaturthi":4,
  "Panchami":5,"Shashthi":6,"Saptami":7,"Ashtami":8,
  "Navami":9,"Dashami":10,"Ekadashi":11,"Dwadashi":12,
  "Trayodashi":13,"Chaturdashi":14,"Purnima":15,"Amavasya":30
};

const TITHI_NATURE = {
  1:"NAN",6:"NAN",11:"NAN",
  2:"BHD",7:"BHD",12:"BHD",
  3:"JAY",8:"JAY",13:"JAY",
  4:"RKT",9:"RKT",14:"RKT",
  5:"PRN",10:"PRN",15:"PRN",30:"PRN"
};

// Hora order (shastric)
const PLANETS = ["SU","VE","ME","MO","SA","JU","MA"];
const WEEKDAY_LORD = ["SU","MO","MA","ME","JU","VE","SA"];

const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/* -------------------- HELPERS -------------------- */

function getDateKey(d) {
  return d.getFullYear()+"-"+("0"+(d.getMonth()+1)).slice(-2)+"-"+("0"+d.getDate()).slice(-2);
}

function getCurrentSlot(slots) {
  let now = new Date();
  let nowMin = now.getHours()*60 + now.getMinutes();
  let cur = slots[0];

  for (let s of slots) {
    let [h,m] = s.start.split(":").map(x=>+x);
    let t = h*60+m;
    if (t <= nowMin) cur = s;
  }
  return cur;
}

/* -------------------- LOAD DAY DATA -------------------- */

function loadDayData(date) {
  let json = Storage.readJSON("vedic-data.json",1);
  let key = getDateKey(date);
  return (json && json[key]) ? json[key] : null;
}

function getVishnuNamesForDay() {
  let names = Storage.readJSON("vedic-names.json",1);
  if (!names || !names.length) return ["--","--","--"];

  let today = new Date();
  let start = new Date(today.getFullYear(),0,1);
  let dayOfYear = Math.floor((today - start)/86400000);

  let i = dayOfYear % names.length;
  return [
    names[i],
    names[(i+1)%names.length],
    names[(i+2)%names.length]
  ];
}

function loadSunriseData() {
  if (!sunriseData)
    sunriseData = Storage.readJSON("sunrise.json",1);
  return sunriseData;
}

/* -------------------- HORA -------------------- */

function getHora() {
  let now = new Date();
  let key = getDateKey(now);
  let sun = loadSunriseData();
  if (!sun || !sun[key]) return "--";

  let sr = sun[key].sr;  // seconds from midnight

  let nowSec =
    now.getHours()*3600 +
    now.getMinutes()*60 +
    now.getSeconds();

  let delta = nowSec - sr;
  if (delta < 0) delta += 86400;

  let horaCount = Math.floor(delta/3600);
  if (horaCount > 23) horaCount = 23;

  let lord = WEEKDAY_LORD[now.getDay()];
  let startIdx = PLANETS.indexOf(lord);

  return PLANETS[(startIdx + horaCount) % 7];
}

/* -------------------- NAKSHATRA -------------------- */

function loadNakshatraSlots(date) {
  if (!nakData) nakData = Storage.readJSON("nakshatra.json",1);
  let key = getDateKey(date);
  return (nakData && nakData[key]) ? nakData[key] : [];
}

function getCurrentNakFromSlots(slots) {
  let now = new Date();
  let nowMin = now.getHours()*60 + now.getMinutes();

  let cur = slots[0];
  for (let s of slots) {
    let [h,m] = s.start.split(":").map(x=>+x);
    let t = h*60+m;
    if (t <= nowMin) cur = s;
  }
  return cur ? cur.name : "--";
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
    for (let t of data.tithi)
      if (t.name==="Ekadashi") return i;
  }
  return "--";
}

/* -------------------- TITHI -------------------- */

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

  // Top bar
  g.setFont("6x8",2);
  g.setColor("#FFFFFF");

  g.setFontAlign(-1,-1);
  g.drawString(E.getBattery()+"%",4,2);

  g.setFontAlign(0,-1);
  g.drawString(currentHora,88,2);

  g.setFontAlign(1,-1);
  g.drawString(Bangle.getHealthStatus("day").steps||0,172,2);

  // Masa ↔ Nakshatra flip
  g.setColor("#FFA500");
  g.setFontAlign(0,-1);
  g.drawString(showMasa ? currentMasa : currentNak, 88, 22);

  // Time
  let d = new Date();
  let time = ("0"+d.getHours()).slice(-2)+":"+("0"+d.getMinutes()).slice(-2);
  g.setFont("Vector",50);
  g.setColor("#FF9933");
  g.setFontAlign(0,0);
  g.drawString(time,88,70);

  // Date + Day
  g.setFont("6x8",2);
  g.setColor("#FFFFFF");
  g.drawString(
    d.getDate()+" "+MONTHS[d.getMonth()]+" "+DAYS[d.getDay()],
    88,104
  );

  // Tithi
  if (panchangData && panchangData.tithi) {
    let slot = getCurrentSlot(panchangData.tithi);
    g.setFont("Vector",18);
    g.setFontAlign(-1,0);
    g.drawString(formatTithi(slot),6,135);
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

  // Vishnu name (cycled)
  g.setFont("6x8",2);
  g.setColor("#FFD700");
  g.setFontAlign(0,0);
  g.drawString(currentVishnu,88,168);
}

/* -------------------- TICK -------------------- */

function onMinute() {
  let now = new Date();
  let m = now.getMinutes();

  if (m !== lastMinute) {
    lastMinute = m;

    // Vibrations
    if (m === 0) {
      Bangle.buzz(350,1.0);
      setTimeout(()=>Bangle.buzz(350,1.0),450);
      setTimeout(()=>Bangle.buzz(350,1.0),900);
    } else if (m === 30) {
      Bangle.buzz(300,0.9);
    }

    // Flip Masa ↔ Nakshatra
    showMasa = !showMasa;
    currentNak = getCurrentNakFromSlots(todayNakSlots);

    // Vishnu cycle every 20 mins
    if (m % 20 === 0) {
      vishnuIndex = (vishnuIndex+1)%3;
      currentVishnu = vishnuNamesToday[vishnuIndex];
    }

    currentHora = getHora();
    drawAll();
  }
}

/* -------------------- INIT -------------------- */

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

  panchangData = loadDayData(now);
  nakData = Storage.readJSON("nakshatra.json",1);
  todayNakSlots = loadNakshatraSlots(now);

  currentNak = getCurrentNakFromSlots(todayNakSlots);

  currentMasa = panchangData ? panchangData.masa : "";

  vishnuNamesToday = getVishnuNamesForDay();
  vishnuIndex = 0;
  currentVishnu = vishnuNamesToday[0];

  currentHora = getHora();
  ekadashiIn = findNextEkadashi();

  drawAll();
  setInterval(onMinute,60000);

  E.on("midnight",()=>{
    let d = new Date();
    cachedDateKey = getDateKey(d);

    panchangData = loadDayData(d);
    todayNakSlots = loadNakshatraSlots(d);
    currentNak = getCurrentNakFromSlots(todayNakSlots);

    currentMasa = panchangData ? panchangData.masa : "";

    vishnuNamesToday = getVishnuNamesForDay();
    vishnuIndex = 0;
    currentVishnu = vishnuNamesToday[0];

    currentHora = getHora();
    ekadashiIn = findNextEkadashi();

    drawAll();
  });
}

init();
