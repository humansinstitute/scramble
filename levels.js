/**
 * Scramble - Level Configuration
 * Terrain generation and enemy spawning patterns
 */

import { Enemy, GroundTarget, TerrainSegment, ENEMY_TYPES, GROUND_TARGET_TYPES } from './entities.js';

// Stage configurations
// enemyDensity = probability per frame of spawning an enemy (0.01 = 1% chance)
export const STAGES = [
  {
    name: 'ROCKY CANYON',
    baseTopHeight: 40,
    baseBottomHeight: 80,
    terrainVariation: 25,
    enemyDensity: 0.008,        // Easy start - few enemies
    groundTargetDensity: 0.012, // More ground targets for fuel
    scrollSpeed: 1.8,
    enemyTypes: ['rocket'],
    groundTargetTypes: ['fuelTank', 'fuelTank', 'rocket'], // More fuel tanks
    length: 1800
  },
  {
    name: 'ENEMY BASE',
    baseTopHeight: 50,
    baseBottomHeight: 90,
    terrainVariation: 35,
    enemyDensity: 0.015,
    groundTargetDensity: 0.012,
    scrollSpeed: 2,
    enemyTypes: ['rocket', 'ufo'],
    groundTargetTypes: ['rocket', 'base', 'fuelTank'],
    length: 2200
  },
  {
    name: 'MISSILE SILOS',
    baseTopHeight: 60,
    baseBottomHeight: 100,
    terrainVariation: 45,
    enemyDensity: 0.022,
    groundTargetDensity: 0.015,
    scrollSpeed: 2.2,
    enemyTypes: ['rocket', 'ufo', 'fighter'],
    groundTargetTypes: ['rocket', 'base', 'radar', 'fuelTank'],
    length: 2500
  },
  {
    name: 'NARROW CAVES',
    baseTopHeight: 90,
    baseBottomHeight: 110,
    terrainVariation: 50,
    enemyDensity: 0.025,
    groundTargetDensity: 0.01,
    scrollSpeed: 2.5,
    enemyTypes: ['ufo', 'fighter'],
    groundTargetTypes: ['fuelTank', 'radar'],
    length: 2200
  },
  {
    name: 'FINAL FORTRESS',
    baseTopHeight: 80,
    baseBottomHeight: 100,
    terrainVariation: 45,
    enemyDensity: 0.035,
    groundTargetDensity: 0.02,
    scrollSpeed: 2.8,
    enemyTypes: ['ufo', 'fighter', 'bomber'],
    groundTargetTypes: ['rocket', 'base', 'radar', 'fuelTank'],
    length: 3000
  }
];

// Terrain generator class
export class TerrainGenerator {
  constructor(canvasWidth, canvasHeight, stageConfig) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.config = stageConfig;

    this.segments = [];
    this.segmentWidth = 4;
    this.noiseOffset = Math.random() * 1000;

