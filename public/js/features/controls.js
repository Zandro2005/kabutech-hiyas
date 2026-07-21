function confirmManualMode() {
    if (state.systemMode === 'manual') return;
    showConfirm({
        title: 'Switch to Manual Override?',
        body: 'This disables the auto control loop. You will be fully responsible for managing all devices manually.',
        icon: 'tune',
        iconBg: 'bg-orange-100 dark:bg-orange-950/40',
        iconColor: 'text-orange-500',
        okLabel: 'Enable Manual',
        okIcon: 'tune',
        okBg: 'bg-orange-500 hover:bg-orange-600',
        onConfirm: () => setSystemMode('manual')
    });
}

function applyModeUI(mode) {
    const btnAuto = document.getElementById('mode-btn-auto');
    const btnManual = document.getElementById('mode-btn-manual');
    const warnLabel = document.getElementById('mode-warning-label');

    if (mode === 'auto') {
        btnAuto.className = "px-3 py-1.5 rounded-full bg-primary text-on-primary font-bold text-[11px] transition-all duration-300";
        btnManual.className = "px-3 py-1.5 rounded-full text-on-surface-variant dark:text-zinc-400 font-bold text-[11px] transition-all duration-300";
        if (warnLabel) warnLabel.classList.add('hidden');
    } else {
        btnManual.className = "px-3 py-1.5 rounded-full bg-warning-gold text-white font-bold text-[11px] transition-all duration-300";
        btnAuto.className = "px-3 py-1.5 rounded-full text-on-surface-variant dark:text-zinc-400 font-bold text-[11px] transition-all duration-300";
        if (warnLabel) warnLabel.classList.remove('hidden');
    }
}

// --- 8. DEVICE OVERRIDES & AUTO SYNC ---
function setSystemMode(mode) {
    state.systemMode = mode;
    saveSetpoints();
    syncControlsUI();
    applyModeUI(mode);

    if (mode === 'auto') {
        addLog('Environmental system Mode set to AUTO.', 'success');
        showToast('Automatic control loop enabled.', 'info');
    } else {
        addLog('Environmental system Mode set to MANUAL override.', 'warning');
        showToast('Manual device controls enabled.', 'warning');
    }
}

function toggleQuickDevice(device) {
    if (state.systemMode === 'auto') {
        showToast('Cannot toggle in Auto Mode. Switch to Manual Override first!', 'warning');
        return;
    }

    state.deviceStates[device] = !state.deviceStates[device];
    if (state.deviceStates[device]) {
        if (!state.deviceUptimeStart) state.deviceUptimeStart = {};
        state.deviceUptimeStart[device] = Date.now();
    }

    // Check mister jammed anomaly block
    if (device === 'misters' && state.anomalies.misterJammed) {
        state.deviceStates.misters = false;
        showToast('Mister toggle failed: Hardware feedback reports Mister Jammed.', 'error');
        return;
    }

    saveSetpoints();
    syncControlsUI();
    const isOn = state.deviceStates[device];
    const label = { fans: 'Ventilation Fan', misters: 'Misters', lights: 'Grow Lights' }[device] || device;
    addLog(`Operator manually toggled ${device.toUpperCase()} ${isOn ? 'ON' : 'OFF'}.`, 'warning');
    showToast(`${label} ${isOn ? 'ON' : 'OFF'}.`, isOn ? 'success' : 'info');
}

function toggleSetpointsSection() {
    const body = document.getElementById('setpoints-section-body');
    const icon = document.getElementById('icon-toggle-setpoints');
    const lbl = document.getElementById('lbl-toggle-setpoints');
    if (!body) return;
    const isHidden = body.classList.contains('hidden');
    body.classList.toggle('hidden', !isHidden);
    if (icon) icon.textContent = isHidden ? 'expand_less' : 'expand_more';
    if (lbl) lbl.textContent = isHidden ? 'Hide' : 'Show';
}

