import { useEffect, useRef } from 'react';

/**
 * VoicePrintSignature
 * Renders a unique, deterministic, and animated voice footprint mandala
 * on an HTML5 Canvas based on a SHA-256 hash.
 */
export default function VoicePrintSignature({ hash, isAuthentic = true, size = 180 }) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    // 1. Derive deterministic parameters from the SHA-256 hash
    // Default fallback values if hash is missing or invalid
    let numPetals = 8;
    let baseHue = 24; // Warm cocoa/brownish orange base
    let saturation = 70;
    let lightness = 35;
    let rotateDirection = 1;
    let baseComplexity = 4;
    let glitchy = false;

    if (hash && hash.length === 64) {
      // Petal count (5 to 12)
      numPetals = 5 + (parseInt(hash.slice(0, 2), 16) % 8);
      // Hue range centered around warm chocolate/orange (0 to 360, but let's map to warm palettes)
      // Warm golds, oranges, cocoas, soft creams
      const hueSeed = parseInt(hash.slice(2, 6), 16) % 360;
      // We want to keep it in the project color family (warm reds, oranges, golds, cocoas)
      // or optionally a unique neon gold/mint for authentic prints.
      const themeSelector = parseInt(hash.slice(6, 8), 16) % 3;
      if (themeSelector === 0) {
        baseHue = 20 + (hueSeed % 25); // Gold/Orange (20-45)
      } else if (themeSelector === 1) {
        baseHue = 345 + (hueSeed % 20); // Warm Rose/Burnt Red (345-365)
      } else {
        baseHue = 150 + (hueSeed % 25); // Safe Mint Green (150-175) for registry contrast
      }

      saturation = 60 + (parseInt(hash.slice(8, 10), 16) % 30); // 60% - 90%
      lightness = 30 + (parseInt(hash.slice(10, 12), 16) % 20); // 30% - 50%
      rotateDirection = parseInt(hash.slice(12, 14), 16) % 2 === 0 ? 1 : -1;
      baseComplexity = 3 + (parseInt(hash.slice(14, 16), 16) % 5); // 3 to 7 layers
    }

    if (!isAuthentic) {
      glitchy = true;
      baseHue = 0; // Pure alert red for tampered
      saturation = 90;
      lightness = 45;
    }

    let time = 0;

    const render = () => {
      time += 0.015;
      ctx.clearRect(0, 0, size, size);

      const cx = size / 2;
      const cy = size / 2;
      const maxR = size * 0.42;

      // 2. Draw background rings
      ctx.lineWidth = 1;
      ctx.strokeStyle = glitchy ? 'rgba(180, 35, 24, 0.08)' : 'rgba(42, 22, 13, 0.05)';
      ctx.beginPath();
      ctx.arc(cx, cy, maxR * 0.95, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, maxR * 0.6, 0, Math.PI * 2);
      ctx.stroke();

      if (glitchy) {
        // Draw glitched chaotic lines/static for tampered files
        ctx.strokeStyle = 'rgba(180, 35, 24, 0.4)';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 5; i++) {
          const yOff = Math.sin(time * 15 + i) * (size * 0.35);
          const x1 = cx - maxR + Math.random() * 20;
          const x2 = cx + maxR - Math.random() * 20;
          ctx.beginPath();
          ctx.moveTo(x1, cy + yOff);
          ctx.lineTo(x2, cy + yOff + (Math.random() - 0.5) * 10);
          ctx.stroke();
        }

        // Draw alert center cross
        ctx.strokeStyle = 'rgba(180, 35, 24, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx - 15, cy - 15);
        ctx.lineTo(cx + 15, cy + 15);
        ctx.moveTo(cx + 15, cy - 15);
        ctx.lineTo(cx - 15, cy + 15);
        ctx.stroke();

        ctx.shadowBlur = 0;
      } else {
        // Draw unique deterministic mandala signature
        ctx.shadowBlur = 5;
        ctx.shadowColor = `hsla(${baseHue}, ${saturation}%, ${lightness}%, 0.3)`;

        for (let layer = 0; layer < baseComplexity; layer++) {
          const layerScale = 0.3 + (layer / baseComplexity) * 0.65;
          const layerSpeed = (0.2 + (layer * 0.15)) * rotateDirection;
          const layerPhase = time * layerSpeed;
          const layerPoints = 120;

          ctx.beginPath();
          ctx.lineWidth = 1.2 - (layer * 0.15);
          
          // Gradient hue shift per layer
          const layerHue = (baseHue + (layer * 12)) % 360;
          ctx.strokeStyle = `hsla(${layerHue}, ${saturation}%, ${lightness}%, ${0.95 - (layer * 0.12)})`;

          for (let i = 0; i <= layerPoints; i++) {
            const theta = (i / layerPoints) * Math.PI * 2;
            const thetaRot = theta + layerPhase;

            // Determine local radius using harmonic frequencies from hash
            const baseRad = maxR * layerScale;
            // Harmonic wave formula
            const harm1 = Math.sin(theta * numPetals) * (maxR * 0.08);
            const harm2 = Math.cos(theta * 3 + layerPhase * 2) * (maxR * 0.03);
            const breathe = Math.sin(time + layer) * (maxR * 0.02);

            const r = baseRad + harm1 + harm2 + breathe;

            const x = cx + Math.cos(thetaRot) * r;
            const y = cy + Math.sin(thetaRot) * r;

            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }
          ctx.closePath();
          ctx.stroke();
        }

        // Draw core glowing biometric dot
        ctx.shadowBlur = 10;
        ctx.shadowColor = `hsla(${baseHue}, ${saturation}%, ${lightness}%, 0.6)`;
        ctx.fillStyle = `hsla(${baseHue}, ${saturation}%, ${lightness}%, 0.85)`;
        ctx.beginPath();
        const pulseCore = 4.5 + Math.sin(time * 3) * 1.5;
        ctx.arc(cx, cy, pulseCore, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.shadowBlur = 0;
      }

      animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [hash, isAuthentic, size]);

  return (
    <div 
      className="relative flex items-center justify-center bg-background/25 border border-border/10 rounded-xl overflow-hidden shadow-inner"
      style={{ width: size + 24, height: size + 24 }}
    >
      {/* Decorative layout ticks in corners */}
      <div className="absolute top-1.5 left-1.5 w-1.5 h-1.5 border-t border-l border-border/25" />
      <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 border-t border-r border-border/25" />
      <div className="absolute bottom-1.5 left-1.5 w-1.5 h-1.5 border-b border-l border-border/25" />
      <div className="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 border-b border-r border-border/25" />
      
      <canvas ref={canvasRef} className="block" />
    </div>
  );
}
