// Lightweight tween helpers for DOM or Phaser UI (no dependency on scene)
// Use requestAnimationFrame; returns a cancel function.

type Easing = (t: number) => number;

const easeInOutSine: Easing = t => 0.5 - 0.5 * Math.cos(Math.PI * t);
const easeOutBack: Easing = t => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

export function tween(
  durMs: number,
  onUpdate: (t: number) => void,
  easing: Easing = easeInOutSine,
  onDone?: () => void
) {
  let raf = 0;
  const start = performance.now();
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / durMs);
    onUpdate(easing(t));
    if (t < 1) raf = requestAnimationFrame(step);
    else onDone?.();
  };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}

export function pulseScale(el: HTMLElement, amt = 0.06, ms = 180) {
  const base = el.style.transform || '';
  tween(ms, t => {
    const s = 1 + Math.sin(t * Math.PI) * amt;
    el.style.transform = `${base} scale(${s})`;
  }, undefined, () => (el.style.transform = base));
}

export function wobble(el: HTMLElement, deg = 4, ms = 220) {
  const base = el.style.transform || '';
  tween(ms, t => {
    const r = Math.sin(t * Math.PI * 2) * deg;
    el.style.transform = `${base} rotate(${r}deg) translateY(${(1 - Math.cos(t*Math.PI))*2}px)`;
  }, easeOutBack, () => (el.style.transform = base));
}

export function ripple(el: HTMLElement, ms = 140) {
  const rippleEl = document.createElement('span');
  rippleEl.className = 'hud-ripple';
  el.appendChild(rippleEl);
  tween(ms, t => { rippleEl.style.opacity = String(0.18 * (1 - t));
                   rippleEl.style.transform = `scale(${1 + t*0.3})`; },
       undefined, () => rippleEl.remove());
}
