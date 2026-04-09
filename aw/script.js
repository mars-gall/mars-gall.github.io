var gameCanvas = document.getElementById("gameCanvas");
var ctx = gameCanvas.getContext("2d");
var player = {
  x: 375,
  y: 275,
  width: 50,
  height: 50,
  color: "red",
  speed: 5,
};
var coin = {
  x: 100,
  y: 100,
  width: 20,
  height: 20,
  color: "gold",
  collected: false,
};
var enemy = {
  x: 700,
  y: 500,
  width: 50,
  height: 50,
  color: "blue",
  speed: 2,
};
var bullet = {
  x: player.x,
  y: player.y,
  width: 10,
  height: 10,
  color: "white",
  speed: 7,
  visable: false,
  velX: -1,
  velY: -1,
};
var keys = {};
var score = 0;
var frames = 0;

gameCanvas.width = 800;
gameCanvas.height = 600;

window.addEventListener("keydown", function (event) {
  keys[event.key] = true;
});
window.addEventListener("keyup", function (event) {
  keys[event.key] = false;
});

function gameloop() {
  frames++;
  ctx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
  if (keys["f"] && !bullet.visable) {
    bullet.visable = true;
    bullet.x = player.x;
    bullet.y = player.y;
  }
  if (keys["ArrowRight"] || keys["d"]) {
    player.x += player.speed;
    if (!bullet.visable) {
      bullet.velX = 1;
    }
  }
  if (keys["ArrowLeft"] || keys["a"]) {
    player.x -= player.speed;
    if (!bullet.visable) {
      bullet.velX = -1;
    }
  }
  if (keys["ArrowUp"] || keys["w"]) {
    player.y -= player.speed;
    if (!bullet.visable) {
      bullet.velY = -1;
    }
  }
  if (keys["ArrowDown"] || keys["s"]) {
    player.y += player.speed;
    if (!bullet.visable) {
      bullet.velY = 1;
    }
  }
  if (player.x < 0) {
    player.x = 0;
  }
  if (player.x > gameCanvas.width - player.width) {
    player.x = gameCanvas.width - player.width;
  }
  if (player.y < 0) {
    player.y = 0;
  }
  if (player.y > gameCanvas.height - player.height) {
    player.y = gameCanvas.height - player.height;
  }

  if (bullet.visable) {
    bullet.x += bullet.velX * bullet.speed;
    bullet.y += bullet.velY * bullet.speed;
    if (bullet.x > gameCanvas.width - bullet.width || bullet.x < 0) {
      bullet.velX *= -1;
    }
    if (bullet.y > gameCanvas.height - bullet.height || bullet.y < 0) {
      bullet.velY *= -1;
    }
  }

  if (enemy.x > player.x) {
    enemy.x -= enemy.speed;
  }
  if (enemy.x < player.x) {
    enemy.x += enemy.speed;
  }
  if (enemy.y > player.y) {
    enemy.y -= enemy.speed;
  }
  if (enemy.y < player.y) {
    enemy.y += enemy.speed;
  }

  if (
    player.x < enemy.x + enemy.width &&
    player.x + player.width > enemy.x &&
    player.y < enemy.y + enemy.height &&
    player.y + player.height > enemy.y
  ) {
    score = 0;
    player.x = 375;
    player.y = 275;
    enemy.x = 700;
    enemy.y = 500;
  }

  if (
    player.x < coin.x + coin.width &&
    player.x + player.width > coin.x &&
    player.y < coin.y + coin.height &&
    player.y + player.height > coin.y &&
    !coin.collected
  ) {
    coin.collected = true;
    score++;
    coin.x = Math.random() * (gameCanvas.width - coin.width);
    coin.y = Math.random() * (gameCanvas.height - coin.height);
  }

  if (bullet.visable) {
    ctx.fillStyle = bullet.color;
    ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
  }

  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, player.y, player.width, player.height);

  ctx.fillStyle = enemy.color;
  ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);

  if (!coin.collected) {
    ctx.fillStyle = coin.color;
    ctx.fillRect(coin.x, coin.y, coin.width, coin.height);
  } else {
    coin.collected = false;
  }

  ctx.fillStyle = "white";
  ctx.font = "24px Arial";
  ctx.fillText("Score: " + score, 10, 30);
  ctx.fillText("Frames: " + frames, 10, 50);
  ctx.fillText("space: " + keys["Space"], 10, 70);

  requestAnimationFrame(gameloop);
}

gameloop();
