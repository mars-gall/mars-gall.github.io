var gameCanvas = document.getElementById("gameCanvas");
var ctx = gameCanvas.getContext("2d");
ctx.font = "50px Serif";
const gameOverContainer = document.querySelector("#gameOverContainer");
const restartButton = document.querySelector("#restartButton");

const Tick_Rate = 60;
const Tick_Time = 1000 / Tick_Rate;
const MAX_TICKS = 5;

let lastTime = performance.now();
let accumulator = 0;

let spawnRate = 5000;
let gameTime = 0;
let lastProjectileTime = 0;
let bgcolor = "white";
let linearSpawnChance = 0;
let bounceSpawnChance = 15;
let gameIsOver = false;
let animationId = null;
let lastSpawnTime = 0;

const enemies = [];

gameCanvas.width = window.innerWidth;
gameCanvas.height = window.innerHeight;

function gameloop(currentTime) {
  let deltatime = currentTime - lastTime;
  lastTime = currentTime;

  if (deltatime > 60) deltatime = 60;

  accumulator += deltatime;

  let ticks = 0;
  while (accumulator >= Tick_Time && ticks < MAX_TICKS) {
    update();
    accumulator -= Tick_Time;
    ticks++;
  }

  render();

  animate();

  requestAnimationFrame(gameloop);
}

function animate() {
  const minDistanceFromPlayer = gameCanvas.width * 0.25;
  const minDistanceFromEnemy = 50;
  const maxAttempts = 100;
  const buffer = 25;

  const secondsPlayed = Math.floor(gameTime / 1000);
  const spawnMultiplier = getSpawnMultiplier(secondsPlayed);
  const effectiveSpawnRate = spawnRate / spawnMultiplier;
  let spawnPos = {
    x: Math.random() * gameCanvas.width,
    y: Math.random() * gameCanvas.height,
  };

  if (gameTime - lastSpawnTime >= effectiveSpawnRate) {
    let validSpawn = false;
    let attempts = 0;

    while (!validSpawn && attempts < maxAttempts) {
      attempts++;
      spawnPos = {
        x: Math.random() * gameCanvas.width,
        y: Math.random() * gameCanvas.height,
      };

      const dx = spawnPos.x - player.position.x;
      const dy = spawnPos.y - player.position.y;
      const distanceFromPlayer = Math.sqrt(dx ** 2 + dy ** 2);

      if (distanceFromPlayer < minDistanceFromPlayer + buffer) continue;

      let tooCloseToEnemy = false;

      for (let i = 0; i < enemies.length; i++) {
        const enemy = enemies[i];
        const edx = spawnPos.x - enemy.position.x;
        const edy = spawnPos.y - enemy.position.y;
        const distanceFromEnemy = Math.sqrt(edx ** 2 + edy ** 2);

        if (distanceFromEnemy < minDistanceFromEnemy + buffer) {
          tooCloseToEnemy = true;
        }
      }

      let edgeSpawnCheck = false;
      if (
        spawnPos.x < 25 ||
        spawnPos.x > gameCanvas.width - 25 ||
        spawnPos.y < 25 ||
        spawnPos.y > gameCanvas.height - 25
      ) {
        edgeSpawnCheck = true;
      }

      if (!tooCloseToEnemy && !edgeSpawnCheck) {
        validSpawn = true;
      }
    }

    if (gameTime - lastSpawnTime >= effectiveSpawnRate && validSpawn) {
      const enemy = new Enemy({
        position: spawnPos,
        target: player
      });
      enemies.push(enemy);
      lastSpawnTime = gameTime;
    }
  }

  if (player.health <= 0 && !gameIsOver) {
    gameIsOver = true;
    gameOverContainer.style.display = "flex";
    cancelAnimationFrame(animationId);
  }
}

const keys = {
  d: {
    pressed: false,
  },
  a: {
    pressed: false,
  },
  w: {
    pressed: false,
  },
  s: {
    pressed: false,
  },
};

class Player {
  constructor({
    position,
    velocity,
    health = 5,
    color = "green",
    height = 50,
    width = 50,
  }) {
    this.position = position;
    this.velocity = velocity;
    this.health = health;
    this.color = color;
    this.height = height;
    this.width = width;
  }

  draw() {
    ctx.fillStyle = this.color;
    ctx.fillRect(
      this.position.x - this.width / 2,
      this.position.y - this.height / 2,
      this.width,
      this.height,
    );
  }
}

function drawInfo(obj) {
  ctx.fillStyle = "Black";
  ctx.font = "50px Serif";
  const totalSeconds = Math.floor(gameTime / 1000);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60);
  const formattedSeconds = seconds.toString().padStart(2, "0");
  ctx.fillText("Time: " + minutes + ":" + formattedSeconds, 50, 100);
  ctx.fillText("Health: " + obj.health, 50, 50);
}

