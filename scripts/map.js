// ✅ map.js 完全版（アクティブチェック除外 / 並べ替え / 検索 / 削除対応）

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
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const dbRef = ref(db);

// ✅ 地図描画
const map = L.map('map', {
  crs: L.CRS.Simple,
  minZoom: -2,
  maxZoom: 2
});
const bounds = [[0, 0], [1000, 1000]];
L.rectangle(bounds, { color: "#ccc", weight: 1 }).addTo(map);
map.fitBounds(bounds);

// ✅ グリッド
for (let i = 0; i <= 1000; i += 100) {
  L.polyline([[i, 0], [i, 1000]], { color: '#ccc', weight: 1 }).addTo(map);
  L.polyline([[0, i], [1000, i]], { color: '#ccc', weight: 1 }).addTo(map);
}

// ✅ マーカー格納
let markers = [];

function clearMarkers() {
  markers.forEach(m => map.removeLayer(m));
  markers = [];
}

function addMarker(key, data) {
  if (data.取得状況 === "未取得") {
    const marker = L.marker([data.Y, data.X]).addTo(map)
      .bindPopup(`サーバー: ${data.サーバー名}<br>X: ${data.X} / Y: ${data.Y}<br>Lv: ${data.レベル}<br>目印: ${data.目印 || ''}<br><button onclick=\"markClaimed('${key}')\">✅取得済みにする</button><br><button onclick=\"handleDelete('${key}')\">🗑削除</button>`);
    markers.push(marker);
  }
}

async function loadMarkers() {
  clearMarkers();
  const snapshot = await get(child(dbRef, "coordinates"));
  if (snapshot.exists()) {
    const data = snapshot.val();
    Object.keys(data).forEach(key => addMarker(key, data[key]));
  }
}

await loadMarkers();

// ✅ 登録
const form = document.getElementById("coordinateForm");
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const formData = new FormData(form);
  const newData = {
    サーバー名: formData.get("サーバー名"),
    X: parseInt(formData.get("X")),
    Y: parseInt(formData.get("Y")),
    レベル: parseInt(formData.get("レベル")),
    目印: formData.get("目印") || "",
    取得状況: "未取得"
  };

  const snapshot = await get(child(dbRef, "coordinates"));
  const existing = snapshot.exists() ? snapshot.val() : {};

  const duplicateKey = Object.keys(existing).find(k =>
    existing[k].サーバー名 == newData.サーバー名 &&
    existing[k].X == newData.X &&
    existing[k].Y == newData.Y
  );

  if (duplicateKey) {
    await update(ref(db, `coordinates/${duplicateKey}`), { ...newData });
  } else {
    await push(ref(db, "coordinates"), newData);
  }

  form.reset();
  await loadMarkers();
});

// ✅ 取得済みに変更
window.markClaimed = async function (key) {
  await update(ref(db, `coordinates/${key}`), { 取得状況: "取得済み" });
  await loadMarkers();
  refreshListTabs();
};

// ✅ 削除（アクティブチェックなし）
window.handleDelete = async function (key, message = "削除しました") {
  try {
    await remove(ref(db, `coordinates/${key}`));
    alert(message);
    await loadMarkers();
    refreshListTabs();
  } catch (error) {
    console.error("削除エラー:", error);
    alert("削除に失敗しました");
  }
};

// ✅ リストを再描画するタブを開き直す
window.refreshListTabs = function () {
  // タブの再表示（未取得・取得済み）
  const unclaimed = window.open("", "unclaimed");
  if (unclaimed) unclaimed.location.reload();

  const claimed = window.open("", "claimed");
  if (claimed) claimed.location.reload();
};

// ✅ リスト表示ボタン
const btnUnclaimed = document.getElementById("toggleUnclaimed");
btnUnclaimed.addEventListener("click", () => openListTab("unclaimed", false));

const btnClaimed = document.getElementById("toggleClaimed");
btnClaimed.addEventListener("click", () => openListTab("claimed", true));

// ✅ 一覧出力・並び替え
function openListTab(name, isClaimed) {
  get(child(dbRef, "coordinates")).then((snapshot) => {
    if (snapshot.exists()) {
      const allData = Object.entries(snapshot.val());

      const filtered = allData.filter(([, v]) => v.取得状況 === (isClaimed ? "取得済み" : "未取得"));

      const sorted = filtered.sort(([, a], [, b]) => {
        if (a.レベル !== b.レベル) return a.レベル - b.レベル;
        if (a.サーバー名 !== b.サーバー名) return a.サーバー名 - b.サーバー名;
        if (a.X !== b.X) return a.X - b.X;
        return a.Y - b.Y;
      });

      const html = `<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><title>座標リスト</title><style>body{font-family:sans-serif}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:4px}input{margin:5px}</style></head><body><h2>${isClaimed ? "取得済み" : "未取得"}座標リスト</h2><input type="text" id="search" placeholder="検索キーワード"><table><thead><tr><th>サーバー</th><th>X</th><th>Y</th><th>レベル</th><th>目印</th><th>操作</th></tr></thead><tbody id="list">${sorted.map(([k,v]) => `<tr><td>${v.サーバー名}</td><td>${v.X}</td><td>${v.Y}</td><td>${v.レベル}</td><td>${v.目印 || ""}</td><td><button onclick=\"window.opener.markClaimed('${k}')\">✅</button><button onclick=\"window.opener.handleDelete('${k}')\">🗑</button></td></tr>`).join("")}</tbody></table><script>const search=document.getElementById('search');search.addEventListener('input',()=>{const val=search.value.toLowerCase();document.querySelectorAll('tbody tr').forEach(tr=>{tr.style.display=[...tr.children].some(td=>td.textContent.toLowerCase().includes(val))?"":"none"})})</script></body></html>`;

      const win = window.open("", name);
      if (win) {
        win.document.open();
        win.document.write(html);
        win.document.close();
      }
    }
  });
}
