// ✅ Firebase & Leaflet 完全対応 - 最新安定版
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

// ✅ マップ初期化（ズーム対応）
const map = L.map('map', {
  minZoom: -2,
  maxZoom: 3,
  zoomSnap: 1,
  wheelPxPerZoomLevel: 60
}).setView([500, 500], 0);

const gridSize = 1000;
L.rectangle([[0, 0], [gridSize, gridSize]], {
  color: "#ccc",
  weight: 1,
  fill: false
}).addTo(map);

// グリッド線
for (let i = 0; i <= gridSize; i += 100) {
  L.polyline([[0, i], [gridSize, i]], { color: "#eee", weight: 1 }).addTo(map);
  L.polyline([[i, 0], [i, gridSize]], { color: "#eee", weight: 1 }).addTo(map);
}

// ✅ マーカー色定義（レベル1〜7）
const levelColors = {
  1: "blue",
  2: "green",
  3: "orange",
  4: "red",
  5: "purple",
  6: "black",
  7: "gold"
};

// ✅ データ読み込みとマーカー描画
const dataRef = ref(db, "coords");
get(dataRef).then(snapshot => {
  if (snapshot.exists()) {
    const data = snapshot.val();
    Object.entries(data).forEach(([key, item]) => {
      const { server, x, y, level, 状態, mark } = item;
      const lat = Number(y);
      const lng = Number(x);
      const color = levelColors[level] || "gray";

      if (状態 === "未取得") {
        const marker = L.circleMarker([lat, lng], {
          radius: 8,
          color: color,
          fillColor: color,
          fillOpacity: 0.8
        }).addTo(map);

        marker.bindPopup(`
          <b>${server}</b><br>X:${x} Y:${y}<br>レベル:${level}<br>目印:${mark || ""}<br>
          <button onclick="changeStatus('${key}', '取得済み')">✅ 取得済みにする</button><br>
          <button onclick="deleteCoord('${key}')">🗑️ 削除</button>
        `);
      }
    });
  }
});

// ✅ 登録処理
document.getElementById("registerForm").addEventListener("submit", e => {
  e.preventDefault();
  const server = document.getElementById("server").value;
  const x = document.getElementById("x").value;
  const y = document.getElementById("y").value;
  const level = document.getElementById("level").value;
  const mark = document.getElementById("mark").value;

  if (!server || !x || !y || !level) return alert("すべての必須項目を入力してください");

  // 重複チェック
  get(dataRef).then(snapshot => {
    const data = snapshot.val();
    const exists = data && Object.entries(data).find(([_, item]) =>
      item.server === server && item.x === x && item.y === y
    );
    if (exists) {
      const [dupKey] = exists;
      update(ref(db, `coords/${dupKey}`), { 状態: "未取得", level, mark }).then(() => location.reload());
    } else {
      push(dataRef, { server, x, y, level, 状態: "未取得", mark }).then(() => location.reload());
    }
  });
});

// ✅ 状態切替
window.changeStatus = (key, status) => {
  update(ref(db, `coords/${key}`), { 状態: status }).then(() => location.reload());
};

// ✅ 削除
window.deleteCoord = (key) => {
  if (confirm("削除してもよろしいですか？")) {
    remove(ref(db, `coords/${key}`)).then(() => location.reload());
  }
};

// ✅ CSV 一括登録
document.getElementById("csvForm").addEventListener("submit", e => {
  e.preventDefault();
  const csv = document.getElementById("csvInput").value.trim().split("\n");
  csv.forEach(row => {
    const [server, x, y, level, mark] = row.split(",");
    if (!server || !x || !y || !level) return;
    push(dataRef, { server, x, y, level, 状態: "未取得", mark: mark || "" });
  });
  setTimeout(() => location.reload(), 1000);
});

// ✅ 重複整理
window.cleanDuplicates = async () => {
  const snapshot = await get(dataRef);
  if (!snapshot.exists()) return;
  const data = snapshot.val();
  const seen = {};
  const removals = [];

  for (const [key, item] of Object.entries(data)) {
    const keyStr = `${item.server}_${item.x}_${item.y}`;
    if (seen[keyStr]) {
      removals.push(key);
    } else {
      seen[keyStr] = true;
    }
  }

  for (const key of removals) {
    await remove(ref(db, `coords/${key}`));
  }

  alert(`重複データを ${removals.length} 件削除しました`);
  location.reload();
};

// ✅ CSV 出力
window.downloadCSV = async (statusFilter) => {
  const snapshot = await get(dataRef);
  if (!snapshot.exists()) return;

  const data = snapshot.val();
  const filtered = Object.values(data).filter(item => item.状態 === statusFilter);
  let csv = "サーバー名,X,Y,レベル,目印\n";
  filtered.forEach(item => {
    csv += `${item.server},${item.x},${item.y},${item.level},"${item.mark || ""}"\n`;
  });

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${statusFilter}_list.csv`;
  a.click();
};

// ✅ リスト表示（別タブ生成）
window.openListTab = async (statusFilter) => {
  const snapshot = await get(dataRef);
  if (!snapshot.exists()) return;
  const data = snapshot.val();

  const items = Object.entries(data)
    .filter(([_, item]) => item.状態 === statusFilter)
    .map(([key, item]) => ({ key, ...item }));

  // 並び順：レベル→サーバー→X→Y
  items.sort((a, b) => a.level - b.level || a.server.localeCompare(b.server) || a.x - b.x || a.y - b.y);

  let html = `<html><head><meta charset="UTF-8"><title>${statusFilter}リスト</title></head><body>`;
  html += `<h2>${statusFilter}リスト</h2><ul>`;
  for (const item of items) {
    html += `<li>
      <b>${item.server}</b> / X:${item.x} / Y:${item.y} / Lv:${item.level} / 目印:${item.mark || ""}<br>
      <button onclick="window.opener.changeStatus('${item.key}', '${statusFilter === '未取得' ? '取得済み' : '未取得'}'); window.close();">🔄 状態変更</button>
      <button onclick="window.opener.deleteCoord('${item.key}'); window.close();">🗑️ 削除</button>
    </li>`;
  }
  html += `</ul></body></html>`;

  const win = window.open("", "_blank");
  win.document.write(html);
  win.document.close();
};
