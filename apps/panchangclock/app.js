const Storage = require("Storage");


let panchangData, nextTimeout;

// Color helper for hora
function horaColor(hora) {
  if (["VE", "MO", "JUP"].includes(hora)) return "#00ff00";
  if (["ME", "MA"].includes(hora)) return "#ffff00";
  return "#ffffff";
}

// Load today's panchang data from storage Ok. 
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
  let index = -1;
  for (let i = 0; i < slots.length; i++) {
    let parts = slots[i].start.split(":");
    let h = parseInt(parts[0]);
    let m = parseInt(parts[1]);
    let t = h * 60 + m;
    if (t <= cur) index = i;
  }
  if (index < 0) index = slots.length - 1;
  return { idx: index, slot: slots[index] };
}

// Schedule the next update when hora or tithi changes
function scheduleNextChange(slots, handler) {
  let now = new Date();
  let curMin = now.getHours()*60 + now.getMinutes();
  let minDiff = Infinity;
  for (let i = 0; i < slots.length; i++) {
    let parts = slots[i].start.split(":");
    let h = parseInt(parts[0]);
    let m = parseInt(parts[1]);
    let t = h * 60 + m;
    if (t <= curMin) t += 24*60;
    let diff = t - curMin;
    if (diff < minDiff) {
      minDiff = diff;
    }
  }
  if (nextTimeout) clearTimeout(nextTimeout);
  nextTimeout = setTimeout(handler, minDiff * 60 * 1000 + 500);
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
    g.drawLine(i, y, i, y); // Replace drawPixel
  }
}

function drawTithi() {
  g.setFont("Vector", 18);
  g.setFontAlign(-1, -1);
  g.setColor("#fff");
  g.clearRect(0, 88, 176, 132);
  let text = bTithi;
  let maxWidth = 44;
  let x = 2, y = 90;
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
  g.clearRect(44, 88, 176, 176);
  let midX = (176 + 44) / 2;
  let colors = ["#f00","#f80","#ff0","#0f0","#00f","#408","#f0f"];
  for(let i = 44; i < 176; i++) {
    g.setColor(colors[(i-44) % colors.length]);
    g.drawLine(i, 132, i, 132);
  }

  g.setFont("Vector", 28);
  g.setFontAlign(-1, 0);
  g.setColor(horaColor(bHora));
  g.drawString(bHora, 50, 110);

  g.setFont("Vector", 28);
  g.setFontAlign(-1, 0);
  g.setColor("#fff");
  g.drawString(bVara, 120, 110);

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

function updateHora() {
  let cur = getCurrentSlot(panchangData.hora);
  bHora = cur.slot.planet;
  Bangle.buzz([100,50,100]);
  redrawAll();
  scheduleNextChange(panchangData.hora, updateHora);
}

function updateTithi() {
  let cur = getCurrentSlot(panchangData.tithi);
  bTithi = cur.slot.name + " - " + cur.slot.type;
  redrawAll();
  scheduleNextChange(panchangData.tithi, updateTithi);
}

// Init
function init() {
  Bangle.loadWidgets();
  Bangle.drawWidgets();
  g.clear();
  Bangle.setLCDTimeout(0);
  Bangle.setUI();

  panchangData = loadTodayData();
  if (!panchangData) return;

  let d = new Date();
  const weekdayMap = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
  bVara = weekdayMap[d.getDay()];
  bDate = d.getDate();

  let curH = getCurrentSlot(panchangData.hora).slot.planet;
  let curT = getCurrentSlot(panchangData.tithi);
  bHora = curH;
  bTithi = curT.slot.name + " - " + curT.slot.type;

  redrawAll();

  scheduleNextChange(panchangData.hora, updateHora);
  scheduleNextChange(panchangData.tithi, updateTithi);

  E.on('midnight', () => {
    panchangData = loadTodayData();
    bDate = new Date().getDate();
    redrawAll();
    scheduleNextChange(panchangData.hora, updateHora);
    scheduleNextChange(panchangData.tithi, updateTithi);
  });

  setInterval(drawTime, 60000);
  setWatch(() => load(), BTN1, { edge:"rising", repeat:false });
}

init();
