const Storage = require("Storage");

let panchangData, nextHoraTimeout, nextTithiTimeout;

// Helper to get color based on Hora planet
function horaColor(planet) {
  if (["VE", "MO", "JUP"].indexOf(planet) !== -1) return "#00ff00";
  if (["ME", "MA"].indexOf(planet) !== -1) return "#ffff00";
  return "#ffffff";
}

// Load Panchang data
function loadTodayData() {
  const today = new Date().toISOString().slice(0, 10);
  const json = Storage.readJSON("panchang-2025.json", 1);
  if (!json || !json[today]) {
    g.clear();
    g.setFontAlign(0, 0);
    g.setFont("Vector", 18);
    g.drawString("No Panchang data", g.getWidth() / 2, g.getHeight() / 2);
    return null;
  }
  return json[today];
}

// Get current slot from slot list
function getCurrentSlot(slots) {
  const now = new Date();
  const curMin = now.getHours() * 60 + now.getMinutes();
  let idx = -1;

  for (let i = 0; i < slots.length; i++) {
    const parts = slots[i].start.split(":");
    const t = parseInt(parts[0]) * 60 + parseInt(parts[1]);
    if (t <= curMin) idx = i;
  }

  if (idx === -1) idx = slots.length - 1;
  return { idx: idx, slot: slots[idx] };
}

// Schedule next change
function scheduleNextChange(slots, handler, isHora) {
  const now = new Date();
  const curMin = now.getHours() * 60 + now.getMinutes();

  let upcoming = null;
  for (let i = 0; i < slots.length; i++) {
    const parts = slots[i].start.split(":");
    let t = parseInt(parts[0]) * 60 + parseInt(parts[1]);
    if (t <= curMin) t += 24 * 60; // handle wrap-around
    const diff = t - curMin;
    if (!upcoming || diff < upcoming.diff) {
      upcoming = { diff: diff, slot: slots[i] };
    }
  }

  const timeout = upcoming.diff * 60 * 1000 + 500;
  const oldTimeout = isHora ? nextHoraTimeout : nextTithiTimeout;
  if (oldTimeout) clearTimeout(oldTimeout);

  const tid = setTimeout(handler, timeout);
  if (isHora) nextHoraTimeout = tid;
  else nextTithiTimeout = tid;
}

// Globals
let bHora = "", bTithi = "", bVara = "", bDate = 0;

// Draw current time
function drawTime() {
  const now = new Date();
  const hours = ("0" + now.getHours()).substr(-2);
  const minutes = ("0" + now.getMinutes()).substr(-2);
  const timeStr = hours + ":" + minutes;

  g.reset();
  g.clearRect(0, 0, 176, 70);
  g.setFont("Vector", 48);
  g.setFontAlign(0, 0);
  g.setColor("#ffffff");
  g.drawString(timeStr, 88, 35);
}

// Draw separators
function drawSeparator() {
  g.setColor("#888888");
  g.drawLine(0, 70, 175, 70);
  g.drawLine(0, 132, 175, 132);
  g.drawLine(88, 132, 88, 176);
}

// Draw Tithi with wrapping
function drawTithi() {
  g.setFont("Vector", 14);
  g.setFontAlign(-1, -1);
  g.setColor("#ffffff");
  g.clearRect(0, 70, 176, 132);

  const words = bTithi.split(" ");
  let x = 2, y = 74;
  let line = "";

  for (let i = 0; i < words.length; i++) {
    const test = line + words[i] + " ";
    if (g.stringWidth(test) > 172) {
      g.drawString(line, x, y);
      y += 16;
      line = words[i] + " ";
    } else {
      line = test;
    }
  }
  g.drawString(line, x, y);
}

// Draw Hora
function drawHora() {
  g.clearRect(0, 132, 176, 176);
  g.setFont("Vector", 22);
  g.setFontAlign(0, 0);
  g.setColor(horaColor(bHora));
  g.drawString(bHora, 44, 152);

  g.setColor("#ffffff");
  g.drawString(bVara, 132, 152);

  g.setFont("Vector", 16);
  g.setFontAlign(1, 1);
  g.drawString(bDate.toString(), 172, 172);
}

function redrawAll() {
  drawTime();
  drawSeparator();
  drawTithi();
  drawHora();
}

// Update hora
function updateHora() {
  const cur = getCurrentSlot(panchangData.hora);
  bHora = cur.slot.planet;
  Bangle.buzz([100, 50, 100]);
  redrawAll();
  scheduleNextChange(panchangData.hora, updateHora, true);
}

// Update tithi
function updateTithi() {
  const cur = getCurrentSlot(panchangData.tithi);
  bTithi = cur.slot.name + " - " + cur.slot.type;
  redrawAll();
  scheduleNextChange(panchangData.tithi, updateTithi, false);
}

// Initialize
function init() {
  Bangle.loadWidgets();
  Bangle.drawWidgets();
  g.clear();
  Bangle.setLCDTimeout(0);
  Bangle.setUI();

  panchangData = loadTodayData();
  if (!panchangData) return;

  const now = new Date();
  const weekdayMap = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
  bVara = (panchangData.vara && panchangData.vara.lord) || weekdayMap[now.getDay()];
  bDate = now.getDate();

  const curH = getCurrentSlot(panchangData.hora).slot.planet;
  const curT = getCurrentSlot(panchangData.tithi);
  bHora = curH;
  bTithi = curT.slot.name + " - " + curT.slot.type;

  redrawAll();

  scheduleNextChange(panchangData.hora, updateHora, true);
  scheduleNextChange(panchangData.tithi, updateTithi, false);

  E.on("midnight", () => {
    panchangData = loadTodayData();
    bDate = new Date().getDate();
    redrawAll();
    scheduleNextChange(panchangData.hora, updateHora, true);
    scheduleNextChange(panchangData.tithi, updateTithi, false);
  });

  setInterval(drawTime, 60000);
  setWatch(() => load(), BTN1, { edge: "rising", repeat: false });
}

init();
