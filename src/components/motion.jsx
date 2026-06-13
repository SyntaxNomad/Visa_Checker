import { useEffect, useRef, useState } from "react";
import { REDUCED_MOTION } from "../lib/reducedMotion";

// One shared IntersectionObserver for every revealed element
let _observer = null;
const _callbacks = new WeakMap();

function observe(el, cb) {
  if (!_observer) {
    _observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            _callbacks.get(e.target)?.();
            _observer.unobserve(e.target);
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
  }
  _callbacks.set(el, cb);
  _observer.observe(el);
  return () => _observer.unobserve(el);
}

/**
 * Scroll-reveal wrapper. Children fade/slide in when scrolled into view.
 * variant: "up" | "scale" | "left" | "right"
 */
export function Reveal({ children, variant = "up", delay = 0, className = "", as: Tag = "div" }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(REDUCED_MOTION);

  useEffect(() => {
    if (REDUCED_MOTION || !ref.current) return;
    return observe(ref.current, () => setShown(true));
  }, []);

  return (
    <Tag
      ref={ref}
      className={`reveal reveal--${variant}${shown ? " reveal--shown" : ""} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}

/** Animated number that counts up when it enters the viewport. */
export function CountUp({ value, duration = 1400, format }) {
  const ref = useRef(null);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (REDUCED_MOTION) return;
    const el = ref.current;
    if (!el) return;
    return observe(el, () => {
      const start = performance.now();
      function tick(now) {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        setDisplay(Math.round(value * eased));
        if (t < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }, [value, duration]);

  const shown = REDUCED_MOTION ? value : display;
  return <span ref={ref}>{format ? format(shown) : shown.toLocaleString()}</span>;
}

/** 3D tilt-on-hover card. Light reflection follows the cursor. */
export function TiltCard({ children, className = "", max = 7 }) {
  const ref = useRef(null);

  function onMove(e) {
    if (REDUCED_MOTION) return;
    const el = ref.current;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.setProperty("--rx", `${(0.5 - py) * max}deg`);
    el.style.setProperty("--ry", `${(px - 0.5) * max}deg`);
    el.style.setProperty("--gx", `${px * 100}%`);
    el.style.setProperty("--gy", `${py * 100}%`);
  }

  function onLeave() {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  }

  return (
    <div ref={ref} className={`tilt ${className}`} onMouseMove={onMove} onMouseLeave={onLeave}>
      <div className="tilt-glare" />
      {children}
    </div>
  );
}

/** Magnetic element: drifts toward the cursor while hovered. */
export function Magnetic({ children, strength = 0.25, className = "" }) {
  const ref = useRef(null);

  function onMove(e) {
    if (REDUCED_MOTION) return;
    const el = ref.current;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left - r.width / 2) * strength;
    const y = (e.clientY - r.top - r.height / 2) * strength;
    el.style.transform = `translate(${x}px, ${y}px)`;
  }

  function onLeave() {
    if (ref.current) ref.current.style.transform = "";
  }

  return (
    <span ref={ref} className={`magnetic ${className}`} onMouseMove={onMove} onMouseLeave={onLeave}>
      {children}
    </span>
  );
}
