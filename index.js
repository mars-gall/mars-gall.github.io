const canvas = document.querySelector('canvas')
const c = canvas.getContext('2d')
let frames = 0
let spawnRate = 240 // 4 seconds at 60fps
let lastDespawnTime = 0
let lastLifeGainTime = 0
let gameStarted = false

canvas.width = 1024
canvas.height = 576
let bgcolor = 'white'

class Player {
  constructor({ position, height, width, health }) {
    this.position = position
    this.height = height
    this.width = width
    this.health = health
    this.velocity = { x: 0, y: 0 }
  }

  draw() {
    c.fillStyle = 'rgba(14, 127, 22, 1)'
    c.fillRect(this.position.x, this.position.y, this.height, this.width)
    c.font = '30px Serif'
    c.fillStyle = 'black'
    c.fillText('Lives: ' + this.health, 20, 40)
    c.fillText('You', this.position.x, this.position.y + this.height)
  }

  update() {
    this.draw()
    this.position.x += this.velocity.x
    this.position.y += this.velocity.y
  }
}

class Enemy {
  constructor({ position, height, width, target, health, color = 'rgba(119,0,0,1)' }) {
    this.position = position
    this.height = height
    this.width = width
    this.target = target
    this.health = health
    this.color = color
    this.spawnTime = frames
    this.collisionCooldown = 0
    this.velocity = { x: 0, y: 0 }
  }

  draw() {
    c.fillStyle = this.color
    c.fillRect(this.position.x, this.position.y, this.height, this.width)
  }

  update() {
    this.move()
    this.draw()
    this.position.x += this.velocity.x
    this.position.y += this.velocity.y

    // Collision with player
    if (collision({ object1: player, object2: this })) {
      player.health -= 1
      this.health -= 1
      lastDespawnTime = frames // reset despawn timer on collision
    }

    // Velocity deceleration
    this.velocity.x *= 0.95
    this.velocity.y *= 0.95

    // Wall bouncing
    if (this.position.x <= 0 || this.position.x + this.height >= canvas.width) this.velocity.x *= -0.85
    if (this.position.y <= 0 || this.position.y + this.width >= canvas.height) this.velocity.y *= -0.85
  }

  move() {
    if (frames - this.spawnTime < 60) return // pause 1 sec after spawn
    const cx = this.position.x + this.width/2
    const cy = this.position.y + this.width/2
    const targetX = this.target.position.x + this.target.width/2
    const targetY = this.target.position.y + this.target.height/2

    if (cx > targetX) this.velocity.x -= 0.3
    else this.velocity.x += 0.3

    if (cy > targetY) this.velocity.y -= 0.3
    else this.velocity.y += 0.3
  }
}

class Projectile {
  constructor(x, y, radius, color, velocity) {
    this.x = x
    this.y = y
    this.radius = radius
    this.color = color
    this.velocity = velocity
  }

  draw() {
    c.beginPath()
    c.arc(this.x, this.y, this.radius, 0, Math.PI*2)
    c.fillStyle = this.color
    c.fill()
  }

  update() {
    this.draw()
    this.x += this.velocity.x
    this.y += this.velocity.y
  }
}

function collision({ object1, object2 }) {
  const r1 = object1.width/2
  const r2 = object2.width/2
  const dx = object2.position.x + r2 - (object1.position.x + r1)
  const dy = object2.position.y + r2 - (object1.position.y + r1)
  return Math.hypot(dx, dy) < r1 + r2
}

const player = new Player({ position: { x: canvas.width/2 - 25, y: canvas.height/2 - 25 }, height: 50, width: 50, health: 5 })
const enemies = []
const projectiles = []

const keys = { w:{pressed:false}, a:{pressed:false}, s:{pressed:false}, d:{pressed:false} }

// Start menu
const menu = document.createElement('div')
menu.id = 'menu'
menu.style = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;'
menu.innerHTML = '<h1>Canvas Game</h1><button id="startButton">Start Game</button>'
document.body.appendChild(menu)
const startButton = document.getElementById('startButton')
startButton.addEventListener('click', () => { gameStarted = true; menu.style.display='none' })

