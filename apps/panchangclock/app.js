let panchangData, nextTimeout;

function horaColor(h) {
  if (["VE", "MO", "JUP"].includes(h)) return "#0f0";
  if (["ME", "MA"].includes(h)) return "#ff0";
  return "#fff";
}
function loadTodayData() {
  let d = new Date().toISOString().slice(0, 10);
  let j = Storage.readJSON("panchang-2025.json", 1e4);
  return j && j[d] ? j[d] : null;
}
function getCurrentSlot(slots) {
  let now = new Date(), cur = now.getHours() * 60 + now.getMinutes();
  let idx = slots.map(s => {
    let [h, m] = s.start.split(":").map(Number);
    return h * 60 + m;
  }).filter(t => t <= cur).length - 1;
  return slots[idx >= 0 ? idx : slots.length - 1];
}
function scheduleNext(slots, fn) {
  let now = new Date(), cur = now.getHours() * 60 + now.getMinutes();
  let next = slots.map(s => {
    let [h, m] = s.start.split(":").map(Number), t = h * 60 + m;
    if (t <= cur) t += 1440;
    return { t, s };
  }).sort((a, b) => a.t - b.t)[0];
  clearTimeout(nextTimeout);
  nextTimeout = setTimeout(fn, (next.t - cur) * 60 * 1000 + 500);
}

let bHora, bTithi, bDate;
function drawAll() {
  g.clear();
  let now = new Date();
  g.setFont("Vector", 52).setColor("#fff").setFontAlign(0, 0).drawString(
    ("0" + now.getHours()).slice(-2) + ":" + ("0" + now.getMinutes()).slice(-2),
    88, 44
  );

  // Rainbow separator
  let c = ["#f00", "#f80", "#ff0", "#0f0", "#0ff", "#00f", "#808"];
  for (let x = 0; x < 176; x++) g.setColor(c[x % c.length]).drawPixel(x, 88);

  g.setFont("Vector", 18).setColor("#fff").setFontAlign(-1, -1);
  g.drawString(bTithi, 2, 96);

  g.setFont("Vector", 28).setColor(horaColor(bHora)).setFontAlign(0, 0);
  g.drawString(bHora, 88, 132);

  g.setFont("Vector", 14).setFontAlign(1, 1).setColor("#fff");
  g.drawString(bDate, 172, 168);
}
function updateHora() {
  bHora = getCurrentSlot(panchangData.hora).planet;
  Bangle.buzz([100, 50, 100]);
  drawAll();
  scheduleNext(panchangData.hora, updateHora);
}
function updateTithi() {
  let t = getCurrentSlot(panchangData.tithi);
  bTithi = t.name + " - " + t.type;
  drawAll();
  scheduleNext(panchangData.tithi, updateTithi);
}
function start() {
  Bangle.loadWidgets(); Bangle.drawWidgets();
  g.clear(); Bangle.setUI(); Bangle.setLCDTimeout(0);
  panchangData = loadTodayData();
  if (!panchangData) {
    g.setFont("6x8").setFontAlign(0, 0).drawString("No data!", 88, 88);
    return;
  }
  bDate = new Date().getDate();
  updateHora(); updateTithi();
  setInterval(drawAll, 60000);
  E.on("midnight", () => {
    panchangData = loadTodayData();
    bDate = new Date().getDate();
    updateHora(); updateTithi();
  });
  setWatch(() => load(), BTN1, { edge: "rising", repeat: false });
}
start();