    // Initialize terrain to fill the screen
    this.generateInitialTerrain();
  }

  // Simple noise function
  noise(x) {
    const sin1 = Math.sin(x * 0.02 + this.noiseOffset);
    const sin2 = Math.sin(x * 0.05 + this.noiseOffset * 2) * 0.5;
    const sin3 = Math.sin(x * 0.01 + this.noiseOffset * 0.5) * 0.3;
    return (sin1 + sin2 + sin3) / 1.8;
  }

  generateInitialTerrain() {
    const numSegments = Math.ceil(this.canvasWidth / this.segmentWidth) + 10;

    for (let i = 0; i < numSegments; i++) {
      const x = i * this.segmentWidth;
      this.segments.push(this.createSegment(x, x));
    }
  }

  createSegment(x, worldX) {
    const noise = this.noise(worldX);

    const topHeight = this.config.baseTopHeight +
      noise * this.config.terrainVariation;
    const bottomHeight = this.config.baseBottomHeight +
      noise * this.config.terrainVariation * 0.8;

    return new TerrainSegment(x, topHeight, bottomHeight, this.segmentWidth);
  }

  update(scrollSpeed, worldDistance) {
    // Move all segments left
    for (const segment of this.segments) {
      segment.update(scrollSpeed);
    }

    // Remove segments that are off screen left
    this.segments = this.segments.filter(s => s.x + s.width > -10);

    // Add new segments on the right
    const lastSegment = this.segments[this.segments.length - 1];
    if (lastSegment && lastSegment.x < this.canvasWidth + 50) {
      const newX = lastSegment.x + this.segmentWidth;
      const worldX = worldDistance + newX;
      this.segments.push(this.createSegment(newX, worldX));
    }
  }

  // Get terrain bounds at a given x position
  getBoundsAt(x) {
    for (const segment of this.segments) {
      if (x >= segment.x && x < segment.x + segment.width) {
        return {
          top: segment.topHeight,
          bottom: this.canvasHeight - segment.bottomHeight
        };
      }
    }
    // Default bounds
    return {
      top: this.config.baseTopHeight,
      bottom: this.canvasHeight - this.config.baseBottomHeight
    };
  }

  // Check collision with an entity
  checkCollision(entity) {
    for (const segment of this.segments) {
      const collision = segment.collidesWithEntity(entity, this.canvasHeight);
      if (collision) return collision;
    }
    return false;
  }

  // Get current safe flying zone
  getSafeZone() {
    // Get average of visible terrain
    let avgTop = 0;
    let avgBottom = 0;
    let count = 0;

    for (const segment of this.segments) {
      if (segment.x >= 0 && segment.x <= this.canvasWidth) {
        avgTop += segment.topHeight;
        avgBottom += this.canvasHeight - segment.bottomHeight;
        count++;
      }
    }

    if (count === 0) {
      return {
        top: this.config.baseTopHeight,
        bottom: this.canvasHeight - this.config.baseBottomHeight
      };
    }

    return {
      top: avgTop / count,
      bottom: avgBottom / count
    };
  }
}

// Spawn manager for enemies and ground targets
export class SpawnManager {
  constructor(canvasWidth, canvasHeight, stageConfig) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.config = stageConfig;

    this.spawnTimer = 0;
    this.groundSpawnTimer = 0;
  }

  update(terrain, worldDistance) {
    const enemies = [];
    const groundTargets = [];

    // Spawn flying enemies
    this.spawnTimer++;
    if (Math.random() < this.config.enemyDensity) {
      const enemy = this.spawnEnemy(terrain);
      if (enemy) enemies.push(enemy);
    }

    // Spawn ground targets
    this.groundSpawnTimer++;
    if (Math.random() < this.config.groundTargetDensity) {
      const target = this.spawnGroundTarget(terrain);
      if (target) groundTargets.push(target);
    }

    return { enemies, groundTargets };
  }

  spawnEnemy(terrain) {
    const types = this.config.enemyTypes;
    const type = types[Math.floor(Math.random() * types.length)];
    const config = ENEMY_TYPES[type];

    if (!config) return null;

    // Spawn off the right side of the screen
    const x = this.canvasWidth + 50;

    // Get safe zone for spawning
    const safeZone = terrain.getSafeZone();
    const minY = safeZone.top + 10;
    const maxY = safeZone.bottom - config.height - 10;

    if (maxY <= minY) return null;

    const y = minY + Math.random() * (maxY - minY);

    return new Enemy(x, y, type, config);
  }

  spawnGroundTarget(terrain) {
    const types = this.config.groundTargetTypes;
    const type = types[Math.floor(Math.random() * types.length)];
    const config = GROUND_TARGET_TYPES[type];

    if (!config) return null;

    // Spawn on the ground (bottom terrain)
    const x = this.canvasWidth + 50;

    // Get terrain height at spawn position
    const bounds = terrain.getBoundsAt(x);

    // Some targets float above ground (like fuel tanks)
    const floatOffset = config.floatHeight || 0;
    const y = bounds.bottom - config.height - floatOffset;

    return new GroundTarget(x, y, type, config);
  }
}

// Get total number of stages
export function getTotalStages() {
  return STAGES.length;
}

// Get stage by index
export function getStage(index) {
  return STAGES[Math.min(index, STAGES.length - 1)];
}
