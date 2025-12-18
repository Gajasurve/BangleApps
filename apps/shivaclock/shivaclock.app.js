// Shiva Clock – Panchang + Hora + Nakshatra (Safe Version)

const Storage = require("Storage");

let panchangData;
let sunriseData;
let nakData;

let todayNakSlots = [];
let currentNak = "--";

let currentMasa = "";
let vishnuNamesToday = [];
let vishnuIndex = 0;
let currentVishnu = "";

let currentHora = "--";
let ekadashiIn = "--";

let showMasa = true;
let lastMinute = -1;

/* -------------------- CONSTANTS -------------------- */

const PLANETS = ["SU","VE","ME","MO","SA","JU","MA"];
const WEEKDAY_LORD = ["SU","MO","MA","ME","JU","VE","SA"];

const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/* -------------------- HELPERS -------------------- */

function safeReadJSON(name) {
  try { return Storage.readJSON(name,1) || {}; }
  catch (e) { return {}; }
}

function getDateKey(d) {
  return d.getFullYear()+"-"+("0"+(d.getMonth()+1)).slice(-2)+"-"+("0"+d.getDate()).slice(-2);
}

/* -------------------- LOAD FUNCTIONS -------------------- */

function loadDayData(date) {
  let json = safeReadJSON("vedic-data.json");
  return json[getDateKey(date)] || null;
}

function loadSunriseData() {
  if (!sunriseData) sunriseData = safeReadJSON("sunrise.json");
  return sunriseData;
}

function loadNakshatraData() {
  if (!nakData) nakData = safeReadJSON("nakshatra.json");
  return nakData;
}

function loadNakshatraSlots(date) {
  let data = loadNakshatraData();
  let slots = data[getDateKey(date)];
  return Array.isArray(slots) ? slots : [];
}

/* -------------------- NAKSHATRA -------------------- */

function getCurrentNakFromSlots(slots) {
  if (!slots || !slots.length) return "--";

  let now = new Date();
  let nowMin = now.getHours()*60 + now.getMinutes();

  let cur = slots[0];

  for (let i=0; i<slots.length; i++) {
    let parts = slots[i].start.split(":");
    let h = +parts[0];
    let m = +parts[1];
    let t = h*60 + m;

    if (t <= nowMin) cur = slots[i];
  }

  return cur.name;
}

/* -------------------- VISHNU -------------------- */

function getVishnuNamesForDay() {
  let names = safeReadJSON("vedic-names.json");
  if (!Array.isArray(names) || names.length === 0)
    return ["--","--","--"];

  let today = new Date();
  let start = new Date(today.getFullYear(),0,1);
  let day = Math.floor((today - start)/86400000);

  return [
    names[day % names.length],
    names[(day+1) % names.length],
    names[(day+2) % names.length]
  ];
}

/* -------------------- HORA -------------------- */

function getHora() {
  let now = new Date();
  let key = getDateKey(now);

  let sun = loadSunriseData();
  if (!sun[key]) return "--";

  let sr = sun[key].sr;  // seconds after midnight

  let nowSec =
    now.getHours()*3600 +
    now.getMinutes()*60 +
    now.getSeconds();

  let delta = nowSec - sr;
  if (delta < 0) delta += 86400;

  let hora = Math.floor(delta/3600);
  if (hora < 0) hora = 0;
  if (hora > 23) hora = 23;

  let lord = WEEKDAY_LORD[now.getDay()];
  let startIdx = PLANETS.indexOf(lord);
  return PLANETS[(startIdx + hora) % 7];
}

/* -------------------- EKADASHI -------------------- */

function findNextEkadashi() {
  let base = new Date();
  base.setHours(0,0,0,0);

  for (let i=0;i<=15;i++) {
    let d = new Date(base.getTime());
    d.setDate(base.getDate()+i);
    let dat = loadDayData(d);
    if (!dat || !dat.tithi) continue;

    for (let j=0; j<dat.tithi.length; j++) {
      if (dat.tithi[j].name==="Ekadashi") return i;
    }
  }
  return "--";
}

/* -------------------- TITHI -------------------- */