function syncControlsUI() {
    applyModeUI(state.systemMode);
    updateShiftSummary();
    const homeBadge = document.getElementById('home-mode-badge');
    homeBadge.innerText = state.systemMode === 'auto' ? 'Auto Mode' : 'Manual Mode';

    // Quick toggles UI sync
    const devices = ['fans', 'misters', 'lights'];
    devices.forEach(d => {
        const btn = document.getElementById(`btn-quick-${d}`);
        const status = document.getElementById(`status-quick-${d}`);
        const icon = document.getElementById(`icon-quick-${d}`);
        const iconContainer = document.getElementById(`icon-container-quick-${d}`);
        const toggleBg = document.getElementById(`toggle-bg-quick-${d}`);
        const toggleDot = document.getElementById(`toggle-dot-quick-${d}`);
        const dot = document.getElementById(`sim-${d}-dot`);
        const uptime = document.getElementById(`uptime-quick-${d}`);

        if (state.deviceStates[d]) {
            // Active (ON) state classes
            if (btn) btn.className = "flex items-center justify-between w-full p-4 rounded-2xl border bg-[#7ef4a2]/5 dark:bg-emerald-950/20 border-[#7ef4a2] hover:bg-[#7ef4a2]/10 transition-all select-none";
            if (iconContainer) iconContainer.className = "w-10 h-10 rounded-xl bg-[#7ef4a2] dark:bg-emerald-800 flex items-center justify-center text-[#032514] dark:text-[#7ef4a2] border-transparent";
            if (toggleBg) toggleBg.className = "relative w-9 h-5 bg-[#7ef4a2] rounded-full transition-colors duration-200 flex items-center p-0.5";
            if (toggleDot) toggleDot.className = "w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-200 translate-x-4";
            if (status) {
                status.className = "text-[10px] text-[#15803d] dark:text-[#7ef4a2] font-bold uppercase tracking-wide";
                status.innerText = "ACTIVE";
            }
            if (dot) dot.className = "w-1.5 h-1.5 rounded-full bg-success-green animate-ping";
            if (uptime && state.deviceUptimeStart && state.deviceUptimeStart[d]) {
                const mins = Math.floor((Date.now() - state.deviceUptimeStart[d]) / 60000);
                uptime.classList.remove('hidden');
                uptime.innerText = mins < 1 ? 'just now' : `${mins}m`;
            }
            if (icon) {
                if (d === 'fans') icon.className = "material-symbols-outlined text-[20px] animate-spin-slow";
                else icon.className = "material-symbols-outlined text-[20px] animate-pulse";
            }
        } else {
            // Inactive (OFF) state classes
            if (btn) btn.className = "flex items-center justify-between w-full p-4 rounded-2xl border bg-white dark:bg-zinc-900 border-slate-100 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-all select-none";
            if (iconContainer) iconContainer.className = "w-10 h-10 rounded-xl bg-slate-50 dark:bg-zinc-800 flex items-center justify-center text-slate-400 dark:text-zinc-500 border border-slate-100 dark:border-zinc-700";
            if (toggleBg) toggleBg.className = "relative w-9 h-5 bg-slate-200 dark:bg-zinc-700 rounded-full transition-colors duration-200 flex items-center p-0.5";
            if (toggleDot) toggleDot.className = "w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-200 translate-x-0";
            if (status) {
                status.className = "text-[10px] text-slate-400 dark:text-zinc-500 uppercase tracking-wide";
                status.innerText = "OFF";
            }
            if (icon) icon.className = "material-symbols-outlined text-[20px]";
            if (dot) dot.className = "w-1.5 h-1.5 rounded-full bg-slate-300";
            if (uptime) {
                uptime.innerText = '';
                uptime.classList.add('hidden');
            }
            if (state.deviceUptimeStart) state.deviceUptimeStart[d] = null;
        }
    });

    // Sliders Readout sync
    document.getElementById('val-temp-setpoint').innerText = state.tempSetpoint.toFixed(1);
    document.getElementById('val-humidity-setpoint').innerText = state.humiditySetpoint;
    document.getElementById('slider-temp').value = state.tempSetpoint;
    document.getElementById('slider-humidity').value = state.humiditySetpoint;
    const lightSp = document.getElementById('val-light-setpoint');
    const lightSlider = document.getElementById('slider-light');
    if (lightSp) lightSp.innerText = state.lightSetpoint;
    if (lightSlider) lightSlider.value = state.lightSetpoint;
    const co2Sp = document.getElementById('val-co2-setpoint');
    const co2Slider = document.getElementById('slider-co2');
    const co2Cur = document.getElementById('ctrl-current-co2');
    if (co2Sp) co2Sp.innerText = state.co2Setpoint || 600;
    if (co2Slider) co2Slider.value = state.co2Setpoint || 600;
    if (co2Cur) co2Cur.innerText = Math.round(state.currentCO2);
    // init slider fills
    ['slider-temp', 'slider-humidity', 'slider-light', 'slider-co2'].forEach(id => {
        const el = document.getElementById(id);
        if (el) updateSliderFill(el);
    });
    syncDeviceButtons();
}

