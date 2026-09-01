import React, { useEffect, useRef } from 'react';

interface ToothParticle {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  rotationSpeed: number;
  density: number;
  color: string;
  type: 'tooth' | 'sparkle' | 'dot';
  opacity: number;
}

export const AntigravityParticles: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const mouse = {
      x: -1000,
      y: -1000,
      radius: 200,
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initParticles();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('resize', handleResize);

    const dentalColors = [
      '#3b82f6', // Electric Blue
      '#6366f1', // Indigo
      '#38bdf8', // Sky Blue / Cyan
      '#818cf8', // Soft Violet
      '#60a5fa', // Light Blue
      '#34d399', // Mint Green / Clean Dental
    ];

    let particles: ToothParticle[] = [];

    // Render SVG Path of Molar Tooth
    const drawToothShape = (
      pCtx: CanvasRenderingContext2D,
      x: number,
      y: number,
      size: number,
      rotation: number,
      color: string,
      opacity: number
    ) => {
      pCtx.save();
      pCtx.translate(x, y);
      pCtx.rotate(rotation);

      const scale = size / 24;
      pCtx.scale(scale, scale);

      pCtx.globalAlpha = opacity;
      pCtx.fillStyle = color;

      // Dental Molar Tooth Contour Path (Crown + 2 Roots)
      const toothPath = new Path2D(
        'M12 2C8.5 2 6 4.2 6 7.5C6 11 7.2 13.8 8 16.5C8.6 18.7 8.8 21 9.5 21C10.2 21 10.7 19.5 11.3 17.5C11.7 16.2 12 15 12 15C12 15 12.3 16.2 12.7 17.5C13.3 19.5 13.8 21 14.5 21C15.2 21 15.4 18.7 16 16.5C16.8 13.8 18 11 18 7.5C18 4.2 15.5 2 12 2Z'
      );

      // Soft glow fill
      pCtx.shadowColor = color;
      pCtx.shadowBlur = 8;
      pCtx.fill(toothPath);

      // Bright white accent outline for crisp dental shine
      pCtx.shadowBlur = 0;
      pCtx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      pCtx.lineWidth = 1.2;
      pCtx.stroke(toothPath);

      pCtx.restore();
    };

    // Render Sparkle Shape
    const drawSparkleShape = (
      pCtx: CanvasRenderingContext2D,
      x: number,
      y: number,
      size: number,
      rotation: number,
      color: string,
      opacity: number
    ) => {
      pCtx.save();
      pCtx.translate(x, y);
      pCtx.rotate(rotation);
      pCtx.fillStyle = color;
      pCtx.globalAlpha = opacity;

      pCtx.beginPath();
      for (let i = 0; i < 4; i++) {
        pCtx.lineTo(Math.cos((i * Math.PI) / 2) * size, Math.sin((i * Math.PI) / 2) * size);
        pCtx.lineTo(
          Math.cos((i * Math.PI) / 2 + Math.PI / 4) * (size * 0.3),
          Math.sin((i * Math.PI) / 2 + Math.PI / 4) * (size * 0.3)
        );
      }
      pCtx.closePath();
      pCtx.fill();
      pCtx.restore();
    };

    const initParticles = () => {
      particles = [];
      const count = Math.min(Math.floor((width * height) / 8000), 140);

      for (let i = 0; i < count; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const color = dentalColors[Math.floor(Math.random() * dentalColors.length)];
        const opacity = Math.random() * 0.5 + 0.35;

        // Distribute types: 55% floating teeth, 25% sparkles, 20% micro-dots
        const typeRoll = Math.random();
        let pType: 'tooth' | 'sparkle' | 'dot' = 'tooth';
        let size = Math.random() * 14 + 14; // Tooth size 14px - 28px

        if (typeRoll > 0.60 && typeRoll <= 0.85) {
          pType = 'sparkle';
          size = Math.random() * 8 + 6;
        } else if (typeRoll > 0.85) {
          pType = 'dot';
          size = Math.random() * 3 + 1.5;
        }

        particles.push({
          x,
          y,
          baseX: x,
          baseY: y,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          size,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.02,
          density: Math.random() * 20 + 8,
          color,
          type: pType,
          opacity,
        });
      }
    };

    initParticles();

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      // Cursor reactive aura glow gradient
      if (mouse.x > 0 && mouse.y > 0) {
        const gradient = ctx.createRadialGradient(
          mouse.x,
          mouse.y,
          0,
          mouse.x,
          mouse.y,
          mouse.radius
        );
        gradient.addColorStop(0, 'rgba(56, 189, 248, 0.18)');
        gradient.addColorStop(0.5, 'rgba(99, 102, 241, 0.06)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, mouse.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Update and draw floating teeth
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Ambient rotation and slow orbit drift
        p.rotation += p.rotationSpeed;
        p.baseX += p.vx;
        p.baseY += p.vy;

        // Wrap around screen boundaries
        if (p.baseX < -30) p.baseX = width + 30;
        if (p.baseX > width + 30) p.baseX = -30;
        if (p.baseY < -30) p.baseY = height + 30;
        if (p.baseY > height + 30) p.baseY = -30;

        // Calculate distance to user's cursor
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Antigravity force field logic
        if (distance < mouse.radius) {
          const forceDirectionX = dx / distance;
          const forceDirectionY = dy / distance;
          const force = (mouse.radius - distance) / mouse.radius;

          const directionX = forceDirectionX * force * p.density * 2.2;
          const directionY = forceDirectionY * force * p.density * 2.2;

          p.x -= directionX;
          p.y -= directionY;

          // Faster spin when mouse interacts with tooth
          p.rotation += force * 0.08;
        } else {
          // Smooth spring return to floating orbit
          if (p.x !== p.baseX) {
            const dxBase = p.x - p.baseX;
            p.x -= dxBase * 0.05;
          }
          if (p.y !== p.baseY) {
            const dyBase = p.y - p.baseY;
            p.y -= dyBase * 0.05;
          }
        }

        // Render tooth, sparkle, or dot
        if (p.type === 'tooth') {
          drawToothShape(ctx, p.x, p.y, p.size, p.rotation, p.color, p.opacity);
        } else if (p.type === 'sparkle') {
          drawSparkleShape(ctx, p.x, p.y, p.size, p.rotation, p.color, p.opacity);
        } else {
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.opacity;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }

        // Connect nearby teeth with subtle laser links
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const pDistance = Math.sqrt((p.x - p2.x) ** 2 + (p.y - p2.y) ** 2);

          if (pDistance < 110) {
            const opacity = (1 - pDistance / 110) * 0.18;
            ctx.strokeStyle = `rgba(56, 189, 248, ${opacity})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }

        // Connect cursor to nearby teeth
        if (distance < mouse.radius * 0.75) {
          const cursorOpacity = (1 - distance / (mouse.radius * 0.75)) * 0.3;
          ctx.strokeStyle = `rgba(99, 102, 241, ${cursorOpacity})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-0 w-full h-full"
    />
  );
};
