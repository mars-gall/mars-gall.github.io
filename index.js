const canvas = document.querySelector('canvas')
const c = canvas.getContext('2d')
let frames = 0
let spawnRate = 240 // 4 seconds at 60fps
let lastDespawnTime = 0 // Track when the last enemy was despawned
let lastLifeGainTime = 0 // Track when the last life was gained
let bgcolor = 'white'


bgcolor = 'white'

canvas.width = 1024
canvas.height = 576

class Player {
  constructor({
    position,
    height,
    width,
    health
  }) {
    this.position = position
    this.height = height
    this.width = width
    this.health = health
    this.velocity = {
      x: 0,
      y: 0
    }
  }

  draw() {
    c.fillStyle = 'rgba(14, 127, 22, 1)'
    c.fillRect(this.position.x, this.position.y, this.height, this.width)
    c.font = '50px Serif'
    c.fillText('Lives: ' + String(this.health), 50, 50)
    c.fillStyle = 'black'
    c.fillText('You', this.position.x, this.position.y + this.height, 50)
  }

  update() {
    this.draw()
    this.position.x += this.velocity.x
    this.position.y += this.velocity.y
  }
}

class Enemy {
  constructor({
    position,
    height,
    width,
    target,
    health,
    color = 'rgba(119, 0, 0, 1)'
  }) {
    this.position = position
    this.height = height
    this.width = width
    this.target = target
    this.health = health
    this.color = color
    this.isDead = false
    this.spawnTime = frames
    this.collisionCooldown = 0
    this.velocity = {
      x: 0,
      y: 0
    }
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

    if (collision({
      object1: player,
      object2: this
    })) {
      player.health -= 1
      this.health -= 1
    }

    // Apply sliding/momentum deceleration
    if (this.velocity.x !== 0) {
      if (this.velocity.x < 0) {
        this.velocity.x += 0.05
      } else this.velocity.x -= 0.05
    }

    if (this.velocity.y !== 0) {
      if (this.velocity.y < 0) {
        this.velocity.y += 0.05
      } else this.velocity.y -= 0.05
    }

    // Wall bouncing with 0.75 speed
    if (this.position.x + this.velocity.x <= 0 ||
      this.position.x + this.height + this.velocity.x >= canvas.width
    ) {
      this.velocity.x *= -2
    }

    if (this.position.y + this.velocity.y <= 0 ||
      this.position.y + this.width + this.velocity.y >= canvas.height
    ) {
      this.velocity.y *= -2
    }

    // Max speed limits (0.9 of player's max speed of 15)
    if (this.velocity.x > 17.50) this.velocity.x = 17.50
    if (this.velocity.y > 17.50) this.velocity.y = 17.50
    if (this.velocity.x < -17.50) this.velocity.x = -17.50
    if (this.velocity.y < -17.50) this.velocity.y = -17.50

    // Collision with other enemies (circle-based elastic collision with positional correction)
    if (this.collisionCooldown > 0) {
      this.collisionCooldown--
    }

    // Only handle each pair once: process collisions with enemies having a higher index
    const myIndex = enemies.indexOf(this)
    for (let i = myIndex + 1; i < enemies.length; i++) {
      const other = enemies[i]
      if (!other) continue
      if (other.collisionCooldown > 0 || this.collisionCooldown > 0) continue

      // treat enemies as circles
      const r1 = this.width / 2
      const r2 = other.width / 2
      const cx1 = this.position.x + r1
      const cy1 = this.position.y + r1
      const cx2 = other.position.x + r2
      const cy2 = other.position.y + r2

      const dx = cx2 - cx1
      const dy = cy2 - cy1
      const dist = Math.hypot(dx, dy)
      const radii = r1 + r2

      if (dist === 0) {
        // jitter slightly to avoid zero-distance
        dx = 1
        dy = 0
      }

      if (dist < radii) {
        // positional correction: push them apart along the collision normal
        const nx = dx / (dist || 1)
        const ny = dy / (dist || 1)
        const overlap = radii - dist
        const correction = overlap / 2
        this.position.x -= nx * correction
        this.position.y -= ny * correction
        other.position.x += nx * correction
        other.position.y += ny * correction

        // relative velocity
        const rvx = other.velocity.x - this.velocity.x
        const rvy = other.velocity.y - this.velocity.y
        const relVelAlongNormal = rvx * nx + rvy * ny

        // if velocities are separating, skip impulse
        if (relVelAlongNormal > 0) {
          this.collisionCooldown = 10
          other.collisionCooldown = 10
          continue
        }

        // impulse scalar (equal mass), restitution
        const e = 1
        const j = -(1 + e) * relVelAlongNormal / 2
        const impulseX = j * nx
        const impulseY = j * ny

        this.velocity.x -= impulseX
        this.velocity.y -= impulseY
        other.velocity.x += impulseX
        other.velocity.y += impulseY

        this.collisionCooldown = 15
        other.collisionCooldown = 15
      }
    }
  }

