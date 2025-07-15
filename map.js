// API URL（GASの最新デプロイURLに差し替えてください）
const API_URL = "<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>座標マップ（未取得のみ表示）</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">

  <!-- Leaflet ライブラリの読み込み -->
  <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css">
  <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>

  <!-- 自作のCSSとJSの読み込み -->
  <link rel="stylesheet" href="style/map.css">
  <script src="scripts/map.js" defer></script>
</head>
<body>

<script>
document.addEventListener("DOMContentLoaded", function () {
  if (sessionStorage.getItem("authenticated") === "true") return;

  const password = prompt("パスワードを入力してください：");
  if (password === "wareranochonnma") {
    sessionStorage.setItem("authenticated", "true");
  } else {
    alert("パスワードが違います。");
    window.location.href = "https://www.google.com";
  }
});
</script>

<h2>📍 座標マップ（未取得のみ表示）</h2>

<form id="coordForm">
  <label>サーバー名: <input type="text" id="server" required></label>
  <label>X: <input type="number" id="x" required></label>
  <label>Y: <input type="number" id="y" required></label>
  <label>レベル:
    <select id="level">
      <option>1</option><option>2</option><option>3</option>
      <option>4</option><option>5</option><option>6</option><option>7</option>
    </select>
  </label>
  <label>状態:
    <select id="status">
      <option>未取得</option>
      <option>取得済み</option>
    </select>
  </label>
  <button type="submit">登録</button>
</form>

<div>
  <a href="list_uncollected.html" target="_blank">📋 未取得一覧</a>
  <a href="list_collected.html" target="_blank">📋 取得済み一覧</a>
</div>

<div id="map"></div>

</body>
</html>
";

// 地図初期化
const map = L.map('map', {
  crs: L.CRS.Simple,
  minZoom: -4,
  maxZoom: 2,
  zoomSnap: 0.1
});
map.fitBounds([[0, 0], [1000, 1000]]);
map.setZoom(0);

// グリッド線描画
for (let i = 0; i <= 1000; i++) {
  L.polyline([[i, 0], [i, 1000]], { color: "#ccc", weight: 0.5 }).addTo(map);
  L.polyline([[0, i], [1000, i]], { color: "#ccc", weight: 0.5 }).addTo(map);
}

// マーカー表示（未取得のみ）
fetch(API_URL)
  .then(res => res.json())
  .then(data => {
    data.forEach(d => {
      if (d.取得状況 === "未取得") {
        const marker = L.circleMarker([parseInt(d.Y), parseInt(d.X)], {
          radius: 3,
          color: "black",
          fillOpacity: 1
        }).addTo(map);
        marker.bindPopup(`${d.サーバー名} / X:${d.X}, Y:${d.Y} / Lv:${d.レベル}`);
        marker.on("click", () => {
          if (confirm("この座標を取得済みにしますか？")) {
            fetch(API_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                サーバー名: d.サーバー名,
                X: d.X,
                Y: d.Y,
                レベル: d.レベル,
                取得状況: "取得済み"
              })
            })
              .then(res => res.json())
              .then(res => {
                alert(res.message);
                location.reload();
              })
              .catch(err => alert("更新エラー: " + err.message));
          }
        });
      }
    });
  })
  .catch(err => alert("地図データの取得エラー: " + err.message));

// 登録処理
document.getElementById("coordForm").addEventListener("submit", function (e) {
  e.preventDefault();
  const data = {
    サーバー名: document.getElementById("server").value,
    X: parseInt(document.getElementById("x").value),
    Y: parseInt(document.getElementById("y").value),
    レベル: document.getElementById("level").value,
    取得状況: document.getElementById("status").value
  };
  fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  })
    .then(res => res.json())
    .then(res => {
      alert(res.message);
      location.reload();
    })
    .catch(err => alert("登録エラー: " + err.message));
});
