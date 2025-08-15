import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
  getDatabase,
  ref,
  get,
  set,
  update,
  push,
  remove,
  child
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDdNI04D1xhQihN3DBDdF1_YAp6XRcErDw",
  authDomain: "maps3-986-ffbbd.firebaseapp.com",
  databaseURL: "https://maps3-986-ffbbd-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "maps3-986-ffbbd",
  storageBucket: "maps3-986-ffbbd.appspot.com",
  messagingSenderId: "701191378459",
  appId: "1:701191378459:web:d2cf8d869f5"
};
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const dbRef = ref(db, "coordinates");

const map = L.map("map", {
  crs: L.CRS.Simple,
  minZoom: -5,
  maxZoom: 2,
  zoomSnap: 0.5
});
const bounds = [[0, 0], [1000, 1000]];
L.rectangle(bounds, { color: "#ccc", weight: 1 }).addTo(map);
map.fitBounds(bounds);

for (let i = 0; i <= 1000; i += 100) {
  L.polyline([[0, i], [1000, i]], { color: "#eee", weight: 1 }).addTo(map);
  L.polyline([[i, 0], [i, 1000]], { color: "#eee", weight: 1 }).addTo(map);
}

let coordinateData = {};

function getColorByLevel(level) {
  switch (String(level)) {
    case "1": return "blue";
    case "2": return "green";
    case "3": return "orange";
    case "4": return "red";
    case "5": return "purple";
    default: return "gray";
  }
}

function drawMarkers() {
  map.eachLayer(layer => {
    if (layer instanceof L.CircleMarker) map.removeLayer(layer);
  });

  Object.entries(coordinateData).forEach(([key, data]) => {
    if (data.取得状況 !== "未取得") return;
    const color = getColorByLevel(data.レベル);
    const marker = L.circleMarker([data.Y, data.X], {
      radius: 6,
      color: color,
      fillOpacity: 0.8
    }).addTo(map);

    const popup = `
      <b>${data.サーバー名}</b><br>
      (${data.X}, ${data.Y})<br>
      Lv: ${data.レベル}<br>
      ${data.目印 ? "目印: " + data.目印 + "<br>" : ""}
      <button onclick="window.changeStatus('${key}')">✅取得済みに</button>
      <button onclick="window.deleteData('${key}')">🗑削除</button>
    `;
    marker.bindPopup(popup);
  });
}

async function fetchData() {
  const snapshot = await get(dbRef);
  coordinateData = snapshot.exists() ? snapshot.val() : {};
  window.coordinateData = coordinateData;
  drawMarkers();
}
fetchData();

window.registerCoordinate = async function () {
  const X = Number(document.getElementById("x").value);
  const Y = Number(document.getElementById("y").value);
  const サーバー名 = document.getElementById("server").value.trim();
  const レベル = document.getElementById("level").value;
  const 目印 = document.getElementById("mark").value.trim();
  if (!X || !Y || !サーバー名) return alert("全ての項目を入力してください");

  const snapshot = await get(dbRef);
  let foundKey = null;
  snapshot.forEach(child => {
    const data = child.val();
    if (data.X == X && data.Y == Y && data.サーバー名 == サーバー名) {
      foundKey = child.key;
    }
  });

  const newData = { X, Y, サーバー名, レベル, 目印, 取得状況: "未取得" };
  if (foundKey) {
    await update(child(dbRef, foundKey), newData);
  } else {
    await push(dbRef, newData);
  }
  document.getElementById("x").value = "";
  document.getElementById("y").value = "";
  document.getElementById("server").value = "";
  document.getElementById("mark").value = "";
  await fetchData();
};

window.changeStatus = async function (key) {
  if (!coordinateData[key]) return;
  await update(child(dbRef, key), { 取得状況: "取得済み" });
  await fetchData();
};

window.deleteData = async function (key) {
  if (!confirm("削除してよろしいですか？")) return;
  await remove(child(dbRef, key));
  await fetchData();
};

window.cleanDuplicates = async function () {
  const snapshot = await get(dbRef);
  const seen = {};
  const deletions = [];
  snapshot.forEach(child => {
    const d = child.val();
    const k = `${d.X}_${d.Y}_${d.サーバー名}`;
    if (seen[k]) deletions.push(child.key);
    else seen[k] = true;
  });
  for (const key of deletions) await remove(child(dbRef, key));
  await fetchData();
};

window.exportCSV = function (status) {
  const headers = ["サーバー名", "X", "Y", "レベル", "目印"];
  const rows = [headers];
  Object.values(coordinateData).forEach(d => {
    if (d.取得状況 === status) {
      rows.push([d.サーバー名, d.X, d.Y, d.レベル, d.目印 || ""]);
    }
  });
  const csv = rows.map(e => e.join(",")).join("\r\n");
  const bom = "\uFEFF";
  const blob = new Blob([bom + csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${status}_list.csv`;
  link.click();
};

window.importCSV = function () {
  const text = document.getElementById("csvInput").value.trim();
  if (!text) return alert("CSVを貼り付けてください");
  const lines = text.split("\n").map(l => l.trim()).filter(l => l);
  const body = lines.slice(1);
  body.forEach(async (line) => {
    const [サーバー名, X, Y, レベル, 目印] = line.split(",");
    const data = { サーバー名, X: Number(X), Y: Number(Y), レベル, 目印: 目印 || "", 取得状況: "未取得" };
    const snapshot = await get(dbRef);
    let foundKey = null;
    snapshot.forEach(child => {
      const d = child.val();
      if (d.X == data.X && d.Y == data.Y && d.サーバー名 == data.サーバー名) {
        foundKey = child.key;
      }
    });
    if (foundKey) await update(child(dbRef, foundKey), data);
    else await push(dbRef, data);
    await fetchData();
  });
  document.getElementById("csvInput").value = "";
};
