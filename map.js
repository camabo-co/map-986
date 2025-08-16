// ✅ Firebase初期化（各自の設定に変更してください）
import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";

import {
  getDatabase,
  ref,
  set,
  push,
  get,
  update,
  remove,
  onValue
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
const coordsRef = ref(db, "coordinates");

// ✅ Leafletマップ初期化（グリッド背景付き）
const map = L.map("map", {
  crs: L.CRS.Simple,
  minZoom: -2,
  maxZoom: 2,
}).setView([500, 500], 0);

const bounds = [[0, 0], [1000, 1000]];
L.rectangle(bounds, { color: "#999", weight: 1, fill: false }).addTo(map);

const gridSpacing = 100;
for (let i = gridSpacing; i < 1000; i += gridSpacing) {
  L.polyline([[0, i], [1000, i]], { color: "#ccc", weight: 1 }).addTo(map); // 縦線
  L.polyline([[i, 0], [i, 1000]], { color: "#ccc", weight: 1 }).addTo(map); // 横線
}

// ✅ レベル別マーカー色
function getMarkerColor(level) {
  switch (parseInt(level)) {
    case 1: return "blue";
    case 2: return "green";
    case 3: return "orange";
    case 4: return "red";
    default: return "gray";
  }
}

// ✅ マーカー管理
let markers = {};
function renderMarkers(data) {
  Object.values(markers).forEach(m => map.removeLayer(m));
  markers = {};

  data.forEach(item => {
    if (item.取得状況 !== "未取得") return;

    const key = `${item.サーバー名}_${item.X}_${item.Y}`;
    const marker = L.circleMarker([item.Y, item.X], {
      radius: 6,
      color: getMarkerColor(item.レベル),
      fillOpacity: 0.8
    }).addTo(map);

    marker.bindPopup(`
      <b>${item.サーバー名}</b><br/>
      (${item.X}, ${item.Y})<br/>
      レベル: ${item.レベル}<br/>
      ${item.目印 || ""}<br/>
      <button onclick="changeStatus('${key}', '取得済み')">取得済みにする</button><br/>
      <button onclick="deleteEntry('${key}')">削除</button>
    `);
    markers[key] = marker;
  });
}

// ✅ データ取得して描画
function fetchAndRender() {
  get(coordsRef).then(snapshot => {
    if (snapshot.exists()) {
      const allData = Object.values(snapshot.val());
      renderMarkers(allData);
      window.allCoordinates = allData;
    }
  });
}
fetchAndRender();
onValue(coordsRef, () => fetchAndRender());

// ✅ ステータス切り替え
window.changeStatus = function (key, status) {
  const [server, x, y] = key.split("_");
  get(coordsRef).then(snapshot => {
    if (!snapshot.exists()) return;
    const entries = Object.entries(snapshot.val());
    const match = entries.find(([id, item]) =>
      item.サーバー名 == server && item.X == x && item.Y == y
    );
    if (match) {
      const [id] = match;
      update(ref(db, `coordinates/${id}`), { 取得状況: status }).then(() => {
        alert("状態を更新しました");
      });
    }
  });
};

// ✅ 削除処理
window.deleteEntry = function (key) {
  if (!confirm("本当に削除しますか？")) return;
  const [server, x, y] = key.split("_");
  get(coordsRef).then(snapshot => {
    if (!snapshot.exists()) return;
    const entries = Object.entries(snapshot.val());
    const match = entries.find(([id, item]) =>
      item.サーバー名 == server && item.X == x && item.Y == y
    );
    if (match) {
      const [id] = match;
      remove(ref(db, `coordinates/${id}`)).then(() => {
        alert("削除しました");
      });
    }
  });
};

// ✅ 重複整理
window.cleanDuplicates = function () {
  get(coordsRef).then(snapshot => {
    if (!snapshot.exists()) return;

    const entries = Object.entries(snapshot.val());
    const seen = new Map();
    const toDelete = [];

    entries.forEach(([id, item]) => {
      const key = `${item.サーバー名}_${item.X}_${item.Y}`;
      if (seen.has(key)) {
        toDelete.push(id);
      } else {
        seen.set(key, id);
      }
    });

    toDelete.forEach(id => remove(ref(db, `coordinates/${id}`)));
    alert("重複を整理しました");
  });
};

// ✅ CSV出力
window.downloadCSV = function (status) {
  const rows = [["サーバー名", "X", "Y", "レベル", "目印", "取得状況"]];
  window.allCoordinates.forEach(item => {
    if (item.取得状況 === status) {
      rows.push([item.サーバー名, item.X, item.Y, item.レベル, item.目印 || "", item.取得状況]);
    }
  });

  const csv = rows.map(r => r.join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${status}_list.csv`;
  a.click();
};

// ✅ リスト表示（別タブ）
window.openListTab = function (status) {
  const filtered = window.allCoordinates.filter(item => item.取得状況 === status);
  filtered.sort((a, b) => a.レベル - b.レベル || a.サーバー名 - b.サーバー名 || a.X - b.X || a.Y - b.Y);

  const html = `
    <html><head><meta charset="UTF-8"><title>${status}リスト</title></head><body>
    <h2>${status}リスト</h2>
    <table border="1" style="border-collapse: collapse;">
      <tr><th>レベル</th><th>サーバー名</th><th>X</th><th>Y</th><th>目印</th><th>操作</th></tr>
      ${filtered.map(item => `
        <tr>
          <td>${item.レベル}</td>
          <td>${item.サーバー名}</td>
          <td>${item.X}</td>
          <td>${item.Y}</td>
          <td>${item.目印 || ""}</td>
          <td>
            <button onclick="window.opener.changeStatus('${item.サーバー名}_${item.X}_${item.Y}', '${status === '未取得' ? '取得済み' : '未取得'}')">状態変更</button>
            <button onclick="window.opener.deleteEntry('${item.サーバー名}_${item.X}_${item.Y}')">削除</button>
          </td>
        </tr>
      `).join("")}
    </table></body></html>
  `;
  const win = window.open();
  win.document.write(html);
  win.document.close();
};

// ✅ CSVから一括登録
document.getElementById("csvForm").addEventListener("submit", function (e) {
  e.preventDefault();
  const lines = document.getElementById("csvInput").value.trim().split("\n");
  lines.forEach(line => {
    const [server, x, y, level, marker] = line.split(",");
    if (!server || !x || !y || !level) return;
    push(coordsRef, {
      サーバー名: server.trim(),
      X: Number(x),
      Y: Number(y),
      レベル: Number(level),
      目印: marker?.trim() || "",
      取得状況: "未取得"
    });
  });
  document.getElementById("csvInput").value = "";
});
