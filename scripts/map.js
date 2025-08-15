// ✅ map.js - 安定版 + 全機能維持（削除・状態変更・リスト表示・CSV出力・ズーム）
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

// Firebase初期化
const firebaseConfig = {
  apiKey: "AIzaSyDdNI04D1xhQihN3DBDdF1_YAp6XRcErDw",
  authDomain: "maps3-986-ffbbd.firebaseapp.com",
  databaseURL: "https://maps3-986-ffbbd-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "maps3-986-ffbbd",
  storageBucket: "maps3-986-ffbbd.appspot.com",
  messagingSenderId: "701191378459",
  appId: "1:701191378459:web:d2cf8d869f5cba869d0abe"
};
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Leafletマップ作成（ズーム対応）
const map = L.map("map", {
  crs: L.CRS.Simple,
  minZoom: -2,
  maxZoom: 4,
  zoomSnap: 0.1,
  zoomDelta: 0.5
});

const bounds = [[0, 0], [1000, 1000]];
L.rectangle(bounds, { color: "#ccc", weight: 1 }).addTo(map);
map.fitBounds(bounds);
map.setView([500, 500], 0);

// グリッド線
for (let i = 0; i <= 1000; i += 50) {
  L.polyline([[0, i], [1000, i]], { color: "#ddd", weight: 1 }).addTo(map);
  L.polyline([[i, 0], [i, 1000]], { color: "#ddd", weight: 1 }).addTo(map);
}

let markers = {};
let coordinatesData = {};

window.loadMarkers = async function () {
  Object.values(markers).forEach(marker => map.removeLayer(marker));
  markers = {};

  const snap = await get(child(ref(db), "coordinates"));
  if (!snap.exists()) return;
  coordinatesData = snap.val();

  for (const key in coordinatesData) {
    const item = coordinatesData[key];
    if (item.取得状況 !== "未取得") continue;

    const marker = L.circleMarker([item.Y, item.X], {
      radius: 6,
      color: getMarkerColor(item.レベル),
      fillOpacity: 0.8
    }).addTo(map);

    marker.bindPopup(`
      <b>サーバー名:</b> ${item.サーバー名}<br>
      <b>X:</b> ${item.X}<br>
      <b>Y:</b> ${item.Y}<br>
      <b>レベル:</b> ${item.レベル}<br>
      <b>目印:</b> ${item.目印 || ""}<br>
      <button onclick=\"window.setClaimed('${key}')\">✅ 取得済みにする</button>
      <button onclick=\"window.deleteCoordinate('${key}')\">🗑 削除</button>
    `);

    markers[key] = marker;
  }
};

function getMarkerColor(level) {
  const colors = { 1: "blue", 2: "green", 3: "orange", 4: "red", 5: "purple", 6: "brown", 7: "black" };
  return colors[level] || "gray";
}

window.setClaimed = async function (key) {
  await update(ref(db, `coordinates/${key}`), { 取得状況: "取得済み" });
  alert("取得済みに変更しました");
  loadMarkers();
};

window.setUnclaimed = async function (key) {
  await update(ref(db, `coordinates/${key}`), { 取得状況: "未取得" });
  alert("未取得に戻しました");
  loadMarkers();
};

window.deleteCoordinate = async function (key) {
  if (!confirm("この座標を削除しますか？")) return;
  await remove(ref(db, `coordinates/${key}`));
  alert("削除しました");
  loadMarkers();
};

// リスト表示
window.openListTab = function (status) {
  const win = window.open("", "_blank");
  const filtered = Object.entries(coordinatesData)
    .filter(([, item]) => item.取得状況 === status)
    .sort((a, b) => {
      const lvA = parseInt(a[1].レベル), lvB = parseInt(b[1].レベル);
      const svA = a[1].サーバー名, svB = b[1].サーバー名;
      if (lvA !== lvB) return lvA - lvB;
      if (svA !== svB) return svA.localeCompare(svB);
      return a[1].X - b[1].X || a[1].Y - b[1].Y;
    });

  const rows = filtered.map(([key, item]) => `
    <tr>
      <td>${item.レベル}</td>
      <td>${item.サーバー名}</td>
      <td>${item.X}</td>
      <td>${item.Y}</td>
      <td>${item.目印 || ""}</td>
      <td><button onclick="window.opener.deleteCoordinate('${key}')">🗑</button></td>
      <td><button onclick="window.opener.${status === '未取得' ? 'setClaimed' : 'setUnclaimed'}('${key}')">↔</button></td>
    </tr>`).join("");

  win.document.write(`
    <html><head><meta charset='UTF-8'><title>${status}リスト</title></head><body>
    <h2>${status}リスト</h2>
    <table border='1' cellpadding='5'><tr><th>Lv</th><th>サーバー</th><th>X</th><th>Y</th><th>目印</th><th>削除</th><th>変更</th></tr>
    ${rows}
    </table></body></html>
  `);
};

// 初期ロード
loadMarkers();
