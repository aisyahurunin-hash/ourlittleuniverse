// Efek interaksi global: ripple + "tekan" pada tombol, tekan pada kartu yang bisa diklik.
// Semua dimatikan otomatis bila pengguna memilih prefers-reduced-motion.
import { reducedMotion } from './util.js';

const PRESSABLE = '.btn, .chip, .tab, .k-tab, .x-tool, .dock, .m-icons a, .mood-btn, .aff-btn, .theme-card, .more-item, .swatch, .envelope, .folder, .book, .capsule, button.fav, .sticker-row button, .c-bottom a, .c-bottom button';

export function initFx() {
  if (initFx.done) return; initFx.done = true;
  document.addEventListener('pointerdown', e => {
    if (reducedMotion() || e.button > 0) return;
    const el = e.target.closest(PRESSABLE); if (!el || el.disabled) return;
    el.classList.add('pressing');
    const end = () => { el.classList.remove('pressing'); ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => el.removeEventListener(t, end)); };
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => el.addEventListener(t, end));
    // ripple dari titik sentuh
    const r = el.getBoundingClientRect(), d = Math.max(r.width, r.height) * 2;
    const rip = document.createElement('span'); rip.className = 'ripple';
    Object.assign(rip.style, { width: d + 'px', height: d + 'px', left: e.clientX - r.left - d / 2 + 'px', top: e.clientY - r.top - d / 2 + 'px' });
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    el.classList.add('has-ripple'); el.append(rip); setTimeout(() => rip.remove(), 650);
  }, { passive: true });
}
