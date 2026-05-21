import { useEffect, useRef } from 'react';

const NODES: { lat: number; lng: number; color: string }[] = [
  { lat: 19.4,  lng: -99.1,  color: '#a78bfa' }, // Mexico City
  { lat: -23.5, lng: -46.6,  color: '#818cf8' }, // São Paulo
  { lat: -34.6, lng: -58.4,  color: '#c084fc' }, // Buenos Aires
  { lat: 4.7,   lng: -74.1,  color: '#a78bfa' }, // Bogotá
  { lat: -12.0, lng: -77.0,  color: '#818cf8' }, // Lima
  { lat: 10.5,  lng: -66.9,  color: '#c084fc' }, // Caracas
  { lat: 37.8,  lng: -122.4, color: '#f0abfc' }, // San Francisco
  { lat: 31.2,  lng: 121.5,  color: '#f0abfc' }, // Shanghai
  { lat: 51.5,  lng: -0.1,   color: '#93c5fd' }, // London
  { lat: 35.7,  lng: 139.7,  color: '#93c5fd' }, // Tokyo
  { lat: -33.9, lng: 18.4,   color: '#6ee7b7' }, // Cape Town
  { lat: 1.3,   lng: 103.8,  color: '#fde68a' }, // Singapore
];

const ARCS: [number, number, number][] = [
  [6, 0, 1.0], [6, 1, 0.8], [6, 2, 1.2], [6, 3, 0.9], [6, 4, 1.1],
  [7, 0, 0.7], [7, 1, 0.9], [7, 3, 1.0], [7, 11, 0.8],
  [0, 1, 1.3], [1, 2, 0.9], [2, 4, 1.0], [3, 4, 0.8],
  [8, 6, 0.6], [9, 7, 0.7], [10, 1, 0.8], [11, 3, 0.9],
  [6, 8, 1.1], [7, 9, 0.9],
];

function latLngToXYZ(lat: number, lng: number, r: number): [number, number, number] {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return [
    -r * Math.sin(phi) * Math.cos(theta),
     r * Math.cos(phi),
     r * Math.sin(phi) * Math.sin(theta),
  ];
}

function projectPoint(x: number, y: number, z: number, rotY: number, cx: number, cy: number) {
  const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
  const rx = cosY * x + sinY * z;
  const ry = y;
  const rz = -sinY * x + cosY * z;
  const fov = 700;
  const p = fov / (fov + rz);
  return { sx: cx + rx * p, sy: cy + ry * p, z: rz, visible: rz > -240, depth: (rz + 300) / 600 };
}

