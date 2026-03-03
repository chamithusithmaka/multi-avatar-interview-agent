import { useEffect, useState } from 'react';
import BusinessAvatarImage from '../assets/BusinessAvatar.png';

interface RealisticBusinessAvatarProps {
  isActive?: boolean;
  isSpeaking?: boolean;
}

const RealisticBusinessAvatar = ({ isActive = false, isSpeaking = false }: RealisticBusinessAvatarProps) => {
  const [pulseScale, setPulseScale] = useState(0);

  useEffect(() => {
    let animationId: number;
    let phase = 0;

    const animate = () => {
      phase += isSpeaking ? 0.15 : 0.03;
      setPulseScale(Math.sin(phase) * 0.5 + 0.5);
      animationId = requestAnimationFrame(animate);
    };

    if (isActive || isSpeaking) {
      animate();
    }

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [isActive, isSpeaking]);

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Outer glow rings when speaking */}
      {isSpeaking && (
        <>
          <div
            className="absolute rounded-full border-2 border-emerald-400/30 animate-ping"
            style={{
              width: `${102 + pulseScale * 3}%`,
              height: `${102 + pulseScale * 3}%`,
              animationDuration: '1.5s',
            }}
          />
          <div
            className="absolute rounded-full border-2 border-emerald-400/20"
            style={{
              width: `${105 + pulseScale * 4}%`,
              height: `${105 + pulseScale * 4}%`,
            }}
          />
          <div
            className="absolute rounded-full border-2 border-emerald-400/10"
            style={{
              width: `${108 + pulseScale * 5}%`,
              height: `${108 + pulseScale * 5}%`,
            }}
          />
        </>
      )}

      {/* Active glow effect */}
      {(isActive || isSpeaking) && (
        <div
          className="absolute rounded-full"
          style={{
            width: '102%',
            height: '102%',
            background: 'radial-gradient(circle, rgba(52, 211, 153, 0.3) 0%, rgba(52, 211, 153, 0) 70%)',
            filter: isSpeaking ? 'blur(8px)' : 'blur(5px)',
          }}
        />
      )}

      {/* Avatar image container */}
      <div
        className={`relative rounded-full overflow-hidden transition-transform duration-200 ${
          isSpeaking ? 'scale-102' : ''
        }`}
        style={{
          width: '100%',
          height: '100%',
          boxShadow: isActive || isSpeaking
            ? '0 0 30px rgba(52, 211, 153, 0.5), 0 0 60px rgba(52, 211, 153, 0.3)'
            : 'none',
        }}
      >
        <img
          src={BusinessAvatarImage}
          alt="Business Interviewer"
          className="w-full h-full object-cover pointer-events-none select-none"
          draggable={false}
        />

        {/* Speaking overlay animation */}
        {isSpeaking && (
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: `radial-gradient(circle, rgba(52, 211, 153, ${0.1 + pulseScale * 0.1}) 0%, transparent 70%)`,
            }}
          />
        )}
      </div>
    </div>
  );
};

export default RealisticBusinessAvatar;