function animate() {
  const animationId = requestAnimationFrame(animate)

  c.fillStyle = bgcolor
  c.fillRect(0, 0, canvas.width, canvas.height)

  if (!gameStarted) {
    c.fillStyle='black'
    c.font='40px serif'
    c.fillText('Press Start to Play', canvas.width/2-200, canvas.height/2)
    return
  }

  player.update()

  // Update enemies
  for (let i = enemies.length-1; i>=0; i--) {
    enemies[i].update()
    if (enemies[i].health <= 0) enemies.splice(i,1)
  }

  // Despawn oldest enemy every 12 sec
  if (frames - lastDespawnTime > 720 && enemies.length>0) {
    let oldestIndex = 0
    for (let i=1;i<enemies.length;i++) if (enemies[i].spawnTime < enemies[oldestIndex].spawnTime) oldestIndex=i
    enemies.splice(oldestIndex,1)
    lastDespawnTime = frames
  }

  // Gain life every 24 sec
  if (frames - lastLifeGainTime > 1440) { player.health+=1; lastLifeGainTime=frames }

  // Player movement
  if (keys.d.pressed) player.velocity.x+=0.5
  if (keys.a.pressed) player.velocity.x-=0.5
  if (keys.w.pressed) player.velocity.y-=0.5
  if (keys.s.pressed) player.velocity.y+=0.5
  player.velocity.x *= 0.9
  player.velocity.y *= 0.9

  // Wall collisions
  if (player.position.x <=0 || player.position.x+player.height>=canvas.width) player.velocity.x*=-0.75
  if (player.position.y <=0 || player.position.y+player.width>=canvas.height) player.velocity.y*=-0.75

  // Spawn enemies
  if (frames % spawnRate ===0) {
    let buffer=10
    let validSpawn=false
    let spawnPos={}
    let attempts=0
    while(!validSpawn && attempts<100){
      attempts++
      spawnPos={x:Math.floor(Math.random()*(canvas.width-50-2*buffer)+buffer), y:Math.floor(Math.random()*(canvas.height-50-2*buffer)+buffer)}
      const dx = spawnPos.x+25-(player.position.x+25)
      const dy = spawnPos.y+25-(player.position.y+25)
      if(Math.hypot(dx,dy)<canvas.width*0.3) continue
      let tooClose=false
      for (let e of enemies){
        if(Math.hypot(spawnPos.x+25-(e.position.x+25), spawnPos.y+25-(e.position.y+25))<70) { tooClose=true; break }
      }
      if(!tooClose) validSpawn=true
    }
    enemies.push(new Enemy({position:spawnPos,height:50,width:50,target:player,health:1,color:`rgba(${Math.floor(Math.random()*255)},0,0,1)`}))
  }

  // Update projectiles
  for (let i=projectiles.length-1;i>=0;i--){
    projectiles[i].update()
    if(projectiles[i].x<0 || projectiles[i].x>canvas.width || projectiles[i].y<0 || projectiles[i].y>canvas.height) projectiles.splice(i,1)
  }

  frames++

  // Death check
  if (player.health <= 0) {
    c.font='50px serif'
    c.fillStyle='black'
    c.fillText('YOU DIED',canvas.width/2-100,canvas.height/2)
    menu.innerHTML='<h1>You Died</h1><button id="restartButton">Play Again</button>'
    menu.style.display='block'
    const restartButton = document.getElementById('restartButton')
    restartButton.addEventListener('click', ()=>{ location.reload() })
    cancelAnimationFrame(animationId)
  }
}

animate()

// Keyboard input
window.addEventListener('keydown', (e)=>{
  if(!gameStarted) return
  switch(e.key){
    case 'd': keys.d.pressed=true; break
    case 'a': keys.a.pressed=true; break
    case 'w': keys.w.pressed=true; break
    case 's': keys.s.pressed=true; break
  }
})

window.addEventListener('keyup', (e)=>{
  switch(e.key){
    case 'd': keys.d.pressed=false; break
    case 'a': keys.a.pressed=false; break
    case 'w': keys.w.pressed=false; break
    case 's': keys.s.pressed=false; break
  }
})

// Shooting projectiles
window.addEventListener('click',(event)=>{
  if(!gameStarted) return
  const angle = Math.atan2(event.clientY - (player.position.y+player.height/2), event.clientX - (player.position.x+player.width/2))
  const velocity = { x: Math.cos(angle)*5, y: Math.sin(angle)*5 }
  projectiles.push(new Projectile(player.position.x+player.width/2, player.position.y+player.height/2,5,'white',velocity))
})
