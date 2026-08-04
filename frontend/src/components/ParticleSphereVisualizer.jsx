import { useEffect, useRef } from 'react';

export default function ParticleSphereVisualizer({
  analyserNode,
  isRecording = false,
  isPlaying = false,
  isLoading = false,
  onClick,
  color = '#5A301E', // Deep cocoa theme color (website accent)
  size = 300
}) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const particlesRef = useRef([]);

  // Initialize particles once
  useEffect(() => {
    const numParticles = 180;
    const particles = [];

    for (let i = 0; i < numParticles; i++) {
      // Fibonacci lattice for even sphere distribution
      const phi = Math.acos(-1 + (2 * i) / numParticles);
      const theta = Math.sqrt(numParticles * Math.PI) * phi;

      const x = Math.sin(phi) * Math.cos(theta);
      const y = Math.sin(phi) * Math.sin(theta);
      const z = Math.cos(phi);

      particles.push({
        x, y, z,
        ox: x, oy: y, oz: z,
        disp: 1.0,
        speed: 0.02 + Math.random() * 0.02,
        phase: Math.random() * Math.PI * 2
      });
    }

    particlesRef.current = particles;
  }, []);

  // Visualizer loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let angleX = 0.005;
    let angleY = 0.008;
    let time = 0;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    const render = () => {
      time += 1;
      ctx.clearRect(0, 0, size, size);

      const centerX = size / 2;
      const centerY = size / 2;
      const baseRadius = size * 0.28;

      // 1. Retrieve frequency data if available
      let frequencyData = null;
      let avgVolume = 0;

      if (analyserNode) {
        const bufferLength = analyserNode.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserNode.getByteFrequencyData(dataArray);
        frequencyData = dataArray;

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        avgVolume = sum / bufferLength;
      }

      // Dynamic rotation rates based on states
      let rx = 0.002;
      let ry = 0.004;

      if (isLoading) {
        // Fast spin when loading/thinking
        rx = 0.03;
        ry = 0.05;
      } else if (isRecording || isPlaying) {
        // React to volume
        const speedBoost = avgVolume ? (avgVolume / 255) * 0.05 : 0;
        rx = 0.005 + speedBoost;
        ry = 0.008 + speedBoost;
      }

      angleX += rx;
      angleY += ry;

      const cosX = Math.cos(rx);
      const sinX = Math.sin(rx);
      const cosY = Math.cos(ry);
      const sinY = Math.sin(ry);

      // 2. Displace & Rotate Particles
      const projected = [];
      const particles = particlesRef.current;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Apply rotation on original base coordinates to avoid drift
        // Rotate Y
        let x1 = p.ox * cosY - p.oz * sinY;
        let z1 = p.ox * sinY + p.oz * cosY;

        // Rotate X
        let y2 = p.oy * cosX - z1 * sinX;
        let z2 = p.oy * sinX + z1 * cosX;

        // Save rotated base coordinates
        p.ox = x1;
        p.oy = y2;
        p.oz = z2;

        // Calculate target displacement based on audio frequency
        let targetDisp = 1.0;
        if (isLoading) {
          // Pulse sphere rhythmically when loading
          targetDisp = 1.0 + Math.sin(time * 0.15 + i * 0.1) * 0.15;
        } else if (frequencyData) {
          const bin = Math.floor((i / particles.length) * frequencyData.length);
          const val = frequencyData[bin] / 255.0; // 0 to 1
          targetDisp = 1.0 + val * 0.65; // up to 65% expansion
        } else if (isRecording || isPlaying) {
          // Simulation fallback if analyser exists but has no live data yet
          targetDisp = 1.0 + Math.sin(time * 0.05 + i * 0.2) * 0.08;
        } else {
          // Idle breathing
          targetDisp = 1.0 + Math.sin(time * 0.02 + i * 0.05) * 0.04;
        }

        // Smooth interpolation for fluid movement
        p.disp += (targetDisp - p.disp) * 0.25;

        // Scale by radius and displacement
        const radius = baseRadius * p.disp;
        const x = p.ox * radius;
        const y = p.oy * radius;
        const z = p.oz * radius;

        // Projection
        const perspective = size * 0.8;
        const scale = perspective / (perspective + z);
        const sx = centerX + x * scale;
        const sy = centerY + y * scale;

        projected.push({
          x: sx,
          y: sy,
          z: z,
          p: p,
          index: i
        });
      }

      // 3. Painter's Algorithm (Sort by Z depth - draw back to front)
      projected.sort((a, b) => b.z - a.z);

      // 4. Draw Constellation/Links
      // Draw lines between points that are close to each other in 3D
      ctx.lineWidth = 0.5;
      ctx.strokeStyle = `rgba(${hexToRgb(color)}, 0.08)`;

      for (let i = 0; i < projected.length; i++) {
        const pA = projected[i];
        let maxLinks = 2; // Limit link drawing to save performance
        let linksDraw = 0;

        for (let j = i + 1; j < projected.length && linksDraw < maxLinks; j++) {
          const pB = projected[j];
          
          // Calculate distance in 3D space
          const dx = pA.p.ox - pB.p.ox;
          const dy = pA.p.oy - pB.p.oy;
          const dz = pA.p.oz - pB.p.oz;
          const dist3D = Math.sqrt(dx * dx + dy * dy + dz * dz);

          // If particles are close on the sphere structure
          if (dist3D < 0.32) {
            ctx.beginPath();
            ctx.moveTo(pA.x, pA.y);
            ctx.lineTo(pB.x, pB.y);
            ctx.stroke();
            linksDraw++;
          }
        }
      }

      // 5. Draw Particles
      for (let i = 0; i < projected.length; i++) {
        const p = projected[i];
        
        // Depth mapping: front is opaque/large, back is transparent/small
        // z ranges roughly from -baseRadius to +baseRadius
        const zNorm = (p.z + baseRadius) / (2 * baseRadius); // 0 to 1
        const opacity = 0.15 + (1 - zNorm) * 0.75; // 0.15 to 0.90
        const radiusSize = 1.0 + (1 - zNorm) * 2.2; // 1.0 to 3.2

        // Glow effects on front particles
        if (zNorm < 0.35 && (isRecording || isPlaying || isLoading)) {
          ctx.shadowBlur = 4;
          ctx.shadowColor = color;
        } else {
          ctx.shadowBlur = 0;
        }

        ctx.fillStyle = `rgba(${hexToRgb(color)}, ${opacity})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radiusSize, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      // 6. Center core glow
      if (isRecording || isPlaying || isLoading) {
        const pulse = 1.0 + Math.sin(time * 0.1) * 0.05;
        const radialGrad = ctx.createRadialGradient(
          centerX, centerY, 0,
          centerX, centerY, baseRadius * 0.5 * pulse
        );
        radialGrad.addColorStop(0, `rgba(${hexToRgb(color)}, 0.15)`);
        radialGrad.addColorStop(0.5, `rgba(${hexToRgb(color)}, 0.05)`);
        radialGrad.addColorStop(1, 'rgba(0,0,0,0)');
        
        ctx.fillStyle = radialGrad;
        ctx.beginPath();
        ctx.arc(centerX, centerY, baseRadius * 0.5 * pulse, 0, Math.PI * 2);
        ctx.fill();
      }

      animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [analyserNode, isRecording, isPlaying, isLoading, size, color]);

  // Helper to convert hex to RGB CSV
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return '16, 185, 129';
    return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
  };

  return (
    <div
      onClick={onClick}
      className={`relative inline-flex items-center justify-center rounded-full overflow-hidden ${
        onClick ? 'cursor-pointer hover:scale-105 active:scale-95 transition-all' : ''
      }`}
      style={{ width: size, height: size }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 block" />
    </div>
  );
}
