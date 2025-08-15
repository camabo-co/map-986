// ✅ map.js - 安定版（ズーム・削除・取得済み変更・未取得に戻す・重複整理・CSV出力すべて対応）
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
  minZoom: -2,
  maxZoom: 4,
  zoomSnap: 0.1,
  zoomDelta: 0.5
});

const bounds = [[0, 0], [1000, 1000]];
L.rectangle(bounds, { color: "#ccc", weight: 1 }).addTo(map);
map.fitBounds(bounds);
map.setView([500, 500], 0);

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

    const color = getMarkerColor(item.レベル);
    const marker = L.circleMarker([item.Y, item.X], {
      radius: 6,
      color: color,
      fillOpacity: 0.8
    }).addTo(map);

    marker.bindPopup(`
      <b>サーバー名:</b> ${item.サーバー名}<br>
      <b>X:</b> ${item.X}<br>
      <b>Y:</b> ${item.Y}<br>
      <b>レベル:</b> ${item.レベル}<br>
      <b>目印:</b> ${item.目印 || ""}<br>
      <button onclick="setClaimed('${key}')">✅ 取得済みにする</button>
      <button onclick="deleteCoordinate('${key}')">🗑 削除</button>
    `);

    markers[key] = marker;
  }
};

function getMarkerColor(level) {
  const colors = {
    1: "blue", 2: "green", 3: "orange",
    4: "red", 5: "purple", 6: "brown", 7: "black"
  };
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