let _sliderDebounceTimers = {};
function _debouncedSetpoint(key, fn) {
    clearTimeout(_sliderDebounceTimers[key]);
    // Show inline saving dot on the relevant card
    const dotId = 'saving-dot-' + key;
    const dot = document.getElementById(dotId);
    if (dot) dot.classList.remove('hidden');
    _sliderDebounceTimers[key] = setTimeout(() => {
        fn();
        if (dot) dot.classList.add('hidden');
    }, 800);
}

// ── Notification Feed (Controls tab top banner) ────────────────────
const NOTIF_ICONS = { info: 'info', success: 'check_circle', warning: 'warning', error: 'error' };
// Inline styles used so no Tailwind purge issues
const NOTIF_STYLES = {
    info: { bg: '#e8f5ee', border: '#a7d4b8', color: '#1a6640' },
    success: { bg: '#d4edda', border: '#5cb85c', color: '#155724' },
    warning: { bg: '#fff8e6', border: '#f0b429', color: '#92600a' },
    error: { bg: '#fde8e8', border: '#e57373', color: '#9b1c1c' }
};

function pushCtrlNotification(msg, type = 'info', icon = null) {
    const feed = document.getElementById('ctrl-notifications-feed');
    if (!feed) return;
    const s = NOTIF_STYLES[type] || NOTIF_STYLES.info;
    const ico = icon || NOTIF_ICONS[type] || 'info';
    const notif = document.createElement('div');
    notif.style.cssText = `display:flex;align-items:center;gap:10px;border:1px solid ${s.border};border-radius:12px;padding:10px 14px;background:${s.bg};color:${s.color};opacity:0;transform:translateY(-8px);transition:opacity 0.3s ease,transform 0.3s ease;`;
    notif.innerHTML = `<span class="material-symbols-outlined" style="font-size:17px;flex-shrink:0;font-variation-settings:'FILL' 1">${ico}</span>
                <p style="font-size:11px;font-weight:600;line-height:1.4;flex:1;margin:0">${msg}</p>
                <button onclick="this.parentElement.style.opacity='0';this.parentElement.style.transform='translateY(-8px)';setTimeout(()=>this.parentElement.remove(),300)" style="background:none;border:none;cursor:pointer;padding:2px;opacity:0.5;flex-shrink:0;color:inherit">
                    <span class="material-symbols-outlined" style="font-size:14px">close</span>
                </button>`;
    feed.prepend(notif);
    requestAnimationFrame(() => requestAnimationFrame(() => {
        notif.style.opacity = '1';
        notif.style.transform = 'translateY(0)';
    }));
    setTimeout(() => {
        notif.style.opacity = '0';
        notif.style.transform = 'translateY(-8px)';
        setTimeout(() => notif.remove(), 300);
    }, 5000);
    while (feed.children.length > 4) feed.lastElementChild.remove();
}

function updateTempSetpoint(val) {
    document.getElementById('val-temp-setpoint').innerText = parseFloat(val).toFixed(1);
    state.tempSetpoint = parseFloat(val);
    if (typeof updateRadialGauges === 'function') updateRadialGauges();
    _debouncedSetpoint('temp', () => {
        saveSetpoints();
        showToast(`Temperature target set to ${state.tempSetpoint.toFixed(1)}°C`, 'info');
        addLog(`Temperature setpoint changed to ${state.tempSetpoint.toFixed(1)}°C.`, 'info');
    });
}

function updateHumiditySetpoint(val) {
    document.getElementById('val-humidity-setpoint').innerText = val;
    state.humiditySetpoint = parseInt(val);
    if (typeof updateRadialGauges === 'function') updateRadialGauges();
    _debouncedSetpoint('humidity', () => {
        saveSetpoints();
        showToast(`Humidity target set to ${state.humiditySetpoint}%`, 'info');
    });
}