function getCurrentTithi(slots) {
  let now = new Date();
  let nowMin = now.getHours()*60 + now.getMinutes();
  let cur = slots[0];

  for (let i=0; i<slots.length; i++) {
    let parts = slots[i].start.split(":");
    let h = +parts[0];
    let m = +parts[1];
    let t = h*60+m;

    if (t <= nowMin) cur = slots[i];
  }
  return cur;
}

const TNUM = {
  "Pratipada":1,"Dwitiya":2,"Tritiya":3,"Chaturthi":4,"Panchami":5,
  "Shashthi":6,"Saptami":7,"Ashtami":8,"Navami":9,"Dashami":10,
  "Ekadashi":11,"Dwadashi":12,"Trayodashi":13,"Chaturdashi":14,
  "Purnima":15,"Amavasya":30
};

const TNATURE = {
  1:"NAN",6:"NAN",11:"NAN",
  2:"BHD",7:"BHD",12:"BHD",
  3:"JAY",8:"JAY",13:"JAY",
  4:"RKT",9:"RKT",14:"RKT",
  5:"PRN",10:"PRN",15:"PRN",30:"PRN"
};

function formatTithi(slot) {
  let paksha = slot.type[0].toUpperCase();
  let num = TNUM[slot.name] || "?";
  let nat = TNATURE[num] || "---";
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

  // Masa / Nak flip
  g.setColor("#FFA500");
  g.setFontAlign(0,-1);
  g.drawString(showMasa ? currentMasa : currentNak, 88, 22);

  // Time
  let d = new Date();
  let ts = ("0"+d.getHours()).slice(-2)+":"+("0"+d.getMinutes()).slice(-2);
  g.setFont("Vector",50);
  g.setColor("#FF9933");
  g.setFontAlign(0,0);
  g.drawString(ts,88,70);

  // Date
  g.setFont("6x8",2);
  g.setColor("#FFFFFF");
  g.setFontAlign(0,-1);
  g.drawString(
    d.getDate()+" "+MONTHS[d.getMonth()]+" "+DAYS[d.getDay()],
    88,104
  );

  // Tithi
  if (panchangData && panchangData.tithi) {
    let slot = getCurrentTithi(panchangData.tithi);
    g.setFont("Vector",18);
    g.setFontAlign(-1,0);
    g.drawString(formatTithi(slot), 6,135);
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

/* -------------------- MINUTE -------------------- */

function onMinute() {
  let now = new Date();
  let m = now.getMinutes();

  if (m !== lastMinute) {
    lastMinute = m;

    // Vibrations
    if (m === 0) {
      Bangle.buzz(350,1.0); setTimeout(()=>Bangle.buzz(350,1.0),450);
      setTimeout(()=>Bangle.buzz(350,1.0),900);
    } else if (m === 30) {
      Bangle.buzz(300,0.9);
    }

    // Flip Masa/Nak
    if (todayNakSlots.length)
      showMasa = !showMasa;

    // Vishnu 20-min cycle
    if (m % 20 === 0) {
      vishnuIndex = (vishnuIndex+1) % vishnuNamesToday.length;
      currentVishnu = vishnuNamesToday[vishnuIndex];
    }

    currentHora = getHora();
    currentNak = getCurrentNakFromSlots(todayNakSlots);

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
  panchangData = loadDayData(now);

  nakData = safeReadJSON("nakshatra.json");
  todayNakSlots = loadNakshatraSlots(now);
  currentNak = getCurrentNakFromSlots(todayNakSlots);

  currentMasa = panchangData ? panchangData.masa : "--";

  vishnuNamesToday = getVishnuNamesForDay();
  currentVishnu = vishnuNamesToday[0];

  currentHora = getHora();
  ekadashiIn = findNextEkadashi();

  drawAll();
  setInterval(onMinute,60000);

  // Midnight refresh
  E.on("midnight",()=>{
    let d = new Date();

    panchangData = loadDayData(d);

    todayNakSlots = loadNakshatraSlots(d);
    currentNak = getCurrentNakFromSlots(todayNakSlots);

    currentMasa = panchangData ? panchangData.masa : "--";

    vishnuNamesToday = getVishnuNamesForDay();
    vishnuIndex = 0;
    currentVishnu = vishnuNamesToday[0];

    currentHora = getHora();
    ekadashiIn = findNextEkadashi();

    drawAll();
  });
}

init();