  move() {
    // Don't move for 1.0 seconds after spawning (60 frames at 60fps)
    if (frames - this.spawnTime < 60) {
      return
    }

    // Separation: steer away from nearby enemies to avoid crowding
    const avoidRadius = 0
    let ax = 0
    let ay = 0
    let count = 0
    const cx = this.position.x + this.width / 2
    const cy = this.position.y + this.width / 2

    for (let i = 0; i < enemies.length; i++) {
      const other = enemies[i]
      if (other === this) continue
      const ox = other.position.x + other.width / 2
      const oy = other.position.y + other.width / 2
      const dx = cx - ox
      const dy = cy - oy
      const dist = Math.hypot(dx, dy)
      if (dist > 0 && dist < avoidRadius) {
        const strength = (avoidRadius - dist) / avoidRadius
        ax += (dx / dist) * strength
        ay += (dy / dist) * strength
        count++
      }
    }

    if (count > 0) {
      ax /= count
      ay /= count
      const avoidForce = 0.2
      this.velocity.x += ax * avoidForce
      this.velocity.y += ay * avoidForce
    }

    // Predict where the player will be based on their velocity
    const predictionFrames = 15 // Look ahead 15 frames
    const predictedX = this.target.position.x + this.target.velocity.x * predictionFrames
    const predictedY = this.target.position.y + this.target.velocity.y * predictionFrames

    // Add acceleration towards predicted target position
    if (this.position.x > predictedX) {
      this.velocity.x += -0.3
    } else this.velocity.x += 0.3

    if (this.position.y > predictedY) {
      this.velocity.y += -0.3
    } else this.velocity.y += 0.3
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
    c.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false)
    c.fillStyle = this.color
    c.fill()
  }

  update() {
    this.draw()
    this.x = this.x + this.velocity.x
    this.y = this.y + this.velocity.y
  }
}

function collision({ object1, object2 }) {
  // Use circle-based collision for better hit detection
  const r1 = object1.width / 2
  const r2 = object2.width / 2
  const cx1 = object1.position.x + r1
  const cy1 = object1.position.y + r1
  const cx2 = object2.position.x + r2
  const cy2 = object2.position.y + r2

  const dx = cx2 - cx1
  const dy = cy2 - cy1
  const distance = Math.sqrt(dx * dx + dy * dy)

  return distance < r1 + r2
}

const player = new Player({
  position: {
    x: canvas.width / 2 - 25,
    y: canvas.height / 2 - 25
  },
  height: 50,
  width: 50,
  health: 5
})

const enemies = []
const projectiles = []

