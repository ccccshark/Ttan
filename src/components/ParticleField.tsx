import { useEffect, useRef, useState } from "react";
import type { AudioAnalysis } from "@/hooks/useAudioAnalyser";

interface Particle {
  x: number;
  y: number;
  z: number;
  size: number;
  baseAlpha: number;
  twinkle: number;
  twinkleSpeed: number;
  hue: number;
}

interface ShootingStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

interface ParticleFieldProps {
  analysis: AudioAnalysis;
  isPlaying: boolean;
  className?: string;
}

const STAR_COUNT = 220;

function spawnShootingStar(arr: ShootingStar[]) {
  const fromLeft = Math.random() > 0.5;
  const startX = fromLeft ? -0.1 : 1.1;
  const startY = Math.random() * 0.5;
  const speed = 0.012 + Math.random() * 0.01;
  const angle = Math.PI / 6 + Math.random() * 0.2;
  arr.push({
    x: startX,
    y: startY,
    vx: Math.cos(angle) * speed * (fromLeft ? 1 : -1),
    vy: Math.sin(angle) * speed,
    life: 0,
    maxLife: 60 + Math.random() * 30,
    size: 1.5 + Math.random() * 1,
  });
  if (arr.length > 5) arr.shift();
}

export default function ParticleField({
  analysis,
  isPlaying,
  className,
}: ParticleFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const shootingRef = useRef<ShootingStar[]>([]);
  const beatPulseRef = useRef(0);
  const flashRef = useRef(0);
  const analysisRef = useRef(analysis);
  const playingRef = useRef(isPlaying);
  const rafRef = useRef<number | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    analysisRef.current = analysis;
    if (analysis.beat) {
      beatPulseRef.current = 1;
      if (analysis.bass > 0.55) {
        flashRef.current = Math.min(0.25, analysis.bass * 0.35);
      }
      if (Math.random() < 0.18) {
        spawnShootingStar(shootingRef.current);
      }
    }
  }, [analysis]);

  useEffect(() => {
    playingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      if (width > 0 && height > 0) {
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        initParticles();
        setInitialized(true);
      }
    };

    const initParticles = () => {
      if (particlesRef.current.length > 0) return;
      const arr: Particle[] = [];
      for (let i = 0; i < STAR_COUNT; i++) {
        arr.push({
          x: Math.random(),
          y: Math.random(),
          z: Math.random() * 0.9 + 0.1,
          size: Math.random() * 1.8 + 0.4,
          baseAlpha: Math.random() * 0.6 + 0.3,
          twinkle: Math.random() * Math.PI * 2,
          twinkleSpeed: Math.random() * 0.04 + 0.01,
          hue: 200 + Math.random() * 40,
        });
      }
      particlesRef.current = arr;
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const render = () => {
      if (width === 0 || height === 0) {
        rafRef.current = requestAnimationFrame(render);
        return;
      }

      const a = analysisRef.current;
      const playing = playingRef.current;

      const bgGrad = ctx.createRadialGradient(
        width / 2,
        height * 0.4,
        0,
        width / 2,
        height * 0.5,
        Math.max(width, height) * 0.7
      );
      const intensity = 0.6 + a.level * 0.4;
      bgGrad.addColorStop(0, `rgba(20, 30, 70, ${0.85 * intensity})`);
      bgGrad.addColorStop(0.4, `rgba(8, 12, 35, ${0.92})`);
      bgGrad.addColorStop(1, `rgba(2, 3, 12, 1)`);
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      const nebulaRadius =
        Math.min(width, height) * (0.35 + a.bass * 0.25 + beatPulseRef.current * 0.15);
      const nebulaGrad = ctx.createRadialGradient(
        width / 2,
        height * 0.45,
        0,
        width / 2,
        height * 0.45,
        nebulaRadius
      );
      const nebulaAlpha = 0.18 + a.bass * 0.25 + beatPulseRef.current * 0.2;
      nebulaGrad.addColorStop(0, `rgba(80, 130, 255, ${nebulaAlpha})`);
      nebulaGrad.addColorStop(0.5, `rgba(60, 90, 200, ${nebulaAlpha * 0.4})`);
      nebulaGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = nebulaGrad;
      ctx.fillRect(0, 0, width, height);

      const speedMul = playing ? 1 + a.level * 2.5 : 0.25;
      const particles = particlesRef.current;
      for (const p of particles) {
        p.x += 0.00006 * p.z * speedMul;
        p.y += 0.00002 * p.z * speedMul;
        if (p.x > 1.05) p.x = -0.05;
        if (p.x < -0.05) p.x = 1.05;
        if (p.y > 1.05) p.y = -0.05;
        if (p.y < -0.05) p.y = 1.05;

        p.twinkle += p.twinkleSpeed;

        const px = p.x * width;
        const py = p.y * height;
        const sizeMul = 1 + p.z * 1.5 + beatPulseRef.current * 0.8;
        const r = p.size * sizeMul;

        const twinkle = 0.6 + Math.sin(p.twinkle) * 0.4;
        const alpha =
          p.baseAlpha * twinkle * (0.5 + p.z * 0.5) * (playing ? (0.6 + a.level * 0.5) : 0.8);

        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 90%, ${70 + a.treble * 20}%, ${alpha})`;
        ctx.fill();

        if (p.z > 0.7) {
          const glow = ctx.createRadialGradient(px, py, 0, px, py, r * 4);
          glow.addColorStop(0, `hsla(${p.hue}, 90%, 80%, ${alpha * 0.5})`);
          glow.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(px, py, r * 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      const shooting = shootingRef.current;
      for (let i = shooting.length - 1; i >= 0; i--) {
        const s = shooting[i];
        s.x += s.vx;
        s.y += s.vy;
        s.life += 1;
        if (s.life > s.maxLife || s.x > 1.2 || s.x < -0.2 || s.y > 1.2) {
          shooting.splice(i, 1);
          continue;
        }
        const lifeRatio = s.life / s.maxLife;
        const alpha = Math.sin(lifeRatio * Math.PI);
        const sx = s.x * width;
        const sy = s.y * height;
        const tailLen = 80;
        const tailX = sx - s.vx * width * tailLen;
        const tailY = sy - s.vy * height * tailLen;

        const tailGrad = ctx.createLinearGradient(tailX, tailY, sx, sy);
        tailGrad.addColorStop(0, "rgba(180, 220, 255, 0)");
        tailGrad.addColorStop(1, `rgba(220, 240, 255, ${alpha})`);
        ctx.strokeStyle = tailGrad;
        ctx.lineWidth = s.size;
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(sx, sy);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(sx, sy, s.size * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fill();
      }

      beatPulseRef.current *= 0.88;
      if (beatPulseRef.current < 0.01) beatPulseRef.current = 0;

      if (flashRef.current > 0.01) {
        ctx.fillStyle = `rgba(200, 220, 255, ${flashRef.current})`;
        ctx.fillRect(0, 0, width, height);
        flashRef.current *= 0.82;
      }

      if (playing && a.level < 0.05) {
        ctx.fillStyle = "rgba(10, 15, 40, 0.06)";
        ctx.fillRect(0, 0, width, height);
      }

      rafRef.current = requestAnimationFrame(render);
    };

    resize();
    rafRef.current = requestAnimationFrame(render);

    return () => {
      ro.disconnect();
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ display: "block", width: "100%", height: "100%", position: "absolute", inset: 0 }}
      aria-hidden="true"
    />
  );
}
