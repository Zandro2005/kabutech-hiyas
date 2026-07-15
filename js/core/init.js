// --- 2. INITIALIZATION ---
// Track previous sensor readings for trend calculation
let prevReadings = { temp: 24.2, humidity: 68.0, co2: 420, light: 420 };
let dashboardEnteredOnce = false; // ensures the "count up from 0" intro only happens once per session

window.addEventListener('resize', () => {
    ['modal-staff-account', 'modal-staff-delete', 'modal-confirm', 'modal-admin-note'].forEach(id => {
        const el = document.getElementById(id);
        if (el && el.style.display === 'flex') positionModalOverApp(id);
    });

    // The onboarding carousel is mobile-only: a hard CSS rule forces
    // #scene-onboarding to display:none at desktop widths. If the user
    // resizes/rotates from mobile into desktop while onboarding is still
    // the active scene, that CSS backstop kicks in and the screen goes
    // blank (onboarding is hidden, but nothing tells JS to swap to the
    // login scene). Detect that case and forward to login automatically.
    const onboarding = document.getElementById('scene-onboarding');
    if (onboarding && !onboarding.classList.contains('hidden') && isDesktopViewport()) {
        onboarding.classList.add('hidden');
        revealLoginWithFade();
    }
});

window.addEventListener('load', () => {
    loadStateFromStorage();
    setSensorDOMStatic();
    updateCropsHealthPanel();
    updateGreeting();

    // Tell the boot-gate (in index.html) that core state/DOM setup is
    // done, so it can release #app-boot-loader once fonts + page load
    // have also finished. This is separate from #scene-loading, which
    // is the app's own in-UI splash sequence shown *after* reveal.
    if (typeof window.__appBootReady === 'function') window.__appBootReady();

    // Init ctrl-slider fill tracks
    setTimeout(() => {
        ['slider-temp', 'slider-humidity', 'slider-light', 'slider-co2'].forEach(id => {
            const el = document.getElementById(id);
            if (el) updateSliderFill(el);
        });
    }, 100);

    // Set current date in inoculation form
    const batchDateEl = document.getElementById('batch-date'); if (batchDateEl) batchDateEl.value = new Date().toISOString().substring(0, 10);

    // Start Dynamic Clock + Greeting refresh
    setInterval(() => {
        updateGreeting();
    }, 60000);

    // Simulation Engine Tick (Every 3 seconds)
    setInterval(runSimulationTick, 3000);
    // Keep the desktop Automation Insights "NOW" marker fresh even
    // when master scheduling is off (runScheduleTick short-circuits
    // in that case, but the timeline should still reflect time-of-day).
    setInterval(renderAutomationInsights, 30000);

    // Autologin and initial screen transition is now handled by onAuthStateChanged in firebase-config.js

    // Scroll-to-top FAB visibility
    const scrollArea = document.getElementById('app-scroll-area');
    const scrollFab = document.getElementById('scroll-top-fab');
    if (scrollArea && scrollFab) {
        scrollArea.addEventListener('scroll', () => {
            if (scrollArea.scrollTop > 200) scrollFab.classList.add('visible');
            else scrollFab.classList.remove('visible');
        });
    }

    // Global ripple effect on buttons and clickable cards
    document.addEventListener('click', (e) => {
        const target = e.target.closest('button, .ripple-surface');
        if (!target) return;
        if (target.disabled) return;
        const computed = getComputedStyle(target).position;
        if (computed === 'static') target.style.position = 'relative';
        if (!target.classList.contains('ripple-surface')) {
            target.classList.add('ripple-surface');
        }
        const rect = target.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const ripple = document.createElement('span');
        ripple.className = 'ripple-effect';
        const isDarkBg = ['bg-primary', 'primary-container', 'error', 'success-green'].some(c => target.className.includes(c));
        if (!isDarkBg) ripple.classList.add('ripple-dark');
        ripple.style.width = ripple.style.height = `${size}px`;
        ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
        ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
        target.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
    });

    // Sensor card tap-to-expand
    initSensorCardExpand();
});

// Toggle expanded detail view on dashboard sensor cards
function initSensorCardExpand() {
    document.querySelectorAll('.sensor-card').forEach(card => {
        card.addEventListener('click', () => {
            const detail = card.querySelector('.sensor-detail');
            const wasOpen = card.classList.contains('expanded');
            // Close all other sensor cards
            document.querySelectorAll('.sensor-card').forEach(c => {
                c.classList.remove('expanded');
                const d = c.querySelector('.sensor-detail');
                if (d) d.classList.remove('open');
            });
            if (!wasOpen) {
                card.classList.add('expanded');
                if (detail) detail.classList.add('open');
            }
        });
    });
}


// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(r => console.log('[SW] Registered:', r.scope))
            .catch(e => console.warn('[SW] Registration failed:', e));
    });
}

// Scroll Intent Guard
(function () {
    var scrollArea = null;
    var touchStartY = 0;
    var touchStartX = 0;
    var didScroll = false;
    var blockNextClick = false;

    function init() {
        scrollArea = document.getElementById('app-scroll-area');
        if (!scrollArea) return;

        scrollArea.addEventListener('touchstart', function (e) {
            if (e.touches.length !== 1) return;
            touchStartY = e.touches[0].clientY;
            touchStartX = e.touches[0].clientX;
            didScroll = false;
            blockNextClick = false;
        }, { passive: true });

        scrollArea.addEventListener('touchmove', function (e) {
            if (e.touches.length !== 1) return;
            var dy = Math.abs(e.touches[0].clientY - touchStartY);
            var dx = Math.abs(e.touches[0].clientX - touchStartX);
            if (dy > 6 && dy > dx) {
                didScroll = true;
            }
        }, { passive: true });

        scrollArea.addEventListener('touchend', function () {
            if (didScroll) {
                blockNextClick = true;
                // Clear the block after a short window (click fires ~0-100ms after touchend)
                setTimeout(function () { blockNextClick = false; }, 350);
            }
            didScroll = false;
        }, { passive: true });

        // Intercept clicks on the scroll area: cancel if we scrolled
        scrollArea.addEventListener('click', function (e) {
            if (blockNextClick) {
                e.stopImmediatePropagation();
                e.preventDefault();
                blockNextClick = false;
            }
        }, true); // capture phase so it fires before onclick handlers

        // Smoothly scroll inputs into view on mobile after native viewport resizes
        if (window.innerWidth < 1024) {
            document.querySelectorAll('input, textarea').forEach(input => {
                input.addEventListener('focus', function() {
                    setTimeout(() => {
                        this.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 400); // Wait for keyboard slide animation
                });
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
