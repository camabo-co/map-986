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
// ✅ CSV一括登録機能
window.importCSV = async function () {
  const input = document.getElementById("csvInput").value.trim();
  if (!input) return alert("CSVを入力してください");

  const lines = input.split("\n");
  let count = 0;

  for (const line of lines) {
    const [サーバー名, X, Y, レベル, 目印 = ""] = line.split(",");
    if (!サーバー名 || !X || !Y || !レベル) continue;

    await push(ref(db, "coordinates"), {
      サーバー名,
      X: parseInt(X),
      Y: parseInt(Y),
      レベル,
      取得状況: "未取得",
      目印
    });
    count++;
  }
  alert(`${count} 件登録しました`);
  document.getElementById("csvInput").value = "";
  loadMarkers();
};

// ✅ 重複座標整理機能（サーバー名+X+Yで重複チェック）
document.getElementById("dedupeButton").addEventListener("click", async () => {
  if (!confirm("重複を削除しますか？（最初の1件だけ残します）")) return;

  const snap = await get(child(ref(db), "coordinates"));
  if (!snap.exists()) return alert("データがありません");

  const allData = snap.val();
  const seen = {};
  const toDelete = [];

  for (const key in allData) {
    const item = allData[key];
    const id = `${item.サーバー名}_${item.X}_${item.Y}`;
    if (seen[id]) {
      toDelete.push(key);
    } else {
      seen[id] = true;
    }
  }

  for (const key of toDelete) {
    await remove(ref(db, `coordinates/${key}`));
  }

  alert(`重複 ${toDelete.length} 件を削除しました`);
  loadMarkers();
});

// ✅ 未取得・取得済みリスト表示
document.getElementById("toggleUnclaimed").addEventListener("click", () => openListTab("未取得"));
document.getElementById("toggleClaimed").addEventListener("click", () => openListTab("取得済み"));

function openListTab(status) {
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
      ${status === "未取得" ? `<td><button onclick="window.opener.setClaimed('${key}')">✅</button></td>` : ""}
    </tr>
  `).join("");

  win.document.write(`
    <html><head><meta charset="UTF-8"><title>${status}リスト</title></head><body>
    <h2>${status}リスト</h2>
    <table border="1" cellspacing="0" cellpadding="5">
      <tr><th>Lv</th><th>サーバー</th><th>X</th><th>Y</th><th>目印</th><th>削除</th>${status === "未取得" ? "<th>取得</th>" : ""}</tr>
      ${rows}
    </table>
    </body></html>
  `);
}

// ✅ CSVエクスポート（UTF-8 BOM付き）
function exportCSV(status) {
  const filtered = Object.values(coordinatesData).filter(i => i.取得状況 === status);
  const csv = filtered.map(i =>
    [i.サーバー名, i.X, i.Y, i.レベル, i.目印 || ""].join(",")
  );
  const blob = new Blob(["\uFEFF" + csv.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${status}_list.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

document.getElementById("exportUnclaimedCSV").addEventListener("click", () => exportCSV("未取得"));
document.getElementById("exportClaimedCSV").addEventListener("click", () => exportCSV("取得済み"));


// 初期読み込み
loadMarkers();

