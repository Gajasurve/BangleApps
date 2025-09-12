const Storage = require("Storage");

let panchangData, nextTimeout;

// Color helper for hora
function horaColor(hora) {
  if (["VE", "MO", "JUP"].includes(hora)) return "#00ff00";
  if (["ME", "MA"].includes(hora)) return "#ffff00";
  return "#ffffff";
}

// Local date in YYYY-MM-DD format
function getTodayDateStr() {
  let d = new Date();
  return d.getFullYear() + "-" +
         ("0" + (d.getMonth() + 1)).slice(-2) + "-" +
         ("0" + d.getDate()).slice(-2);
}

// Load today's panchang data
function loadTodayData() {
  let today = getTodayDateStr();
  let json = Storage.readJSON("panchang-2025.json", 1);

  if (!json || !json[today]) {
    g.clear();
    g.setFontAlign(0, 0);
    g.setFont("Vector", 18);
    g.drawString("No Panchang data", g.getWidth() / 2, g.getHeight() / 2);
    return null;
  }

  return json[today];
}

function getCurrentSlot(slots) {
  let now = new Date();
  let cur = now.getHours() * 60 + now.getMinutes();
  let idx = -1;
  for (let i = 0; i < slots.length; i++) {
    let parts = slots[i].start.split(":").map(x => parseInt(x));
    let t = parts[0] * 60 + parts[1];
    if (t <= cur) idx = i;
  }
  if (idx === -1) idx = slots.length - 1;
  return { idx, slot: slots[idx] };
}

function scheduleNextChange(slots, handler) {
  let now = new Date();
  let curMin = now.getHours() * 60 + now.getMinutes();
  let upcoming = slots
    .map(s => {
      let [h, m] = s.start.split(":").map(Number);
      let t = h * 60 + m;
      if (t <= curMin) t += 24 * 60;
      return { timeMin: t, s };
    })
    .sort((a, b) => a.timeMin - b.timeMin)[0];

  let diff = (upcoming.timeMin - curMin) * 60 * 1000;

  if (nextTimeout) clearTimeout(nextTimeout);
  nextTimeout = setTimeout(handler, diff + 500);
}

let bHora = "", bTithi = "", bVara = "", bDate = 0;

function drawTime() {
  let now = new Date();
  let hours = ("0" + now.getHours()).substr(-2);
  let minutes = ("0" + now.getMinutes()).substr(-2);
  let timeStr = hours + ":" + minutes;

  g.reset();
  g.clearRect(0, 0, 176, 70);
  g.setFont("Vector", 48);
  g.setFontAlign(0, 0);
  g.setColor("#ffffff");
  g.drawString(timeStr, 88, 35);
}

function drawSeparator() {
  g.setColor("#888888");
  g.drawLine(0, 70, 175, 70);
  g.drawLine(0, 132, 175, 132);
  g.drawLine(88, 132, 88, 176);
}

function drawTithi() {
  g.setFont("Vector", 14);
  g.setFontAlign(-1, -1);
  g.setColor("#ffffff");
  g.clearRect(0, 70, 176, 132);

  let words = bTithi.split(" ");
  let x = 2, y = 74;
  let line = "";
  for (let i = 0; i < words.length; i++) {
    let test = line + words[i] + " ";
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

function updateHora() {
  let cur = getCurrentSlot(panchangData.hora);
  bHora = cur.slot.planet;
  console.log("Updated Hora:", bHora);
  Bangle.buzz([100, 50, 100]);
  redrawAll();
  scheduleNextChange(panchangData.hora, updateHora);
}

function updateTithi() {
  let cur = getCurrentSlot(panchangData.tithi);
  bTithi = cur.slot.name + " - " + cur.slot.type;
  console.log("Updated Tithi:", bTithi);
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

  let d = new Date();
  const weekdayMap = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
  bVara = panchangData.vara?.lord || weekdayMap[d.getDay()];
  bDate = d.getDate();

  let curH = getCurrentSlot(panchangData.hora).slot.planet;
  let curT = getCurrentSlot(panchangData.tithi);
  bHora = curH;
  bTithi = curT.slot.name + " - " + curT.slot.type;

  redrawAll();

  scheduleNextChange(panchangData.hora, updateHora);
  scheduleNextChange(panchangData.tithi, updateTithi);

  E.on("midnight", () => {
    console.log("Midnight event triggered.");
    let newData = loadTodayData();
    if (newData) {
      panchangData = newData;
      bDate = new Date().getDate();
      redrawAll();
      scheduleNextChange(panchangData.hora, updateHora);
      scheduleNextChange(panchangData.tithi, updateTithi);
    } else {
      console.log("No panchang data for the new day.");
    }
  });

  setInterval(redrawAll, 60000); // redraw everything every minute
  setWatch(() => load(), BTN1, { edge: "rising", repeat: false });
}

init();
