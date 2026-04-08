// --- Initial Setup ---
const canvas = document.querySelector('canvas')
const c = canvas.getContext('2d')
const gameOverContainer = document.querySelector('#gameOverContainer')
const restartButton = document.querySelector('#restartButton')

let frames = 0
let spawnRate = 360 // 6 seconds at 60fps
let lastLifeGainTime = 0 // Track when the last life was gained
let lastProjectileTime = -60 // Track projectile cooldown (frames)
let bgcolor = 'white'
let blueSpawnChance = 0 // Starts at 0%, increases after 10 seconds
let gameIsOver = false
let animationId = null

canvas.width = 1024
canvas.height = 576

// --- Utility Functions ---

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

// Custom collision for Projectile (Circle) vs Enemy (Rectangle/Circle-treated)
function projectileEnemyCollision(projectile, enemy) {
  const enemyCenterX = enemy.position.x + enemy.width / 2
  const enemyCenterY = enemy.position.y + enemy.height / 2
  
  const dx = projectile.x - enemyCenterX
  const dy = projectile.y - enemyCenterY
  const distance = Math.hypot(dx, dy)
  
  return distance < projectile.radius + enemy.width / 2
}

function getSpawnMultiplier(seconds) {
  if (seconds < 10) return 1
  if (seconds < 20) return 1.5
  if (seconds < 30) return 2
  if (seconds < 40) return 2.5
  if (seconds < 50) return 3
  return 3
}

