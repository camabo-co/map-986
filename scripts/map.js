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

// ✅ 地図初期化（1000×1000グリッド）
const map = L.map("map", {
  crs: L.CRS.Simple,
  minZoom: -3,
  maxZoom: 2
}).setView([500, 500], -2);

for (let i = 0; i <= 1000; i++) {
  L.polyline([[i, 0], [i, 1000]], { color: "#ddd", weight: 0.3 }).addTo(map);
  L.polyline([[0, i], [1000, i]], { color: "#ddd", weight: 0.3 }).addTo(map);
}

// ✅ レベル別マーカー色
const levelColors = {
  "1": "blue",
  "2": "lightblue",
  "3": "green",
  "4": "lime",
  "5": "orange",
  "6": "red",
  "7": "purple"
};

// ✅ 状態管理変数
let unclaimedItems = [], claimedItems = [];
let claimedWin = null, unclaimedWin = null;

// ✅ 登録フォーム送信
const form = document.getElementById("coordinateForm");
form.addEventListener("submit", async (e) => {
  e.preventDefault();
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

// ✅ マーカー読み込みと分類
async function loadMarkers() {
  unclaimedItems = [], claimedItems = [];
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

// ✅ 状態変更（ポップアップから）
window.changeStatus = async function (key) {
  await update(ref(db), { [`coordinates/${key}/取得状況`]: "取得済み" });
  await loadMarkers();
  refreshListTabs();
};

// ✅ 削除（全画面共通）
window.handleDelete = async function (key, message = "削除しました") {
  try {
    if (!confirm("本当に削除しますか？")) return;
    await remove(ref(db, `coordinates/${key}`));
    alert(message);
    await loadMarkers();
    refreshListTabs();
  } catch (error) {
    console.error("削除エラー:", error);
    alert("削除に失敗しました");
  }
};

// ✅ 状態変更（リスト画面から）
window.handleStatusChange = async function (key, status, message) {
  await update(ref(db), { [`coordinates/${key}/取得状況`]: status });
  alert(message);
  await loadMarkers();
  refreshListTabs();
};

// ✅ メッセージ受信（リストからの postMessage に対応）
window.addEventListener("message", async (event) => {
  const data = event.data;
  if (!data || typeof data !== "object") return;

  if (data.type === "statusChange") {
    await handleStatusChange(data.id, data.status, `状態を「${data.status}」に更新しました`);
  }

  if (data.type === "delete") {
    await handleDelete(data.id, "削除しました");
  }
});

// ✅ リスト再描画
function refreshListTabs() {
  if (unclaimedWin && !unclaimedWin.closed) openListTab("未取得リスト", unclaimedItems, "unclaimed");
  if (claimedWin && !claimedWin.closed) openListTab("取得済みリスト", claimedItems, "claimed");
}

// ✅ 初期ロード
loadMarkers();

// ✅ リストボタンイベント
document.getElementById("toggleUnclaimed").addEventListener("click", () => {
  openListTab("未取得リスト", unclaimedItems, "unclaimed");
});
document.getElementById("toggleClaimed").addEventListener("click", () => {
  openListTab("取得済みリスト", claimedItems, "claimed");
});

// ✅ リストウィンドウ生成
function openListTab(title, items, type) {
  const win = window.open("", type === "unclaimed" ? "unclaimedWin" : "claimedWin");

  // 並び順を保持
  const currentSort = localStorage.getItem(`${type}_sortOrder`) || "xy";

  const sortItems = (list, order) => {
    if (order === "xy") {
      return [...list].sort((a, b) => a.X - b.X || a.Y - b.Y);
    } else if (order === "recent") {
      return [...list]; // 登録順（ソートしない）
    }
    return list;
  };

  const renderList = (sortOrder) => {
    const sortedItems = sortItems(items, sortOrder);
    const html = `
      <!DOCTYPE html>
      <html lang="ja">
      <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        <style>
          body { font-family: sans-serif; padding: 20px; background: #fafafa; }
          h2 { color: ${type === "unclaimed" ? "#6c63ff" : "darkgreen"}; }
          select { margin: 10px 0; padding: 4px 8px; }
          ul { list-style: none; padding: 0; }
          li {
            background: white; border: 1px solid #ccc; margin-bottom: 8px;
            padding: 10px; font-size: 14px;
          }
          button {
            margin-right: 8px; padding: 5px 10px; font-size: 13px;
            background: ${type === "unclaimed" ? "#6c63ff" : "darkorange"};
            color: white; border: none; border-radius: 4px;
            cursor: pointer;
          }
          button.delete { background: #d9534f; }
        </style>
      </head>
      <body>
        <h2>📋 ${title}</h2>

        <label>並び順：
          <select id="sortSelect" onchange="changeSort(this.value)">
            <option value="xy" ${sortOrder === "xy" ? "selected" : ""}>座標順（X→Y）</option>
            <option value="recent" ${sortOrder === "recent" ? "selected" : ""}>登録順（そのまま）</option>
          </select>
        </label>

        <ul>
          ${sortedItems.map(item => `
            <li>
              サーバー名: ${item.サーバー名} / X:${item.X}, Y:${item.Y} / Lv${item.レベル}<br>
              ${item.目印 ? `<b>🖍️目印:</b> ${item.目印}<br>` : ""}
              ${type === "unclaimed"
                ? `<button onclick="sendStatusChange('${item._id}', '取得済み')">取得済みに</button>`
                : `<button onclick="sendStatusChange('${item._id}', '未取得')">未取得に戻す</button>`}
              <button class="delete" onclick="sendDelete('${item._id}')">削除</button>
            </li>
          `).join("")}
        </ul>

        <script>
          function sendStatusChange(id, status) {
            window.opener.postMessage({ type: 'statusChange', id, status }, "*");
          }
          function sendDelete(id) {
            window.opener.postMessage({ type: 'delete', id }, "*");
          }
          function changeSort(order) {
            localStorage.setItem("${type}_sortOrder", order);
            location.reload();
          }
        </script>
      </body>
      </html>
    `;
    win.document.open();
    win.document.write(html);
    win.document.close();
  };

  renderList(currentSort);

  if (type === "unclaimed") unclaimedWin = win;
  else claimedWin = win;
}
