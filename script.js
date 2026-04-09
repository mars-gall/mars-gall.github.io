var gameCanvas = document.getElementById('gameCanvas');
var ctx = gameCanvas.getContext('2d');
const gameOverContainer = document.querySelector('#gameOverContainer');
const restartButton = document.querySelector('#restartButton');

const Tick_Rate = 60;
const Tick_Time = 1000 / Tick_Rate;
const MAX_TICKS = 5;

let lastTime = performance.now();
let accumulator = 0;

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


let spawnRate = 300;
let lastProjectileTime = 0;
let bgcolor = 'white';
let linearSpawnChance = 0;
let bouncySpawnChance = 15;
let gameIsOver = false;
let animationId = null;

canvas.width = window.innerWidth
canvas.height = window.innerHeight

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
        c.fillStyle = this.color
        c.fillRect(this.position.x - this.width / 2, this.position.y - this.height / 2, this.width, this.height)
        c.font = '50px Serif'
        c.fillStyle = 'black'
        c.fillText('Health: ' + String(this.health), 50, 50)

        const totalSeconds = Math.floor(Tick_Time / 1000)
        const seconds = totalSeconds % 60
        const minutes = Math.floor(totalSeconds / 60)
        c.fillText('Time: ' + minutes + ':' + seconds, 50, 100)
    };

    update() {
        this.draw()
        this.position.x += this.velocity.x,
        this.position.y += this.velocity.y
    };
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

function animate () {
    animationId = requestAnimationFrame(animate)

    c.fillstyle = bgcolor
    c.fillRect(0, 0, canvas.width, canvas.height)

    const maxPlayerVelocity = 10
    if (player.velocity.x > maxPlayerVelocity) player.velocity.x = maxPlayerVelocity
    if (player.velocity.x < -maxPlayerVelocity) player.velocity.x = -maxPlayerVelocity
    if (player.velocity.y > maxPlayerVelocity) player.velocity.y = maxPlayerVelocity
    if (player.velocity.y < -maxPlayerVelocity) player.velocity.y = -maxPlayerVelocity

    const acceleraton = 0.85
    if (keys.d.pressed) {
        player.velocity.x += acceleration;
    }
    if (keys.a.pressed) {
        player.velocity.x -= acceleration;
    }
    if (keys.w.pressed) {
        player.velocity.y -= acceleration;
    }
    if (keys.s.pressed) {
        player.velocity.y += acceleration;
    }

    const friction = 0.4
    if (Math.abs(player.velocity.x) > 0) {
        player.velocity.x *= (1 - friction)
    }
    if (Math.abs(player.velocity.y) > 0) {
        player.velocity.y *= (1 - friction)
    }

    if (player.position.x + player.velocity.x - player.width / 2 <=0 ||
        player.position.x + player.velocity.x + player.width /2 >= canvas.width
    ) {
        player.velocity.x *= -0.9
    }
    requestAnimationFrame(gameloop);
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