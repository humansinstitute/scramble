/**
 * Scramble - Entity Classes
 * Side-scrolling shooter entities
 */

// Base Entity class with position, size, and collision detection
export class Entity {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.active = true;
  }

  getBounds() {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height
    };
  }

  // AABB collision detection
  collidesWith(other) {
    if (!this.active || !other.active) return false;
    const a = this.getBounds();
    const b = other.getBounds();
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  getCenterX() {
    return this.x + this.width / 2;
  }

  getCenterY() {
    return this.y + this.height / 2;
  }
}

// Player ship - flies through the cave
export class Player extends Entity {
  constructor(canvasWidth, canvasHeight) {
    const width = 32;
    const height = 16;
    // Start on the left side of the screen
    super(60, canvasHeight / 2 - height / 2, width, height);

    this.speed = 4;
    this.lives = 3;
    this.shootCooldown = 0;
    this.shootCooldownMax = 10;
    this.bombCooldown = 0;
    this.bombCooldownMax = 30;
    this.isInvincible = false;
    this.invincibleTimer = 0;
    this.invincibleDuration = 120;

    this.color = '#00ff88';
    this.glowColor = '#00ff88';

    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;

    // Fuel system (classic Scramble feature)
    this.fuel = 100;
    this.maxFuel = 100;
    this.fuelDrainRate = 0.05; // Drain per frame
  }

  update(input, topBound, bottomBound) {
    // Movement - up/down and slight forward/back
    if (input.up && this.y > topBound + 5) {
      this.y -= this.speed;
    }
    if (input.down && this.y + this.height < bottomBound - 5) {
      this.y += this.speed;
    }
    if (input.left && this.x > 30) {
      this.x -= this.speed * 0.5;
    }
    if (input.right && this.x < this.canvasWidth * 0.4) {
      this.x += this.speed * 0.5;
    }

    // Cooldowns
    if (this.shootCooldown > 0) this.shootCooldown--;
    if (this.bombCooldown > 0) this.bombCooldown--;

    // Invincibility timer
    if (this.isInvincible) {
      this.invincibleTimer--;
      if (this.invincibleTimer <= 0) {
        this.isInvincible = false;
      }
    }

    // Fuel drain
    this.fuel -= this.fuelDrainRate;
    if (this.fuel <= 0) {
      this.fuel = 0;
    }
  }

  // Shoot forward
  shoot() {
    if (this.shootCooldown > 0) return null;
    this.shootCooldown = this.shootCooldownMax;
    return new Bullet(
      this.x + this.width,
      this.getCenterY() - 2,
      10, 0, // velocity x, y (shoots right)
      true
    );
  }

  // Drop bomb (falls down)
  bomb() {
    if (this.bombCooldown > 0) return null;
    this.bombCooldown = this.bombCooldownMax;
    return new Bomb(
      this.getCenterX(),
      this.y + this.height,
      3, 4 // velocity x, y (moves right and down)
    );
  }

  hit() {
    if (this.isInvincible) return false;
    this.lives--;
    this.isInvincible = true;
    this.invincibleTimer = this.invincibleDuration;
    return true;
  }

  addFuel(amount) {
    this.fuel = Math.min(this.maxFuel, this.fuel + amount);
  }

  reset(canvasWidth, canvasHeight) {
    this.x = 60;
    this.y = canvasHeight / 2 - this.height / 2;
    this.lives = 3;
    this.fuel = this.maxFuel;
    this.isInvincible = false;
    this.invincibleTimer = 0;
    this.shootCooldown = 0;
    this.bombCooldown = 0;
  }
}

// Enemy types for Scramble
export class Enemy extends Entity {
  constructor(x, y, type, config) {
    super(x, y, config.width, config.height);

    this.type = type;
    this.health = config.health;
    this.maxHealth = config.health;
    this.points = config.points;
    this.color = config.color;
    this.glowColor = config.glowColor || config.color;
    this.behavior = config.behavior || 'straight';
    this.speed = config.speed || 2;
    this.shootChance = config.shootChance || 0;

    // For wave/sine movement
    this.startY = y;
    this.angle = Math.random() * Math.PI * 2;
    this.waveAmplitude = config.waveAmplitude || 30;
    this.waveSpeed = config.waveSpeed || 0.05;

    // Animation
    this.animFrame = 0;
    this.animTimer = 0;
  }

  update(scrollSpeed) {
    // Move left with the scroll
    this.x -= scrollSpeed + this.speed;

    // Behavior patterns
    switch (this.behavior) {
      case 'wave':
        this.angle += this.waveSpeed;
        this.y = this.startY + Math.sin(this.angle) * this.waveAmplitude;
        break;
      case 'dive':
        this.y += 2;
        break;
      case 'chase':
        // Will be handled in game.js with player position
        break;
      case 'straight':
      default:
        // Just moves left
        break;
    }

    // Animation
    this.animTimer++;
    if (this.animTimer > 15) {
      this.animTimer = 0;
      this.animFrame = 1 - this.animFrame;
    }

    // Deactivate if off screen left
    if (this.x + this.width < -50) {
      this.active = false;
    }
  }

  takeDamage(amount = 1) {
    this.health -= amount;
    if (this.health <= 0) {
      this.active = false;
      return true;
    }
    return false;
  }

  shouldShoot() {
    return Math.random() < this.shootChance;
  }

  shoot() {
    return new Bullet(
      this.x,
      this.getCenterY() - 2,
      -6, 0, // shoots left
      false
    );
  }
}