function animate() {
  const animationId= requestAnimationFrame(animate)

  c.fillStyle = bgcolor
  c.fillRect(0, 0, canvas.width, canvas.height)

  player.update()

  for (let index = enemies.length - 1; index >= 0; index--) {
    const enemy = enemies[index]
    
    enemy.update()
    if (enemy.health <= 0) enemies.splice(index, 1)
  }

  // Despawn the oldest enemy every 12 seconds (720 frames at 60fps)
  if (frames - lastDespawnTime > 720 && enemies.length > 0) {
    let oldestEnemy = enemies[0]
    let oldestIndex = 0
    for (let i = 1; i < enemies.length; i++) {
      if (enemies[i].spawnTime < oldestEnemy.spawnTime) {
        oldestEnemy = enemies[i]
        oldestIndex = i
      }
    }
    enemies.splice(oldestIndex, 1)
    lastDespawnTime = frames
  }

  // Gain 1 life every 24 seconds (1440 frames at 60fps)
  if (frames - lastLifeGainTime > 1440) {
    player.health += 1
    lastLifeGainTime = frames
  }

if (player.velocity.x !== 0) {
  if (player.velocity.x < 0) {
    player.velocity.x += 0.4
  } else player.velocity.x -= 0.4
}

if (player.velocity.y !== 0) {
  if (player.velocity.y < 0) {
    player.velocity.y += 0.4
  } else player.velocity.y -= 0.4
}


  if (keys.d.pressed) {
    player.velocity.x += 1
  } else if (keys.a.pressed) {
    player.velocity.x += -1
  }

  if (keys.s.pressed) {
    player.velocity.y += 1
  } else if (keys.w.pressed) {
    player.velocity.y += -1
  }

  if (player.velocity.x > 30) player.velocity.x = 30
  if (player.velocity.y > 30) player.velocity.y = 30
  if (player.velocity.x < -30) player.velocity.x = -30
  if (player.velocity.y < -30) player.velocity.y = -30

  if (player.position.x + player.velocity.x <= 0 ||
    player.position.x + player.height + player.velocity.x >= canvas.width
  ) {
    player.velocity.x *= -1
  }

  if (player.position.y + player.velocity.y <= 0 ||
    player.position.y + player.width + player.velocity.y >= canvas.height
  ) {
    player.velocity.y *= -1
  }

  if (frames % spawnRate === 0) {
    let validSpawn = false
    let spawnPos = {}
    const minDistance = canvas.width * 0.3
    const enemySize = 50
    const buffer = 10 // buffer from walls
    let attempts = 0
    const maxAttempts = 100

    // Keep trying to spawn until we find a valid position outside the safe zone and away from walls/other enemies
    while (!validSpawn && attempts < maxAttempts) {
      attempts++
      spawnPos = {
        x: Math.floor(Math.random() * (canvas.width - enemySize - 2 * buffer) + buffer),
        y: Math.floor(Math.random() * (canvas.height - enemySize - 2 * buffer) + buffer)
      }

      // Calculate distance from player center
      const dx = spawnPos.x + enemySize / 2 - (player.position.x + player.height / 2)
      const dy = spawnPos.y + enemySize / 2 - (player.position.y + player.width / 2)
      const distance = Math.sqrt(dx * dx + dy * dy)

      // Check if far enough from player
      if (distance < minDistance) continue

      // Check if far enough from other enemies
      let tooClose = false
      for (let i = 0; i < enemies.length; i++) {
        const enemy = enemies[i]
        const edx = spawnPos.x + enemySize / 2 - (enemy.position.x + enemy.width / 2)
        const edy = spawnPos.y + enemySize / 2 - (enemy.position.y + enemy.width / 2)
        const eDist = Math.sqrt(edx * edx + edy * edy)
        if (eDist < enemySize + 20) {
          tooClose = true
          break
        }
      }

      if (!tooClose) {
        validSpawn = true
      }
    }

    enemies.push(new Enemy({
      position: spawnPos,
      height: 50,
      width: 50,
      target: player,
      health: 1,
      color: 'rgba(' + String(Math.floor(Math.random() * 255)) + ', 0, 0)'
    }))

    // if (!spawnRate <= 20) spawnRate -= 20
  }

  frames++

  if (player.health <= 0) {
    c.font = '50px serif'
    c.fillStyle = 'black'
    c.fillText('YOU DIED', 100, 100, 1000)
    cancelAnimationFrame(animationId)
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
    pressed: false
  }
}

animate()

window.addEventListener('keydown', (event) => {
  switch (event.key) {
    case 'd':
      keys.d.pressed = true
      break
    case 'a':
      keys.a.pressed = true
      break
    case 'w':
      keys.w.pressed = true
      break
    case 's':
      keys.s.pressed = true
      break
  }
}
)

window.addEventListener('keyup', (event) => {
  switch (event.key) {
    case 'd':
      keys.d.pressed = false
      break
    case 'a':
      keys.a.pressed = false
      break
    case 'w':
      keys.w.pressed = false
      break
    case 's':
      keys.s.pressed = false
      break
  }
})

addEventListener('click', (event) => {
  console.log(`click`)
  const angle = Math.atan2(
    event.clientY - canvas.height / 2,
    event.clientX - canvas.width / 2
  )
  const velocity = {
    x: Math.cos(angle) * 5,
    y: Math.sin(angle) * 5
  }
  projectiles.push(
    new Projectile(canvas.width / 2, canvas.height / 2, 5, 'white', velocity)
  )
})