import { useCallback, useRef } from 'react';

/**
 * Drag-to-scroll with momentum ("tarik lepas") for any overflow container – no scrollbar, no extra scroll UI.
 *  - mouse: press, drag, let go -> the list glides on and slowly settles (inertia from the speed of the last ~100 ms of the drag)
 *  - touch / pen: the browser's own native scrolling is used (it already has smooth momentum); this hook only locks the scroll axis
 *    (touch-action) and stops the scroll from chaining into the page (overscroll-behavior)
 *  - horizontal lists also react to the mouse wheel (vertical wheel -> sideways) with an eased, smooth glide
 *  - a drag never "clicks" the card under the pointer; pressing during a glide just stops it
 * Returns a callback ref, so it also works on elements that are mounted later / conditionally.
 */
type Axis = 'x' | 'y';
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const DRAG_START = 6;      // px of movement before a press turns into a drag (so taps still click)
const FRICTION = 0.0026;   // glide decay per ms (bigger = stops sooner)
const MAX_SPEED = 4.5;     // px per ms
const MIN_SPEED = 0.02;    // below this the glide ends

function attach(el: HTMLElement, axis: Axis): () => void {
  const horiz = axis === 'x';
  const read = () => (horiz ? el.scrollLeft : el.scrollTop);
  const write = (v: number) => { if (horiz) el.scrollLeft = v; else el.scrollTop = v; };
  const maxScroll = () => Math.max(0, horiz ? el.scrollWidth - el.clientWidth : el.scrollHeight - el.clientHeight);

  const before = { touch: el.style.touchAction, over: el.style.overscrollBehavior };
  el.style.touchAction = horiz ? 'pan-x' : 'pan-y';
  el.style.overscrollBehavior = 'contain';
  el.dataset.dragScroll = '1';

  let id = -1, startP = 0, lastP = 0, cur = 0, target = 0, vel = 0, raf = 0, last = 0;
  let dragging = false, stopTapped = false, suppress = false;
  let mode: 'none' | 'fling' | 'ease' = 'none';
  let samples: { t: number; c: number }[] = [];

  const stop = () => { mode = 'none'; cancelAnimationFrame(raf); };
  const tick = (now: number) => {
    const dt = Math.min(48, Math.max(1, now - last)); last = now;
    const mx = maxScroll();
    if (mode === 'fling') {
      cur += vel * dt; vel *= Math.exp(-dt * FRICTION);
      if (cur <= 0 || cur >= mx) { cur = clamp(cur, 0, mx); vel = 0; }
      write(cur);
      if (Math.abs(vel) < MIN_SPEED) { stop(); return; }
    } else if (mode === 'ease') {
      target = clamp(target, 0, mx);
      cur += (target - cur) * (1 - Math.exp(-dt * 0.016));
      if (Math.abs(target - cur) < 0.4) { cur = target; write(cur); stop(); return; }
      write(cur);
    }
    raf = requestAnimationFrame(tick);
  };
  const run = (m: 'fling' | 'ease') => { cancelAnimationFrame(raf); mode = m; last = performance.now(); raf = requestAnimationFrame(tick); };

  const onDown = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return; // touch & pen scroll natively
    stopTapped = false;
    if (mode === 'fling') { stopTapped = true; stop(); }      // pressing during a glide only stops it
    id = e.pointerId; startP = lastP = horiz ? e.clientX : e.clientY; cur = read(); vel = 0; dragging = false;
  };
  const onMove = (e: PointerEvent) => {
    if (e.pointerId !== id) return;
    const p = horiz ? e.clientX : e.clientY;
    if (!dragging) {
      if (Math.abs(p - startP) < DRAG_START) return;
      stop(); dragging = true; lastP = startP; cur = read(); samples = []; // lastP = startP: the content stays exactly under the pointer (no jump)
      el.dataset.dragging = '1';
      try { el.setPointerCapture(e.pointerId); } catch { /* not supported */ }
    }
    cur = clamp(cur - (p - lastP), 0, maxScroll()); lastP = p; write(cur);
    const now = performance.now(); samples.push({ t: now, c: cur });
    while (samples.length > 2 && now - samples[0].t > 100) samples.shift();
  };
  const end = (e: PointerEvent) => {
    if (e.pointerId !== id) return;
    id = -1;
    if (dragging) {
      dragging = false; delete el.dataset.dragging;
      try { el.releasePointerCapture(e.pointerId); } catch { /* already released */ }
      suppress = true; window.setTimeout(() => { suppress = false; }, 0); // swallow the click that follows a drag
      const a = samples[0], b = samples[samples.length - 1];
      vel = a && b && b.t > a.t && performance.now() - b.t < 90 ? clamp((b.c - a.c) / (b.t - a.t), -MAX_SPEED, MAX_SPEED) : 0; // paused before letting go -> no glide
      if (Math.abs(vel) > 0.06) run('fling');
    } else if (stopTapped) { suppress = true; window.setTimeout(() => { suppress = false; }, 0); }
    stopTapped = false;
  };
  const onClick = (e: MouseEvent) => { if (suppress) { suppress = false; e.stopPropagation(); e.preventDefault(); } };
  const onWheel = (e: WheelEvent) => {
    if (!horiz || e.ctrlKey) return;
    const mx = maxScroll(); if (mx <= 0 || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return; // real sideways wheel / trackpad swipe: native (already smooth)
    const unit = e.deltaMode === 1 ? 34 : e.deltaMode === 2 ? el.clientWidth : 1;
    if (mode === 'none') cur = read();
    if (mode !== 'ease') target = cur;
    target = clamp(target + e.deltaY * unit, 0, mx);
    e.preventDefault();
    if (mode !== 'ease') run('ease');
  };
  const onDragStart = (e: Event) => e.preventDefault();

  el.addEventListener('pointerdown', onDown); el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  el.addEventListener('click', onClick, true); el.addEventListener('dragstart', onDragStart);
  el.addEventListener('wheel', onWheel, { passive: false });
  return () => {
    stop();
    el.removeEventListener('pointerdown', onDown); el.removeEventListener('pointermove', onMove);
    el.removeEventListener('pointerup', end); el.removeEventListener('pointercancel', end);
    el.removeEventListener('click', onClick, true); el.removeEventListener('dragstart', onDragStart);
    el.removeEventListener('wheel', onWheel);
    el.style.touchAction = before.touch; el.style.overscrollBehavior = before.over;
    delete el.dataset.dragScroll; delete el.dataset.dragging;
  };
}

export function useDragScroll<T extends HTMLElement = HTMLDivElement>(axis: Axis) {
  const off = useRef<(() => void) | null>(null);
  return useCallback((el: T | null) => { off.current?.(); off.current = el ? attach(el, axis) : null; }, [axis]);
}
