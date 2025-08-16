// ✅ 完全対応版 map.js - ズーム機能付き（Firebase + Leaflet）

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  get,
  child,
  update,
  remove
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";

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

const map = L.map("map", {
  crs: L.CRS.Simple,
  minZoom: -3,
  maxZoom: 2,
  zoomControl: true,
  zoomSnap: 0.1,
  wheelPxPerZoomLevel: 60,
  doubleClickZoom: true,
  touchZoom: true,
  scrollWheelZoom: true
}).setView([500, 500], -2);

const bounds = [[0, 0], [1000, 1000]];
L.rectangle(bounds, { color: "#888", weight: 1, fill: false }).addTo(map);
map.setMaxBounds(bounds);

// 1000x1000グリッド背景生成
for (let i = 0; i <= 1000; i += 100) {
  L.polyline([[0, i], [1000, i]], { color: "#ccc", weight: 1 }).addTo(map);
  L.polyline([[i, 0], [i, 1000]], { color: "#ccc", weight: 1 }).addTo(map);
}

// 🔄 座標の再読み込み
window.loadMarkers = async function () {
  const snap = await get(child(ref(db), "coordinates"));
  if (!snap.exists()) return;

  const data = snap.val();
  map.eachLayer(layer => {
    if (layer instanceof L.Marker) map.removeLayer(layer);
  });

  for (const key in data) {
    const item = data[key];
    if (item.取得状況 === "未取得") {
      const marker = L.circleMarker([item.Y, item.X], {
        radius: 8,
        color: levelColor(item.レベル),
        fillOpacity: 0.8
      }).addTo(map);

      marker.bindPopup(`
        <b>サーバー名:</b> ${item.サーバー名}<br>
        <b>X:</b> ${item.X}<br>
        <b>Y:</b> ${item.Y}<br>
        <b>レベル:</b> ${item.レベル}<br>
        <b>目印:</b> ${item.目印 || "なし"}<br>
        <button onclick="markClaimed('${key}')">✅ 取得済みにする</button><br>
        <button onclick="deleteCoordinate('${key}')">🗑️ 削除</button>
      `);
    }
  }
};

function levelColor(level) {
  const colors = {
    1: "blue", 2: "green", 3: "orange",
    4: "red", 5: "purple", 6: "black", 7: "brown"
  };
  return colors[level] || "gray";
}

window.markClaimed = async function (key) {
  await update(ref(db, `coordinates/${key}`), { 取得状況: "取得済み" });
  alert("取得済みに更新しました。");
  window.loadMarkers();
};

window.deleteCoordinate = async function (key) {
  await remove(ref(db, `coordinates/${key}`));
  alert("削除しました。");
  window.loadMarkers();
};

// 初回読み込み
window.addEventListener("DOMContentLoaded", () => {
  window.loadMarkers();
});