class Enemy {
  constructor({
    position,
    health = 1,
    target,
    posGoal,
    collisionCooldown = 0,
    color = "rgba(255, 0, 0, 1)",
    height = 50,
    width = 50,
  }) {
    this.position = position;
    this.velocity = { x: 0, y: 0 };
    this.health = health;
    this.color = color;
    this.height = height;
    this.width = width;
    this.spawnTime = gameTime;
    this.isDead = false;
    this.target = target;
    this.posGoal = posGoal;
    this.collisionCooldown = collisionCooldown;
  }

  draw() {
    ctx.fillStyle = this.color;
    ctx.fillRect(
      this.position.x - this.width / 2,
      this.position.y - this.height / 2,
      this.width,
      this.height,
    );
  }

  update() {

    if (gameTime - this.spawnTime <= 750) {;
      return;
    }

    const enemyVelocity = 1.0;
    const predictionTicks = 250;

    const predictedX =
      this.target.position.x + this.target.velocity.x * predictionTicks;
    const predictedY =
      this.target.position.y + this.target.velocity.y * predictionTicks;

    const angle = Math.atan2(
      predictedX - this.position.x,
      predictedY - this.position.y
    );

    this.velocity.x += Math.cos(angle) * enemyVelocity;
    this.velocity.y += Math.sin(angle) * enemyVelocity;

    if (
      this.collisionCooldown === 0 &&
      collision({
        object1: player,
        object2: this,
      })
    ) {
      player.health -= 1;
      this.health -= 1;
      this.collisionCooldown = 10;
    }

    this.position.x += this.velocity.x;
    this.position.y += this.velocity.y;

    const EnemyBounceModifier = -5;

    if (this.position.x < 24) {
      this.position.x = 25;
    }
    if (this.position.x > gameCanvas.width - 24) {
      this.position.x = gameCanvas.width - 25;
    }
    if (this.position.y < 24) {
      this.position.y = 25;
    }
    if (this.position.y > gameCanvas.height - 24) {
      this.position.y = gameCanvas.height - 25;
    }

    if (
      this.position.x + this.velocity.x <= 0 ||
      this.position.x + this.width + this.velocity.x >= gameCanvas.width
    ) {
      this.velocity.x *= EnemyBounceModifier;
    }

    if (
      this.position.y + this.velocity.y <= 0 ||
      this.position.y + this.height + this.velocity.y >= gameCanvas.height
    ) {
      this.velocity.y *= EnemyBounceModifier;
    }

    const EnemyMaxVelocity = 18;
    if (this.velocity.x > EnemyMaxVelocity) this.velocity.x = EnemyMaxVelocity;
    if (this.velocity.y > EnemyMaxVelocity) this.velocity.y = EnemyMaxVelocity;
    if (this.velocity.x < -EnemyMaxVelocity)
      this.velocity.x = -EnemyMaxVelocity;
    if (this.velocity.y < -EnemyMaxVelocity)
      this.velocity.y = -EnemyMaxVelocity;

   /* if (this.collisionCooldown > 0) {
      this.collisionCooldown--;
    }*/

    const myIndex = enemies.indexOf(this);
    for (let i = myIndex + 1; i < enemies.length; i++) {
      const other = enemies[i];
      if (!other) continue;
     /* if (other.collisionCooldown > 0 || this.collisionCooldown > 0) continue;
*/
    const dx = other.position.x - this.position.x;
    const dy = other.position.y - this.position.y;
    const dist = Math.hypot(dx,dy);
    const radii = this.width / 2 + other.width / 2;

    if (dist === 0) {
      dist = 1;
    }
    if (dist < radii) {
      const nx = dx / dist;
      const ny = dy / dist;
      const overlap = radii - dist;
      const correction = overlap / 2;

      this.position.x -= nx * correction;
      this.position.y -= ny * correction;
      other.position.x += nx * correction;
      other.position.y += ny * correction;

      const relativeVelocityX = other.velocity.x - this.velocity.x;
      const relativeVelocityY = other.velocity.y - this.velocity.y;
      const relativeVelocityAlongNormal =
        relativeVelocityX * nx + relativeVelocityY * ny;

   /*   if (relativeVelocityAlongNormal > 0) {
        this.collisionCooldown = 10;
        other.collisionCooldown = 10;
      }*/
    
      const e = 1.0;
      const j = -(1 + e) * relativeVelocityAlongNormal;
      const impulseX = j * nx;
      const impulseY = j * ny;

      this.velocity.x -= impulseX;
      this.velocity.y -= impulseY;
      other.velocity.x += impulseX;
      other.velocity.y += impulseY;

 /*     this.collisionCooldown = 10;
      other.collisionCooldown = 10;*/
    }
    }
  }
}

const player = new Player({
  position: { x: gameCanvas.width / 2, y: gameCanvas.height / 2 },
  velocity: { x: 0, y: 0 },
});

function render() {
  ctx.fillStyle = bgcolor;
  ctx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);

  player.draw();
  drawInfo(player);

  enemies.forEach((enemy) => enemy.draw());
  ctx.fillStyle = "black";
  ctx.fillText("Health: " + player.health, 50, 50);
}