function updateLightSetpoint(val) {
    const el = document.getElementById('val-light-setpoint');
    if (el) el.innerText = val;
    state.lightSetpoint = parseInt(val);
    if (typeof updateRadialGauges === 'function') updateRadialGauges();
    _debouncedSetpoint('light', () => {
        saveSetpoints();
        showToast(`Light target set to ${state.lightSetpoint} µmol`, 'info');
    });
}

function commitCO2Setpoint(val) {
    document.getElementById('val-co2-setpoint').innerText = val;
    state.co2Setpoint = parseInt(val);
    if (typeof updateRadialGauges === 'function') updateRadialGauges();
    _debouncedSetpoint('co2', () => {
        saveSetpoints();
        showToast(`CO2 target set to ${state.co2Setpoint} ppm`, 'info');
        addLog(`CO2 setpoint changed to ${state.co2Setpoint} ppm.`, 'info');
    });
}

function toggleDeviceManual(device) {
    if (state.systemMode !== 'manual') {
        showToast('Switch to Manual Override to control devices directly.', 'warning');
        return;
    }
    if (device === 'misters' && state.anomalies.misterJammed) {
        showToast('Mister toggle failed: Hardware feedback reports Mister Jammed.', 'error');
        return;
    }
    state.deviceStates[device] = !state.deviceStates[device];

    // Ventilation Fan (Temperature) and Ventilation Fan (CO2) are
    // physically the same fan — keep them in sync.
    if (device === 'fans' || device === 'ventFan') {
        const linked = device === 'fans' ? 'ventFan' : 'fans';
        state.deviceStates[linked] = state.deviceStates[device];
    }

    saveSetpoints();
    syncDeviceButtons();

    // Brief checkmark confirmation flash on the button
    const btnId = { fans: 'btn-device-fans', misters: 'btn-device-misters', lights: 'btn-device-lights', ventFan: 'btn-vent-fan' }[device];
    if (btnId) {
        const btn = document.getElementById(btnId);
        if (btn) {
            const knob = btn.querySelector('.ctrl-toggle-knob');
            if (knob) {
                const prev = knob.innerHTML;
                knob.innerHTML = '<span class="material-symbols-outlined text-[11px] text-primary dark:text-on-primary absolute inset-0 flex items-center justify-center" style="font-variation-settings:\'FILL\' 1">check</span>';
                setTimeout(() => { knob.innerHTML = prev; }, 900);
            }
        }
    }
    const label = { fans: 'Ventilation Fan', misters: 'Misters', lights: 'Grow Lights', ventFan: 'Ventilation Fan (CO2)' }[device] || device;
    const isOn = state.deviceStates[device];
    showToast(`${label} ${isOn ? 'ON' : 'OFF'}.`, isOn ? 'success' : 'info');
    addLog(`Manual override: ${label} toggled ${isOn ? 'ON' : 'OFF'}.`, 'warning');
}

