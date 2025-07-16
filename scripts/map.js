// map.js
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

const form = document.getElementById("coordinateForm");
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const formData = new FormData(form);
  const serverName = formData.get("サーバー名");
  const x = parseInt(formData.get("X"));
  const y = parseInt(formData.get("Y"));
  const level = formData.get("レベル");

  if (!/^\d{3,4}$/.test(serverName)) {
    alert("サーバー名は3〜4桁の数字で入力してください");
    return;
  }
  if (isNaN(x) || x < 0 || x > 999 || isNaN(y) || y < 0 || y > 999) {
    alert("座標は0〜999の範囲で入力してください");
    return;
  }

  const snapshot = await get(child(ref(db), "coordinates"));
  const existingItems = snapshot.exists() ? snapshot.val() : {};
  for (const key in existingItems) {
    const item = existingItems[key];
    if (parseInt(item.X) === x && parseInt(item.Y) === y) {
      alert(`この座標 X:${x}, Y:${y} はすでに登録されています`);
      return;
    }
  }

  const data = {
    サーバー名: serverName,
    X: x,
    Y: y,
    レベル: level,
    取得状況: "未取得"
  };
  await push(ref(db, "coordinates"), data);
  alert("登録しました！");
  form.reset();
  loadMarkers();
});

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
        <button onclick="changeStatus('${item._id}')">取得済みにする</button><br>
        <button onclick="handleDelete('${item._id}', '削除しました！')">削除</button>
      `);
    } else {
      claimedItems.push(item);
    }
  }
}

window.changeStatus = async function(key) {
  await update(ref(db), { [`coordinates/${key}/取得状況`]: "取得済み" });
  alert("更新しました！");
  loadMarkers();
};

window.restoreStatus = async function(key) {
  await update(ref(db), { [`coordinates/${key}/取得状況`]: "未取得" });
  alert("未取得に戻しました！");
  loadMarkers();
};

window.alertFromList = function (message) {
  alert(message);
};

window.handleStatusChange = async function(key, newStatus, message) {
  await update(ref(db), { [`coordinates/${key}/取得状況`]: newStatus });
  window.alertFromList(message);
  loadMarkers();
};

window.handleDelete = async function(key, message) {
  if (!confirm("本当に削除しますか？")) return;
  await remove(ref(db, `coordinates/${key}`));
  window.alertFromList(message);
  loadMarkers();
};

loadMarkers();
// 未取得／取得済みリストを新しいタブで開く
document.getElementById("toggleUnclaimed").addEventListener("click", () => {
  window.open("list_uncollected.html", "_blank");
});

document.getElementById("toggleClaimed").addEventListener("click", () => {
  window.open("list_collected.html", "_blank");
});

