require("Storage");

let panchangData, nextTimeout;

// Color helper for hora
function horaColor(hora) {
  if (["VE", "MO", "JUP"].includes(hora)) return "#00ff00";
  if (["ME", "MA"].includes(hora)) return "#ffff00";
  return "#ffffff";
}

// Load today's panchang data from storage
function loadTodayData() {
  let today = new Date().toISOString().slice(0, 10);
  let json = require("Storage").readJSON("panchang-2025.json", 1e4);
  if (!json || !json[today]) return null;
  return json[today];
}

// Get current slot (tithi or hora)
function getCurrentSlot(slots) {
  let now = new Date();
  let cur = now.getHours() * 60 + now.getMinutes();
  let latest = null;
  for (let i = 0; i < slots.length; i++) {
    let [h, m] = slots[i].start.split(":").map(Number);
    let t = h * 60 + m;
    if (t <= cur) latest = slots[i];
  }
  return latest || slots[slots.length - 1];
}

// Schedule next change (tithi/hora)
function scheduleNextChange(slots, cb) {
  let now = new Date();
  let curMin = now.getHours() * 60 + now.getMinutes();
  let upcoming = slots.map(s => {
    let [h, m] = s.start.split(":").map(Number);
    let t = h * 60 + m;
    if (t <= curMin) t += 1440;
    return { time: t, s };
  }).sort((a, b) => a.time - b.time)[0];

  let delay = (upcoming.time - curMin) * 60000;
  if (nextTimeout) clearTimeout(nextTimeout);
  nextTimeout = setTimeout(cb, delay + 1000);
}

// Draw top clock
function drawTime() {
  let now = new Date();
  let timeStr = now.getHours().toString().padStart(2, "0") + ":" +
                now.getMinutes().toString().padStart(2, "0");

  g.setColor("#ffffff");
  g.setFont("Vector", 48);
  g.setFontAlign(0, 0);
  g.clearRect(0, 0, 176, 60);
  g.drawString(timeStr, 88, 30);
}

// Draw rainbow separator line
function drawRainbowLine(y) {
  const colors = ["#FF0000", "#FF7F00", "#FFFF00", "#00FF00", "#0000FF", "#4B0082", "#9400D3"];
  const segment = Math.floor(176 / colors.length);
  for (let i = 0; i < colors.length; i++) {
    g.setColor(colors[i]);
    g.fillRect(i * segment, y, (i + 1) * segment - 1, y + 2);
  }
}

// Draw tithi in center
function drawTithi(tithi) {
  g.setFont("Vector", 14);
  g.setFontAlign(-1, -1);
  g.setColor("#ffffff");
  g.clearRect(0, 64, 176, 120);

  const words = (tithi || "").split(" ");
  let line = "", y = 70;

  for (let w of words) {
    let test = line + w + " ";
    if (g.stringWidth(test) > 170) {
      g.drawString(line, 4, y);
      y += 18;
      line = w + " ";
    } else {
      line = test;
    }
  }
  if (line) g.drawString(line, 4, y);
}

// Draw bottom: hora + vara + date
function drawBottom(hora, vara, date) {
  g.setFont("Vector", 24);
  g.setFontAlign(0, 0);

  g.clearRect(0, 122, 176, 176);

  // Hora (left)
  g.setColor(horaColor(hora));
  g.drawString(hora, 44, 145);

  // Vara (right)
  g.setColor("#ffffff");
  g.drawString(vara, 132, 145);

  // Date (bottom right corner)
  g.setFont("Vector", 16);
  g.setFontAlign(1, 1);
  g.drawString(date.toString(), 172, 174);
}

// Global state
let bHora = "", bTithi = "", bVara = "", bDate = 0;

function redrawAll() {
  drawTime();
  drawRainbowLine(60);
  drawTithi(bTithi);
  drawBottom(bHora, bVara, bDate);
}

function updateHora() {
  let slot = getCurrentSlot(panchangData.hora);
  bHora = slot.planet;
  Bangle.buzz([100, 50, 100]);
  redrawAll();
  scheduleNextChange(panchangData.hora, updateHora);
}

function updateTithi() {
  let slot = getCurrentSlot(panchangData.tithi);
  bTithi = slot.name + " - " + slot.type;
  redrawAll();
  scheduleNextChange(panchangData.tithi, updateTithi);
}

// INIT
function init() {
  Bangle.loadWidgets();
  Bangle.drawWidgets();
  g.clear();
  Bangle.setUI();
  Bangle.setLCDTimeout(0);

  panchangData = loadTodayData();
  if (!panchangData) {
    g.setFont("Vector", 16);
    g.setFontAlign(0, 0);
    g.drawString("No Panchang data", 88, 88);
    return;
  }

  const weekdayMap = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
  let d = new Date();
  bVara = weekdayMap[d.getDay()];
  bDate = d.getDate();

  bHora = getCurrentSlot(panchangData.hora).planet;
  let tSlot = getCurrentSlot(panchangData.tithi);
  bTithi = tSlot.name + " - " + tSlot.type;

  redrawAll();
  scheduleNextChange(panchangData.hora, updateHora);
  scheduleNextChange(panchangData.tithi, updateTithi);

  setInterval(drawTime, 60000);
  E.on("midnight", () => load()); // refresh full app on day change
  setWatch(() => load(), BTN1, { repeat: false, edge: "rising" });
}

init();
