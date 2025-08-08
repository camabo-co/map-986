// ✅ map.js - 安定版 + ズーム機能付き
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
  minZoom: -2,   // かなり引ける
  maxZoom: 4,    // かなり拡大できる
  zoomSnap: 0.1, // ズーム段階の細かさ
  zoomDelta: 0.5 // ボタンやマウスでのズーム刻み
});

const bounds = [[0, 0], [1000, 1000]];
const image = L.rectangle(bounds, { color: "#ccc", weight: 1 }).addTo(map);
map.fitBounds(bounds);
map.setView([500, 500], 0); // 初期位置とズーム

// グリッド線描画
for (let i = 0; i <= 1000; i += 50) {
  L.polyline([[0, i], [1000, i]], { color: "#ddd", weight: 1 }).addTo(map);
  L.polyline([[i, 0], [i, 1000]], { color: "#ddd", weight: 1 }).addTo(map);
}

let markers = {};
let coordinatesData = {};

// マーカー描画
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

// 取得済みに変更
window.setClaimed = async function (key) {
  await update(ref(db, `coordinates/${key}`), { 取得状況: "取得済み" });
  alert("取得済みに変更しました");
  loadMarkers();
};

// 削除
window.deleteCoordinate = async function (key) {
  if (!confirm("この座標を削除しますか？")) return;
  await remove(ref(db, `coordinates/${key}`));
  alert("削除しました");
  loadMarkers();
};

// 登録フォーム処理
document.getElementById("coordinateForm").addEventListener("submit", async e => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const data = {
    サーバー名: formData.get("サーバー名"),
    X: parseInt(formData.get("X")),
    Y: parseInt(formData.get("Y")),
    レベル: formData.get("レベル"),
    取得状況: "未取得",
    目印: formData.get("目印") || ""
  };
  await push(ref(db, "coordinates"), data);
  alert("登録しました");
  e.target.reset();
  loadMarkers();
});

// 初期読み込み
loadMarkers();