// Ground target (rockets, fuel tanks, etc.)
export class GroundTarget extends Entity {
  constructor(x, y, type, config) {
    super(x, y, config.width, config.height);

    this.type = type;
    this.points = config.points;
    this.color = config.color;
    this.glowColor = config.glowColor || config.color;
    this.givesFuel = config.givesFuel || false;
    this.fuelAmount = config.fuelAmount || 0;
    this.shootChance = config.shootChance || 0;
  }

  update(scrollSpeed) {
    this.x -= scrollSpeed;

    if (this.x + this.width < -50) {
      this.active = false;
    }
  }

  shouldShoot() {
    return Math.random() < this.shootChance;
  }

  shoot() {
    return new Bullet(
      this.getCenterX(),
      this.y,
      0, -5, // shoots up
      false
    );
  }
}

// Bullet (horizontal shooting)
export class Bullet extends Entity {
  constructor(x, y, velocityX, velocityY, isPlayerBullet, damage = 1) {
    super(x, y, 8, 4);

    this.velocityX = velocityX;
    this.velocityY = velocityY;
    this.isPlayerBullet = isPlayerBullet;
    this.damage = damage;

    this.color = isPlayerBullet ? '#4a9eff' : '#ff6b6b';
    this.glowColor = this.color;
  }

  update(canvasWidth, canvasHeight) {
    this.x += this.velocityX;
    this.y += this.velocityY;

    // Deactivate if off screen
    if (this.x < -20 || this.x > canvasWidth + 20 ||
        this.y < -20 || this.y > canvasHeight + 20) {
      this.active = false;
    }
  }
}

// Bomb (drops down, affected by gravity)
export class Bomb extends Entity {
  constructor(x, y, velocityX, velocityY) {
    super(x, y, 6, 6);

    this.velocityX = velocityX;
    this.velocityY = velocityY;
    this.gravity = 0.15;
    this.damage = 2;

    this.color = '#ff8c00';
    this.glowColor = '#ff8c00';
  }

  update(canvasWidth, canvasHeight) {
    this.x += this.velocityX;
    this.velocityY += this.gravity;
    this.y += this.velocityY;

    // Deactivate if off screen
    if (this.x < -20 || this.x > canvasWidth + 20 ||
        this.y > canvasHeight + 20) {
      this.active = false;
    }
  }
}

// Terrain segment (cave walls)
export class TerrainSegment {
  constructor(x, topHeight, bottomHeight, width = 4) {
    this.x = x;
    this.topHeight = topHeight;
    this.bottomHeight = bottomHeight;
    this.width = width;
  }

  update(scrollSpeed) {
    this.x -= scrollSpeed;
  }

  // Check collision with entity
  collidesWithEntity(entity, canvasHeight) {
    if (!entity.active) return false;

    const entityBounds = entity.getBounds();

    // Check top wall collision
    if (entityBounds.y < this.topHeight &&
        entityBounds.x < this.x + this.width &&
        entityBounds.x + entityBounds.width > this.x) {
      return 'top';
    }

    // Check bottom wall collision
    const bottomY = canvasHeight - this.bottomHeight;
    if (entityBounds.y + entityBounds.height > bottomY &&
        entityBounds.x < this.x + this.width &&
        entityBounds.x + entityBounds.width > this.x) {
      return 'bottom';
    }

    return false;
  }
}

// Particle for explosions
export class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.color = color;

    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 4;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;

    this.size = 2 + Math.random() * 4;
    this.life = 25 + Math.random() * 20;
    this.maxLife = this.life;
    this.active = true;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.08; // light gravity
    this.life--;

    if (this.life <= 0) {
      this.active = false;
    }
  }

  getAlpha() {
    return this.life / this.maxLife;
  }
}

// Create explosion particles
export function createExplosion(x, y, color, count = 10) {
  const particles = [];
  for (let i = 0; i < count; i++) {
    particles.push(new Particle(x, y, color));
  }
  return particles;
}

// Enemy type configurations
export const ENEMY_TYPES = {
  rocket: {
    width: 20,
    height: 12,
    health: 1,
    points: 50,
    color: '#e74c3c',
    glowColor: '#ff0000',
    behavior: 'straight',
    speed: 1,
    shootChance: 0
  },
  ufo: {
    width: 24,
    height: 14,
    health: 1,
    points: 100,
    color: '#9b59b6',
    glowColor: '#a855f7',
    behavior: 'wave',
    speed: 2,
    waveAmplitude: 40,
    waveSpeed: 0.08,
    shootChance: 0.01
  },
  fighter: {
    width: 22,
    height: 10,
    health: 2,
    points: 150,
    color: '#3498db',
    glowColor: '#60a5fa',
    behavior: 'straight',
    speed: 3,
    shootChance: 0.02
  },
  bomber: {
    width: 28,
    height: 16,
    health: 3,
    points: 200,
    color: '#f39c12',
    glowColor: '#fbbf24',
    behavior: 'wave',
    speed: 1,
    waveAmplitude: 20,
    waveSpeed: 0.03,
    shootChance: 0.015
  }
};

// Ground target configurations
export const GROUND_TARGET_TYPES = {
  fuelTank: {
    width: 16,
    height: 20,
    points: 150,
    color: '#22c55e',
    glowColor: '#4ade80',
    givesFuel: true,
    fuelAmount: 25,
    shootChance: 0,
    floatHeight: 35  // Float above ground so lasers can hit
  },
  rocket: {
    width: 8,
    height: 24,
    points: 80,
    color: '#ef4444',
    glowColor: '#f87171',
    shootChance: 0.005
  },
  base: {
    width: 24,
    height: 16,
    points: 100,
    color: '#64748b',
    glowColor: '#94a3b8',
    shootChance: 0.008
  },
  radar: {
    width: 12,
    height: 18,
    points: 120,
    color: '#06b6d4',
    glowColor: '#22d3ee',
    shootChance: 0
  }
};
