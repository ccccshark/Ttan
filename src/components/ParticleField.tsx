import { useEffect, useRef, useState } from "react";
import type { AudioAnalysis } from "@/hooks/useAudioAnalyser";
import { cn } from "@/lib/utils";

// 极光粒子系统 - 参考 Spotify / Apple Music 风格
// 多层渐变雾气 + 流动光带 + 漂浮微粒 + 节拍脉冲

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  baseAlpha: number;
  life: number;
  maxLife: number;
  hue: number;
  sat: number;
}

interface AuroraBand {
  y: number;
  amplitude: number;
  frequency: number;
  phase: number;
  speed: number;
  hue: number;
  sat: number;
  width: number;
  alpha: number;
}

interface ParticleFieldProps {
  analysis: AudioAnalysis;
  isPlaying: boolean;
  className?: string;
}

const PARTICLE_COUNT = 60;
const AURORA_BANDS = 4;

export default function ParticleField({
  analysis,
  isPlaying,
  className,
}: ParticleFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const auroraRef = useRef<AuroraBand[]>([]);
  const beatPulseRef = useRef(0);
  const timeRef = useRef(0);
  const analysisRef = useRef(analysis);
  const playingRef = useRef(isPlaying);
  const rafRef = useRef<number | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    analysisRef.current = analysis;
    if (analysis.beat) {
      beatPulseRef.current = 1;
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
        initAurora();
        setInitialized(true);
      }
    };

    const initParticles = () => {
      if (particlesRef.current.length > 0) return;
      const arr: Particle[] = [];
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        arr.push(createParticle());
      }
      particlesRef.current = arr;
    };

    const initAurora = () => {
      if (auroraRef.current.length > 0) return;
      const arr: AuroraBand[] = [];
      for (let i = 0; i < AURORA_BANDS; i++) {
        arr.push({
          y: 0.2 + (i / AURORA_BANDS) * 0.5,
          amplitude: 0.06 + Math.random() * 0.08,
          frequency: 1.5 + Math.random() * 2,
          phase: Math.random() * Math.PI * 2,
          speed: 0.008 + Math.random() * 0.006,
          hue: 220 + i * 30 + Math.random() * 20,
          sat: 60 + Math.random() * 30,
          width: 0.08 + Math.random() * 0.12,
          alpha: 0.12 + Math.random() * 0.1,
        });
      }
      auroraRef.current = arr;
    };

    const createParticle = (): Particle => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.0003,
      vy: -0.0001 - Math.random() * 0.0004,
      size: 1 + Math.random() * 2.5,
      baseAlpha: 0.3 + Math.random() * 0.5,
      life: 0,
      maxLife: 200 + Math.random() * 300,
      hue: 200 + Math.random() * 60,
      sat: 60 + Math.random() * 30,
    });

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const render = () => {
      if (width === 0 || height === 0) {
        rafRef.current = requestAnimationFrame(render);
        return;
      }

      const a = analysisRef.current;
      const playing = playingRef.current;
      const dt = playing ? 1 : 0.3;
      timeRef.current += dt * 0.016;

      // === 背景：深色渐变 ===
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      const intensity = 0.5 + a.level * 0.5;
      bgGrad.addColorStop(0, `rgba(6, 8, 20, 1)`);
      bgGrad.addColorStop(0.4, `rgba(10, 14, 35, ${0.95 * intensity})`);
      bgGrad.addColorStop(1, `rgba(4, 5, 15, 1)`);
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // === 极光光带 ===
      const auroras = auroraRef.current;
      for (const band of auroras) {
        band.phase += band.speed * dt;
        const bandAlpha = band.alpha * (0.6 + a.level * 0.6 + beatPulseRef.current * 0.3);
        const bandWidth = band.width * height * (1 + a.bass * 0.4 + beatPulseRef.current * 0.2);

        ctx.save();
        ctx.globalCompositeOperation = "screen";

        // 绘制多条正弦波叠加形成极光带
        ctx.beginPath();
        const steps = 80;
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const x = t * width;
          const wave1 = Math.sin(t * band.frequency * Math.PI + band.phase) * band.amplitude;
          const wave2 = Math.sin(t * band.frequency * 1.7 * Math.PI + band.phase * 1.3) * band.amplitude * 0.5;
          const wave3 = Math.sin(t * band.frequency * 0.5 * Math.PI + band.phase * 0.7) * band.amplitude * 0.3;
          const y = (band.y + wave1 + wave2 + wave3) * height;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }

        // 闭合底部形成填充区域
        for (let i = steps; i >= 0; i--) {
          const t = i / steps;
          const x = t * width;
          const wave1 = Math.sin(t * band.frequency * Math.PI + band.phase) * band.amplitude;
          const wave2 = Math.sin(t * band.frequency * 1.7 * Math.PI + band.phase * 1.3) * band.amplitude * 0.5;
          const wave3 = Math.sin(t * band.frequency * 0.5 * Math.PI + band.phase * 0.7) * band.amplitude * 0.3;
          const y = (band.y + wave1 + wave2 + wave3) * height + bandWidth;
          ctx.lineTo(x, y);
        }
        ctx.closePath();

        const grad = ctx.createLinearGradient(0, band.y * height - bandWidth, 0, band.y * height + bandWidth);
        const h = band.hue + a.treble * 20 + beatPulseRef.current * 10;
        grad.addColorStop(0, `hsla(${h}, ${band.sat}%, 60%, 0)`);
        grad.addColorStop(0.3, `hsla(${h}, ${band.sat}%, 65%, ${bandAlpha * 0.6})`);
        grad.addColorStop(0.5, `hsla(${h}, ${band.sat}%, 70%, ${bandAlpha})`);
        grad.addColorStop(0.7, `hsla(${h}, ${band.sat}%, 65%, ${bandAlpha * 0.6})`);
        grad.addColorStop(1, `hsla(${h}, ${band.sat}%, 60%, 0)`);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();
      }

      // === 中心光晕（跟随节拍） ===
      const glowRadius = Math.min(width, height) * (0.25 + a.bass * 0.2 + beatPulseRef.current * 0.15);
      const glowGrad = ctx.createRadialGradient(
        width / 2, height * 0.42, 0,
        width / 2, height * 0.42, glowRadius
      );
      const glowAlpha = 0.08 + a.bass * 0.15 + beatPulseRef.current * 0.12;
      const glowHue = 240 + a.treble * 30;
      glowGrad.addColorStop(0, `hsla(${glowHue}, 80%, 70%, ${glowAlpha})`);
      glowGrad.addColorStop(0.5, `hsla(${glowHue}, 70%, 50%, ${glowAlpha * 0.3})`);
      glowGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.globalCompositeOperation = "screen";
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = "source-over";

      // === 漂浮微粒 ===
      const speedMul = playing ? 1 + a.level * 2 : 0.3;
      const particles = particlesRef.current;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx * speedMul;
        p.y += p.vy * speedMul;
        p.life += dt;

        if (p.life > p.maxLife || p.y < -0.05 || p.x < -0.05 || p.x > 1.05) {
          particles[i] = createParticle();
          particles[i].y = 1.05;
          continue;
        }

        const lifeRatio = p.life / p.maxLife;
        // 淡入淡出
        const fadeIn = Math.min(1, lifeRatio * 5);
        const fadeOut = Math.max(0, 1 - (lifeRatio - 0.7) / 0.3);
        const alpha = p.baseAlpha * fadeIn * fadeOut * (playing ? (0.5 + a.level * 0.5) : 0.4);

        const px = p.x * width;
        const py = p.y * height;
        const sizeMul = 1 + beatPulseRef.current * 0.5 + a.bass * 0.3;
        const r = p.size * sizeMul;

        // 微粒发光
        const glow = ctx.createRadialGradient(px, py, 0, px, py, r * 3);
        glow.addColorStop(0, `hsla(${p.hue}, ${p.sat}%, 80%, ${alpha})`);
        glow.addColorStop(0.4, `hsla(${p.hue}, ${p.sat}%, 70%, ${alpha * 0.4})`);
        glow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(px, py, r * 3, 0, Math.PI * 2);
        ctx.fill();

        // 微粒核心
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, ${p.sat}%, 90%, ${alpha * 0.8})`;
        ctx.fill();
      }

      // === 节拍脉冲环 ===
      if (beatPulseRef.current > 0.1) {
        const pulseRadius = Math.min(width, height) * (0.3 + (1 - beatPulseRef.current) * 0.2);
        const pulseAlpha = beatPulseRef.current * 0.15;
        ctx.beginPath();
        ctx.arc(width / 2, height * 0.42, pulseRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(260, 80%, 75%, ${pulseAlpha})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // 衰减
      beatPulseRef.current *= 0.9;
      if (beatPulseRef.current < 0.01) beatPulseRef.current = 0;

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
    <>
      {/* Fallback: canvas 初始化前显示静态背景 */}
      {!initialized && (
        <div
          className={cn("absolute inset-0 -z-20 bg-gradient-to-b from-slate-950 via-[#05060f] to-black", className)}
          aria-hidden="true"
        />
      )}
      <canvas
        ref={canvasRef}
        className={cn("absolute inset-0 -z-10 block h-full w-full", className)}
        aria-hidden="true"
      />
    </>
  );
}
