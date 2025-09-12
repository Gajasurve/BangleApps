const Storage = require("Storage");

let panchangData;
let horaTimeout, tithiTimeout;

let bHora = "", bTithi = "", bVara = "", bDate = 0;

// Color for each planet
function horaColor(planet) {
  switch (planet) {
    case "VE": return "#00FF00";
    case "MO": return "#00FFFF";
    case "JUP": return "#FFD700";
    case "ME": return "#FFFF00";
    case "MA": return "#FF0000";
    case "SA": return "#8888FF";
    case "RA": return "#FF00FF";
    case "SU": return "#FFA500";
    default: return "#FFFFFF";
  }
}

function loadTodayData() {
  let today = new Date().toISOString().slice(0, 10);
  let json = Storage.readJSON("panchang-2025.json", 1);
  if (!json || !json[today]) {
    g.clear();
    g.setFontAlign(0, 0);
    g.setFont("Vector", 18);
    g.setColor("#FFFFFF");
    g.drawString("No Panchang data", g.getWidth() / 2, g.getHeight() / 2);
    return null;
  }
  return json[today];
}

function getCurrentSlot(slots) {
  let now = new Date();
  let curMin = now.getHours() * 60 + now.getMinutes();
  let idx = -1;
  for (let i = 0; i < slots.length; i++) {
    let parts = slots[i].start.split(":");
    let h = parseInt(parts[0]), m = parseInt(parts[1]);
    let slotMin = h * 60 + m;
    if (slotMin <= curMin) idx = i;
  }
  if (idx === -1) idx = slots.length - 1;
  return { idx: idx, slot: slots[idx] };
}

function scheduleNextChange(slots, handler) {
  let now = new Date();
  let curMin = now.getHours() * 60 + now.getMinutes();

  let next = slots
    .map(s => {
      let parts = s.start.split(":");
      let h = parseInt(parts[0]), m = parseInt(parts[1]);
      let t = h * 60 + m;
      if (t <= curMin) t += 24 * 60;
      return { timeMin: t, s: s };
    })
    .sort((a, b) => a.timeMin - b.timeMin)[0];

  let diffMs = (next.timeMin - curMin) * 60 * 1000;
  return setTimeout(handler, diffMs + 500);
}

function drawTime() {
  let now = new Date();
  let h = ("0" + now.getHours()).substr(-2);
  let m = ("0" + now.getMinutes()).substr(-2);
  let timeStr = h + ":" + m;

  g.setColor("#FFFFFF");
  g.setFont("Vector", 40);
  g.setFontAlign(0, 0);
  g.clearRect(0, 0, 176, 60);
  g.drawString(timeStr, 88, 30);
}

function drawSeparator() {
  g.setColor("#888888");
  g.drawLine(0, 60, 176, 60);
  g.drawLine(0, 120, 176, 120);
}

function drawTithi() {
  g.clearRect(0, 60, 176, 120);
  g.setColor("#FFFFFF");
  g.setFont("6x8", 2);
  g.setFontAlign(-1, -1);
  let words = bTithi.split(" ");
  let x = 4, y = 64;
  let line = "";

  for (let i = 0; i < words.length; i++) {
    let testLine = line + words[i] + " ";
    if (g.stringWidth(testLine) > 168) {
      g.drawString(line, x, y);
      y += 16;
      line = words[i] + " ";
    } else {
      line = testLine;
    }
  }
  g.drawString(line, x, y);
}

function drawHora() {
  g.clearRect(0, 120, 176, 176);

  g.setFont("Vector", 20);
  g.setFontAlign(0, 0);
  g.setColor(horaColor(bHora));
  g.drawString(bHora, 44, 148);

  g.setColor("#FFFFFF");
  g.drawString(bVara, 132, 148);

  g.setFont("Vector", 14);
  g.setFontAlign(1, 1);
  g.drawString(bDate.toString(), 174, 174);
}

function redrawAll() {
  drawTime();
  drawSeparator();
  drawTithi();
  drawHora();
}

function updateHora() {
  let horaCur = getCurrentSlot(panchangData.hora);
  bHora = horaCur.slot.planet;
  redrawAll();
  horaTimeout = scheduleNextChange(panchangData.hora, updateHora);
}

function updateTithi() {
  let tithiCur = getCurrentSlot(panchangData.tithi);
  bTithi = tithiCur.slot.name + " - " + tithiCur.slot.type;
  redrawAll();
  tithiTimeout = scheduleNextChange(panchangData.tithi, updateTithi);
}

function init() {
  Bangle.loadWidgets();
  Bangle.drawWidgets();
  g.clear();
  Bangle.setLCDTimeout(0);
  Bangle.setUI();

  panchangData = loadTodayData();
  if (!panchangData) return;

  let d = new Date();
  let days = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
  bVara = (panchangData.vara && panchangData.vara.lord) || days[d.getDay()];
  bDate = d.getDate();

  let horaCur = getCurrentSlot(panchangData.hora);
  let tithiCur = getCurrentSlot(panchangData.tithi);
  bHora = horaCur.slot.planet;
  bTithi = tithiCur.slot.name + " - " + tithiCur.slot.type;

  redrawAll();

  horaTimeout = scheduleNextChange(panchangData.hora, updateHora);
  tithiTimeout = scheduleNextChange(panchangData.tithi, updateTithi);

  setInterval(drawTime, 60000);

  E.on("midnight", () => {
    panchangData = loadTodayData();
    bDate = new Date().getDate();
    updateHora();
    updateTithi();
  });

  setWatch(() => load(), BTN1, { edge: "rising", repeat: false });
}

init();
