var gameCanvas = document.getElementById('gameCanvas');
var ctx = gameCanvas.getContext('2d');
ctx.font = '50px Serif';
const gameOverContainer = document.querySelector('#gameOverContainer');
const restartButton = document.querySelector('#restartButton'); 

const Tick_Rate = 60;
const Tick_Time = 1000 / Tick_Rate;
const MAX_TICKS = 5;

let lastTime = performance.now();
let accumulator = 0;


let spawnRate = 300;
let gameTime = 0;
let lastProjectileTime = 0;
let bgcolor = 'white';
let linearSpawnChance = 0;
let bounceSpawnChance = 15;
let gameIsOver = false;
let animationId = null;

gameCanvas.width = window.innerWidth
gameCanvas.height = window.innerHeight

function gameloop(currentTime) {
    let deltatime = currentTime - lastTime;
    lastTime = currentTime;

    if (deltatime > 100) deltatime = 100;

    accumulator += deltatime;

    let ticks = 0;
    while (accumulator >= Tick_Time && ticks < MAX_TICKS) {
        update();
        accumulator -= Tick_Time;
        ticks++;
    }

    render();

    requestAnimationFrame(gameloop);
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
}



class Player {
    constructor ({
        position,
        velocity,
        health = 5,
        color = 'green',
        height = 50,
        width = 50,
    }) {
        this.position = position
        this.velocity = velocity
        this.health = health
        this.color = color
        this.height = height
        this.width = width
    };

    draw() {
        ctx.fillStyle = this.color
        ctx.fillRect(
            this.position.x - this.width / 2,
            this.position.y - this.height / 2,
            this.width,
            this.height
        );

        const totalSeconds = Math.floor(gameTime / 1000)
        const seconds = totalSeconds % 60
        const minutes = Math.floor(totalSeconds / 60)
        const formattedSeconds = seconds.toString().padStart(2, '0')
        ctx.fillText('Time: ' + minutes + ':' + formattedSeconds, 50, 100)
    };
}

class Enemy {
    constructor({
        position,
        health = 1,
        target,
        color = 'rgba(255, 0, 0, 0.5)',
        height = 50,
        width = 50,
    }) {
        this.position = position
        this.velocity = { x: 0, y: 0 }
        this.health = health
        this.color = color
        this.height = height
        this.width = width
        this.spawnTime = gameTime
        this.isDead = false
        this.target = target
    }
    
    draw() {
        ctx.fillStyle = this.color
        ctx.fillRect(
            this.position.x - this.width / 2,
            this.position.y - this.height / 2,
            this.width,
            this.height
        );
    }

    update() {
        this.move()

        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;

        const enemyDeceleration = 0.1

        if (Math.abs(this.velocity.x) > 0.01) {
            this.velocity.x *= (1 - enemyDeceleration)
        if (Math.abs(this.velocity.x) < 0.01) {
            this.velocity.x = 0
        }

        if (Math.abs(this.velocity.y) > 0.01) {
            this.velocity.y *= (1 - enemyDeceleration)
        if (Math.abs(this.velocity.y) < 0.01) {
            this.velocity.y = 0
        }
    }
        
    if (this.position.x + this.velocity.x <= 0 ||
        this.position.x +this.width + this.velocity.x >= gameCanvas.width
    ) {
        this.velocity.x *= -1.00
    }

      if (this.position.y + this.velocity.y <= 0 ||
        this.position.y + this.height + this.velocity.y >= gameCanvas.height
    ) {
        this.velocity.y *= -1.00
    }
}
    const maxEnemyVelocity = 30

    if (this.velocity.x > maxEnemyVelocity) this.velocity.x = maxEnemyVelocity;
    if (this.velocity.y > maxEnemyVelocity) this.velocity.y = maxEnemyVelocity;
    if (this.velocity.x < -maxEnemyVelocity) this.velocity.x = -maxEnemyVelocity;
    if (this.velocity.y < -maxEnemyVelocity) this.velocity.y = -maxEnemyVelocity;

    if (this.collisionCooldown > 0) {
        this.collisionCooldown--
    }

    const myIndex = enemies.indexOf(this)
    for (let i = myIndex + 1;
        i < enemies.length;
        i++
    ) {
        const other = enemies[i]
        if (!other) continue
        if (other.collisionCooldown > 0 || this.collisionCooldown > 0) continue
    }

    const r1 = this.width / 2;
    const r2 = other.width / 2;
    const cx1 = this.position.x;
    const cy1 = this.position.y;
    const cx2 = other.position.x;
    const cy2 = other.position.y;

    const dx = cx2 - cx1;
    const dy = cy2 - cy1;
    let dist = Math.hypot(dx, dy);
    const radii = r1 + r2;

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
        const relativeVelocityY = other.velocity.y - this.velocity.x;
        const relativeVelocityAlongNormal = relativeVelocityX * nx + relativeVelocityY * ny;

        if (relativeVelocityAlongNormal > 0) {
            this.collisionCooldown = 10
            other.collisionCooldown = 10
        }

        const e = 1.0;
        const j = -(1 + e) * relativeVelocityAlongNormal;
        const impulseX = j * nx;
        const impulseY = j * ny;

        this.velocity.x -= impulseX;
        this.velocity.y -= impulseY;
        other.velocity.x += impulseX;
        other.velocity.y += impulseY;

        this.collisionCooldown = 10;
        other.collisionCooldown = 10;
    }
    }

    move() {
        if (gameTime - this.spawnTime < 750) {
            return
        }

        const predictionTicks = 15
        const predictedX = this.target.position.x + this.target.velocity.x * predictionTicks
        const predictedY = this.target.position.y + this.target.velocity.y * predictionTicks
  
        const followForce = 0.5
        
        if (this.position.x > predictedX) {
            this.velocity.x -= followForce
        } else {
            this.velocity.x += followForce
        }

        if (this.position.y > predictedY) {
            this.velocity.y -= followForce
        } else {
            this.velocity.y += followForce
        }
    }
}

