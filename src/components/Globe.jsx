import { useEffect, useRef } from "react";
import { REDUCED_MOTION } from "../lib/reducedMotion";

/**
 * The signature: an engraved guilloché globe — the kind of fine line-work
 * printed inside a passport — rendered as a rotating 3D wireframe in gold
 * and oxblood ink on the ivory page. Flight arcs trace across it, and an
 * entry stamp periodically presses in at an angle like a border officer's
 * mark. No WebGL; pure canvas. Pauses offscreen and respects reduced motion.
 */

const OXBLOOD = [92, 26, 27];
const GOLD = [168, 130, 60];

function rgba([r, g, b], a) {
  return `rgba(${r},${g},${b},${a})`;
}

const STAMPS = [
  { label: "ADMITTED", sub: "VISAINEED" },
  { label: "ENTRY", sub: "CLEARED" },
  { label: "ARRIVAL", sub: "VERIFIED" },
  { label: "BORDER OK", sub: "VISAINEED" },
];

export default function Globe({ className = "" }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let raf = 0;
    let running = false;
    let w = 0, h = 0, R = 0, cx = 0, cy = 0;
    let t0 = performance.now();

    const dense = window.innerWidth >= 700;
    const LAT_STEP = dense ? 15 : 20;   // degrees
    const LON_STEP = dense ? 30 : 45;
    const SEG = dense ? 48 : 32;

    // Pre-build the wireframe as a list of polylines in unit-sphere space
    const lines = [];
    for (let lat = -75; lat <= 75; lat += LAT_STEP) {
      const phi = (lat * Math.PI) / 180;
      const ring = [];
      for (let i = 0; i <= SEG; i++) {
        const th = (i / SEG) * Math.PI * 2;
        ring.push([Math.cos(phi) * Math.cos(th), Math.sin(phi), Math.cos(phi) * Math.sin(th)]);
      }
      lines.push({ pts: ring, key: lat === 0 });
    }
    for (let lon = 0; lon < 360; lon += LON_STEP) {
      const lam = (lon * Math.PI) / 180;
      const mer = [];
      for (let i = 0; i <= SEG; i++) {
        const phi = -Math.PI / 2 + (i / SEG) * Math.PI;
        mer.push([Math.cos(phi) * Math.cos(lam), Math.sin(phi), Math.cos(phi) * Math.sin(lam)]);
      }
      lines.push({ pts: mer, key: lon === 0 });
    }

    function randPt() {
      const u = Math.random() * 2 - 1;
      const th = Math.random() * Math.PI * 2;
      const r = Math.sqrt(1 - u * u);
      return [r * Math.cos(th), u, r * Math.sin(th)];
    }
    const arcs = Array.from({ length: 5 }, (_, i) => ({
      a: randPt(), b: randPt(), t: -i * 0.5, speed: 0.0035 + Math.random() * 0.003,
    }));

    // Stamp cycle
    let stamp = null;
    let nextStampAt = 1800;

    let rotY = 0;
    let targetTilt = -0.32, tilt = -0.32;
    let targetOff = 0, off = 0;

    function resize() {
      const rect = canvas.parentElement.getBoundingClientRect();
      w = rect.width; h = rect.height;
      canvas.width = w * dpr; canvas.height = h * dpr;
      canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      R = Math.min(w, h) * 0.6;
      cx = w / 2; cy = h * 0.52;
    }

    function rot(p, ry, rx) {
      const [x, y, z] = p;
      const nx = x * Math.cos(ry) + z * Math.sin(ry);
      let nz = -x * Math.sin(ry) + z * Math.cos(ry);
      const ny = y * Math.cos(rx) - nz * Math.sin(rx);
      nz = y * Math.sin(rx) + nz * Math.cos(rx);
      return [nx, ny, nz];
    }

    function project(p, radius = R) {
      const persp = 2.6 / (2.6 - p[2]);
      return [cx + off + p[0] * radius * persp, cy + p[1] * radius * persp, p[2], persp];
    }

    function slerp(a, b, tt) {
      let dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
      dot = Math.max(-1, Math.min(1, dot));
      const om = Math.acos(dot) || 0.0001;
      const s = Math.sin(om);
      const f1 = Math.sin((1 - tt) * om) / s;
      const f2 = Math.sin(tt * om) / s;
      return [a[0] * f1 + b[0] * f2, a[1] * f1 + b[1] * f2, a[2] * f1 + b[2] * f2];
    }

    function drawStamp(s, now) {
      const age = now - s.born;
      const dur = 2600;
      if (age > dur) { stamp = null; return; }
      const p = age / dur;
      let scale, alpha;
      if (p < 0.12) {            // press in with overshoot
        const k = p / 0.12;
        scale = 1.5 - 0.5 * k;
        alpha = k;
      } else if (p < 0.16) {
        scale = 1 + (0.16 - p) / 0.04 * 0.04;
        alpha = 1;
      } else if (p < 0.78) {     // hold
        scale = 1; alpha = 1;
      } else {                   // fade
        scale = 1; alpha = 1 - (p - 0.78) / 0.22;
      }
      const rad = R * 0.42 * scale;
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.angle);
      ctx.globalAlpha = alpha * 0.8;
      ctx.strokeStyle = rgba(OXBLOOD, 0.9);
      ctx.fillStyle = rgba(OXBLOOD, 0.9);
      ctx.lineWidth = Math.max(1.4, rad * 0.022);
      // double ring
      ctx.beginPath(); ctx.arc(0, 0, rad, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, rad * 0.78, 0, Math.PI * 2); ctx.stroke();
      // tick marks between rings
      for (let i = 0; i < 36; i++) {
        const a = (i / 36) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * rad * 0.86, Math.sin(a) * rad * 0.86);
        ctx.lineTo(Math.cos(a) * rad * 0.92, Math.sin(a) * rad * 0.92);
        ctx.stroke();
      }
      // text
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `600 ${rad * 0.2}px "IBM Plex Mono", monospace`;
      ctx.fillText(s.label, 0, -rad * 0.12);
      ctx.font = `500 ${rad * 0.1}px "IBM Plex Mono", monospace`;
      ctx.fillText(s.sub, 0, rad * 0.2);
      // little plane glyph line
      ctx.lineWidth = Math.max(1, rad * 0.014);
      ctx.beginPath();
      ctx.moveTo(-rad * 0.34, rad * 0.02);
      ctx.lineTo(rad * 0.34, rad * 0.02);
      ctx.stroke();
      ctx.restore();
    }

    function frame() {
      const now = performance.now();
      ctx.clearRect(0, 0, w, h);
      rotY += 0.0022;
      tilt += (targetTilt - tilt) * 0.05;
      off += (targetOff - off) * 0.05;

      // faint warm vignette behind the globe (paper, not glow)
      const halo = ctx.createRadialGradient(cx + off, cy, R * 0.4, cx + off, cy, R * 1.5);
      halo.addColorStop(0, rgba(GOLD, 0.06));
      halo.addColorStop(1, rgba(GOLD, 0));
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, w, h);

      // engraved wireframe — bucket segments by depth for cheap, quality strokes
      const buckets = Array.from({ length: 6 }, () => []);
      const keyBuckets = Array.from({ length: 6 }, () => []);
      for (const line of lines) {
        const proj = line.pts.map((p) => project(rot(p, rotY, tilt)));
        for (let i = 0; i < proj.length - 1; i++) {
          const a = proj[i], b = proj[i + 1];
          const zMid = (a[2] + b[2]) / 2;
          const bi = Math.min(5, Math.max(0, Math.floor(((zMid + 1) / 2) * 6)));
          (line.key ? keyBuckets : buckets)[bi].push([a[0], a[1], b[0], b[1]]);
        }
      }
      for (let bi = 0; bi < 6; bi++) {
        const frontness = bi / 5;
        // regular graticule — gold ink
        if (buckets[bi].length) {
          ctx.strokeStyle = rgba(GOLD, 0.1 + frontness * 0.42);
          ctx.lineWidth = 0.6 + frontness * 0.5;
          ctx.beginPath();
          for (const [ax, ay, bx, by] of buckets[bi]) { ctx.moveTo(ax, ay); ctx.lineTo(bx, by); }
          ctx.stroke();
        }
        // equator + prime meridian — oxblood, heavier
        if (keyBuckets[bi].length) {
          ctx.strokeStyle = rgba(OXBLOOD, 0.18 + frontness * 0.55);
          ctx.lineWidth = 1 + frontness * 0.8;
          ctx.beginPath();
          for (const [ax, ay, bx, by] of keyBuckets[bi]) { ctx.moveTo(ax, ay); ctx.lineTo(bx, by); }
          ctx.stroke();
        }
      }

      // rim
      ctx.strokeStyle = rgba(GOLD, 0.4);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx + off, cy, R, 0, Math.PI * 2);
      ctx.stroke();

      // flight arcs in oxblood with a gold comet
      for (const arc of arcs) {
        arc.t += arc.speed;
        if (arc.t > 1.4) { arc.a = randPt(); arc.b = randPt(); arc.t = -0.2; }
        if (arc.t <= 0) continue;
        const head = Math.min(arc.t, 1);
        const tail = Math.max(0, arc.t - 0.4);
        ctx.beginPath();
        let started = false;
        for (let s = 0; s <= 40; s++) {
          const tt = tail + ((head - tail) * s) / 40;
          const lift = 1 + 0.18 * Math.sin(tt * Math.PI);
          const p = rot(slerp(arc.a, arc.b, tt), rotY, tilt);
          if (p[2] < -0.1) { started = false; continue; }
          const [x, y] = project(p, R * lift);
          if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = rgba(OXBLOOD, 0.55);
        ctx.lineWidth = 1.5;
        ctx.stroke();
        if (head < 1) {
          const lift = 1 + 0.18 * Math.sin(head * Math.PI);
          const p = rot(slerp(arc.a, arc.b, head), rotY, tilt);
          if (p[2] > -0.1) {
            const [x, y] = project(p, R * lift);
            const g = ctx.createRadialGradient(x, y, 0, x, y, 6);
            g.addColorStop(0, rgba(GOLD, 0.95));
            g.addColorStop(1, rgba(GOLD, 0));
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
          }
        }
      }

      // entry stamp
      if (!stamp && now - t0 > nextStampAt) {
        const def = STAMPS[(Math.random() * STAMPS.length) | 0];
        stamp = {
          born: now,
          angle: (Math.random() * 28 - 14) * Math.PI / 180,
          x: cx + off + (Math.random() * 0.4 - 0.2) * R,
          y: cy + (Math.random() * 0.4 - 0.2) * R,
          ...def,
        };
        nextStampAt = now - t0 + 6500 + Math.random() * 2500;
      }
      if (stamp) drawStamp(stamp, now);
      ctx.globalAlpha = 1;

      raf = requestAnimationFrame(frame);
    }

    function start() { if (!running) { running = true; raf = requestAnimationFrame(frame); } }
    function stop() { running = false; cancelAnimationFrame(raf); }

    resize();
    window.addEventListener("resize", resize);

    function onMouse(e) {
      const nx = e.clientX / window.innerWidth - 0.5;
      const ny = e.clientY / window.innerHeight - 0.5;
      targetTilt = -0.32 + ny * 0.2;
      targetOff = nx * 20;
    }

    if (REDUCED_MOTION) {
      frame();
      cancelAnimationFrame(raf);
    } else {
      window.addEventListener("mousemove", onMouse, { passive: true });
      const io = new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()), { threshold: 0.02 });
      io.observe(canvas);
      document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
    }

    return () => {
      stop();
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouse);
    };
  }, []);

  return <canvas ref={canvasRef} className={`globe-canvas ${className}`} aria-hidden="true" />;
}
