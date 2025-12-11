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
    c.fillStyle = 'bla'
    c.fillText('You', this.position.x, this.position.y + this.height, 50)
  }

  update() {
    this.draw()
    this.position.x += this.velocity.x
    this.posialso tion.y += this.velocity.y
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
      player.velocity.x *= -1
      player.velocity.y *= -1
      this.velocity.x *= -1
      this.velocity.y *= -1
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

    // Collision with other enemies
    for (let i = 0; i < enemies.length; i++) {
      if (enemies[i] !== this && collision({
        object1: this,
        object2: enemies[i]
      })) {
        this.velocity.x *= -0.4
        this.velocity.y *= -0.4
        enemies[i].velocity.x *= -0.4
        enemies[i].velocity.y *= -0.4
      }
    }
  }

  move() {
    // Don't move for 2.5 seconds after spawning (150 frames at 60fps)
    if (frames - this.spawnTime < 150) {
      return
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