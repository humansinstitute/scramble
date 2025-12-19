/**
 * Scramble - Game Controller
 * Side-scrolling shooter game loop and state machine
 */

import { Player, Bomb, createExplosion } from './entities.js';
import { STAGES, TerrainGenerator, SpawnManager, getTotalStages, getStage } from './levels.js';
import { Renderer } from './renderer.js';

// Game states
export const GameState = {
  START_SCREEN: 'start',
  PLAYING: 'playing',
  STAGE_TRANSITION: 'stage_transition',
  GAME_OVER: 'game_over',
  VICTORY: 'victory',
  PAUSED: 'paused'
};

const STORAGE_KEY = 'scramble.best';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.renderer = new Renderer(canvas);

    // State
    this.state = GameState.START_SCREEN;
    this.stateTimer = 0;

    // Game entities
    this.player = null;
    this.enemies = [];
    this.groundTargets = [];
    this.bullets = [];
    this.bombs = [];
    this.particles = [];

    // Terrain
    this.terrain = null;
    this.spawnManager = null;

    // Progress
    this.score = 0;
    this.bestScore = parseInt(localStorage.getItem(STORAGE_KEY) || '0');
    this.currentStage = 0;
    this.distance = 0;
    this.scrollSpeed = 2;

    // Input state
    this.input = {
      up: false,
      down: false,
      left: false,
      right: false,
      shoot: false,
      bomb: false
    };

    // Timing
    this.lastTime = 0;
    this.running = false;

    // Callbacks for UI
    this.onStateChange = null;
    this.onScoreChange = null;
  }

  setState(newState, data = {}) {
    const oldState = this.state;
    this.state = newState;
    this.stateTimer = 0;

    if (this.onStateChange) {
      this.onStateChange(newState, oldState, data);
    }

    this.onStateEnter(newState, data);
  }

  onStateEnter(state, data) {
    switch (state) {
      case GameState.PLAYING:
        // Continue playing
        break;

      case GameState.STAGE_TRANSITION:
        this.stateTimer = 120; // 2 seconds
        break;

      case GameState.GAME_OVER:
        this.saveBestScore();
        break;

      case GameState.VICTORY:
        this.saveBestScore();
        break;
    }
  }

  start() {
    // Reset game state
    this.score = 0;
    this.currentStage = 0;
    this.distance = 0;

    // Get stage config
    const stageConfig = getStage(this.currentStage);
    this.scrollSpeed = stageConfig.scrollSpeed;

    // Create terrain and spawn manager
    this.terrain = new TerrainGenerator(
      this.canvas.width,
      this.canvas.height,
      stageConfig
    );
    this.spawnManager = new SpawnManager(
      this.canvas.width,
      this.canvas.height,
      stageConfig
    );

    // Create player
    this.player = new Player(this.canvas.width, this.canvas.height);

    // Clear entities
    this.enemies = [];
    this.groundTargets = [];
    this.bullets = [];
    this.bombs = [];
    this.particles = [];

    // Start playing
    this.setState(GameState.PLAYING);

    if (!this.running) {
      this.running = true;
      this.lastTime = performance.now();
      requestAnimationFrame((t) => this.gameLoop(t));
    }
  }

  initStage() {
    const stageConfig = getStage(this.currentStage);
    this.scrollSpeed = stageConfig.scrollSpeed;

    // Create new terrain and spawn manager for this stage
    this.terrain = new TerrainGenerator(
      this.canvas.width,
      this.canvas.height,
      stageConfig
    );
    this.spawnManager = new SpawnManager(
      this.canvas.width,
      this.canvas.height,
      stageConfig
    );

    // Reset distance for stage
    this.distance = 0;

    // Clear enemies but keep player
    this.enemies = [];
    this.groundTargets = [];
    this.bullets = [];
    this.bombs = [];
  }

  gameLoop(timestamp) {
    if (!this.running) return;

    const deltaTime = timestamp - this.lastTime;
    this.lastTime = timestamp;

    this.update(deltaTime);
    this.render();

    requestAnimationFrame((t) => this.gameLoop(t));
  }

  update(deltaTime) {
    // Always update particles
    this.updateParticles();

    switch (this.state) {
      case GameState.PLAYING:
        this.updatePlaying();
        break;

      case GameState.STAGE_TRANSITION:
        this.stateTimer--;
        if (this.stateTimer <= 0) {
          this.advanceStage();
        }
        break;

      case GameState.GAME_OVER:
      case GameState.VICTORY:
        // Just render, wait for user input
        break;
    }
  }

  updatePlaying() {
    const stageConfig = getStage(this.currentStage);

    // Update distance (score multiplier)
    this.distance += this.scrollSpeed;

    // Update terrain
    this.terrain.update(this.scrollSpeed, this.distance);

    // Get player safe bounds from terrain
    const safeZone = this.terrain.getSafeZone();

    // Update player
    this.player.update(this.input, safeZone.top, safeZone.bottom);

    // Player shooting
    if (this.input.shoot) {
      const bullet = this.player.shoot();
      if (bullet) {
        this.bullets.push(bullet);
      }
    }

    // Player bombing
    if (this.input.bomb) {
      const bomb = this.player.bomb();
      if (bomb) {
        this.bombs.push(bomb);
      }
    }

    // Spawn new enemies and targets
    const spawned = this.spawnManager.update(this.terrain, this.distance);
    this.enemies.push(...spawned.enemies);
    this.groundTargets.push(...spawned.groundTargets);

    // Update all entities
    this.updateEnemies();
    this.updateGroundTargets();
    this.updateBullets();
    this.updateBombs();

    // Check collisions
    this.checkCollisions();

    // Check terrain collision for player
    if (this.terrain.checkCollision(this.player)) {
      this.playerCrash();
      return;
    }

    // Check fuel - out of fuel means game over
    if (this.player.fuel <= 0) {
      this.playerCrash();
      return;
    }

    // Check stage completion
    if (this.distance >= stageConfig.length) {
      this.setState(GameState.STAGE_TRANSITION);
    }
  }

  updateEnemies() {
    for (const enemy of this.enemies) {
      if (!enemy.active) continue;

      enemy.update(this.scrollSpeed);

      // Enemy shooting
      if (enemy.shouldShoot()) {
        this.bullets.push(enemy.shoot());
      }
    }

    // Remove inactive enemies
    this.enemies = this.enemies.filter(e => e.active);
  }

  updateGroundTargets() {
    for (const target of this.groundTargets) {
      if (!target.active) continue;

      target.update(this.scrollSpeed);

      // Target shooting (missiles, etc.)
      if (target.shouldShoot()) {
        this.bullets.push(target.shoot());
      }
    }

    // Remove inactive targets
    this.groundTargets = this.groundTargets.filter(t => t.active);
  }

  updateBullets() {
    for (const bullet of this.bullets) {
      bullet.update(this.canvas.width, this.canvas.height);
    }

    // Remove inactive bullets
    this.bullets = this.bullets.filter(b => b.active);
  }

  updateBombs() {
    for (const bomb of this.bombs) {
      bomb.update(this.canvas.width, this.canvas.height);

      // Check terrain collision for bombs
      if (this.terrain.checkCollision(bomb)) {
        this.particles.push(...createExplosion(
          bomb.getCenterX(),
          bomb.getCenterY(),
          bomb.color,
          6
        ));
        bomb.active = false;
      }
    }

    // Remove inactive bombs
    this.bombs = this.bombs.filter(b => b.active);
  }

  updateParticles() {
    for (const p of this.particles) {
      p.update();
    }
    this.particles = this.particles.filter(p => p.active);
  }

  checkCollisions() {
    // Player bullets vs enemies
    for (const bullet of this.bullets) {
      if (!bullet.isPlayerBullet || !bullet.active) continue;

      for (const enemy of this.enemies) {
        if (!enemy.active) continue;

        if (bullet.collidesWith(enemy)) {
          bullet.active = false;
          const destroyed = enemy.takeDamage(bullet.damage);

          if (destroyed) {
            this.addScore(enemy.points);
            this.particles.push(...createExplosion(
              enemy.getCenterX(),
              enemy.getCenterY(),
              enemy.color
            ));
          }
          break;
        }
      }
    }

    // Bombs vs ground targets
    for (const bomb of this.bombs) {
      if (!bomb.active) continue;

      for (const target of this.groundTargets) {
        if (!target.active) continue;

        if (bomb.collidesWith(target)) {
          bomb.active = false;
          target.active = false;

          this.addScore(target.points);
          this.particles.push(...createExplosion(
            target.getCenterX(),
            target.getCenterY(),
            target.color,
            12
          ));

          // Fuel pickup
          if (target.givesFuel) {
            this.player.addFuel(target.fuelAmount);
          }
          break;
        }
      }
    }

    // Player bullets vs ground targets
    for (const bullet of this.bullets) {
      if (!bullet.isPlayerBullet || !bullet.active) continue;

      for (const target of this.groundTargets) {
        if (!target.active) continue;

        if (bullet.collidesWith(target)) {
          bullet.active = false;
          target.active = false;

          this.addScore(target.points);
          this.particles.push(...createExplosion(
            target.getCenterX(),
            target.getCenterY(),
            target.color
          ));

          // Fuel pickup
          if (target.givesFuel) {
            this.player.addFuel(target.fuelAmount);
          }
          break;
        }
      }
    }

    // Enemy bullets vs player
    for (const bullet of this.bullets) {
      if (bullet.isPlayerBullet || !bullet.active) continue;

      if (bullet.collidesWith(this.player)) {
        bullet.active = false;
        this.playerHit();
        break;
      }
    }

    // Player vs enemies (collision = death)
    for (const enemy of this.enemies) {
      if (!enemy.active) continue;

      if (this.player.collidesWith(enemy)) {
        this.particles.push(...createExplosion(
          enemy.getCenterX(),
          enemy.getCenterY(),
          enemy.color
        ));
        enemy.active = false;
        this.playerHit();
        break;
      }
    }
  }

  playerHit() {
    const wasHit = this.player.hit();

    if (wasHit) {
      this.particles.push(...createExplosion(
        this.player.getCenterX(),
        this.player.getCenterY(),
        '#ff8c00',
        15
      ));

      if (this.player.lives <= 0) {
        this.setState(GameState.GAME_OVER);
      }
    }
  }

  playerCrash() {
    this.particles.push(...createExplosion(
      this.player.getCenterX(),
      this.player.getCenterY(),
      '#ff8c00',
      20
    ));

    this.player.lives--;

    if (this.player.lives <= 0) {
      this.setState(GameState.GAME_OVER);
    } else {
      // Reset player position and give brief invincibility
      this.player.x = 60;
      this.player.y = this.canvas.height / 2 - this.player.height / 2;
      this.player.isInvincible = true;
      this.player.invincibleTimer = 120;
      this.player.fuel = Math.max(this.player.fuel, 30); // Give some fuel back
    }
  }

  advanceStage() {
    this.currentStage++;

    if (this.currentStage >= getTotalStages()) {
      // All stages complete!
      this.setState(GameState.VICTORY);
    } else {
      // Initialize next stage
      this.initStage();
      this.setState(GameState.PLAYING);
    }
  }

  addScore(points) {
    this.score += points;
    if (this.onScoreChange) {
      this.onScoreChange(this.score);
    }
  }

  saveBestScore() {
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      localStorage.setItem(STORAGE_KEY, this.bestScore.toString());
    }
  }

  render() {
    const r = this.renderer;

    // Clear and draw background
    r.clear();
    r.drawGrid();
    r.drawStarfield(this.scrollSpeed);

    switch (this.state) {
      case GameState.START_SCREEN:
        // Just background, UI handles the rest
        break;

      case GameState.PLAYING:
        // Draw terrain
        r.drawTerrain(this.terrain);

        // Draw ground targets
        for (const target of this.groundTargets) {
          r.drawGroundTarget(target);
        }

        // Draw enemies
        for (const enemy of this.enemies) {
          r.drawEnemy(enemy);
        }

        // Draw bullets
        for (const bullet of this.bullets) {
          r.drawBullet(bullet);
        }

        // Draw bombs
        for (const bomb of this.bombs) {
          r.drawBomb(bomb);
        }

        // Draw player
        r.drawPlayer(this.player);

        // Draw particles
        r.drawParticles(this.particles);

        // Draw HUD
        r.drawHUD(
          this.score,
          this.player.lives,
          this.player.fuel,
          this.currentStage,
          this.distance,
          this.bestScore
        );
        break;

      case GameState.STAGE_TRANSITION:
        r.drawTerrain(this.terrain);
        r.drawPlayer(this.player);
        r.drawParticles(this.particles);

        const stageConfig = getStage(this.currentStage + 1);
        if (stageConfig) {
          r.drawStageTransition(stageConfig.name, this.stateTimer / 120);
        }
        break;

      case GameState.GAME_OVER:
        r.drawTerrain(this.terrain);
        r.drawParticles(this.particles);
        r.drawGameOver(this.score, this.bestScore);
        break;

      case GameState.VICTORY:
        r.drawParticles(this.particles);
        r.drawVictory(this.score);
        break;

      case GameState.PAUSED:
        r.drawTerrain(this.terrain);
        r.drawPlayer(this.player);
        r.drawPaused();
        break;
    }
  }

  // Input methods (called from index.html)
  setInput(key, value) {
    this.input[key] = value;
  }

  restart() {
    this.start();
  }

  pause() {
    if (this.state === GameState.PLAYING) {
      this.setState(GameState.PAUSED);
    } else if (this.state === GameState.PAUSED) {
      this.setState(GameState.PLAYING);
    }
  }

  isGameOver() {
    return this.state === GameState.GAME_OVER;
  }

  isVictory() {
    return this.state === GameState.VICTORY;
  }

  isStartScreen() {
    return this.state === GameState.START_SCREEN;
  }
}
