import { useEffect, useRef } from 'react';

const HRAvatar = ({ isActive = false, isSpeaking = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let rotation = 0;
    let pulseScale = 0;

    const animate = () => {
      // Clear with extra padding to prevent clipping
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const baseRadius = 60;
      
      // Add pulsing effect when speaking
      const radius = isSpeaking ? baseRadius + Math.sin(pulseScale) * 8 : baseRadius;

      // Create gradient orb
      const gradient = ctx.createRadialGradient(centerX, centerY, 20, centerX, centerY, radius);
      gradient.addColorStop(0, '#ff6b9d');
      gradient.addColorStop(0.5, '#f06595');
      gradient.addColorStop(1, '#e64980');

      // Draw main orb
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Add glow effect with stronger intensity when speaking
      if (isActive || isSpeaking) {
        ctx.shadowBlur = isSpeaking ? 40 : 20;
        ctx.shadowColor = '#ff6b9d';
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = '#ff6b9d';
        ctx.lineWidth = isSpeaking ? 5 : 3;
        ctx.stroke();
      }

      // Add outer pulse rings when speaking
      if (isSpeaking) {
        ctx.shadowBlur = 0;
        for (let i = 0; i < 3; i++) {
          const ringRadius = radius + 15 + (i * 10) + Math.sin(pulseScale + i) * 5;
          const alpha = 0.3 - (i * 0.1);
          
          ctx.beginPath();
          ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255, 107, 157, ${alpha})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }

      // Add rotating shine effect
      const shineGradient = ctx.createLinearGradient(
        centerX - radius,
        centerY - radius,
        centerX + radius,
        centerY + radius
      );
      shineGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
      shineGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.3)');
      shineGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(rotation);
      ctx.translate(-centerX, -centerY);
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius - 10, 0, Math.PI * 2);
      ctx.fillStyle = shineGradient;
      ctx.fill();
      
      ctx.restore();

      rotation += 0.02;
      pulseScale += isSpeaking ? 0.15 : 0.05;
      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isActive, isSpeaking]);

  return (
    <canvas
      ref={canvasRef}
      width={200}
      height={200}
      className="block pointer-events-none select-none"
      style={{ width: '100%', height: '100%' }}
    />
  );
};

export default HRAvatar;