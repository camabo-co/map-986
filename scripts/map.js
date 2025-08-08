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
  "1": "blue", "2": "lightblue", "3": "green", "4": "lime",
  "5": "orange", "6": "red", "7": "purple"
};

let unclaimedItems = [], claimedItems = [];
let unclaimedWin = null, claimedWin = null;

document.getElementById("toggleUnclaimed").onclick = () => openListTab("未取得リスト", unclaimedItems, "unclaimed");
document.getElementById("toggleClaimed").onclick = () => openListTab("取得済みリスト", claimedItems, "claimed");
document.getElementById("exportUnclaimedCSV").onclick = () => exportCSV(unclaimedItems, "unclaimed");
document.getElementById("exportClaimedCSV").onclick = () => exportCSV(claimedItems, "claimed");
document.getElementById("dedupeButton").onclick = dedupeCoordinates;

document.getElementById("coordinateForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = new FormData(e.target);
  const serverName = form.get("サーバー名");
  const x = parseInt(form.get("X"));
  const y = parseInt(form.get("Y"));
  const level = form.get("レベル");
  const mark = form.get("目印");

  if (!/^\d{3,4}$/.test(serverName) || isNaN(x) || isNaN(y)) {
    alert("入力内容を確認してください");
    return;
  }

  const snapshot = await get(child(ref(db), "coordinates"));
  const items = snapshot.exists() ? snapshot.val() : {};
  for (const key in items) {
    if (parseInt(items[key].X) === x && parseInt(items[key].Y) === y) {
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

  alert("登録しました");
  e.target.reset();
  await loadMarkers();
});

window.changeStatus = async (key) => {
  await update(ref(db), { [`coordinates/${key}/取得状況`]: "取得済み" });
  await loadMarkers();
  refreshListTabs();
};

window.handleDelete = async (key, msg = "削除しました") => {
  if (!confirm("本当に削除しますか？")) return;
  await remove(ref(db, `coordinates/${key}`));
  alert(msg);
  await loadMarkers();
  refreshListTabs();
};

window.handleStatusChange = async (key, status, msg) => {
  await update(ref(db), { [`coordinates/${key}/取得状況`]: status });
  alert(msg);
  await loadMarkers();
  refreshListTabs();
};

window.addEventListener("message", async (e) => {
  const d = e.data;
  if (d?.type === "statusChange") await handleStatusChange(d.id, d.status, `状態を「${d.status}」に変更しました`);
  if (d?.type === "delete") await handleDelete(d.id);
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
    item.X = parseInt(item.X);
    item.Y = parseInt(item.Y);

    const marker = L.circleMarker([item.Y, item.X], {
      radius: 1,
      color: levelColors[item.レベル] || "black",
      fillOpacity: 1
    }).addTo(map);

    const popupHTML = `
      <b>サーバー名:</b> ${item.サーバー名}<br>
      <b>Lv:</b> ${item.レベル}<br>
      <b>X:</b> ${item.X} / <b>Y:</b> ${item.Y}<br>
      <b>状態:</b> ${item.取得状況}<br>
      ${item.目印 ? `<b>🖍️目印:</b> ${item.目印}<br>` : ""}
      <button onclick="changeStatus('${item._id}')">取得済みに</button><br>
      <button onclick="handleDelete('${item._id}')">削除</button>
    `;
    marker.bindPopup(popupHTML);

    if (item.取得状況 === "未取得") unclaimedItems.push(item);
    else claimedItems.push(item);
  }
}

function openListTab(title, items, type) {
  const win = window.open("", type);
  const sorted = [...items].sort((a, b) => a.レベル - b.レベル || a.サーバー名 - b.サーバー名 || a.X - b.X || a.Y - b.Y);
  win.document.write(`
    <!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><title>${title}</title>
    <style>body{font-family:sans-serif;padding:20px;background:#fafafa}h2{color:${type==="unclaimed"?"#6c63ff":"darkgreen"}}li{background:white;margin:5px 0;padding:10px;border:1px solid #ccc}button{margin-right:5px;padding:5px 10px;font-size:13px;border:none;border-radius:4px;cursor:pointer}button.delete{background:#d9534f;color:white}button.status{background:${type==="unclaimed"?"#6c63ff":"darkorange"};color:white}</style></head><body>
    <h2>📋 ${title}</h2><ul>
    ${sorted.map(item => `
      <li>
        サーバー名: ${item.サーバー名} / X:${item.X}, Y:${item.Y} / Lv${item.レベル}<br>
        ${item.目印 ? `🖍️目印: ${item.目印}<br>` : ""}
        <button class="status" onclick="window.opener.postMessage({type:'statusChange',id:'${item._id}',status:'${type==="unclaimed"?"取得済み":"未取得"}'},'*')">
          ${type==="unclaimed"?"取得済みに":"未取得に戻す"}
        </button>
        <button class="delete" onclick="window.opener.postMessage({type:'delete',id:'${item._id}'},'*')">削除</button>
      </li>
    `).join("")}
    </ul></body></html>
  `);
  win.document.close();

  if (type === "unclaimed") unclaimedWin = win;
  else claimedWin = win;
}

function refreshListTabs() {
  if (unclaimedWin && !unclaimedWin.closed) openListTab("未取得リスト", unclaimedItems, "unclaimed");
  if (claimedWin && !claimedWin.closed) openListTab("取得済みリスト", claimedItems, "claimed");
}

function exportCSV(items, type) {
  const csv = ["サーバー名,X,Y,レベル,取得状況,目印"];
  items.forEach(i => {
    const line = [i.サーバー名, i.X, i.Y, i.レベル, i.取得状況, `"${i.目印 || ""}"`];
    csv.push(line.join(","));
  });

  const bom = new Uint8Array([0xEF, 0xBB, 0xBF]); // UTF-8 BOM
  const blob = new Blob([bom, csv.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${type}_list.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function dedupeCoordinates() {
  const snapshot = await get(child(ref(db), "coordinates"));
  if (!snapshot.exists()) return alert("データがありません");

  const all = snapshot.val();
  const seen = new Set();
  const deletes = [];

  for (const key in all) {
    const item = all[key];
    const keyXY = `${item.X},${item.Y}`;
    if (seen.has(keyXY)) {
      deletes.push(key);
    } else {
      seen.add(keyXY);
    }
  }

  for (const key of deletes) {
    await remove(ref(db, `coordinates/${key}`));
  }

  alert(`重複座標の整理が完了しました（削除：${deletes.length}件）`);
  await loadMarkers();
  refreshListTabs();
}

loadMarkers();
