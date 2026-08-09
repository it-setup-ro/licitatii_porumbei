"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

/**
 * Animatia de castig: un stol de porumbei isi ia zborul prin pagina
 * (cerinta obligatorie din brief §6.4). Canvas full-screen, ~6 secunde.
 * - prefers-reduced-motion: fara animatie, doar mesajul static.
 * - sunet (falfait de aripi, sintetizat WebAudio): doar daca adminul l-a activat.
 */

type Bird = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  phase: number;
  flapSpeed: number;
  color: string;
};

const COLORS = ["#1B1B1B", "#2E6E9E", "#E8720C", "#C0341D", "#3a3a3a"];

export default function WinCelebration({
  soundEnabled,
  orderHref,
  onDone,
}: {
  soundEnabled: boolean;
  orderHref: string | null;
  onDone?: () => void;
}) {
  const t = useTranslations("celebrate");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
  }, []);

  // Sunet de falfait: rafale scurte de zgomot filtrat (nu necesita fisiere audio)
  useEffect(() => {
    if (reduced || !soundEnabled) return;
    let ctx: AudioContext | null = null;
    try {
      ctx = new AudioContext();
      const flaps = 10;
      for (let i = 0; i < flaps; i++) {
        const dur = 0.08;
        const start = ctx.currentTime + i * 0.22 + Math.random() * 0.05;
        const buffer = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let j = 0; j < data.length; j++) {
          const env = Math.sin((j / data.length) * Math.PI);
          data[j] = (Math.random() * 2 - 1) * env * 0.35;
        }
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.value = 300 + Math.random() * 250;
        const gain = ctx.createGain();
        gain.gain.value = 0.4;
        src.connect(filter).connect(gain).connect(ctx.destination);
        src.start(start);
      }
    } catch {
      // audio indisponibil — ignoram
    }
    return () => {
      ctx?.close().catch(() => {});
    };
  }, [reduced, soundEnabled]);

  useEffect(() => {
    if (reduced) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const birds: Bird[] = Array.from({ length: 26 }, () => ({
      x: w * 0.2 + Math.random() * w * 0.6,
      y: h + 40 + Math.random() * 200,
      vx: (Math.random() - 0.35) * 3,
      vy: -(3.4 + Math.random() * 3.2),
      size: 10 + Math.random() * 16,
      phase: Math.random() * Math.PI * 2,
      flapSpeed: 0.28 + Math.random() * 0.18,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }));

    let frame = 0;
    let raf = 0;
    const maxFrames = 6 * 60;

    const drawBird = (b: Bird, tick: number) => {
      const flap = Math.sin(tick * b.flapSpeed + b.phase);
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(Math.atan2(b.vy, b.vx) * 0.15 + 0.1);
      ctx.fillStyle = b.color;
      // corp
      ctx.beginPath();
      ctx.ellipse(0, 0, b.size * 0.55, b.size * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();
      // aripi (falfait)
      const wingY = -flap * b.size * 0.9;
      ctx.beginPath();
      ctx.moveTo(-b.size * 0.1, 0);
      ctx.quadraticCurveTo(-b.size * 0.9, wingY, -b.size * 1.4, wingY * 0.6);
      ctx.quadraticCurveTo(-b.size * 0.7, wingY * 0.25 + b.size * 0.1, -b.size * 0.1, b.size * 0.12);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(b.size * 0.1, 0);
      ctx.quadraticCurveTo(b.size * 0.9, wingY, b.size * 1.4, wingY * 0.6);
      ctx.quadraticCurveTo(b.size * 0.7, wingY * 0.25 + b.size * 0.1, b.size * 0.1, b.size * 0.12);
      ctx.fill();
      ctx.restore();
    };

    const loop = () => {
      frame++;
      ctx.clearRect(0, 0, w, h);
      for (const b of birds) {
        b.x += b.vx;
        b.y += b.vy;
        b.vy -= 0.012; // accelereaza usor in sus
        b.vx += Math.sin(frame * 0.02 + b.phase) * 0.03;
        drawBird(b, frame);
      }
      if (frame < maxFrames && birds.some((b) => b.y > -60)) {
        raf = requestAnimationFrame(loop);
      } else {
        onDone?.();
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [reduced, onDone]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      data-testid="win-celebration"
      role="status"
    >
      <div className="absolute inset-0 bg-ink/40" />
      {!reduced && (
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />
      )}
      <div className="relative z-10 mx-4 rounded-3xl bg-ivory p-8 text-center shadow-2xl">
        <div className="wing-gradient mx-auto mb-4 h-1.5 w-24 rounded-full" />
        <h2 className="font-display text-3xl font-bold">{t("title")}</h2>
        <p className="mt-1 text-ink/70">{t("subtitle")}</p>
        {orderHref && (
          <a
            href={orderHref}
            data-testid="celebration-cta"
            className="mt-5 inline-block rounded-full bg-ink px-6 py-2.5 font-semibold text-ivory hover:bg-ink/85"
          >
            {t("cta")}
          </a>
        )}
      </div>
    </div>
  );
}
