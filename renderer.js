/**
 * Scramble - Renderer
 * All canvas rendering with neon glow effects for side-scrolling shooter
 */

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;

    // Colors
    this.bgColor = '#0a1628';
    this.terrainColor = '#1a3a5c';
    this.terrainGlow = '#4a9eff';
    this.gridColor = 'rgba(74, 154, 255, 0.03)';
    this.textColor = '#4a9eff';

    // Starfield
    this.stars = this.createStarfield(40);
  }

  createStarfield(count) {
    const stars = [];
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: Math.random() * 2 + 0.5,
        brightness: Math.random() * 0.5 + 0.2,
        speed: Math.random() * 0.5 + 0.2
      });
    }
    return stars;
  }

  updateStarfield(scrollSpeed) {
    for (const star of this.stars) {
      star.x -= star.speed + scrollSpeed * 0.3;
      if (star.x < 0) {
        star.x = this.width;
        star.y = Math.random() * this.height;
      }
    }
  }

  clear() {
    this.ctx.fillStyle = this.bgColor;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  drawGrid() {
    this.ctx.strokeStyle = this.gridColor;
    this.ctx.lineWidth = 1;

    const gridSize = 20;
    for (let x = 0; x <= this.width; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.height);
      this.ctx.stroke();
    }
    for (let y = 0; y <= this.height; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.width, y);
      this.ctx.stroke();
    }
  }

  drawStarfield(scrollSpeed) {
    this.updateStarfield(scrollSpeed);
    for (const star of this.stars) {
      this.ctx.globalAlpha = star.brightness;
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillRect(star.x, star.y, star.size, star.size);
    }
    this.ctx.globalAlpha = 1;
  }

  drawTerrain(terrain) {
    const ctx = this.ctx;
    const segments = terrain.segments;

    if (segments.length === 0) return;

    // Draw top terrain (ceiling)
    ctx.fillStyle = this.terrainColor;
    ctx.shadowColor = this.terrainGlow;
    ctx.shadowBlur = 8;

    ctx.beginPath();
    ctx.moveTo(0, 0);

    for (const segment of segments) {
      ctx.lineTo(segment.x, segment.topHeight);
    }

    const lastSeg = segments[segments.length - 1];
    ctx.lineTo(lastSeg.x + lastSeg.width, lastSeg.topHeight);
    ctx.lineTo(this.width, 0);
    ctx.closePath();
    ctx.fill();

    // Draw bottom terrain (ground)
    ctx.beginPath();
    ctx.moveTo(0, this.height);

    for (const segment of segments) {
      const bottomY = this.height - segment.bottomHeight;
      ctx.lineTo(segment.x, bottomY);
    }

    ctx.lineTo(lastSeg.x + lastSeg.width, this.height - lastSeg.bottomHeight);
    ctx.lineTo(this.width, this.height);
    ctx.closePath();
    ctx.fill();

    // Add highlight lines on terrain edges
    ctx.strokeStyle = this.terrainGlow;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 12;

    // Top edge
    ctx.beginPath();
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      if (i === 0) {
        ctx.moveTo(segment.x, segment.topHeight);
      } else {
        ctx.lineTo(segment.x, segment.topHeight);
      }
    }
    ctx.stroke();

    // Bottom edge
    ctx.beginPath();
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const bottomY = this.height - segment.bottomHeight;
      if (i === 0) {
        ctx.moveTo(segment.x, bottomY);
      } else {
        ctx.lineTo(segment.x, bottomY);
      }
    }
    ctx.stroke();

    ctx.shadowBlur = 0;
  }

  drawPlayer(player) {
    if (!player.active) return;

    // Flicker when invincible
    if (player.isInvincible && Math.floor(player.invincibleTimer / 4) % 2 === 0) {
      return;
    }

    const ctx = this.ctx;
    ctx.shadowColor = player.glowColor;
    ctx.shadowBlur = 12;
    ctx.fillStyle = player.color;

    // Jet fighter shape pointing right
    const x = player.x;
    const y = player.y;
    const w = player.width;
    const h = player.height;

    // Main body (pointed nose)
    ctx.beginPath();
    ctx.moveTo(x + w, y + h / 2); // Nose
    ctx.lineTo(x + w * 0.3, y);    // Top wing
    ctx.lineTo(x, y + h * 0.3);    // Back top
    ctx.lineTo(x, y + h * 0.7);    // Back bottom
    ctx.lineTo(x + w * 0.3, y + h); // Bottom wing
    ctx.closePath();
    ctx.fill();

    // Cockpit
    ctx.fillStyle = '#4a9eff';
    ctx.fillRect(x + w * 0.5, y + h * 0.35, w * 0.2, h * 0.3);

    // Engine glow
    ctx.shadowColor = '#ff8c00';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#ff8c00';
    ctx.beginPath();
    ctx.moveTo(x, y + h * 0.35);
    ctx.lineTo(x - 8 - Math.random() * 4, y + h / 2);
    ctx.lineTo(x, y + h * 0.65);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;
  }

  drawEnemy(enemy) {
    if (!enemy.active) return;

    const ctx = this.ctx;
    ctx.shadowColor = enemy.glowColor;
    ctx.shadowBlur = 8;
    ctx.fillStyle = enemy.color;

    const x = enemy.x;
    const y = enemy.y;
    const w = enemy.width;
    const h = enemy.height;

    switch (enemy.type) {
      case 'rocket':
        // Simple rocket shape
        ctx.beginPath();
        ctx.moveTo(x, y + h / 2);
        ctx.lineTo(x + w * 0.3, y);
        ctx.lineTo(x + w, y + h * 0.2);
        ctx.lineTo(x + w, y + h * 0.8);
        ctx.lineTo(x + w * 0.3, y + h);
        ctx.closePath();
        ctx.fill();
        break;

      case 'ufo':
        // UFO/saucer shape
        ctx.beginPath();
        ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 3, 0, 0, Math.PI * 2);
        ctx.fill();
        // Dome
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.ellipse(x + w / 2, y + h * 0.3, w * 0.25, h * 0.25, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        break;

      case 'fighter':
        // Enemy fighter
        ctx.beginPath();
        ctx.moveTo(x, y + h / 2);
        ctx.lineTo(x + w * 0.4, y);
        ctx.lineTo(x + w, y + h * 0.3);
        ctx.lineTo(x + w * 0.8, y + h / 2);
        ctx.lineTo(x + w, y + h * 0.7);
        ctx.lineTo(x + w * 0.4, y + h);
        ctx.closePath();
        ctx.fill();
        break;

      case 'bomber':
        // Larger bomber
        ctx.fillRect(x, y + h * 0.2, w * 0.8, h * 0.6);
        ctx.fillRect(x + w * 0.2, y, w * 0.4, h);
        break;

      default:
        ctx.fillRect(x, y, w, h);
    }

    ctx.shadowBlur = 0;
  }

  drawGroundTarget(target) {
    if (!target.active) return;

    const ctx = this.ctx;
    ctx.shadowColor = target.glowColor;
    ctx.shadowBlur = 6;
    ctx.fillStyle = target.color;

    const x = target.x;
    const y = target.y;
    const w = target.width;
    const h = target.height;

    switch (target.type) {
      case 'fuelTank':
        // Cylindrical fuel tank
        ctx.fillRect(x, y + h * 0.2, w, h * 0.6);
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h * 0.2, w / 2, Math.PI, 0);
        ctx.fill();
        // Fuel symbol
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('F', x + w / 2, y + h * 0.6);
        break;

      case 'rocket':
        // Standing rocket
        ctx.beginPath();
        ctx.moveTo(x + w / 2, y);
        ctx.lineTo(x + w, y + h * 0.3);
        ctx.lineTo(x + w * 0.8, y + h);
        ctx.lineTo(x + w * 0.2, y + h);
        ctx.lineTo(x, y + h * 0.3);
        ctx.closePath();
        ctx.fill();
        break;

      case 'base':
        // Military base building
        ctx.fillRect(x, y + h * 0.3, w, h * 0.7);
        // Roof
        ctx.beginPath();
        ctx.moveTo(x, y + h * 0.3);
        ctx.lineTo(x + w / 2, y);
        ctx.lineTo(x + w, y + h * 0.3);
        ctx.closePath();
        ctx.fill();
        break;

      case 'radar':
        // Radar dish
        ctx.fillRect(x + w * 0.3, y + h * 0.5, w * 0.4, h * 0.5);
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h * 0.3, w * 0.4, Math.PI, 0);
        ctx.fill();
        break;

      default:
        ctx.fillRect(x, y, w, h);
    }

    ctx.shadowBlur = 0;
  }

  drawBullet(bullet) {
    if (!bullet.active) return;

    const ctx = this.ctx;
    ctx.shadowColor = bullet.glowColor;
    ctx.shadowBlur = 6;
    ctx.fillStyle = bullet.color;
    ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    ctx.shadowBlur = 0;
  }

  drawBomb(bomb) {
    if (!bomb.active) return;

    const ctx = this.ctx;
    ctx.shadowColor = bomb.glowColor;
    ctx.shadowBlur = 8;
    ctx.fillStyle = bomb.color;

    ctx.beginPath();
    ctx.arc(bomb.x + bomb.width / 2, bomb.y + bomb.height / 2,
            bomb.width / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
  }

  drawParticle(particle) {
    if (!particle.active) return;

    const ctx = this.ctx;
    ctx.globalAlpha = particle.getAlpha();
    ctx.fillStyle = particle.color;
    ctx.shadowColor = particle.color;
    ctx.shadowBlur = 4;
    ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  drawParticles(particles) {
    for (const p of particles) {
      this.drawParticle(p);
    }
  }

  drawHUD(score, lives, fuel, stage, distance, bestScore) {
    const ctx = this.ctx;
    ctx.font = 'bold 12px "Courier New", monospace';

    // Score (top left)
    ctx.fillStyle = this.textColor;
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${score}`, 10, 20);

    // Best score
    ctx.fillStyle = '#4a7a9e';
    ctx.fillText(`BEST: ${bestScore}`, 10, 35);

    // Stage (top center)
    ctx.fillStyle = '#e8a030';
    ctx.textAlign = 'center';
    ctx.fillText(`STAGE ${stage + 1}`, this.width / 2, 20);

    // Distance
    ctx.fillStyle = '#4a7a9e';
    ctx.fillText(`${Math.floor(distance)}m`, this.width / 2, 35);

    // Lives (top right)
    ctx.textAlign = 'right';
    ctx.fillStyle = '#00ff88';
    const livesX = this.width - 10;
    for (let i = 0; i < lives; i++) {
      const x = livesX - i * 18 - 12;
      ctx.beginPath();
      ctx.moveTo(x + 12, 16);
      ctx.lineTo(x, 12);
      ctx.lineTo(x, 20);
      ctx.closePath();
      ctx.fill();
    }

    // Fuel bar (bottom)
    this.drawFuelBar(fuel, 100);
  }

  drawFuelBar(fuel, maxFuel) {
    const ctx = this.ctx;
    const barWidth = 150;
    const barHeight = 12;
    const x = 10;
    const y = this.height - 22;

    // Label
    ctx.font = 'bold 10px "Courier New", monospace';
    ctx.fillStyle = '#4a7a9e';
    ctx.textAlign = 'left';
    ctx.fillText('FUEL', x, y - 3);

    // Background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(x, y, barWidth, barHeight);

    // Fuel fill
    const fuelPercent = fuel / maxFuel;
    const fillColor = fuelPercent > 0.5 ? '#22c55e' :
                      fuelPercent > 0.25 ? '#f39c12' : '#ef4444';

    ctx.shadowColor = fillColor;
    ctx.shadowBlur = 4;
    ctx.fillStyle = fillColor;
    ctx.fillRect(x, y, barWidth * fuelPercent, barHeight);

    ctx.shadowBlur = 0;

    // Border
    ctx.strokeStyle = '#4a7a9e';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, barWidth, barHeight);

    // Warning flash if low fuel
    if (fuelPercent < 0.25 && Math.floor(Date.now() / 300) % 2 === 0) {
      ctx.fillStyle = '#ef4444';
      ctx.fillText('LOW FUEL!', x + barWidth + 10, y + 10);
    }
  }

  drawStageTransition(stageName, progress) {
    const ctx = this.ctx;

    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(10, 22, 40, 0.8)';
    ctx.fillRect(0, 0, this.width, this.height);

    // Stage name
    ctx.font = 'bold 24px "Courier New", monospace';
    ctx.fillStyle = '#e8a030';
    ctx.shadowColor = '#e8a030';
    ctx.shadowBlur = 15;
    ctx.textAlign = 'center';
    ctx.fillText(stageName, this.width / 2, this.height / 2 - 10);

    ctx.font = 'bold 14px "Courier New", monospace';
    ctx.fillStyle = '#4a9eff';
    ctx.shadowColor = '#4a9eff';
    ctx.fillText('GET READY!', this.width / 2, this.height / 2 + 20);

    ctx.shadowBlur = 0;
  }

  drawGameOver(score, bestScore) {
    const ctx = this.ctx;

    ctx.fillStyle = 'rgba(10, 22, 40, 0.9)';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.font = 'bold 28px "Courier New", monospace';
    ctx.fillStyle = '#ff6b6b';
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 20;
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', this.width / 2, this.height / 2 - 60);

    ctx.font = 'bold 18px "Courier New", monospace';
    ctx.fillStyle = '#4a9eff';
    ctx.shadowColor = '#4a9eff';
    ctx.shadowBlur = 10;
    ctx.fillText(`Score: ${score}`, this.width / 2, this.height / 2 - 10);

    ctx.fillStyle = '#e8a030';
    ctx.shadowColor = '#e8a030';
    ctx.fillText(`Best: ${bestScore}`, this.width / 2, this.height / 2 + 20);

    ctx.shadowBlur = 0;
  }

  drawVictory(score) {
    const ctx = this.ctx;

    ctx.fillStyle = 'rgba(10, 22, 40, 0.9)';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.font = 'bold 24px "Courier New", monospace';
    ctx.fillStyle = '#00ff88';
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 25;
    ctx.textAlign = 'center';
    ctx.fillText('MISSION COMPLETE!', this.width / 2, this.height / 2 - 50);

    ctx.font = 'bold 14px "Courier New", monospace';
    ctx.fillStyle = '#4a9eff';
    ctx.shadowColor = '#4a9eff';
    ctx.shadowBlur = 10;
    ctx.fillText('You destroyed the fortress!', this.width / 2, this.height / 2);

    ctx.font = 'bold 18px "Courier New", monospace';
    ctx.fillStyle = '#e8a030';
    ctx.shadowColor = '#e8a030';
    ctx.fillText(`Final Score: ${score}`, this.width / 2, this.height / 2 + 40);

    ctx.shadowBlur = 0;
  }

  drawPaused() {
    const ctx = this.ctx;

    ctx.fillStyle = 'rgba(10, 22, 40, 0.7)';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.font = 'bold 24px "Courier New", monospace';
    ctx.fillStyle = '#4a9eff';
    ctx.shadowColor = '#4a9eff';
    ctx.shadowBlur = 15;
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', this.width / 2, this.height / 2);

    ctx.shadowBlur = 0;
  }
}
