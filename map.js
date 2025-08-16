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
  appId: "1:701191378459:web:d2cf8d869f5"
};
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// マップ初期化
const map = L.map("map", {
  minZoom: 0,
  maxZoom: 4,
  zoomSnap: 1
}).setView([500, 500], 0);
const bounds = [[0, 0], [1000, 1000]];
L.rectangle(bounds, { color: "#999", weight: 1, fillOpacity: 0 }).addTo(map);
map.setMaxBounds(bounds);

// グリッド描画
for (let i = 0; i <= 1000; i += 100) {
  L.polyline([[0, i], [1000, i]], { color: "#ccc", weight: 1 }).addTo(map);
  L.polyline([[i, 0], [i, 1000]], { color: "#ccc", weight: 1 }).addTo(map);
}

// レベルに応じたマーカー色
function getColor(level) {
  const colors = {
    1: "blue", 2: "green", 3: "orange",
    4: "purple", 5: "red", 6: "black", 7: "brown"
  };
  return colors[level] || "gray";
}

// 表示
function displayMarkers() {
  get(child(ref(db), "coordinates")).then(snapshot => {
    if (snapshot.exists()) {
      map.eachLayer(layer => {
        if (layer instanceof L.CircleMarker) map.removeLayer(layer);
      });

      Object.entries(snapshot.val()).forEach(([key, val]) => {
        if (val.取得状況 === "未取得") {
          const marker = L.circleMarker([val.Y, val.X], {
            radius: 8,
            color: getColor(val.レベル),
            fillOpacity: 0.8
          }).addTo(map);
          marker.bindPopup(`
            <b>サーバー名:</b> ${val.サーバー名}<br/>
            <b>X:</b> ${val.X} / <b>Y:</b> ${val.Y}<br/>
            <b>レベル:</b> ${val.レベル}<br/>
            <b>目印:</b> ${val.目印 || ""}<br/>
            <button onclick="window.toggleStatus('${key}')">✅ 取得済みにする</button><br/>
            <button onclick="window.deleteEntry('${key}')">🗑️ 削除</button>
          `);
        }
      });
    }
  });
}
displayMarkers();

// 登録処理
document.getElementById("csvForm")?.addEventListener("submit", e => {
  e.preventDefault();
  const lines = document.getElementById("csvInput").value.trim().split("\n");
  lines.forEach(line => {
    const [サーバー名, X, Y, レベル, 目印] = line.split(",");
    if (サーバー名 && X && Y && レベル) {
      const newItem = {
        サーバー名: サーバー名.trim(),
        X: Number(X),
        Y: Number(Y),
        レベル: Number(レベル),
        目印: (目印 || "").trim(),
        取得状況: "未取得"
      };
      const coordRef = ref(db, "coordinates");
      get(coordRef).then(snapshot => {
        let found = false;
        snapshot.forEach(child => {
          const val = child.val();
          if (val.X === newItem.X && val.Y === newItem.Y) {
            update(ref(db, `coordinates/${child.key}`), newItem);
            found = true;
          }
        });
        if (!found) push(coordRef, newItem);
        displayMarkers();
      });
    }
  });
  document.getElementById("csvInput").value = "";
});

// ステータス切替
window.toggleStatus = function (key) {
  const itemRef = ref(db, `coordinates/${key}`);
  get(itemRef).then(snapshot => {
    if (snapshot.exists()) {
      const current = snapshot.val().取得状況;
      const next = current === "未取得" ? "取得済み" : "未取得";
      update(itemRef, { 取得状況: next }).then(displayMarkers);
    }
  });
};

// 削除
window.deleteEntry = function (key) {
  if (confirm("本当に削除しますか？")) {
    remove(ref(db, `coordinates/${key}`)).then(displayMarkers);
  }
};

// 重複整理
window.cleanDuplicates = function () {
  get(child(ref(db), "coordinates")).then(snapshot => {
    const coords = {};
    snapshot.forEach(child => {
      const val = child.val();
      const key = `${val.X}_${val.Y}`;
      if (!coords[key]) {
        coords[key] = { key: child.key, val };
      } else {
        remove(ref(db, `coordinates/${child.key}`));
      }
    });
    alert("重複整理を完了しました。");
    displayMarkers();
  });
};

// CSV出力
window.downloadCSV = function (filter) {
  get(child(ref(db), "coordinates")).then(snapshot => {
    if (!snapshot.exists()) return;

    const rows = [["サーバー名", "X", "Y", "レベル", "目印"]];
    snapshot.forEach(child => {
      const val = child.val();
      if (val.取得状況 === filter) {
        rows.push([val.サーバー名, val.X, val.Y, val.レベル, val.目印 || ""]);
      }
    });

    const csv = "\uFEFF" + rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${filter}_list.csv`;
    a.click();
  });
};

// リスト表示
window.openListTab = function (status) {
  get(child(ref(db), "coordinates")).then(snapshot => {
    if (!snapshot.exists()) return;

    const data = [];
    snapshot.forEach(child => {
      const val = child.val();
      if (val.取得状況 === status) {
        data.push({ ...val, key: child.key });
      }
    });

    data.sort((a, b) =>
      a.レベル - b.レベル ||
      a.サーバー名.localeCompare(b.サーバー名) ||
      a.X - b.X ||
      a.Y - b.Y
    );

    const html = `
      <html lang="ja"><head><meta charset="UTF-8"><title>${status}リスト</title>
      <style>
        body { font-family: sans-serif; padding: 10px; }
        h2 { color: ${status === "未取得" ? "#2c3e50" : "#8e44ad"}; }
        button { margin-left: 5px; }
      </style></head><body>
      <h2>📋 ${status}リスト</h2><ul>
      ${data.map(d => `
        <li>
          Lv${d.レベル} / ${d.サーバー名} / X:${d.X} / Y:${d.Y} / ${d.目印 || ""}
          <button onclick="window.opener.toggleStatus('${d.key}')">
            ${status === "未取得" ? "✅取得済みに" : "↩未取得に戻す"}
          </button>
          <button onclick="window.opener.deleteEntry('${d.key}')">🗑️削除</button>
        </li>
      `).join("")}
      </ul></body></html>
    `;
    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
  });
};
