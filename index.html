// ✅ map.js - 安定版＋ズーム対応（Leaflet + Firebase） import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";

import { getDatabase, ref, push, get, child, update, remove } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";

// ✅ Firebase初期化 const firebaseConfig = { apiKey: "AIzaSyDdNI04D1xhQihN3DBDdF1_YAp6XRcErDw", authDomain: "maps3-986-ffbbd.firebaseapp.com", databaseURL: "https://maps3-986-ffbbd-default-rtdb.asia-southeast1.firebasedatabase.app", projectId: "maps3-986-ffbbd", storageBucket: "maps3-986-ffbbd.appspot.com", messagingSenderId: "701191378459", appId: "1:701191378459:web:d2cf8d869f5cba869d0abe" }; const app = initializeApp(firebaseConfig); const db = getDatabase(app);

// ✅ 地図初期化 const map = L.map('map', { minZoom: 0, maxZoom: 5, zoomControl: true, zoomSnap: 1 }).setView([500, 500], 1);

// グリッドの背景 const gridSize = 1000; const canvas = document.createElement('canvas'); canvas.width = gridSize; canvas.height = gridSize; const ctx = canvas.getContext('2d'); ctx.strokeStyle = '#ccc'; ctx.lineWidth = 0.5; for (let i = 0; i <= gridSize; i += 100) { ctx.moveTo(i, 0); ctx.lineTo(i, gridSize); ctx.moveTo(0, i); ctx.lineTo(gridSize, i); } ctx.stroke(); const gridUrl = canvas.toDataURL(); L.imageOverlay(gridUrl, [[0, 0], [1000, 1000]]).addTo(map); map.setMaxBounds([[0, 0], [1000, 1000]]);

// ✅ レベル色分け const levelColors = { 1: 'blue', 2: 'green', 3: 'orange', 4: 'purple', 5: 'red', 6: 'brown', 7: 'black' };

// ✅ マーカー描画 let markers = []; window.loadMarkers = async function () { markers.forEach(m => m.remove()); markers = [];

const snap = await get(child(ref(db), "coordinates")); if (!snap.exists()) return; const data = snap.val();

for (const key in data) { const item = data[key]; if (item.取得状況 !== "未取得") continue;

const marker = L.circleMarker([item.Y, item.X], {
  radius: 6,
  color: levelColors[item.レベル] || 'gray',
  fillOpacity: 0.9
}).addTo(map);

marker.bindPopup(`
  <strong>サーバー:</strong> ${item.サーバー名}<br>
  <strong>座標:</strong> (${item.X}, ${item.Y})<br>
  <strong>レベル:</strong> Lv${item.レベル}<br>
  <strong>目印:</strong> ${item.目印 || ''}<br><br>
  <button onclick="markClaimed('${key}')">✅ 取得済みにする</button>
  <button onclick="deleteCoordinate('${key}')">🗑️ 削除</button>
`);
markers.push(marker);

} };

window.markClaimed = async function (key) { await update(ref(db, coordinates/${key}), { 取得状況: "取得済み" }); window.loadMarkers(); };

window.deleteCoordinate = async function (key) { if (confirm("本当に削除しますか？")) { await remove(ref(db, coordinates/${key})); window.loadMarkers(); } };

window.addEventListener("DOMContentLoaded", async () => { // 登録フォーム処理 const form = document.getElementById("coordinateForm"); form.onsubmit = async (e) => { e.preventDefault(); const fd = new FormData(form); const data = Object.fromEntries(fd); const newCoord = { サーバー名: data["サーバー名"], X: parseInt(data.X), Y: parseInt(data.Y), レベル: data.レベル, 取得状況: "未取得", 目印: data["目印"] || "" }; await push(ref(db, "coordinates"), newCoord); form.reset(); window.loadMarkers(); };

// リストボタン document.getElementById("toggleUnclaimed").onclick = () => openListTab("未取得"); document.getElementById("toggleClaimed").onclick = () => openListTab("取得済み");

window.loadMarkers(); });

function openListTab(status) { const win = window.open(); win.document.write("<h2>" + status + "リスト</h2>"); win.document.write("<ul id='list'></ul>");

get(child(ref(db), "coordinates")).then((snap) => { if (!snap.exists()) return; const data = Object.values(snap.val()).filter(d => d.取得状況 === status); data.sort((a, b) => a.レベル - b.レベル || a.サーバー名.localeCompare(b.サーバー名) || a.X - b.X || a.Y - b.Y);

for (const d of data) {
  const li = document.createElement("li");
  li.textContent = `Lv${d.レベル} (${d.X},${d.Y}) - ${d.サーバー名} ${d.目印 || ""}`;
  win.document.getElementById("list").appendChild(li);
}

}); }

