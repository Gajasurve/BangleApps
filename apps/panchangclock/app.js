const Storage = require("Storage");

let panchangData, nextTimeout;

function horaColor(hora) {
  if (["VE", "MO", "JUP"].includes(hora)) return "#00ff00";
  if (["ME", "MA"].includes(hora)) return "#ffff00";
  return "#ffffff";
}

function loadTodayData() {
  let today = new Date().toISOString().slice(0, 10);
  let json = Storage.readJSON("panchang-2025.json", 1e4);
  if (!json || !json[today]) {
    g.clear();
    g.setFontAlign(0, 0);
    g.setFont("Vector", 20);
    g.drawString("No Panchang data for today", 88, 88);
    return null;
  }
  return json[today];
}

function getCurrentSlot(slots) {
  let now = new Date();
  let cur = now.getHours() * 60 + now.getMinutes();
  let best = slots[0];
  for (let i = 0; i < slots.length; i++) {
    let t = slots[i].start.split(":").map(x => parseInt(x, 10));
    let minutes = t[0] * 60 + t[1];
    if (minutes <= cur) best = slots[i];
  }
  return { slot: best };
}

function scheduleNextChange(slots, handler) {
  let now = new Date();
  let curMin = now.getHours() * 60 + now.getMinutes();
  let minDiff = Infinity;
  for (let s of slots) {
    let [h, m] = s.start.split(":").map(Number);
    let t = h * 60 + m;
    if (t <= curMin) t += 24 * 60;
    minDiff = Math.min(minDiff, t - curMin);
  }
  if (nextTimeout) clearTimeout(nextTimeout);
  nextTimeout = setTimeout(handler, minDiff * 60 * 1000 + 500);
}

// Vara to Lord mapping
function getVaraLord(day) {
  return ["SU", "MO", "MA", "BU", "GU", "VE", "SA"][day];
}

let bHora = "", bTithi = "", bVara = "", bDate = 0;

function drawTime() {
  let now = new Date();
  let h = ("0" + now.getHours()).slice(-2);
  let m = ("0" + now.getMinutes()).slice(-2);
  g.setFont("Vector", 40);
  g.setFontAlign(0, 0);
  g.setColor("#ffffff");
  g.clearRect(0, 0, 176, 50);
  g.drawString(`${h}:${m}`, 88, 25);
}

function drawSeparator() {
  g.setColor("#999");
  g.drawLine(0, 52, 175, 52);
}

function drawTithi() {
  g.clearRect(0, 53, 176, 100);
  g.setFont("Vector", 16);
  g.setFontAlign(0, -1);
  g.setColor("#ffffff");

  let words = bTithi.split(" ");
  let lines = [];
  let line = "";
  for (let word of words) {
    let test = line + word + " ";
    if (g.stringWidth(test) > 160) {
      lines.push(line.trim());
      line = word + " ";
    } else {
      line = test;
    }
  }
  if (line) lines.push(line.trim());

  let y = 55;
  for (let l of lines.slice(0, 2)) {
    g.drawString(l, 88, y);
    y += 18;
  }
}

function drawBottom() {
  g.clearRect(0, 101, 176, 176);

  // Rainbow line
  const colors = ["#f00", "#f80", "#ff0", "#0f0", "#00f", "#408", "#f0f"];
  for (let i = 0; i < 176; i++) {
    g.setColor(colors[i % colors.length]);
    g.drawLine(i, 101, i, 101);
  }

  // Hora (left)
  g.setFont("Vector", 28);
  g.setFontAlign(0, 0);
  g.setColor(horaColor(bHora));
  g.drawString(bHora, 44, 135);

  // Vara (center)
  g.setFont("Vector", 20);
  g.setColor("#ffffff");
  g.drawString(bVara, 88, 135);

  // Date (right)
  g.setFont("Vector", 24);
  g.drawString(bDate.toString(), 132, 135);
}

function redrawAll() {
  drawTime();
  drawSeparator();
  drawTithi();
  drawBottom();
}

function updateHora() {
  let cur = getCurrentSlot(panchangData.hora);
  bHora = cur.slot.planet;
  Bangle.buzz([80, 40, 80]);
  redrawAll();
  scheduleNextChange(panchangData.hora, updateHora);
}

function updateTithi() {
  let cur = getCurrentSlot(panchangData.tithi);
  bTithi = cur.slot.name + " - " + cur.slot.type;
  redrawAll();
  scheduleNextChange(panchangData.tithi, updateTithi);
}

function init() {
  Bangle.loadWidgets();
  Bangle.drawWidgets();
  g.clear();
  Bangle.setLCDTimeout(0);
  Bangle.setUI();

  panchangData = loadTodayData();
  if (!panchangData) return;

  let now = new Date();
  bVara = getVaraLord(now.getDay());
  bDate = now.getDate();

  let curH = getCurrentSlot(panchangData.hora).slot.planet;
  let curT = getCurrentSlot(panchangData.tithi);
  bHora = curH;
  bTithi = curT.slot.name + " - " + curT.slot.type;

  redrawAll();
  scheduleNextChange(panchangData.hora, updateHora);
  scheduleNextChange(panchangData.tithi, updateTithi);

  setInterval(drawTime, 60000);

  E.on('midnight', () => {
    panchangData = loadTodayData();
    bDate = new Date().getDate();
    redrawAll();
    scheduleNextChange(panchangData.hora, updateHora);
    scheduleNextChange(panchangData.tithi, updateTithi);
  });

  setWatch(() => load(), BTN1, { edge: "rising", repeat: false });
}

init();
