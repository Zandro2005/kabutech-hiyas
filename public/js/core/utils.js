// --- COUNT-UP ANIMATION UTILITY ---
// Animates a numeric value from 0 (or a start value) up to a target,
// calling onUpdate(currentValue) on each frame. Use for KPIs, scores,
// sensor readings, and progress bars to feel more "alive".
const countUpRegistry = new Map(); // element -> animation frame id, to avoid overlap

function animateCountUp({ key, from = 0, to, duration = 1000, decimals = 0, onUpdate, easing = (t) => 1 - Math.pow(1 - t, 3) }) {
    if (to === undefined || isNaN(to)) return;
    // Cancel any in-flight animation for this key
    if (key && countUpRegistry.has(key)) {
        cancelAnimationFrame(countUpRegistry.get(key));
        countUpRegistry.delete(key);
    }
    const start = performance.now();
    const diff = to - from;
    // If the change is negligible, just snap to the value
    if (Math.abs(diff) < Math.pow(10, -decimals) / 2) {
        onUpdate(to);
        return;
    }
    function frame(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = easing(progress);
        const value = from + diff * eased;
        onUpdate(Number(value.toFixed(decimals)));
        if (progress < 1) {
            const id = requestAnimationFrame(frame);
            if (key) countUpRegistry.set(key, id);
        } else if (key) {
            countUpRegistry.delete(key);
        }
    }
    const id = requestAnimationFrame(frame);
    if (key) countUpRegistry.set(key, id);
}

// Convenience: animate the text content of an element from 0 to target,
// preserving a suffix (e.g. "°C", "%", " ppm", " µmol", "/100").
function countUpElement(el, target, { decimals = 0, suffix = '', duration = 1000, from, key } = {}) {
    if (!el) return;
    if (from === undefined) {
        const parsed = parseFloat(el.innerText);
        from = isNaN(parsed) ? 0 : parsed;
    }
    animateCountUp({
        key: key || el.id,
        from,
        to: target,
        duration,
        decimals,
        onUpdate: (val) => {
            el.innerText = `${decimals > 0 ? val.toFixed(decimals) : Math.round(val)}${suffix}`;
        }
    });
}

function getAppRect() {
    const wrapper = document.getElementById('app-wrapper');
    const r = wrapper ? wrapper.getBoundingClientRect() : null;
    // If app-wrapper is not visible or has no size, fall back to full viewport
    if (!r || r.width === 0 || r.height === 0) {
        return { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
    }
    return r;
}

function positionModalOverApp(modalId) {
    const r = getAppRect();
    const el = document.getElementById(modalId);
    el.style.position = 'fixed';
    el.style.left = r.left + 'px';
    el.style.top = r.top + 'px';
    el.style.width = r.width + 'px';
    el.style.height = r.height + 'px';
    el.style.display = 'flex';
}

function updateSliderFill(input) {
    if (!input) return;
    const min = parseFloat(input.min), max = parseFloat(input.max), val = parseFloat(input.value);
    const pct = ((val - min) / (max - min) * 100).toFixed(1);
    const isDark = document.documentElement.classList.contains('dark');
    // Solid color up to the thumb, neutral track after it — a hard
    // cut at the handle rather than a blended gradient.
    const filled = input.dataset.accent || (isDark ? '#adf2bc' : '#004521');
    const track = isDark ? '#3f3f46' : '#e2e8f0';
    input.style.background = `linear-gradient(to right, ${filled} 0%, ${filled} ${pct}%, ${track} ${pct}%, ${track} 100%)`;
}

function toggleAccordion(id) {
    const panel = document.getElementById(id);
    const chevron = document.getElementById(id + '-chevron');
    const isOpen = !panel.classList.contains('hidden');
    panel.classList.toggle('hidden', isOpen);
    if (chevron) chevron.style.transform = isOpen ? '' : 'rotate(180deg)';
}

