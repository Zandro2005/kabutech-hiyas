// Zoom Control Widget
(function () {
    var MIN_ZOOM = 0.8, MAX_ZOOM = 1.4, STEP = 0.1;

    function clampZoom(v) {
        return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(v * 100) / 100));
    }

    function currentZoom() {
        var v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--user-zoom'));
        return isNaN(v) ? 1 : v;
    }

    function applyZoom(zoom) {
        zoom = clampZoom(zoom);
        document.documentElement.style.setProperty('--user-zoom', zoom);
        try { localStorage.setItem('kb_zoom_level', zoom); } catch (e) { }

        var label = document.getElementById('zoom-level-label');
        if (label) label.textContent = Math.round(zoom * 100) + '%';

        var inBtn = document.getElementById('zoom-in-btn');
        var outBtn = document.getElementById('zoom-out-btn');
        if (inBtn) inBtn.disabled = zoom >= MAX_ZOOM - 0.001;
        if (outBtn) outBtn.disabled = zoom <= MIN_ZOOM + 0.001;
    }

    window.appZoomIn = function () { applyZoom(currentZoom() + STEP); };
    window.appZoomOut = function () { applyZoom(currentZoom() - STEP); };

    // Sync the label/button state with whatever zoom level was
    // already restored (by the early head script) on load.
    applyZoom(currentZoom());

    // --- Transparent-until-touched + draggable sidebar behavior ---
    var ctrl = document.getElementById('zoom-control');
    var FADE_DELAY = 2200;
    var fadeTimer = null;

    function wake() {
        ctrl.classList.add('zc-active');
        if (fadeTimer) clearTimeout(fadeTimer);
    }
    function scheduleFade() {
        if (fadeTimer) clearTimeout(fadeTimer);
        fadeTimer = setTimeout(function () {
            ctrl.classList.remove('zc-active');
        }, FADE_DELAY);
    }

    document.getElementById('zoom-in-btn').addEventListener('click', function () { wake(); scheduleFade(); this.blur(); });
    document.getElementById('zoom-out-btn').addEventListener('click', function () { wake(); scheduleFade(); this.blur(); });

    // Restore a previously-dragged vertical position, like a
    // remembered cellphone side-toggle placement.
    try {
        var savedTop = localStorage.getItem('kb_zoom_ctrl_top');
        if (savedTop) {
            ctrl.style.top = savedTop;
            ctrl.style.transform = 'none';
        }
    } catch (e) { }

    var dragging = false, moved = false, startY = 0, startTop = 0, suppressClick = false, startPointerId = null;

    function clampTop(top) {
        var parent = ctrl.parentElement;
        var min = 60; // stay clear of the notch / header area
        var max = parent.clientHeight - ctrl.offsetHeight - 70; // stay clear of bottom nav
        if (max < min) max = min;
        return Math.min(max, Math.max(min, top));
    }

    function onPointerDown(e) {
        dragging = true; moved = false;
        startY = e.clientY;
        startPointerId = e.pointerId;
        var rect = ctrl.getBoundingClientRect();
        var parentRect = ctrl.parentElement.getBoundingClientRect();
        startTop = rect.top - parentRect.top;
        wake();
    }

    function onPointerMove(e) {
        if (!dragging) return;
        var dy = e.clientY - startY;
        if (Math.abs(dy) > 6 && !moved) {
            moved = true;
            ctrl.classList.add('zc-dragging');
            // Only steal the pointer once we know it's a drag,
            // so a plain tap still reaches the +/- button click.
            try { ctrl.setPointerCapture(startPointerId); } catch (err) { }
        }
        if (moved) {
            e.preventDefault();
            ctrl.style.top = clampTop(startTop + dy) + 'px';
            ctrl.style.transform = 'none';
        }
    }

    function onPointerUp() {
        dragging = false;
        ctrl.classList.remove('zc-dragging');
        if (moved) {
            suppressClick = true;
            try { localStorage.setItem('kb_zoom_ctrl_top', ctrl.style.top); } catch (e) { }
        }
        moved = false;
        scheduleFade();
    }

    // Dragging the pill shouldn't also trigger the +/- button
    // it happened to start or end on top of.
    ctrl.addEventListener('click', function (e) {
        if (suppressClick) {
            e.preventDefault();
            e.stopPropagation();
            suppressClick = false;
        }
    }, true);

    ctrl.addEventListener('pointerdown', onPointerDown);
    ctrl.addEventListener('pointermove', onPointerMove);
    ctrl.addEventListener('pointerup', onPointerUp);
    ctrl.addEventListener('pointercancel', onPointerUp);
})();

