const API_URL = "https://script.google.com/macros/s/AKfycbxe8W2-j3bVVnqJbrbczljM5cMXnzeye9hwVuhB7lbrdR1g8qpsXpbdYMbaqR7Bw9E/exec";

const levelColor = {
  "1": "#1E90FF",
  "2": "#32CD32",
  "3": "#FFA500",
  "4": "#FF4500",
  "5": "#9370DB",
  "6": "#8B4513",
  "7": "#000000"
};

const map = L.map('map', {
  crs: L.CRS.Simple,
  minZoom: -4,
  maxZoom: 2,
  zoomSnap: 0.1
});
map.fitBounds([[0, 0], [1000, 1000]]);
map.setZoom(0);

// グリッド描画
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
        const color = levelColor[d.レベル] || "gray";
        const marker = L.circleMarker([parseInt(d.Y), parseInt(d.X)], {
          radius: 4,
          color: color,
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
