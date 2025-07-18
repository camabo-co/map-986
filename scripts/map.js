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

const map = L.map("map", {
  crs: L.CRS.Simple,
  minZoom: -3,
  maxZoom: 2
}).setView([500, 500], -2);

for (let i = 0; i <= 1000; i++) {
  L.polyline([[i, 0], [i, 1000]], { color: "#ddd", weight: 0.3 }).addTo(map);
  L.polyline([[0, i], [1000, i]], { color: "#ddd", weight: 0.3 }).addTo(map);
}

const levelColors = {
  "1": "blue",
  "2": "lightblue",
  "3": "green",
  "4": "lime",
  "5": "orange",
  "6": "red",
  "7": "purple"
};

let unclaimedItems = [], claimedItems = [];
let claimedWin = null, unclaimedWin = null;

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
    目印: mark
  });
  alert("登録しました！");
  form.reset();
  await loadMarkers();
});

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
        <button onclick="changeStatus('${item._id}')">取得済みに</button><br>
        <button onclick="handleDelete('${item._id}')">削除</button>
      `);
    } else {
      claimedItems.push(item);
    }
  }
}

window.changeStatus = async function(key) {
  await update(ref(db), { [`coordinates/${key}/取得状況`]: "取得済み" });
  await loadMarkers();
  refreshListTabs();
};

window.handleDelete = async function(key) {
  if (!confirm("本当に削除しますか？")) return;
  await remove(ref(db, `coordinates/${key}`));
  alert("削除しました！");
  await loadMarkers();
  refreshListTabs();
};

function refreshListTabs() {
  if (unclaimedWin && !unclaimedWin.closed) openListTab("未取得リスト", unclaimedItems, "unclaimed");
  if (claimedWin && !claimedWin.closed) openListTab("取得済みリスト", claimedItems, "claimed");
}

loadMarkers();

document.getElementById("toggleUnclaimed").addEventListener("click", () => {
  openListTab("未取得リスト", unclaimedItems, "unclaimed");
});

document.getElementById("toggleClaimed").addEventListener("click", () => {
  openListTab("取得済みリスト", claimedItems, "claimed");
});

function openListTab(title, items, type) {
  const win = window.open("", type === "unclaimed" ? "unclaimedWin" : "claimedWin");
  const sortedItems = [...items].sort((a, b) => {
    return a.レベル - b.レベル || a.サーバー名 - b.サーバー名 || a.X - b.X || a.Y - b.Y;
  });
  const html = `<!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        body { font-family: sans-serif; padding: 20px; background: #fafafa; }
        h2 { color: ${type === "unclaimed" ? "#6c63ff" : "darkgreen"}; }
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
      <ul>
        ${sortedItems.map(item => `
         <li>
  サーバー名: ${item.サーバー名} / X:${item.X}, Y:${item.Y} / Lv${item.レベル}<br>
  ${type === "unclaimed" && item.目印 ? `<b>🖍️目印:</b> ${item.目印}<br>` : ""}
  ${type === "unclaimed"
    ? `<button onclick="window.opener.handleStatusChange('${item._id}', '取得済み', '更新しました')">取得済みに</button>`
    : `<button onclick="window.opener.handleStatusChange('${item._id}', '未取得', '未取得に戻しました')">未取得に戻す</button>`}
  <button class="delete" onclick="window.opener.handleDelete('${item._id}', '削除しました')">削除</button>
</li>

        `).join("")}
      </ul>
    </body>
    </html>`;
  win.document.write(html);
  win.document.close();

  if (type === "unclaimed") unclaimedWin = win;
  else claimedWin = win;
}

// ✅ メッセージ受信処理（postMessage 対応）
window.addEventListener("message", async (event) => {
  const { action, key, status } = event.data;
  if (action === "changeStatus") {
    await update(ref(db), { [`coordinates/${key}/取得状況`]: status });
    await loadMarkers();
    refreshListTabs();
  } else if (action === "delete") {
    await remove(ref(db, `coordinates/${key}`));
    await loadMarkers();
    refreshListTabs();
  }
});
