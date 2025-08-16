<!-- ✅ scripts/map.js - 完全動作版 -->
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
  appId: "1:701191378459:web:d2cf8d869f5"
};
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const dbRef = ref(db, "coordinates");

const levelColors = {
  1: "blue",
  2: "green",
  3: "orange",
  4: "red",
  5: "purple",
  6: "black",
  7: "gold"
};

const map = L.map("map", {
  crs: L.CRS.Simple,
  minZoom: -2
});
const bounds = [[0, 0], [1000, 1000]];
L.rectangle(bounds, { color: "#ddd", weight: 1, fillOpacity: 0.05 }).addTo(map);
map.fitBounds(bounds);

const markers = {};
function renderMarkers(data) {
  Object.values(markers).forEach(marker => map.removeLayer(marker));
  Object.keys(markers).forEach(key => delete markers[key]);

  data.forEach(entry => {
    const { サーバー名, X, Y, レベル, 取得状況, 目印 } = entry;
    const key = `${サーバー名}_${X}_${Y}`;
    const color = levelColors[レベル] || "gray";
    const marker = L.circleMarker([Y, X], {
      radius: 8,
      color,
      fillColor: color,
      fillOpacity: 0.8
    }).addTo(map);
    marker.bindPopup(`サーバー: ${サーバー名}<br>X: ${X} / Y: ${Y}<br>レベル: ${レベル}<br>状態: ${取得状況}<br>目印: ${目印 || ""}`);
    markers[key] = marker;
  });
}

function fetchDataAndRender() {
  get(dbRef).then(snapshot => {
    if (snapshot.exists()) {
      const data = Object.values(snapshot.val());
      const unclaimed = data.filter(item => item.取得状況 === "未取得");
      renderMarkers(unclaimed);
    }
  });
}
fetchDataAndRender();

document.getElementById("registerForm").addEventListener("submit", e => {
  e.preventDefault();
  const server = document.getElementById("server").value.trim();
  const x = parseInt(document.getElementById("x").value);
  const y = parseInt(document.getElementById("y").value);
  const level = parseInt(document.getElementById("level").value);
  const mark = document.getElementById("mark").value.trim();
  if (!server || isNaN(x) || isNaN(y) || isNaN(level)) return;
  get(child(dbRef, `${server}_${x}_${y}`)).then(() => {
    get(dbRef).then(snapshot => {
      const data = snapshot.val() || {};
      const exists = Object.values(data).find(item =>
        item.サーバー名 == server && item.X == x && item.Y == y);
      if (exists) {
        const matchKey = Object.keys(data).find(k =>
          data[k].サーバー名 == server && data[k].X == x && data[k].Y == y);
        update(child(dbRef, matchKey), { 取得状況: "未取得", 目印: mark });
      } else {
        push(dbRef, {
          サーバー名: server,
          X: x,
          Y: y,
          レベル: level,
          取得状況: "未取得",
          目印: mark
        });
      }
      setTimeout(fetchDataAndRender, 300);
    });
  });
  e.target.reset();
});

document.getElementById("csvForm").addEventListener("submit", e => {
  e.preventDefault();
  const lines = document.getElementById("csvInput").value.trim().split("\n");
  lines.forEach(line => {
    const [server, xStr, yStr, levelStr, mark] = line.split(",");
    const x = parseInt(xStr), y = parseInt(yStr), level = parseInt(levelStr);
    if (!server || isNaN(x) || isNaN(y) || isNaN(level)) return;
    get(dbRef).then(snapshot => {
      const data = snapshot.val() || {};
      const exists = Object.values(data).find(item =>
        item.サーバー名 == server && item.X == x && item.Y == y);
      if (exists) {
        const matchKey = Object.keys(data).find(k =>
          data[k].サーバー名 == server && data[k].X == x && data[k].Y == y);
        update(child(dbRef, matchKey), { 取得状況: "未取得", 目印: mark });
      } else {
        push(dbRef, {
          サーバー名: server,
          X: x,
          Y: y,
          レベル: level,
          取得状況: "未取得",
          目印: mark
        });
      }
      setTimeout(fetchDataAndRender, 300);
    });
  });
  e.target.reset();
});

window.openListTab = function (status) {
  get(dbRef).then(snapshot => {
    if (!snapshot.exists()) return;
    const data = Object.values(snapshot.val())
      .filter(item => item.取得状況 === status)
      .sort((a, b) => a.レベル - b.レベル || a.サーバー名.localeCompare(b.サーバー名) || a.X - b.X || a.Y - b.Y);
    const win = window.open("", "_blank");
    win.document.write(`<html><head><meta charset="UTF-8"><title>${status}リスト</title>
      <style>body{font-family:sans-serif;}table{border-collapse:collapse;width:100%;}th,td{border:1px solid #999;padding:4px;text-align:center;}button{margin:0 2px;}</style></head><body><h2>${status}リスト</h2><table><tr><th>サーバー</th><th>X</th><th>Y</th><th>レベル</th><th>目印</th><th>操作</th></tr>`);
    data.forEach(item => {
      win.document.write(`<tr>
        <td>${item.サーバー名}</td><td>${item.X}</td><td>${item.Y}</td><td>${item.レベル}</td><td>${item.目印 || ""}</td>
        <td>
          <button onclick="window.opener.updateStatus('${item.サーバー名}', ${item.X}, ${item.Y}, '${status === "未取得" ? "取得済み" : "未取得"}');window.close();">状態変更</button>
          <button onclick="window.opener.deleteEntry('${item.サーバー名}', ${item.X}, ${item.Y});window.close();">削除</button>
        </td>
      </tr>`);
    });
    win.document.write("</table></body></html>");
    win.document.close();
  });
};

window.updateStatus = function (server, x, y, newStatus) {
  get(dbRef).then(snapshot => {
    if (!snapshot.exists()) return;
    const data = snapshot.val();
    const key = Object.keys(data).find(k =>
      data[k].サーバー名 == server && data[k].X == x && data[k].Y == y);
    if (key) {
      update(child(dbRef, key), { 取得状況: newStatus });
      setTimeout(fetchDataAndRender, 300);
    }
  });
};

window.deleteEntry = function (server, x, y) {
  get(dbRef).then(snapshot => {
    if (!snapshot.exists()) return;
    const data = snapshot.val();
    const key = Object.keys(data).find(k =>
      data[k].サーバー名 == server && data[k].X == x && data[k].Y == y);
    if (key) {
      remove(child(dbRef, key));
      setTimeout(fetchDataAndRender, 300);
    }
  });
};

window.downloadCSV = function (status) {
  get(dbRef).then(snapshot => {
    if (!snapshot.exists()) return;
    const data = Object.values(snapshot.val()).filter(item => item.取得状況 === status);
    const csv = ["サーバー名,X,Y,レベル,目印"].concat(
      data.map(d => [d.サーバー名, d.X, d.Y, d.レベル, d.目印 || ""].join(","))
    ).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${status}_list.csv`;
    link.click();
  });
};

window.cleanDuplicates = function () {
  get(dbRef).then(snapshot => {
    if (!snapshot.exists()) return;
    const data = snapshot.val();
    const seen = {};
    Object.entries(data).forEach(([key, val]) => {
      const id = `${val.サーバー名}_${val.X}_${val.Y}`;
      if (seen[id]) {
        remove(child(dbRef, key));
      } else {
        seen[id] = true;
      }
    });
    setTimeout(fetchDataAndRender, 300);
  });
};
