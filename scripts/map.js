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
    // 親ウィンドウでのみ confirm（子ウィンドウは無効化）
    if (document.hidden) {
      alert("削除するには、地図画面をアクティブにしてから操作してください。");
      return;
    }

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

// ✅ リストボタン
document.getElementById("toggleUnclaimed").addEventListener("click", () => {
  openListTab("未取得リスト", unclaimedItems, "unclaimed");
});
document.getElementById("toggleClaimed").addEventListener("click", () => {
  openListTab("取得済みリスト", claimedItems, "claimed");
});

// ✅ リスト画面更新
function refreshListTabs() {
  if (unclaimedWin && !unclaimedWin.closed) openListTab("未取得リスト", unclaimedItems, "unclaimed");
  if (claimedWin && !claimedWin.closed) openListTab("取得済みリスト", claimedItems, "claimed");
}

// ✅ リストタブを新規 or 更新
function openListTab(title, items, type) {
  const win = window.open("", type === "unclaimed" ? "unclaimedWin" : "claimedWin");

  const sortOrder = localStorage.getItem(`${type}_sortOrder`) || "xy";
  const sorted = [...items].sort((a, b) =>
    sortOrder === "xy" ? a.X - b.X || a.Y - b.Y : 0
  );

  const html = `
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8"><title>${title}</title>
      <style>
        body { font-family: sans-serif; background: #f5f5f5; padding: 20px; }
        h2 { color: ${type === "unclaimed" ? "#3366cc" : "#009900"}; }
        ul { list-style: none; padding: 0; }
        li { background: white; margin-bottom: 8px; padding: 8px; border: 1px solid #ccc; }
        button { margin-right: 6px; font-size: 13px; padding: 4px 8px; }
        .delete { background: #d9534f; color: white; }
      </style>
    </head>
    <body>
      <h2>${title}</h2>
      <label>並び順:
        <select onchange="changeSort(this.value)">
          <option value="xy" ${sortOrder === "xy" ? "selected" : ""}>座標順</option>
          <option value="recent" ${sortOrder === "recent" ? "selected" : ""}>登録順</option>
        </select>
      </label>
      <input type="text" id="searchInput" oninput="filterList()" placeholder="検索: 986, Lv3, 山など" style="margin-left:10px;" />
      <ul id="dataList">
        ${sorted.map(item => `
          <li data-search="${[item.サーバー名, item.X, item.Y, item.レベル, item.目印].join(' ').toLowerCase()}">
            サーバー名: ${item.サーバー名} / X:${item.X}, Y:${item.Y} / Lv${item.レベル}<br>
            ${item.目印 ? `🖍️目印: ${item.目印}<br>` : ""}
            <button onclick="sendAction('statusChange', '${item._id}', '${type === "unclaimed" ? "取得済み" : "未取得"}')">
              ${type === "unclaimed" ? "取得済みに" : "未取得に戻す"}
            </button>
            <button class="delete" onclick="sendAction('delete', '${item._id}')">削除</button>
          </li>
        `).join("")}
      </ul>
      <script>
        function sendAction(type, id, status = "") {
          if (!window.opener) {
            alert("親ウィンドウと通信できません");
            return;
          }
          window.opener.postMessage({ type, id, status }, "*");
        }

        function changeSort(order) {
          localStorage.setItem("${type}_sortOrder", order);
          location.reload();
        }

        function filterList() {
          const keyword = document.getElementById("searchInput").value.toLowerCase();
          const items = document.querySelectorAll("#dataList li");
          items.forEach(li => {
            const search = li.dataset.search;
            li.style.display = search.includes(keyword) ? "block" : "none";
          });
        }
      </script>
    </body>
    </html>
  `;

  win.document.write(html);
  win.document.close();

  if (type === "unclaimed") unclaimedWin = win;
  else claimedWin = win;
}

// ✅ 初期読み込み
loadMarkers();
