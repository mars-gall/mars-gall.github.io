const canvas = document.querySelector('canvas')
const c = canvas.getContext('2d')
let frames = 0
let spawnRate = 200

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
        this.velocity.x += 0.25
      } else this.velocity.x -= 0.25
    }

    if (this.velocity.y !== 0) {
      if (this.velocity.y < 0) {
        this.velocity.y += 0.25
      } else this.velocity.y -= 0.25
    }

    // Wall bouncing with 0.75 speed
    if (this.position.x + this.velocity.x <= 0 ||
      this.position.x + this.height + this.velocity.x >= canvas.width
    ) {
      this.velocity.x *= -0.75
    }

    if (this.position.y + this.velocity.y <= 0 ||
      this.position.y + this.width + this.velocity.y >= canvas.height
    ) {
      this.velocity.y *= -0.75
    }

    // Max speed limits (0.9 of player's max speed of 15)
    if (this.velocity.x > 13.5) this.velocity.x = 13.5
    if (this.velocity.y > 13.5) this.velocity.y = 13.5
    if (this.velocity.x < -13.5) this.velocity.x = -13.5
    if (this.velocity.y < -13.5) this.velocity.y = -13.5

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
        const e = 0.4
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
    // Don't move for 1.5 seconds after spawning (90 frames at 60fps)
    if (frames - this.spawnTime < 90) {
      return
    }

    // Separation: steer away from nearby enemies to avoid crowding
    const avoidRadius = 80
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
      const avoidForce = 0.25
      this.velocity.x += ax * avoidForce
      this.velocity.y += ay * avoidForce
    }

    // Add acceleration towards target (momentum)
    if (this.position.x > this.target.position.x) {
      this.velocity.x += -0.3
    } else this.velocity.x += 0.3

    if (this.position.y > this.target.position.y) {
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
  return (
    object1.position.y + object1.height >= object2.position.y &&
    object1.position.y <= object2.position.y + object2.height &&
    object1.position.x <= object2.position.x + object2.height &&
    object1.position.x + object1.width >= object2.position.x
  )
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

  if (player.velocity.x !== 0) {
    if (player.velocity.x < 0) {
      player.velocity.x += 0.25
    } else player.velocity.x -= 0.25
  }

  if (player.velocity.y !== 0) {
    if (player.velocity.y < 0) {
      player.velocity.y += 0.25
    } else player.velocity.y -= 0.25
  }

  if (keys.d.pressed) {
    player.velocity.x += 0.5
  } else if (keys.a.pressed) {
    player.velocity.x += -0.5
  }

  if (keys.s.pressed) {
    player.velocity.y += 0.5
  } else if (keys.w.pressed) {
    player.velocity.y += -0.5
  }

  if (player.velocity.x > 15) player.velocity.x = 15
  if (player.velocity.y > 15) player.velocity.y = 15
  if (player.velocity.x < -15) player.velocity.x = -15
  if (player.velocity.y < -15) player.velocity.y = -15

  if (player.position.x + player.velocity.x <= 0 ||
    player.position.x + player.height + player.velocity.x >= canvas.width
  ) {
    player.velocity.x *= -0.75
  }

  if (player.position.y + player.velocity.y <= 0 ||
    player.position.y + player.width + player.velocity.y >= canvas.height
  ) {
    player.velocity.y *= -0.75
  }

  if (frames % spawnRate === 0) {
    let validSpawn = false
    let spawnPos = {}
    const minDistance = canvas.width * 0.3

    // Keep trying to spawn until we find a valid position outside the safe zone
    while (!validSpawn) {
      spawnPos = {
        x: Math.floor(Math.random() * canvas.width),
        y: Math.floor(Math.random() * canvas.height)
      }

      // Calculate distance from player
      const dx = spawnPos.x - (player.position.x + player.height / 2)
      const dy = spawnPos.y - (player.position.y + player.width / 2)
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance >= minDistance) {
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