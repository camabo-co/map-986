import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";

import {
  getDatabase,
  ref,
  push,
  get,
  child,
  update,
  remove
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";

// ✅ Firebase 初期化
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

const map = L.map('map', {
  crs: L.CRS.Simple,
  minZoom: -1,
  maxZoom: 4,
  zoomSnap: 0.5
}).setView([500, 500], 0);

const bounds = [[0, 0], [1000, 1000]];
L.rectangle(bounds, {color: "#666", weight: 1, fillOpacity: 0.05}).addTo(map);
map.setMaxBounds(bounds);

const gridSize = 1000;
for (let i = 0; i <= gridSize; i += 100) {
  L.polyline([[i, 0], [i, gridSize]], {color: "#ccc", weight: 1}).addTo(map);
  L.polyline([[0, i], [gridSize, i]], {color: "#ccc", weight: 1}).addTo(map);
}

const markers = new Map();

function renderMarker(id, data) {
  const { X, Y, サーバー名, レベル, 目印, 取得状況 } = data;
  const key = `${X}-${Y}`;
  if (取得状況 !== "未取得") return;
  if (markers.has(key)) return;

  const marker = L.circleMarker([Y, X], {
    radius: 6,
    color: getLevelColor(レベル),
    fillOpacity: 0.9
  }).addTo(map);

  marker.bindPopup(`
    <strong>${サーバー名}</strong><br/>
    X: ${X} / Y: ${Y}<br/>
    Lv: ${レベル}<br/>
    ${目印 ? `目印: ${目印}<br/>` : ""}
    <button onclick="changeStatus('${id}', '取得済み')">✅ 取得済みに</button><br/>
    <button onclick="deleteCoordinate('${id}')">🗑️ 削除</button>
  `);
  markers.set(key, marker);
}

function getLevelColor(level) {
  const colors = {
    "1": "#66c2a5", "2": "#fc8d62", "3": "#8da0cb",
    "4": "#e78ac3", "5": "#a6d854", "6": "#ffd92f", "7": "#e5c494"
  };
  return colors[level] || "#999";
}

async function loadCoordinates() {
  const snapshot = await get(child(ref(db), "coordinates"));
  if (snapshot.exists()) {
    markers.clear();
    map.eachLayer(layer => {
      if (layer instanceof L.CircleMarker) map.removeLayer(layer);
    });
    const data = snapshot.val();
    for (const [id, val] of Object.entries(data)) {
      renderMarker(id, val);
    }
  }
}
loadCoordinates();

document.getElementById("coordinateForm").addEventListener("submit", async e => {
  e.preventDefault();
  const form = e.target;
  const data = {
    サーバー名: form[0].value.trim(),
    X: parseInt(form[1].value),
    Y: parseInt(form[2].value),
    レベル: form[3].value,
    目印: form[4].value.trim(),
    取得状況: "未取得"
  };
  if (!data.サーバー名 || isNaN(data.X) || isNaN(data.Y) || !data.レベル) return;

  const snapshot = await get(child(ref(db), "coordinates"));
  const exists = snapshot.exists() && Object.values(snapshot.val()).some(coord =>
    coord.X == data.X && coord.Y == data.Y
  );
  if (exists) {
    for (const [id, coord] of Object.entries(snapshot.val())) {
      if (coord.X == data.X && coord.Y == data.Y) {
        await update(ref(db, `coordinates/${id}`), data);
        break;
      }
    }
  } else {
    await push(ref(db, "coordinates"), data);
  }
  form.reset();
  loadCoordinates();
});

window.changeStatus = async (id, status) => {
  await update(ref(db, `coordinates/${id}`), { 取得状況: status });
  loadCoordinates();
};

window.deleteCoordinate = async id => {
  if (confirm("この座標を削除しますか？")) {
    await remove(ref(db, `coordinates/${id}`));
    loadCoordinates();
  }
};

window.openListTab = async (status) => {
  const snapshot = await get(child(ref(db), "coordinates"));
  const data = snapshot.exists() ? Object.entries(snapshot.val())
    .filter(([, val]) => val.取得状況 === status) : [];

  const sorted = data.sort(([, a], [, b]) =>
    a.レベル - b.レベル || a.サーバー名.localeCompare(b.サーバー名) || a.X - b.X || a.Y - b.Y
  );

  let html = `<html><head><meta charset="utf-8"><title>${status}リスト</title></head><body>`;
  html += `<h2>${status}リスト</h2><ul>`;
  for (const [id, val] of sorted) {
    html += `<li>Lv${val.レベル} / ${val.サーバー名} / X:${val.X} / Y:${val.Y} ${val.目印 ? " / " + val.目印 : ""} 
      <button onclick="window.opener.changeStatus('${id}', '${status === "未取得" ? "取得済み" : "未取得"}')">切替</button>
      <button onclick="window.opener.deleteCoordinate('${id}')">削除</button>
    </li>`;
  }
  html += `</ul></body></html>`;

  const win = window.open("", "_blank");
  win.document.write(html);
  win.document.close();
};

window.exportCSV = async (status) => {
  const snapshot = await get(child(ref(db), "coordinates"));
  if (!snapshot.exists()) return;

  const rows = [["サーバー名", "X", "Y", "レベル", "目印"]];
  for (const [, val] of Object.entries(snapshot.val())) {
    if (val.取得状況 === status) {
      rows.push([val.サーバー名, val.X, val.Y, val.レベル, val.目印 || ""]);
    }
  }
  const csv = "\uFEFF" + rows.map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${status}_list.csv`;
  a.click();
};

window.importCSV = async () => {
  const text = document.getElementById("csvInput").value.trim();
  const lines = text.split("\n");
  for (const line of lines) {
    const [サーバー名, x, y, レベル, 目印 = ""] = line.split(",");
    if (!サーバー名 || isNaN(x) || isNaN(y) || !レベル) continue;

    const data = {
      サーバー名: サーバー名.trim(),
      X: parseInt(x),
      Y: parseInt(y),
      レベル: レベル.trim(),
      目印: 目印.trim(),
      取得状況: "未取得"
    };

    const snapshot = await get(child(ref(db), "coordinates"));
    let updated = false;
    if (snapshot.exists()) {
      for (const [id, coord] of Object.entries(snapshot.val())) {
        if (coord.X == data.X && coord.Y == data.Y) {
          await update(ref(db, `coordinates/${id}`), data);
          updated = true;
          break;
        }
      }
    }
    if (!updated) {
      await push(ref(db, "coordinates"), data);
    }
  }
  document.getElementById("csvInput").value = "";
  loadCoordinates();
};

window.dedupeCoordinates = async () => {
  const snapshot = await get(child(ref(db), "coordinates"));
  if (!snapshot.exists()) return;

  const coords = {};
  for (const [id, val] of Object.entries(snapshot.val())) {
    const key = `${val.X}-${val.Y}`;
    if (coords[key]) {
      await remove(ref(db, `coordinates/${id}`));
    } else {
      coords[key] = true;
    }
  }
  loadCoordinates();
};
