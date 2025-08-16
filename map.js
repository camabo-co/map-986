// ✅ Firebase + Leaflet 初期化
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
  getDatabase, ref, push, get, set, update, remove, onValue
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";

// Firebase設定
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
const dataRef = ref(db, "coordinates");

// 地図表示（1000×1000グリッド）
const map = L.map("map", {
  crs: L.CRS.Simple,
  minZoom: -2,
  maxZoom: 4,
  zoomSnap: 1
});
const bounds = [[0, 0], [1000, 1000]];
map.fitBounds(bounds);

// グリッド描画
for (let i = 0; i <= 1000; i += 100) {
  L.polyline([[0, i], [1000, i]], { color: "#ccc", weight: 1 }).addTo(map);
  L.polyline([[i, 0], [i, 1000]], { color: "#ccc", weight: 1 }).addTo(map);
}

// レベルごとの色
const levelColors = {
  1: "blue", 2: "green", 3: "orange",
  4: "red", 5: "purple", 6: "brown", 7: "black"
};

// Firebaseのデータを読み込み → 未取得だけ表示
onValue(dataRef, (snapshot) => {
  map.eachLayer(layer => {
    if (layer instanceof L.CircleMarker) map.removeLayer(layer);
  });

  snapshot.forEach(childSnapshot => {
    const data = childSnapshot.val();
    const key = childSnapshot.key;
    if (data.取得状況 === "未取得") {
      createMarker(data, key);
    }
  });
});

// マーカー作成関数
function createMarker(data, key) {
  const { サーバー名, X, Y, レベル, 目印 } = data;
  const color = levelColors[レベル] || "gray";

  const marker = L.circleMarker([Y, X], {
    radius: 8,
    color: color,
    fillColor: color,
    fillOpacity: 0.8
  }).addTo(map);

  marker.bindPopup(`
    <b>サーバー:</b> ${サーバー名}<br>
    <b>X:</b> ${X} / <b>Y:</b> ${Y}<br>
    <b>レベル:</b> ${レベル}<br>
    <b>目印:</b> ${目印 || ""}<br><br>
    <button onclick="toggleStatus('${key}')">✅ 取得済みにする</button><br>
    <button onclick="deleteEntry('${key}')">🗑️ 削除</button>
  `);
}

// 取得状況を切り替える（未取得 ⇄ 取得済み）
window.toggleStatus = function (key) {
  const itemRef = ref(db, `coordinates/${key}`);
  get(itemRef).then(snapshot => {
    if (snapshot.exists()) {
      const currentStatus = snapshot.val().取得状況;
      const newStatus = currentStatus === "未取得" ? "取得済み" : "未取得";
      update(itemRef, { 取得状況: newStatus }).then(() => {
        alert(`「${newStatus}」に変更しました。`);
      });
    }
  });
};

// データを削除する
window.deleteEntry = function (key) {
  if (confirm("本当に削除しますか？")) {
    const itemRef = ref(db, `coordinates/${key}`);
    remove(itemRef).then(() => {
      alert("削除しました。");
    });
  }
};

// CSVダウンロード
window.downloadCSV = function (status) {
  get(dataRef).then(snapshot => {
    let csv = "サーバー名,X,Y,レベル,取得状況,目印\n";
    snapshot.forEach(childSnapshot => {
      const data = childSnapshot.val();
      if (data.取得状況 === status) {
        csv += `${data.サーバー名},${data.X},${data.Y},${data.レベル},${data.取得状況},${data.目印 || ""}\n`;
      }
    });

    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${status}_リスト.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });
};

// CSV一括登録
window.bulkRegisterFromCSV = function () {
  const input = document.getElementById("csvInput").value;
  const rows = input.split(/\r?\n/);

  rows.forEach(line => {
    const [サーバー名, X, Y, レベル, 目印] = line.split(",").map(v => v.trim());
    if (!サーバー名 || !X || !Y || !レベル) return;

    const entry = {
      サーバー名,
      X: Number(X),
      Y: Number(Y),
      レベル: Number(レベル),
      取得状況: "未取得",
      目印: 目印 || ""
    };

    push(dataRef, entry);
  });

  alert("CSVからの登録が完了しました。");
};
// ✅ 未取得／取得済みリストを別タブで表示
window.openListTab = function (status) {
  get(dataRef).then(snapshot => {
    const entries = [];
    snapshot.forEach(child => {
      const val = child.val();
      if (val.取得状況 === status) {
        entries.push({ key: child.key, ...val });
      }
    });

    // 並び替え：レベル → サーバー名 → X → Y
    entries.sort((a, b) => {
      return a.レベル - b.レベル || a.サーバー名.localeCompare(b.サーバー名) || a.X - b.X || a.Y - b.Y;
    });

    const newWin = window.open("", "_blank");
    const doc = newWin.document;
    doc.write("<!DOCTYPE html><html><head><meta charset='UTF-8'><title>リスト</title>");
    doc.write("<style>body{font-family:sans-serif;}table{border-collapse:collapse;width:100%;}th,td{border:1px solid #ccc;padding:4px;}button{margin:2px;}</style>");
    doc.write("</head><body>");
    doc.write(`<h2>${status}リスト</h2>`);
    doc.write("<table><thead><tr><th>レベル</th><th>サーバー名</th><th>X</th><th>Y</th><th>目印</th><th>操作</th></tr></thead><tbody>");

    entries.forEach(entry => {
      doc.write(`<tr>
        <td>${entry.レベル}</td>
        <td>${entry.サーバー名}</td>
        <td>${entry.X}</td>
        <td>${entry.Y}</td>
        <td>${entry.目印 || ""}</td>
        <td>
          <button onclick="window.opener.toggleStatus('${entry.key}')">${status === "未取得" ? "取得済みにする" : "未取得に戻す"}</button>
          <button onclick="window.opener.deleteEntry('${entry.key}')">削除</button>
        </td>
      </tr>`);
    });

    doc.write("</tbody></table>");
    doc.write("</body></html>");
    doc.close();
  });
};

// ✅ 同じX,Yの座標は1つだけ残す
window.cleanDuplicates = function () {
  get(dataRef).then(snapshot => {
    const seen = {};
    const toDelete = [];

    snapshot.forEach(child => {
      const data = child.val();
      const key = child.key;
      const coordKey = `${data.X}-${data.Y}`;
      if (seen[coordKey]) {
        toDelete.push(key);
      } else {
        seen[coordKey] = true;
      }
    });

    if (toDelete.length === 0) {
      alert("重複はありません。");
      return;
    }

    if (confirm(`${toDelete.length} 件の重複を削除しますか？`)) {
      toDelete.forEach(key => {
        remove(ref(db, `coordinates/${key}`));
      });
      alert("重複を削除しました。");
    }
  });
};