const player = new Player({
    position: { x: gameCanvas.width / 2, y: gameCanvas.height / 2 },
    velocity: { x: 0, y: 0 },
 })


function render() {
    ctx.fillStyle = bgcolor;
    ctx.fillRect (0, 0, gameCanvas.width, gameCanvas.height);

    player.draw();

    ctx.fillStyle = 'black';
    ctx.fillText("Health: " + player.health, 50, 50)
}


function collision({ object1, object2 }) {
    const rect1 = {
        x: object1.position.x - object1.width / 2,
        y: object1.position.y - object1.height / 2,
        width: object1.width,
        height: object1.height
    };

    const rect2 = {
        x: object2.position.x - object2.width / 2,
        y: object2.position.y - object2.height / 2,
        width: object2.width,
        height: object2.height
    };

    return (
        rect1.x < rect2.x + rect2.width &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.y + rect1.height > rect2.y
    );
}

function getSpawnMultiplier(seconds) {
  if (seconds < 10) return 1.0
  if (seconds < 20) return 1.5
  if (seconds < 30) return 2.0
  if (seconds < 40) return 2.5
  if (seconds < 50) return 3.0
  if (seconds < 60) return 4.0
  return 4.0
}

function update() {
    const maxPlayerVelocity = 10
   
    if (player.velocity.x > maxPlayerVelocity) player.velocity.x = maxPlayerVelocity
    if (player.velocity.x < -maxPlayerVelocity) player.velocity.x = -maxPlayerVelocity
    if (player.velocity.y > maxPlayerVelocity) player.velocity.y = maxPlayerVelocity
    if (player.velocity.y < -maxPlayerVelocity) player.velocity.y = -maxPlayerVelocity

    const acceleration = 1;

    let inputX = 0;
    let inputY = 0;

    if (keys.d.pressed) inputX += 1;
    if (keys.a.pressed) inputX -= 1;
    if (keys.w.pressed) inputY -= 1;
    if (keys.s.pressed) inputY += 1;

    if (inputX !== 0 || inputY !== 0) {
        const length = Math.sqrt(inputX * inputX + inputY * inputY);
        inputX /= length;
        inputY /= length;

    player.velocity.x += inputX * acceleration;
    player.velocity.y += inputY * acceleration;
}

    const friction = 0.025
    if (Math.abs(player.velocity.x) > 0) {
        player.velocity.x *= (1 - friction)
        if (Math.abs(player.velocity.x) < friction) player.velocity.x = 0

    }
    if (Math.abs(player.velocity.y) > 0) {
        player.velocity.y *= (1 - friction)
        if (Math.abs(player.velocity.y) < friction) player.velocity.y = 0
    }

    if (player.position.x + player.velocity.x - player.width / 2 <=0 ||
        player.position.x + player.velocity.x + player.width /2 >= gameCanvas.width
    ) {
        player.velocity.x *= -1
    }

     if (player.position.y + player.velocity.y - player.height / 2 <=0 ||
        player.position.y + player.velocity.y + player.height /2 >= gameCanvas.height
    ) {
        player.velocity.y *= -1
    }
        
        gameTime += Tick_Time;
    player.update();
}

window.addEventListener('keyup', (event) => {
    switch (event.key) {
        case 'd':
        case 'ArrowRight':
            keys.d.pressed = false
            break
        case 'a':
        case 'ArrowLeft':
            keys.a.pressed = false
            break
        case 'w':
        case 'ArrowUp':
            keys.w.pressed = false
            break
        case 's':
        case 'ArrowDown':
            keys.s.pressed = false
            break
    }
})

window.addEventListener('keydown', (event) => {
    switch (event.key) {
        case 'd':
        case 'ArrowRight':
            keys.d.pressed = true
            break
        case 'a':
        case 'ArrowLeft':
            keys.a.pressed = true
            break
        case 'w':
        case 'ArrowUp':
            keys.w.pressed = true
            break
        case 's':
        case 'ArrowDown':
            keys.s.pressed = true
            break
    }

});

requestAnimationFrame(gameloop);