function syncDeviceButtons() {
    const isManual = state.systemMode === 'manual';
    const map = {
        fans: { btn: 'btn-device-fans', lbl: 'lbl-device-fans' },
        misters: { btn: 'btn-device-misters', lbl: 'lbl-device-misters' },

        lights: { btn: 'btn-device-lights', lbl: 'lbl-device-lights' },
        ventFan: { btn: 'btn-vent-fan', lbl: 'lbl-vent-fan' }
    };
    Object.entries(map).forEach(([device, ids]) => {
        const btn = document.getElementById(ids.btn);
        const lbl = document.getElementById(ids.lbl);
        if (!btn) return;
        const on = !!state.deviceStates[device];
        // Base toggle classes
        btn.className = 'ctrl-toggle rounded-full border-2 relative transition-all duration-300';
        if (!isManual) {
            // Auto mode: always grey, never show green is-on state
            btn.classList.add('border-slate-200', 'dark:border-zinc-700', 'bg-slate-200', 'dark:bg-zinc-700', 'opacity-50', 'cursor-not-allowed');
            // do NOT add is-on — button stays grey even if device is running
        } else {
            btn.classList.add('border-slate-200', 'dark:border-zinc-700', 'bg-slate-200', 'dark:bg-zinc-700');
            btn.classList.toggle('is-on', on);
        }
        if (lbl) {
            lbl.innerText = on ? 'ON' : 'OFF';
            lbl.className = (on && isManual)
                ? 'text-[10px] font-extrabold text-primary dark:text-primary-fixed'
                : 'text-[10px] font-bold text-on-surface-variant dark:text-zinc-500';
        }
    });
    // Update mode banner
    const modeTitle = document.getElementById('ctrl-mode-title');
    const modeDesc = document.getElementById('ctrl-mode-desc');
    const modeIcon = document.getElementById('ctrl-mode-icon');
    const modeIconWrap = document.getElementById('ctrl-mode-icon-wrap');
    const modeBadge = document.getElementById('ctrl-mode-badge');
    const lockedHint = document.getElementById('ctrl-locked-hint');
    const manualHint = document.getElementById('ctrl-manual-hint');
    const modePill = document.getElementById('header-mode-pill');
    const modePillIcon = document.getElementById('header-mode-icon');
    const modePillText = document.getElementById('header-mode-text');
    if (isManual) {
        if (modeTitle) modeTitle.innerText = 'Manual Override';
        if (modeDesc) modeDesc.innerText = 'You control devices directly';
        if (modeIcon) { modeIcon.innerText = 'tune'; modeIcon.style.color = '#f59e0b'; }
        if (modeIconWrap) modeIconWrap.style.cssText = 'width:40px;height:40px;border-radius:12px;background:#fff8e6;display:flex;align-items:center;justify-content:center;flex-shrink:0;';
        if (modeBadge) { modeBadge.innerText = 'MANUAL'; modeBadge.style.cssText = 'background:#f59e0b;color:#fff;font-size:8px;font-weight:800;letter-spacing:.05em;padding:2px 6px;border-radius:999px;'; }
        if (lockedHint) lockedHint.classList.add('hidden');
        if (manualHint) {
            manualHint.classList.remove('hidden');
            const sinceLabel = document.getElementById('manual-since-label');
            if (sinceLabel) {
                const now = new Date();
                const h = now.getHours(), m = now.getMinutes();
                const ampm = h >= 12 ? 'PM' : 'AM';
                const h12 = h % 12 || 12;
                const mm = String(m).padStart(2, '0');
                sinceLabel.innerText = `Active since ${h12}:${mm} ${ampm}`;
            }
        }
        if (modePill) modePill.className = 'flex items-center gap-1.5 px-2.5 py-1 rounded-full border cursor-pointer active:scale-95 transition-all duration-300 bg-warning-gold/20 border-warning-gold/60 text-warning-gold';
        if (modePillIcon) modePillIcon.innerText = 'tune';
        if (modePillText) modePillText.innerText = 'MANUAL';
    } else {
        const isScheduled = scheduleConfig && scheduleConfig.masterEnabled;
        if (modeTitle) modeTitle.innerText = isScheduled ? 'Scheduled Auto' : 'Fully Automatic';
        if (modeDesc) modeDesc.innerText = isScheduled ? 'Devices follow scheduled timers' : 'System adjusts devices automatically';
        if (modeIcon) { modeIcon.innerText = isScheduled ? 'schedule' : 'smart_toy'; modeIcon.style.color = ''; }
        if (modeIconWrap) modeIconWrap.style.cssText = '';
        if (modeBadge) { modeBadge.innerText = isScheduled ? 'SCHEDULED' : 'AUTO'; modeBadge.style.cssText = ''; }
        if (lockedHint) lockedHint.classList.remove('hidden');
        if (manualHint) manualHint.classList.add('hidden');
        if (modePill) modePill.className = 'flex items-center gap-1.5 px-2.5 py-1 rounded-full border cursor-pointer active:scale-95 transition-all duration-300 bg-success-green/10 border-success-green/30 text-success-green dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-400';
        if (modePillIcon) modePillIcon.innerText = isScheduled ? 'schedule' : 'smart_toy';
        if (modePillText) modePillText.innerText = isScheduled ? 'SCHED' : 'AUTO';
    }
    // Schedule config section: only visible in Auto mode AND only for admin
    const schedSection = document.getElementById('schedule-config-section');
    const schedSectionMobile = document.getElementById('schedule-config-section-mobile');
    const isAdmin = state.currentUser && state.currentUser.role === 'admin';
    if (schedSection) schedSection.classList.toggle('hidden', isManual || !isAdmin);
    if (schedSectionMobile) schedSectionMobile.classList.toggle('hidden', isManual || !isAdmin);
}

