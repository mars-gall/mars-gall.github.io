const canvas = document.querySelector('canvas')
const c = canvas.getContext('2d')
const gameOverContainer = document.querySelector('#gameOverContainer')
const restartButton = document.querySelector('#restartButton')


const Tick_Rate = 60;
const Tick_Time = 1000 / Tick_Rate;
const MAX_TICKS = 5;

let lastTime = performance.now();
let accumulator = 0;

function gameLoop(currentTime) {
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
}

requestAnimationFrame(gameLoop);

let spawnRate = 300;
let lastProjectileTime = 0;
let bgcolor = 'white';
let linearSpawnChance = 0;
let bouncySpawnChance = 15;
let gameIsOver = false;
let animationId = null;

canvas.width = 1024
canvas.height = 576

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