export default function AnimatedGlobe({ size = 380 }: { size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotRef = useRef(0.4);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);

    const cx = size / 2, cy = size / 2;
    const R = size * 0.38;

    // Each arc has 3 staggered particles
    const arcState = ARCS.map(() => ({
      particles: Array.from({ length: 3 }, (_, i) => ({ t: i / 3 }))
    }));

    const pulsePhase = NODES.map((_, i) => i * 0.7);

    const draw = (time: number) => {
      ctx.clearRect(0, 0, size, size);
      const rot = rotRef.current;
      const t = time / 1000;

      // Outer ambient glow
      const outerGlow = ctx.createRadialGradient(cx, cy, R * 0.5, cx, cy, R * 1.45);
      outerGlow.addColorStop(0, 'rgba(109,40,217,0.04)');
      outerGlow.addColorStop(0.5, 'rgba(139,92,246,0.10)');
      outerGlow.addColorStop(1, 'rgba(139,92,246,0)');
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.45, 0, Math.PI * 2);
      ctx.fillStyle = outerGlow;
      ctx.fill();

      // Sphere base
      const sphereGrad = ctx.createRadialGradient(cx - R * 0.28, cy - R * 0.28, R * 0.04, cx + R * 0.1, cy + R * 0.1, R * 1.05);
      sphereGrad.addColorStop(0, 'rgba(245,243,255,0.58)');
      sphereGrad.addColorStop(0.35, 'rgba(221,214,254,0.25)');
      sphereGrad.addColorStop(0.75, 'rgba(167,139,250,0.14)');
      sphereGrad.addColorStop(1, 'rgba(109,40,217,0.07)');
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = sphereGrad;
      ctx.fill();

      // === GRID LINES ===
      for (let lat = -75; lat <= 75; lat += 15) {
        const y3d = R * Math.sin(lat * Math.PI / 180);
        const r2d = R * Math.cos(lat * Math.PI / 180);
        if (r2d < 1) continue;
        const isEquator = lat === 0;
        ctx.beginPath();
        let first = true;
        for (let lng = -180; lng <= 181; lng += 3) {
          const x3d = r2d * Math.cos(lng * Math.PI / 180);
          const z3d = r2d * Math.sin(lng * Math.PI / 180);
          const p = projectPoint(x3d, y3d, z3d, rot, cx, cy);
          const alpha = Math.max(0, p.depth) * (isEquator ? 0.60 : 0.30);
          if (alpha < 0.01) { first = true; continue; }
          ctx.strokeStyle = isEquator
            ? `rgba(139,92,246,${alpha.toFixed(3)})`
            : `rgba(167,139,250,${alpha.toFixed(3)})`;
          ctx.lineWidth = isEquator ? 1.1 : 0.55;
          if (first) { ctx.moveTo(p.sx, p.sy); first = false; }
          else ctx.lineTo(p.sx, p.sy);
        }
        ctx.stroke();
      }

      for (let lng = 0; lng < 360; lng += 15) {
        const isMeridian = lng === 0 || lng === 180;
        ctx.beginPath();
        let first = true;
        for (let lat = -90; lat <= 90; lat += 3) {
          const [x3d, y3d, z3d] = latLngToXYZ(lat, lng - 180, R);
          const p = projectPoint(x3d, y3d, z3d, rot, cx, cy);
          const alpha = Math.max(0, p.depth) * (isMeridian ? 0.48 : 0.24);
          if (alpha < 0.01) { first = true; continue; }
          ctx.strokeStyle = `rgba(167,139,250,${alpha.toFixed(3)})`;
          ctx.lineWidth = isMeridian ? 0.9 : 0.48;
          if (first) { ctx.moveTo(p.sx, p.sy); first = false; }
          else ctx.lineTo(p.sx, p.sy);
        }
        ctx.stroke();
      }

      // === TILTED ORBIT RING ===
      const tilt = 23 * Math.PI / 180;
      ctx.beginPath();
      let ringFirst = true;
      for (let a = 0; a <= 361; a += 2) {
        const rad = a * Math.PI / 180;
        const ox = R * 1.10 * Math.cos(rad);
        const oy = R * 1.10 * Math.sin(rad) * Math.sin(tilt);
        const oz = R * 1.10 * Math.sin(rad) * Math.cos(tilt);
        const p = projectPoint(ox, oy, oz, rot, cx, cy);
        const alpha = Math.max(0, p.depth) * 0.55;
        ctx.strokeStyle = `rgba(196,181,253,${alpha.toFixed(3)})`;
        ctx.lineWidth = 1.3;
        if (ringFirst) { ctx.moveTo(p.sx, p.sy); ringFirst = false; }
        else ctx.lineTo(p.sx, p.sy);
      }
      ctx.stroke();

      // Orbit ring traveling dots
      for (let i = 0; i < 4; i++) {
        const rad = ((t * 22 + i * 90) % 360) * Math.PI / 180;
        const ox = R * 1.10 * Math.cos(rad);
        const oy = R * 1.10 * Math.sin(rad) * Math.sin(tilt);
        const oz = R * 1.10 * Math.sin(rad) * Math.cos(tilt);
        const p = projectPoint(ox, oy, oz, rot, cx, cy);
        if (!p.visible) continue;
        const d = Math.max(0, p.depth);
        [5, 2.5, 1.2].forEach((r, ri) => {
          ctx.beginPath();
          ctx.arc(p.sx, p.sy, r * d, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(216,180,254,${(d * [0.12, 0.3, 0.9][ri]).toFixed(3)})`;
          ctx.fill();
        });
      }

      // === ARCS ===
      ARCS.forEach(([from, to, speed], i) => {
        const nA = NODES[from], nB = NODES[to];
        const [x0, y0, z0] = latLngToXYZ(nA.lat, nA.lng, R);
        const [x1, y1, z1] = latLngToXYZ(nB.lat, nB.lng, R);

        const steps = 48;
        const pts: { sx: number; sy: number; z: number; visible: boolean; depth: number }[] = [];
        for (let s = 0; s <= steps; s++) {
          const st = s / steps;
          const lift = 1 + 0.38 * Math.sin(Math.PI * st);
          pts.push(projectPoint(
            (x0 + (x1 - x0) * st) * lift,
            (y0 + (y1 - y0) * st) * lift,
            (z0 + (z1 - z0) * st) * lift,
            rot, cx, cy
          ));
        }

        // Faint base path
        ctx.beginPath();
        let begun = false;
        for (let s = 0; s <= steps; s++) {
          const p = pts[s];
          if (!p.visible) { begun = false; continue; }
          ctx.strokeStyle = `rgba(167,139,250,${(p.depth * 0.16).toFixed(3)})`;
          ctx.lineWidth = 0.7;
          if (!begun) { ctx.moveTo(p.sx, p.sy); begun = true; }
          else ctx.lineTo(p.sx, p.sy);
        }
        ctx.stroke();

        // Staggered particles
        arcState[i].particles.forEach(particle => {
          particle.t = (particle.t + 0.004 * speed) % 1;
          const headIdx = Math.round(particle.t * steps);
          const trailLen = 14;

          for (let s = Math.max(0, headIdx - trailLen); s <= headIdx; s++) {
            if (s >= pts.length) break;
            const p = pts[s];
            if (!p.visible) continue;
            const localT = (s - (headIdx - trailLen)) / trailLen;
            const alpha = localT * p.depth * 0.92;
            const next = pts[Math.min(s + 1, steps)];
            if (!next?.visible) continue;
            ctx.beginPath();
            ctx.moveTo(p.sx, p.sy);
            ctx.lineTo(next.sx, next.sy);
            ctx.strokeStyle = `rgba(196,181,253,${Math.max(0, alpha).toFixed(3)})`;
            ctx.lineWidth = 1.2 + localT * 1.2;
            ctx.stroke();
          }

          // Glowing head
          const head = pts[Math.min(headIdx, steps)];
          if (head?.visible) {
            const d = Math.max(0, head.depth);
            [7, 3.5, 1.8].forEach((r, ri) => {
              ctx.beginPath();
              ctx.arc(head.sx, head.sy, r * d, 0, Math.PI * 2);
              ctx.fillStyle = `rgba(216,180,254,${(d * [0.12, 0.32, 0.95][ri]).toFixed(3)})`;
              ctx.fill();
            });
          }
        });
      });

      // === NODES ===
      NODES.forEach(({ lat, lng, color }, idx) => {
        const [x3d, y3d, z3d] = latLngToXYZ(lat, lng, R);
        const p = projectPoint(x3d, y3d, z3d, rot, cx, cy);
        if (!p.visible) return;
        const d = Math.max(0, p.depth);

        pulsePhase[idx] += 0.04;
        const pulse = (Math.sin(pulsePhase[idx]) * 0.5 + 0.5);

        // Outer pulse ring
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, (6 + pulse * 9) * d, 0, Math.PI * 2);
        ctx.strokeStyle = `${color}${Math.round(d * 0.28 * 255).toString(16).padStart(2, '0')}`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Middle ring
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, (4 + pulse * 3) * d, 0, Math.PI * 2);
        ctx.strokeStyle = `${color}${Math.round(d * 0.55 * 255).toString(16).padStart(2, '0')}`;
        ctx.lineWidth = 0.9;
        ctx.stroke();

        // Glow core
        const ng = ctx.createRadialGradient(p.sx, p.sy, 0, p.sx, p.sy, 5 * d);
        ng.addColorStop(0, `rgba(255,255,255,${(d * 0.95).toFixed(2)})`);
        ng.addColorStop(0.35, `${color}${Math.round(d * 0.88 * 255).toString(16).padStart(2, '0')}`);
        ng.addColorStop(1, `${color}00`);
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, 5 * d, 0, Math.PI * 2);
        ctx.fillStyle = ng;
        ctx.fill();

        // Bright center
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, 2.2 * d, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${(d * 0.98).toFixed(2)})`;
        ctx.fill();
      });

      // === FLOATING BACKGROUND PARTICLES ===
      for (let i = 0; i < 32; i++) {
        const a1 = (i / 32) * Math.PI * 2 + t * 0.07;
        const a2 = (i * 2.39) % Math.PI;
        const r = R * (0.88 + (i % 6) * 0.04);
        const p = projectPoint(
          r * Math.sin(a2) * Math.cos(a1),
          r * Math.cos(a2),
          r * Math.sin(a2) * Math.sin(a1),
          rot, cx, cy
        );
        if (!p.visible) continue;
        const alpha = Math.max(0, p.depth) * (0.18 + 0.14 * Math.sin(t * 1.8 + i));
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, 1.3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(196,181,253,${alpha.toFixed(3)})`;
        ctx.fill();
      }

      // Specular highlight
      const rimGrad = ctx.createRadialGradient(cx - R * 0.45, cy - R * 0.4, R * 0.08, cx, cy, R * 1.02);
      rimGrad.addColorStop(0, 'rgba(255,255,255,0.20)');
      rimGrad.addColorStop(0.3, 'rgba(255,255,255,0.07)');
      rimGrad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = rimGrad;
      ctx.fill();

      // Bottom shadow depth
      const botGrad = ctx.createRadialGradient(cx + R * 0.3, cy + R * 0.5, 0, cx, cy, R);
      botGrad.addColorStop(0.5, 'rgba(109,40,217,0)');
      botGrad.addColorStop(1, 'rgba(109,40,217,0.10)');
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = botGrad;
      ctx.fill();
    };

    const loop = (time: number) => {
      rotRef.current += 0.0025;
      draw(time);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [size]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size }}
      className="opacity-95 drop-shadow-2xl"
    />
  );
}
