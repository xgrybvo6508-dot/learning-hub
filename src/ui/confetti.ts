export function burstConfetti(color: string): void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'confetti-canvas';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.append(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    canvas.remove();
    return;
  }
  const particles = Array.from({ length: 48 }, () => ({
    x: canvas.width * 0.5 + (Math.random() - 0.5) * 80,
    y: canvas.height * 0.35,
    vx: (Math.random() - 0.5) * 6,
    vy: Math.random() * -8 - 2,
    life: 1,
    size: 4 + Math.random() * 4,
  }));
  let frame = 0;
  const tick = (): void => {
    frame += 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.25;
      p.life -= 0.018;
      ctx.globalAlpha = Math.max(p.life, 0);
      ctx.fillStyle = color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    ctx.globalAlpha = 1;
    if (frame < 70) {
      requestAnimationFrame(tick);
    } else {
      canvas.remove();
    }
  };
  requestAnimationFrame(tick);
}
