// ✅ Firebase SDK 読み込み
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getDatabase, ref, push, get, child, update, remove } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";

// ✅ Firebase 初期化
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

// ✅ 地図初期化（1000×1000 グリッド）
const map = L.map("map", {
  crs: L.CRS.Simple,
  minZoom: -3,
  maxZoom: 2
}).setView([500, 500], -2);

// グリッド描画
for (let i = 0; i <= 1000; i++) {
  L.polyline([[i, 0], [i, 1000]], { color: "#ddd", weight: 0.3 }).addTo(map);
  L.polyline([[0, i], [1000, i]], { color: "#ddd", weight: 0.3 }).addTo(map);
}

// ✅ マーカー色（レベル別）
const levelColors = {
  "1": "blue", "2": "lightblue", "3": "green",
  "4": "lime", "5": "orange", "6": "red", "7": "purple"
};

// ✅ 状態管理
let unclaimedItems = [], claimedItems = [];
let claimedWin = null, unclaimedWin = null;

// ✅ 登録処理
document.getElementById("coordinateForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);
  const serverName = formData.get("サーバー名");
  const x = parseInt(formData.get("X"));
  const y = parseInt(formData.get("Y"));
  const level = formData.get("レベル");
  const mark = formData.get("目印");

  if (!/^\d{3,4}$/.test(serverName) || isNaN(x) || x < 0 || x > 999 || isNaN(y) || y < 0 || y > 999) {
    alert("入力内容を確認してください");
    return;
  }

  const snapshot = await get(child(ref(db), "coordinates"));
  const items = snapshot.exists() ? snapshot.val() : {};
  for (const key in items) {
    const item = items[key];
    if (parseInt(item.X) === x && parseInt(item.Y) === y) {
      alert(`この座標 X:${x}, Y:${y} はすでに登録されています`);
      return;
    }
  }

  await push(ref(db, "coordinates"), {
    サーバー名: serverName,
    X: x,
    Y: y,
    レベル: level,
    取得状況: "未取得",
    目印: mark || ""
  });

  alert("登録しました！");
  form.reset();
  await loadMarkers();
});

// ✅ マーカー表示
async function loadMarkers() {
  unclaimedItems = [];
  claimedItems = [];

  map.eachLayer(layer => {
    if (layer instanceof L.CircleMarker) map.removeLayer(layer);
  });

  const snapshot = await get(child(ref(db), "coordinates"));
  const items = snapshot.exists() ? snapshot.val() : {};

  for (const key in items) {
    const item = items[key];
    item._id = key;

    if (item.取得状況 === "未取得") {
      unclaimedItems.push(item);

      const marker = L.circleMarker([parseInt(item.Y), parseInt(item.X)], {
        radius: 1,
        color: levelColors[item.レベル] || "black",
        fillOpacity: 1
      }).addTo(map);

      marker.bindPopup(`
        <b>サーバー名:</b> ${item.サーバー名}<br>
        <b>Lv:</b> ${item.レベル}<br>
        <b>状態:</b> ${item.取得状況}<br>
        ${item.目印 ? `<b>🖍️目印:</b> ${item.目印}<br>` : ""}
        <button onclick="changeStatus('${item._id}')">取得済みに</button><br>
        <button onclick="handleDelete('${item._id}')">削除</button>
      `);
    } else {
      claimedItems.push(item);
    }
  }
}

// ✅ 状態変更（地図ポップアップ）
window.changeStatus = async function (key) {
  await update(ref(db), { [`coordinates/${key}/取得状況`]: "取得済み" });
  await loadMarkers();
  refreshListTabs();
};

// ✅ 削除処理（親ウィンドウでのみ confirm を出す）
window.handleDelete = async function (key, message = "削除しました") {
  try {
    // アクティブチェックを無効化（常に削除可能）
    if (!confirm("本当に削除しますか？")) return;
    await remove(ref(db, `coordinates/${key}`));
    alert(message);
    await loadMarkers();
    refreshListTabs();
  } catch (err) {
    console.error("削除エラー:", err);
    alert("削除に失敗しました");
  }
};

// ✅ 状態変更（postMessage 経由）
window.handleStatusChange = async function (key, status, message) {
  await update(ref(db), { [`coordinates/${key}/取得状況`]: status });
  alert(message);
  await loadMarkers();
  refreshListTabs();
};

// ✅ メッセージ受信（子ウィンドウ → 親ウィンドウ）
window.addEventListener("message", async (event) => {
  const data = event.data;
  if (!data || typeof data !== "object") return;

  if (data.type === "statusChange") {
    await handleStatusChange(data.id, data.status, `状態を「${data.status}」に変更しました`);
  }
  if (data.type === "delete") {
    await handleDelete(data.id, "削除しました");
  }
});

// ✅ 初期読み込み
loadMarkers();