function collision({ object1, object2 }) {
  const rect1 = {
    x: object1.position.x - object1.width / 2,
    y: object1.position.y - object1.height / 2,
    width: object1.width,
    height: object1.height,
  };

  const rect2 = {
    x: object2.position.x - object2.width / 2,
    y: object2.position.y - object2.height / 2,
    width: object2.width,
    height: object2.height,
  };

  return (
    rect1.x < rect2.x + rect2.width &&
    rect1.x + rect1.width > rect2.x &&
    rect1.y < rect2.y + rect2.height &&
    rect1.y + rect1.height > rect2.y
  );
}

function getSpawnMultiplier(seconds) {
  if (seconds < 20) return 1.0;
  if (seconds < 40) return 1.5;
  if (seconds < 60) return 2.0;
  if (seconds < 80) return 2.5;
  if (seconds < 100) return 3.0;
  if (seconds >= 100) return 4.0;
}

function update() {
  const maxPlayerVelocity = 10;
  const playerBounceModifier = -1.0;
  const acceleration = 1;

  if (player.velocity.x > maxPlayerVelocity)
    player.velocity.x = maxPlayerVelocity;
  if (player.velocity.x < -maxPlayerVelocity)
    player.velocity.x = -maxPlayerVelocity;
  if (player.velocity.y > maxPlayerVelocity)
    player.velocity.y = maxPlayerVelocity;
  if (player.velocity.y < -maxPlayerVelocity)
    player.velocity.y = -maxPlayerVelocity;

  let inputX = 0;
  let inputY = 0;

  if (keys.d.pressed) inputX += 1;
  if (keys.a.pressed) inputX -= 1;
  if (keys.w.pressed) inputY -= 1;
  if (keys.s.pressed) inputY += 1;

  if (inputX !== 0 || inputY !== 0) {
    const length = Math.sqrt(inputX ** 2 + inputY ** 2);
    inputX /= length;
    inputY /= length;

    player.velocity.x += inputX * acceleration;
    player.velocity.y += inputY * acceleration;
  }

  player.position.x += player.velocity.x;
  player.position.y += player.velocity.y;

  const friction = 0.025;
  if (Math.abs(player.velocity.x) > 0) {
    player.velocity.x *= 1 - friction;
    if (Math.abs(player.velocity.x) < friction) player.velocity.x = 0;
  }
  if (Math.abs(player.velocity.y) > 0) {
    player.velocity.y *= 1 - friction;
    if (Math.abs(player.velocity.y) < friction) player.velocity.y = 0;
  }

  if (
    player.position.x + player.velocity.x - player.width / 2 <= 0 ||
    player.position.x + player.velocity.x + player.width / 2 >= gameCanvas.width
  ) {
    player.velocity.x *= playerBounceModifier;
  }

  if (
    player.position.y + player.velocity.y - player.height / 2 <= 0 ||
    player.position.y + player.velocity.y + player.height / 2 >=
      gameCanvas.height
  ) {
    player.velocity.y *= playerBounceModifier;
  }

  if (player.position.x <= 25) {
    player.position.x = 25;
  }
  if (player.position.x >= gameCanvas.width - 25) {
    player.position.x = gameCanvas.width - 25;
  }
  if (player.position.y <= 25) {
    player.position.y = 25;
  }
  if (player.position.y >= gameCanvas.height - 25) {
    player.position.y = gameCanvas.height - 25;
  }

  enemies.forEach(enemy => enemy.update());

  gameTime += Tick_Time;
}

function restartGame() {
  gameTime = 0;
  bgcolor = "white";
  linearSpawnChance = 0;
  bounceSpawnChance = 15;
  gameIsOver = false;
  lastSpawnTime = 0;

  player.position = {
    x: gameCanvas.width / 2,
    y: gameCanvas.height / 2,
  };
  player.velocity = {
    x: 0,
    y: 0,
  };

  player.health = 5;

  enemies.length = 0;

  gameOverContainer.style.display = "none";

  animate();
}

window.addEventListener("keyup", (event) => {
  switch (event.key) {
    case "d":
    case "ArrowRight":
      keys.d.pressed = false;
      break;
    case "a":
    case "ArrowLeft":
      keys.a.pressed = false;
      break;
    case "w":
    case "ArrowUp":
      keys.w.pressed = false;
      break;
    case "s":
    case "ArrowDown":
      keys.s.pressed = false;
      break;
  }
});

window.addEventListener("keydown", (event) => {
  switch (event.key) {
    case "d":
    case "ArrowRight":
      keys.d.pressed = true;
      break;
    case "a":
    case "ArrowLeft":
      keys.a.pressed = true;
      break;
    case "w":
    case "ArrowUp":
      keys.w.pressed = true;
      break;
    case "s":
    case "ArrowDown":
      keys.s.pressed = true;
      break;
  }
});

restartButton.addEventListener("click", restartGame);

requestAnimationFrame(gameloop);