// --- Classes ---

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
    c.fillRect(this.position.x - this.width / 2, this.position.y - this.height / 2, this.width, this.height)
    c.font = '50px Serif'
    c.fillStyle = 'black' // Set color before drawing text
    c.fillText('Lives: ' + String(this.health), 50, 50)

    const totalSeconds = Math.floor(frames / 60)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = String(totalSeconds % 60).padStart(2, '0')
    c.fillText('Time: ' + minutes + ':' + seconds, 50, 105)
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
    color = 'rgb(255, 0, 0)'
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
    c.fillRect(this.position.x, this.position.y, this.width, this.height)
  }

  update() {
    this.move()
    
    // Check for Player collision before applying movement to prevent overlap issues
    if (this.collisionCooldown === 0 && collision({
      object1: player,
      object2: this
    })) {
      player.health -= 1
      this.health = 0 // Enemy dies on contact
      this.collisionCooldown = 5 // Apply cooldown to player to prevent instant multiple hits
    }

    // Apply movement after potential collision check
    this.position.x += this.velocity.x
    this.position.y += this.velocity.y
    this.draw()


    // Apply sliding/momentum deceleration
    const enemyDeceleration = 0.1
    if (Math.abs(this.velocity.x) > 0) {
      this.velocity.x += (this.velocity.x < 0 ? enemyDeceleration : -enemyDeceleration)
      // Stop completely if the speed is very low
      if (Math.abs(this.velocity.x) < enemyDeceleration) this.velocity.x = 0
    }

    if (Math.abs(this.velocity.y) > 0) {
      this.velocity.y += (this.velocity.y < 0 ? enemyDeceleration : -enemyDeceleration)
      if (Math.abs(this.velocity.y) < enemyDeceleration) this.velocity.y = 0
    }


    // Wall bouncing with 0.75 speed
    // Use the actual height/width of the enemy when checking bounds
    if (this.position.x + this.velocity.x <= 0 ||
      this.position.x + this.width + this.velocity.x >= canvas.width // Use 'width' for horizontal bounds
    ) {
      this.velocity.x *= -0.75 // Adjusted bounce force to 0.75 for realism
    }

    if (this.position.y + this.velocity.y <= 0 ||
      this.position.y + this.height + this.velocity.y >= canvas.height // Use 'height' for vertical bounds
    ) {
      this.velocity.y *= -0.75 // Adjusted bounce force to 0.75 for realism
    }

    // Max speed limits
    const maxEnemySpeed = 25
    if (this.velocity.x > maxEnemySpeed) this.velocity.x = maxEnemySpeed
    if (this.velocity.y > maxEnemySpeed) this.velocity.y = maxEnemySpeed
    if (this.velocity.x < -maxEnemySpeed) this.velocity.x = -maxEnemySpeed
    if (this.velocity.y < -maxEnemySpeed) this.velocity.y = -maxEnemySpeed

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
      let dist = Math.hypot(dx, dy)
      const radii = r1 + r2

      if (dist === 0) {
        // jitter slightly to avoid zero-distance
        dist = 1
      }

      if (dist < radii) {
        // positional correction: push them apart along the collision normal
        const nx = dx / dist
        const ny = dy / dist
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
    // Don't move for 0.75 seconds after spawning (45 frames at 60fps)
    if (frames - this.spawnTime < 45) {
      return
    }
   

    // Prediction: Enemy tracks player movement
    const predictionFrames = 15 // Look ahead 15 frames
    const predictedX = this.target.position.x + this.target.velocity.x * predictionFrames
    const predictedY = this.target.position.y + this.target.velocity.y * predictionFrames

    // Add acceleration towards predicted target position
    const followForce = 0.25
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

class LinearEnemy {
  constructor({
    position,
    height,
    width,
    target,
    color = 'rgba(0, 0, 255, 1)'
  }) {
    this.position = position
    this.height = height
    this.width = width
    this.target = target
    this.color = color
    this.spawnTime = frames
    this.pauseTime = 30 // 0.5 seconds at 60fps
    this.velocity = {
      x: 0,
      y: 0
    }
    
    // Direction is chosen when the enemy unpauses, so it targets the player at that moment
    this.directionX = null
    this.directionY = null
    this.speed = 30 // Constant high speed
    this.health = 1
  }

  draw() {
    c.fillStyle = this.color
    c.fillRect(this.position.x, this.position.y, this.height, this.width)
  }

  update() {
    this.draw()
    
    // Pause for 0.5 seconds (30 frames) before moving
    if (frames - this.spawnTime < this.pauseTime) {
      // During pause, don't move
      this.velocity.x = 0
      this.velocity.y = 0
    } else {
      // If direction hasn't been set yet, calculate it when unpausing
      if (this.directionX === null || this.directionY === null) {
        const dx = this.target.position.x - (this.position.x + this.width / 2)
        const dy = this.target.position.y - (this.position.y + this.height / 2)
        const distance = Math.hypot(dx, dy)
        if (distance > 0) {
          this.directionX = dx / distance
          this.directionY = dy / distance
        } else {
          this.directionX = 0
          this.directionY = 0
        }
      }
      // After pause, apply constant velocity
      this.velocity.x = this.directionX * this.speed
      this.velocity.y = this.directionY * this.speed
    }
    
    // Apply movement (no acceleration, just constant velocity)
    this.position.x += this.velocity.x
    this.position.y += this.velocity.y

    // Check for Player collision
    if (collision({
      object1: player,
      object2: this
    })) {
      player.health -= 1
      this.health = 0 // Mark for deletion
    }

    // Die on screen edge contact
    if (this.position.x + this.width <= 0 ||
      this.position.x >= canvas.width ||
      this.position.y + this.height <= 0 ||
      this.position.y >= canvas.height
    ) {
      this.health = 0 // Mark for deletion
    }
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

// --- Game Objects and Initialization ---

const player = new Player({
  position: {
    x: canvas.width / 2,
    y: canvas.height / 2
  },
  height: 50,
  width: 50,
  health: 5
})

const enemies = []
const projectiles = []

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

// --- Main Animation Loop ---

function animate() {
  animationId = requestAnimationFrame(animate)

  // Clear canvas
  c.fillStyle = bgcolor
  c.fillRect(0, 0, canvas.width, canvas.height)

  // Player Update
  player.update()

  // Projectile Update and Cleanup
  for (let index = projectiles.length - 1; index >= 0; index--) {
    const projectile = projectiles[index]
    projectile.update()

    // Remove projectiles that go off-screen
    if (
      projectile.x + projectile.radius < 0 ||
      projectile.x - projectile.radius > canvas.width ||
      projectile.y + projectile.radius < 0 ||
      projectile.y - projectile.radius > canvas.height
    ) {
      projectiles.splice(index, 1)
      continue // Skip to next projectile
    }
  }

  // Enemy Update, Player Collision, and Projectile Collision (FIXED: ADDED PROJECTILE COLLISION)
  for (let index = enemies.length - 1; index >= 0; index--) {
    const enemy = enemies[index]
    
    // Check collision against all projectiles for this enemy (skip if LinearEnemy - immune)
    if (!(enemy instanceof LinearEnemy)) {
      for (let pIndex = projectiles.length - 1; pIndex >= 0; pIndex--) {
        const projectile = projectiles[pIndex]

        if (projectileEnemyCollision(projectile, enemy)) {
          // Projectile hit the enemy
          enemy.health -= 1 // Enemy takes damage
          projectiles.splice(pIndex, 1) // Remove projectile
        }
      }
    }
    
    // Update enemy movement and internal state (includes player collision check and inter-enemy collision)
    enemy.update() 
    
    // Check if enemy is dead after update and collisions
    if (enemy.health <= 0) {
      enemies.splice(index, 1)
    }
  }

  // --- Game State Management ---

  // Gain 1 life every 20 seconds (1200 frames at 60fps)
  if (frames - lastLifeGainTime > 1200) {
    player.health += 1
    lastLifeGainTime = frames
  }

  // --- Player Physics/Movement ---
  
  const friction = 0.4
  if (Math.abs(player.velocity.x) > 0) {
    player.velocity.x += (player.velocity.x < 0 ? friction : -friction)
    if (Math.abs(player.velocity.x) < friction) player.velocity.x = 0 // Stop if below friction threshold
  }

  if (Math.abs(player.velocity.y) > 0) {
    player.velocity.y += (player.velocity.y < 0 ? friction : -friction)
    if (Math.abs(player.velocity.y) < friction) player.velocity.y = 0 // Stop if below friction threshold
  }

  const acceleration = 0.8
  if (keys.d.pressed) {
    player.velocity.x += acceleration
  } 
  if (keys.a.pressed) {
    player.velocity.x -= acceleration
  }

  if (keys.s.pressed) {
    player.velocity.y += acceleration
  } 
  if (keys.w.pressed) {
    player.velocity.y -= acceleration
  }

  const maxPlayerSpeed = 15
  if (player.velocity.x > maxPlayerSpeed) player.velocity.x = maxPlayerSpeed
  if (player.velocity.y > maxPlayerSpeed) player.velocity.y = maxPlayerSpeed
  if (player.velocity.x < -maxPlayerSpeed) player.velocity.x = -maxPlayerSpeed
  if (player.velocity.y < -maxPlayerSpeed) player.velocity.y = -maxPlayerSpeed

  // Wall bouncing
  if (player.position.x + player.velocity.x - player.width / 2 <= 0 ||
    player.position.x + player.velocity.x + player.width / 2 >= canvas.width
  ) {
    player.velocity.x *= -1
  }

  if (player.position.y + player.velocity.y - player.height / 2 <= 0 ||
    player.position.y + player.velocity.y + player.height / 2 >= canvas.height
  ) {
    player.velocity.y *= -1
  }

  // --- Enemy Spawning ---
  const secondsPlayed = Math.floor(frames / 60)
  const spawnMultiplier = getSpawnMultiplier(secondsPlayed)
  const effectiveSpawnRate = Math.max(1, Math.round(spawnRate / spawnMultiplier))

  if (frames % effectiveSpawnRate === 0) {
    let validSpawn = false
    let spawnPos = { x: 0, y: 0 }
    const minDistance = canvas.width * 0.3
    const enemySize = 50
    const buffer = 10
    let attempts = 0
    const maxAttempts = 100

    while (!validSpawn && attempts < maxAttempts) {
      attempts++
      spawnPos = {
        x: Math.floor(Math.random() * (canvas.width - enemySize - 2 * buffer) + buffer),
        y: Math.floor(Math.random() * (canvas.height - enemySize - 2 * buffer) + buffer)
      }

      const dx = spawnPos.x + enemySize / 2 - player.position.x
      const dy = spawnPos.y + enemySize / 2 - player.position.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance < minDistance) continue

      let tooClose = false
      for (let i = 0; i < enemies.length; i++) {
        const enemy = enemies[i]
        const edx = spawnPos.x + enemySize / 2 - (enemy.position.x + enemy.width / 2)
        const edy = spawnPos.y + enemySize / 2 - (enemy.position.y + enemy.height / 2)
        const eDist = Math.sqrt(edx * edx + edy * edy)
        if (eDist < enemySize + 20) {
          tooClose = true
          break
        }
      }

      if (!tooClose) validSpawn = true
    }

    if (validSpawn) {
      if (secondsPlayed >= 10) {
        blueSpawnChance = Math.min(100, (secondsPlayed - 10) * 2)
      } else {
        blueSpawnChance = 0
      }

      if (Math.random() * 100 < blueSpawnChance) {
        const blueSize = enemySize * 0.75
        const outerWidth = canvas.width * 0.1
        const outerHeight = canvas.height * 0.1
        let linearSpawnPos = { x: 0, y: 0 }
        const edge = Math.floor(Math.random() * 4)

        if (edge === 0) {
          linearSpawnPos = {
            x: Math.random() * (canvas.width - blueSize),
            y: Math.random() * outerHeight
          }
        } else if (edge === 1) {
          linearSpawnPos = {
            x: canvas.width - blueSize - Math.random() * outerWidth,
            y: Math.random() * (canvas.height - blueSize)
          }
        } else if (edge === 2) {
          linearSpawnPos = {
            x: Math.random() * (canvas.width - blueSize),
            y: canvas.height - blueSize - Math.random() * outerHeight
          }
        } else {
          linearSpawnPos = {
            x: Math.random() * outerWidth,
            y: Math.random() * (canvas.height - blueSize)
          }
        }

        enemies.push(new LinearEnemy({
          position: linearSpawnPos,
          height: blueSize,
          width: blueSize,
          target: player,
          color: 'rgba(0, 0, 255, 1)'
        }))
      } else {
        enemies.push(new Enemy({
          position: spawnPos,
          height: enemySize,
          width: enemySize,
          target: player,
          health: 1,
          color: 'rgb(255, 0, 0)'
        }))
      }
    }
  }

  frames++

  if (player.health <= 0 && !gameIsOver) {
    gameIsOver = true
    gameOverContainer.style.display = 'flex'
    cancelAnimationFrame(animationId)
  }
}

function restartGame() {
  // Reset all game variables
  frames = 0
  spawnRate = 360
  lastLifeGainTime = 0
  lastProjectileTime = -60
  bgcolor = 'white'
  blueSpawnChance = 0
  gameIsOver = false
  
  // Clear arrays
  enemies.length = 0
  projectiles.length = 0
  
  // Reset player
  player.position = {
    x: canvas.width / 2,
    y: canvas.height / 2
  }
  player.velocity = {
    x: 0,
    y: 0
  }
  player.health = 5
  
  // Hide game over screen
  gameOverContainer.style.display = 'none'
  
  // Restart animation loop
  animate()
}

// --- Event Listeners ---

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
})

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

addEventListener('click', (event) => {
  if (frames - lastProjectileTime < 60) {
    return
  }

  const rect = canvas.getBoundingClientRect()
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height
  const clickX = (event.clientX - rect.left) * scaleX
  const clickY = (event.clientY - rect.top) * scaleY

  const angle = Math.atan2(
    clickY - player.position.y,
    clickX - player.position.x
  )

  const velocity = {
    x: Math.cos(angle) * 20 + player.velocity.x * 0.5,
    y: Math.sin(angle) * 20 + player.velocity.y * 0.5
  }

  projectiles.push(
    new Projectile(player.position.x, player.position.y, 8, 'black', velocity)
  )
  lastProjectileTime = frames
})

// --- Event Listener for Restart Button ---
restartButton.addEventListener('click', restartGame)

// --- Start Game ---
animate()
