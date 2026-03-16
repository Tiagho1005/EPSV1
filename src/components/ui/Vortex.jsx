import React, { useRef, useEffect } from 'react';

// Colores que armonizan con el gradiente de fondo (morado-azul)
const COLORS = ['#f87171', '#c084fc', '#818cf8', '#6366f1', '#a78bfa', '#e879f9'];

const PARTICLE_COUNT = 700;
const INFLUENCE_RADIUS = 240;   // radio de influencia del cursor
const SWIRL_STRENGTH   = 0.09;  // fuerza tangencial (crea el remolino)
const ATTRACT_STRENGTH = 0.018; // atracción suave hacia el cursor
const DAMPING          = 0.92;  // amortiguación de velocidad
const MAX_SPEED        = 5;

class Particle {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.reset(true);
  }

  reset(initial = false) {
    if (initial) {
      this.x = Math.random() * this.w;
      this.y = Math.random() * this.h;
    } else {
      // Reaparece desde un borde aleatorio
      const edge = Math.floor(Math.random() * 4);
      if (edge === 0) { this.x = Math.random() * this.w; this.y = -4; }
      else if (edge === 1) { this.x = this.w + 4; this.y = Math.random() * this.h; }
      else if (edge === 2) { this.x = Math.random() * this.w; this.y = this.h + 4; }
      else { this.x = -4; this.y = Math.random() * this.h; }
    }

    this.vx = (Math.random() - 0.5) * 0.4;
    this.vy = (Math.random() - 0.5) * 0.4;
    this.size      = Math.random() * 1.8 + 0.4;
    this.baseAlpha = Math.random() * 0.45 + 0.15;
    this.alpha     = this.baseAlpha;
    this.color     = COLORS[Math.floor(Math.random() * COLORS.length)];
    this.prevX     = this.x;
    this.prevY     = this.y;
  }

  update(vortexX, vortexY, active) {
    this.prevX = this.x;
    this.prevY = this.y;

    // Deriva ambiente suave hacia el centro + giro base
    const dxC  = this.w / 2 - this.x;
    const dyC  = this.h / 2 - this.y;
    const dC   = Math.sqrt(dxC * dxC + dyC * dyC) || 1;
    this.vx += (dxC / dC) * 0.0008 + (dyC / dC) * 0.0015;
    this.vy += (dyC / dC) * 0.0008 - (dxC / dC) * 0.0015;

    // Influencia del vórtice del cursor
    if (active) {
      const dx   = vortexX - this.x;
      const dy   = vortexY - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;

      if (dist < INFLUENCE_RADIUS) {
        const t = (INFLUENCE_RADIUS - dist) / INFLUENCE_RADIUS;
        const strength = t * t; // cuadrática: más pronunciado cerca del cursor

        // Fuerza tangencial — crea el giro (perpendicular al radio)
        const nx = dx / dist;
        const ny = dy / dist;
        this.vx += -ny * strength * SWIRL_STRENGTH;
        this.vy +=  nx * strength * SWIRL_STRENGTH;

        // Atracción radial suave
        if (dist > 35) {
          this.vx += nx * strength * ATTRACT_STRENGTH;
          this.vy += ny * strength * ATTRACT_STRENGTH;
        } else {
          // Repulsión en el núcleo para evitar colapso
          this.vx -= nx * 0.06;
          this.vy -= ny * 0.06;
        }

        // Partículas cercanas se iluminan
        this.alpha = Math.min(0.9, this.baseAlpha + strength * 0.45);
      } else {
        this.alpha += (this.baseAlpha - this.alpha) * 0.05;
      }
    } else {
      this.alpha += (this.baseAlpha - this.alpha) * 0.03;
    }

    // Límite de velocidad
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (speed > MAX_SPEED) {
      this.vx = (this.vx / speed) * MAX_SPEED;
      this.vy = (this.vy / speed) * MAX_SPEED;
    }

    this.vx *= DAMPING;
    this.vy *= DAMPING;
    this.x  += this.vx;
    this.y  += this.vy;

    if (this.x < -12 || this.x > this.w + 12 || this.y < -12 || this.y > this.h + 12) {
      this.reset(false);
    }
  }

  draw(ctx) {
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);

    ctx.globalAlpha = this.alpha;

    // Traza de movimiento cuando va rápido
    if (speed > 0.6) {
      ctx.beginPath();
      ctx.strokeStyle = this.color;
      ctx.lineWidth   = this.size * 0.65;
      ctx.moveTo(this.prevX, this.prevY);
      ctx.lineTo(this.x, this.y);
      ctx.stroke();
    }

    // Punto central
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();

    ctx.globalAlpha = 1;
  }
}

const Vortex = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');
    let animId;
    let w, h;
    let particles = [];

    // Centro del vórtice (persigue al cursor con inercia)
    const vortex = { x: 0, y: 0 };
    const cursor = { x: 0, y: 0, active: false };

    const init = () => {
      w = canvas.width  = window.innerWidth;
      h = canvas.height = window.innerHeight;
      vortex.x = w / 2;
      vortex.y = h / 2;
      particles = Array.from({ length: PARTICLE_COUNT }, () => new Particle(w, h));
    };

    const animate = () => {
      ctx.clearRect(0, 0, w, h);

      // Vórtice sigue al cursor con suavizado
      if (cursor.active) {
        vortex.x += (cursor.x - vortex.x) * 0.1;
        vortex.y += (cursor.y - vortex.y) * 0.1;
      }

      for (const p of particles) {
        p.update(vortex.x, vortex.y, cursor.active);
        p.draw(ctx);
      }

      animId = requestAnimationFrame(animate);
    };

    const onMove   = (e) => { cursor.x = e.clientX; cursor.y = e.clientY; cursor.active = true; };
    const onLeave  = ()  => { cursor.active = false; };
    const onResize = ()  => { init(); };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseleave', onLeave);
    window.addEventListener('resize', onResize);

    init();
    animate();

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full z-0"
      style={{ background: 'transparent', pointerEvents: 'none' }}
    />
  );
};

export default Vortex;
