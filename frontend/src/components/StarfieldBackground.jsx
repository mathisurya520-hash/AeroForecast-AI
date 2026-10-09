import React, { useEffect, useRef } from 'react';

export default function StarfieldBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Environmental atmospheric dust & star particles
    const count = window.innerWidth < 768 ? 70 : 150;
    const particles = [];
    const colors = ['#F1EDE5', '#A66A4C', '#D2B06A', '#78866B', '#E7DCC8'];

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.5 + 0.4,
        alpha: Math.random(),
        speed: Math.random() * 0.12 + 0.04,
        twinkleSpeed: Math.random() * 0.015 + 0.004,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }

    let angle = 0;

    const render = () => {
      angle += 0.002;
      ctx.clearRect(0, 0, width, height);

      // Deep Charcoal & Warm Olive Linear Background
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      bgGrad.addColorStop(0, '#121212');
      bgGrad.addColorStop(1, '#171713');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Warm Terracotta Ambient Glow Top-Left
      const terracottaGlow = ctx.createRadialGradient(
        width * 0.25, height * 0.2, 0,
        width * 0.25, height * 0.2, width * 0.45
      );
      terracottaGlow.addColorStop(0, 'rgba(166, 106, 76, 0.07)');
      terracottaGlow.addColorStop(1, 'rgba(18, 18, 18, 0)');
      ctx.fillStyle = terracottaGlow;
      ctx.fillRect(0, 0, width, height);

      // Warm Sand & Olive Ambient Glow Bottom-Right
      const oliveGlow = ctx.createRadialGradient(
        width * 0.8, height * 0.75, 0,
        width * 0.8, height * 0.75, width * 0.5
      );
      oliveGlow.addColorStop(0, 'rgba(210, 176, 106, 0.06)');
      oliveGlow.addColorStop(1, 'rgba(18, 18, 18, 0)');
      ctx.fillStyle = oliveGlow;
      ctx.fillRect(0, 0, width, height);

      // Render Floating Environmental Particles
      particles.forEach((p) => {
        p.y -= p.speed;
        if (p.y < 0) {
          p.y = height;
          p.x = Math.random() * width;
        }

        p.alpha += Math.sin(angle * 4) * p.twinkleSpeed;
        const opacity = Math.max(0.15, Math.min(0.85, Math.abs(Math.sin(p.alpha))));

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = opacity;
        ctx.shadowBlur = p.radius > 1 ? 3 : 0;
        ctx.shadowColor = p.color;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      ctx.globalAlpha = 1.0;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: -2,
        pointerEvents: 'none'
      }}
    />
  );
}
