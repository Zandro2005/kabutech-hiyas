// Live Cam Toggle
(function () {
    var camOn = true;
    window._liveCamOn = true;
    window.toggleLiveCam = function () {
        camOn = !camOn;
        window._liveCamOn = camOn;
        var overlay = document.getElementById('live-cam-off-overlay');
        var icon = document.getElementById('live-cam-toggle-icon');
        var label = document.getElementById('live-cam-toggle-label');
        var pill = document.getElementById('live-status-pill');
        var rec = document.getElementById('live-rec-indicator');
        var img = document.getElementById('mushroom-farm-img');
        if (camOn) {
            if (overlay) overlay.classList.add('hidden');
            if (icon) icon.textContent = 'videocam_off';
            if (label) label.textContent = 'Disable';
            if (pill) pill.style.display = '';
            if (rec) rec.style.display = '';
            if (img) img.style.display = '';
        } else {
            if (overlay) overlay.classList.remove('hidden');
            if (icon) icon.textContent = 'videocam';
            if (label) label.textContent = 'Enable';
            if (pill) pill.style.display = 'none';
            if (rec) rec.style.display = 'none';
            if (img) img.style.display = 'none';
        }
    };
})();

// --- 9. LIVE FARM VIEWING ---
// Update the live camera timestamp every second
(function startLiveCamClock() {
    function pad(n) { return String(n).padStart(2, '0'); }
    function tick() {
        const now = new Date();
        const ts = pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());
        document.querySelectorAll('#live-cam-timestamp').forEach(el => { el.textContent = ts; });
    }
    tick();
    setInterval(tick, 1000);
})();

function closeLiveViewAndGoSettings() {
    closeSubPage('subpage-live-view');
    setTimeout(() => switchTab('profile'), 360);
}

// Animate Yield Analytics tab visuals on entrance: progress fills, actual yield counts up
