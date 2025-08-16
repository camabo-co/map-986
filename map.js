// ✅ map.js - 完全版：リスト表示・切替・削除・ズーム対応・UTF-8 CSV出力・目印対応
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

// ✅ Firebase 設定
const firebaseConfig = {
  apiKey: "AIzaSyDdNI04D1xhQihN3DBDdF1_YAp6XRcErDw",
  authDomain: "maps3-986-ffbbd.firebaseapp.com",
  databaseURL: "https://maps3-986-ffbbd-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "maps3-986-ffbbd",
  storageBucket: "maps3-986-ffbbd.appspot.com",
  messagingSenderId: "701191378459",
  appId: "1:701191378459:web:d2cf8d869f5e682157cbad"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const dbRef = ref(db, "coordinates");

// ✅ 地図初期化
const map = L.map("map").setView([500, 500], 3);
L.tileLayer('', {
  attribution: ''
}).addTo(map);

// ✅ グリッド背景
const gridSize = 1000;
const gridInterval = 100;
for (let x = 0; x <= gridSize; x += gridInterval) {
  L.polyline([[0, x], [gridSize, x]], { color: '#ccc', weight: 1 }).addTo(map);
  L.polyline([[x, 0], [x, gridSize]], { color: '#ccc', weight: 1 }).addTo(map);
}

// ✅ レベル別マーカー色
const levelColors = {
  1: "blue",
  2: "green",
  3: "red",
  4: "orange",
  5: "purple",
  6: "brown",
  7: "black"
};

// ✅ 登録フォーム処理
const form = document.getElementById("registerForm");
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const server = form.server.value.trim();
  const x = parseInt(form.x.value);
  const y = parseInt(form.y.value);
  const level = parseInt(form.level.value);
  const memo = form.memo.value.trim();

  if (!server || isNaN(x) || isNaN(y) || isNaN(level)) return alert("すべて入力してください");

  const snapshot = await get(dbRef);
  let exists = false;
  snapshot.forEach(child => {
    const data = child.val();
    if (data.server === server && data.x === x && data.y === y) {
      update(child.ref, { status: "未取得", level, memo });
      exists = true;
    }
  });

  if (!exists) {
    push(dbRef, { server, x, y, level, status: "未取得", memo });
  }

  alert("登録しました");
  form.reset();
  loadMarkers();
});

// ✅ CSV一括登録
const csvForm = document.getElementById("csvForm");
csvForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = document.getElementById("csvInput").value.trim();
  if (!text) return;

  const lines = text.split("\n");
  const snapshot = await get(dbRef);

  for (let line of lines) {
    const [server, x, y, level, memo] = line.split(",").map(s => s.trim());
    if (!server || !x || !y || !level) continue;

    let exists = false;
    snapshot.forEach(child => {
      const data = child.val();
      if (data.server == server && data.x == x && data.y == y) {
        update(child.ref, { status: "未取得", level: parseInt(level), memo });
        exists = true;
      }
    });

    if (!exists) {
      push(dbRef, { server, x: parseInt(x), y: parseInt(y), level: parseInt(level), status: "未取得", memo });
    }
  }

  alert("CSV登録完了");
  document.getElementById("csvInput").value = "";
  loadMarkers();
});

// ✅ マーカー読み込み
async function loadMarkers() {
  map.eachLayer(layer => { if (layer instanceof L.Marker) map.removeLayer(layer); });

  const snapshot = await get(dbRef);
  snapshot.forEach(child => {
    const data = child.val();
    if (data.status === "未取得") {
      const marker = L.circleMarker([data.y, data.x], {
        radius: 8,
        color: levelColors[data.level] || "gray",
        fillOpacity: 0.8
      }).addTo(map);
      marker.bindPopup(`【${data.server}】Lv.${data.level}<br>(${data.x}, ${data.y})<br>${data.memo || ""}`);
    }
  });
}

loadMarkers();

// ✅ CSV出力
window.downloadCSV = async function (statusFilter) {
  const snapshot = await get(dbRef);
  const rows = [];
  snapshot.forEach(child => {
    const d = child.val();
    if (d.status === statusFilter) {
      rows.push([d.server, d.x, d.y, d.level, d.memo || ""].join(","));
    }
  });
  const bom = new Uint8Array([0xef, 0xbb, 0xbf]);
  const blob = new Blob([bom, rows.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${statusFilter}.csv`;
  a.click();
};

// ✅ 重複整理
window.cleanDuplicates = async function () {
  const snapshot = await get(dbRef);
  const seen = new Map();

  snapshot.forEach(child => {
    const d = child.val();
    const key = `${d.server}_${d.x}_${d.y}`;
    if (seen.has(key)) {
      remove(child.ref);
    } else {
      seen.set(key, child);
    }
  });
  alert("重複を削除しました");
  loadMarkers();
};

// ✅ リスト表示
window.openListTab = async function (statusFilter) {
  const snapshot = await get(dbRef);
  const list = [];

  snapshot.forEach(child => {
    const d = child.val();
    if (d.status === statusFilter) {
      list.push({ ...d, id: child.key });
    }
  });

  list.sort((a, b) => a.level - b.level || a.server.localeCompare(b.server) || a.x - b.x || a.y - b.y);

  const win = window.open("", "_blank");
  win.document.write(`<html><head><meta charset='UTF-8'><title>${statusFilter}リスト</title>
  <style>
    body { font-family: sans-serif; }
    table { border-collapse: collapse; margin: 20px auto; }
    th, td { border: 1px solid #ccc; padding: 4px 10px; }
    button { margin: 2px; }
  </style>
  </head><body><h2>${statusFilter}リスト</h2><table><tr><th>Lv</th><th>サーバー</th><th>X</th><th>Y</th><th>目印</th><th>操作</th></tr>`);

  for (const d of list) {
    win.document.write(`<tr>
      <td>${d.level}</td>
      <td>${d.server}</td>
      <td>${d.x}</td>
      <td>${d.y}</td>
      <td>${d.memo || ""}</td>
      <td>
        <button onclick="window.opener.toggleStatus('${d.id}')">${statusFilter === "未取得" ? "取得済みに" : "未取得に"}</button>
        <button onclick="window.opener.deleteCoordinate('${d.id}')">削除</button>
      </td>
    </tr>`);
  }

  win.document.write("</table></body></html>");
  win.document.close();
};

// ✅ 削除処理
window.deleteCoordinate = async function (id) {
  if (confirm("本当に削除しますか？")) {
    await remove(child(dbRef, id));
    alert("削除しました");
    loadMarkers();
  }
};

// ✅ 状態切り替え
window.toggleStatus = async function (id) {
  const snapshot = await get(child(dbRef, id));
  if (snapshot.exists()) {
    const data = snapshot.val();
    const newStatus = data.status === "未取得" ? "取得済み" : "未取得";
    await update(child(dbRef, id), { status: newStatus });
    alert(`状態を「${newStatus}」に変更しました`);
    loadMarkers();
  }
};
