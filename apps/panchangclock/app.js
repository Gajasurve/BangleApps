let panchangData, nextTimeout;
const Storage = require("Storage");

// Color helper for hora
function horaColor(hora) {
  if (["VE", "MO", "JUP"].includes(hora)) return "#00ff00";
  if (["ME", "MA"].includes(hora)) return "#ffff00";
  return "#ffffff";
}

// Get vara lord for the weekday abbreviation
function getVaraLord(dayAbbr) {
  const map = {
    SU: "SU",
    MO: "MO",
    TU: "MA",
    WE: "ME",
    TH: "JUP",
    FR: "VE",
    SA: "SA"
  };
  return map[dayAbbr] || "??";
}

// Load today's panchang data from storage
function loadTodayData() {
  let today = new Date().toISOString().slice(0,10);
  let json = Storage.readJSON("panchang-2025.json", 1e4);
  if (!json || !json[today]) {
    g.clear();
    g.setFontAlign(0,0);
    g.setFont("Vector",20);
    g.drawString("No Panchang data for today", 88, 88);
    return null;
  }
  return json[today];
}

// Find current slot index based on current time
function getCurrentSlot(slots) {
  let now = new Date();
  let cur = now.getHours() * 60 + now.getMinutes();
  let index = slots.map(s=> {
    let [h,m] = s.start.split(":").map(Number);
    return h*60 + m;
  }).filter(t => t <= cur).length - 1;
  if (index < 0) index = slots.length - 1;
  return { idx: index, slot: slots[index] };
}

// Schedule the next update when hora or tithi changes
function scheduleNextChange(slots, handler) {
  let now = new Date();
  let curMin = now.getHours()*60 + now.getMinutes();
  let upcoming = slots
    .map(s => {
      let [h,m] = s.start.split(":").map(Number);
      let t = h*60 + m;
      if (t <= curMin) t += 24*60;
      return { timeMin: t, s };
    })
    .sort((a,b) => a.timeMin - b.timeMin)[0];
  let diff = (upcoming.timeMin - curMin)*60*1000;
  if (nextTimeout) clearTimeout(nextTimeout);
  nextTimeout = setTimeout(handler, diff + 500);
}

// Variables to hold current values
let bHora = "", bTithi = "", bVara = "", bDate = 0;

function drawTime() {
  let now = new Date();
  let hours = ("0" + now.getHours()).substr(-2);
  let minutes = ("0" + now.getMinutes()).substr(-2);
  let timeStr = hours + ":" + minutes;

  // Clear top half
  g.reset();
  g.clearRect(0,0,176,88);
  g.setFont("Vector", 52);
  g.setFontAlign(0,0);
  g.setColor("#fff");
  g.drawString(timeStr, 88, 44);
}

function drawSeparator() {
  // Draw rainbow line at 50% vertical
  let colors = ["#f00","#f80","#ff0","#0f0","#00f","#408","#f0f"];
  let y = 88;
  let width = 176;
  for (let i = 0; i < width; i++) {
    g.setColor(colors[i % colors.length]);
    g.drawPixel(i, y);
  }
}

function drawTithi() {
  g.setFont("Vector", 18);
  g.setFontAlign(-1, -1);
  g.setColor("#fff");
  // Clear 50-75% vertical zone
  g.clearRect(0, 88, 176, 132);
  // Wrap text within 25% width (44px)
  let text = bTithi;
  let maxWidth = 44;
  let x = 2, y = 90;
  // naive wrap
  let words = text.split(" ");
  let line = "";
  for (let w of words) {
    let testLine = line + w + " ";
    if (g.stringWidth(testLine) > maxWidth) {
      g.drawString(line, x, y);
      line = w + " ";
      y += 20;
    } else {
      line = testLine;
    }
  }
  g.drawString(line, x, y);
}

function drawHora() {
  // Clear 75-100% vertical zone
  g.clearRect(44, 88, 176, 176);

  // Draw horizontal divider between VE and RA
  let midX = (176 + 44) / 2;
  g.setColor("#fff");
  // Draw rainbow line for divider
  let colors = ["#f00","#f80","#ff0","#0f0","#00f","#408","#f0f"];
  for(let i = 44; i < 176; i++) {
    g.setColor(colors[(i-44) % colors.length]);
    g.drawPixel(i, 132);
  }

  // Draw current hora on left half
  g.setFont("Vector", 28);
  g.setFontAlign(-1, 0);
  g.setColor(horaColor(bHora));
  g.drawString(bHora, 50, 110);

  // Draw Vara lord (not hardcoded) on right half
  g.setFont("Vector", 28);
  g.setFontAlign(-1, 0);
  g.setColor("#fff");
  g.drawString(getVaraLord(bVara), 120, 110);

  // Draw date at right edge below
  g.setFont("Vector", 14);
  g.setFontAlign(1, 1);
  g.setColor("#fff");
  g.drawString(bDate.toString(), 172, 160);
}

function redrawAll() {
  drawTime();
  drawSeparator();
  drawTithi();
  drawHora();
}

// Update hora & schedule next update
function updateHora() {
  let cur = getCurrentSlot(panchangData.hora);
  bHora = cur.slot.planet;
  Bangle.buzz([100,50,100]);
  redrawAll();
  scheduleNextChange(panchangData.hora, updateHora);
}

// Update tithi & schedule next update
function updateTithi() {
  let cur = getCurrentSlot(panchangData.tithi);
  bTithi = cur.slot.name + " - " + cur.slot.type;
  redrawAll();
  scheduleNextChange(panchangData.tithi, updateTithi);
}

// Init function
function init() {
  Bangle.loadWidgets();
  Bangle.drawWidgets();
  g.clear();
  Bangle.setLCDTimeout(0);
  Bangle.setUI();

  // Load data
  panchangData = loadTodayData();
  if (!panchangData) return;

  let d = new Date();
  bVara = d.toLocaleString('en-US', {weekday:'short'}).toUpperCase().slice(0,2);
  bDate = d.getDate();

  // Set initial values
  let curH = getCurrentSlot(panchangData.hora).slot.planet;
  let curT = getCurrentSlot(panchangData.tithi);
  bHora = curH;
  bTithi = curT.slot.name + " - " + curT.slot.type;

  redrawAll();

  // Schedule updates
  scheduleNextChange(panchangData.hora, updateHora);
  scheduleNextChange(panchangData.tithi, updateTithi);

  // Refresh at midnight to reload new day data
  E.on('midnight', () => {
    panchangData = loadTodayData();
    bDate = new Date().getDate();
    redrawAll();
    scheduleNextChange(panchangData.hora, updateHora);
    scheduleNextChange(panchangData.tithi, updateTithi);
  });

  // Redraw time every minute
  setInterval(drawTime, 60000);

  // Exit to launcher on BTN1 press
  setWatch(() => load(), BTN1, { edge:"rising", repeat:false });
}

// Start app
init();
