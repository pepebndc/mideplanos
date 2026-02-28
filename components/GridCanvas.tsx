'use client';

import { useRef, useEffect } from 'react';

export default function GridCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const mouse = { x: -2000, y: -2000 };
    const smooth = { x: -2000, y: -2000 };

    let w = 0;
    let h = 0;

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;
    };
    resize();

    const onMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    const onTouchMove = (e: TouchEvent) => {
      mouse.x = e.touches[0].clientX;
      mouse.y = e.touches[0].clientY;
    };

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('touchmove', onTouchMove, { passive: true });

    const GRID = 48;
    const MOUSE_R = 220;
    const LERP = 0.07;

    let raf: number;

    const draw = (ts: number) => {
      smooth.x += (mouse.x - smooth.x) * LERP;
      smooth.y += (mouse.y - smooth.y) * LERP;

      const t = ts * 0.001;
      const ox = Math.sin(t * 0.11) * GRID * 0.38;
      const oy = Math.cos(t * 0.08) * GRID * 0.28;

      const gx0 = (ox % GRID) - GRID;
      const gy0 = (oy % GRID) - GRID;

      ctx.clearRect(0, 0, w, h);

      ctx.fillStyle = '#F1EFEA';
      ctx.fillRect(0, 0, w, h);

      ctx.lineWidth = 1;

      for (let x = gx0; x < w + GRID; x += GRID) {
        const dx = Math.abs(x - smooth.x);
        const glow = Math.max(0, 1 - dx / MOUSE_R);
        const alpha = 0.055 + glow * 0.13;
        ctx.strokeStyle = `rgba(26,44,61,${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }

      for (let y = gy0; y < h + GRID; y += GRID) {
        const dy = Math.abs(y - smooth.y);
        const glow = Math.max(0, 1 - dy / MOUSE_R);
        const alpha = 0.055 + glow * 0.13;
        ctx.strokeStyle = `rgba(26,44,61,${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      for (let x = gx0; x < w + GRID; x += GRID) {
        if (Math.abs(x - smooth.x) > MOUSE_R) continue;
        for (let y = gy0; y < h + GRID; y += GRID) {
          const dist = Math.hypot(x - smooth.x, y - smooth.y);
          if (dist >= MOUSE_R) continue;
          const t2 = 1 - dist / MOUSE_R;
          const ease = t2 * t2 * t2;
          ctx.beginPath();
          ctx.arc(x, y, 0.5 + ease * 3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(26,44,61,${(ease * 0.38).toFixed(3)})`;
          ctx.fill();
        }
      }

      if (smooth.x > -1000) {
        const grad = ctx.createRadialGradient(
          smooth.x, smooth.y, 0,
          smooth.x, smooth.y, MOUSE_R * 1.6,
        );
        grad.addColorStop(0, 'rgba(255,255,252,0.10)');
        grad.addColorStop(0.4, 'rgba(255,255,252,0.04)');
        grad.addColorStop(1, 'rgba(255,255,252,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchmove', onTouchMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
