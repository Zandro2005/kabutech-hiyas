// ─────────────────────────────────────────────────────────────────
//  SCHEDULE CONFIGURATION  (Admin-only traditional-routine automation)
//  Stores: masterEnabled, per-device enabled + params, persisted to
//  localStorage under 'kb_schedule_config'.
// ─────────────────────────────────────────────────────────────────

const DEFAULT_SCHEDULE = {
    masterEnabled: false,
    misters: { enabled: false, duration: 30, interval: 2 },
    fan: { enabled: false, on1: '06:00', off1: '08:00', on2: '14:00', off2: '16:00' },
    lights: { enabled: false, on: '06:30', off: '19:00' }
};

let scheduleConfig = JSON.parse(JSON.stringify(DEFAULT_SCHEDULE));

// Mister cycle tracker (so we don't fire multiple overlapping cycles)
let _misterCycleTimer = null;
let _misterOffTimer = null;
let _lastMisterCycleMin = -1; // tracks which minute we last started a cycle

function loadScheduleConfig() {
    // Rely on firebase-config.js onValue listener to overwrite this.
    // We just ensure UI reflects default state initially.
    applyScheduleConfigToUI();
}

function saveScheduleConfig() {
    // Pull live values from inputs before saving
    const dur = parseInt(document.getElementById('sched-misters-duration')?.value) || 30;
    const intv = parseInt(document.getElementById('sched-misters-interval')?.value) || 2;
    scheduleConfig.misters.duration = Math.max(1, Math.min(120, dur)); // 1-120 min
    scheduleConfig.misters.interval = Math.max(1, Math.min(24, intv)); // 1-24 hours
    scheduleConfig.fan.on1 = document.getElementById('sched-fan-on1')?.value || '06:00';
    scheduleConfig.fan.off1 = document.getElementById('sched-fan-off1')?.value || '08:00';
    scheduleConfig.fan.on2 = document.getElementById('sched-fan-on2')?.value || '14:00';
    scheduleConfig.fan.off2 = document.getElementById('sched-fan-off2')?.value || '16:00';
    scheduleConfig.lights.on = document.getElementById('sched-lights-on')?.value || '06:30';
    scheduleConfig.lights.off = document.getElementById('sched-lights-off')?.value || '19:00';
    if(window.fbDB) fbDB.ref('kabutech/settings/schedule').set(scheduleConfig);
    updateMisterSummary();
    updateFanSummary();
    updateLightsSummary();
    queueScheduleSavedToast();
}

// Debounced so rapid-fire input events (e.g. dragging a slider) only
// trigger a single "Schedule saved" notification once the user
// actually stops adjusting, instead of one per tick.
let _schedSaveToastTimer = null;
function queueScheduleSavedToast() {
    clearTimeout(_schedSaveToastTimer);
    _schedSaveToastTimer = setTimeout(() => {
        showScheduleSavedToast();
    }, 500);
}

function syncScheduleEntryBadge(enabled) {
    const text = enabled ? 'Scheduling active — tap to edit' : 'Tap to configure timers & schedules';
    ['', '-mobile'].forEach(suffix => {
        const badge = document.getElementById(`schedule-entry-badge${suffix}`);
        const status = document.getElementById(`schedule-entry-status${suffix}`);
        if (badge) badge.classList.toggle('hidden', !enabled);
        if (status) status.textContent = text;
    });
}

function applyScheduleConfigToUI() {
    // Master toggle
    const masterCb = document.getElementById('toggle-schedule-master');
    const masterLbl = document.getElementById('lbl-schedule-master');
    const masterKnob = document.getElementById('toggle-schedule-master-knob');
    if (masterCb) masterCb.checked = scheduleConfig.masterEnabled;
    if (masterLbl) masterLbl.textContent = scheduleConfig.masterEnabled ? 'ON' : 'OFF';
    if (masterKnob) masterKnob.style.transform = scheduleConfig.masterEnabled ? 'translateX(15px)' : 'translateX(0)';
    const masterTrack = document.getElementById('toggle-schedule-master-track');
    if (masterTrack) masterTrack.style.backgroundColor = scheduleConfig.masterEnabled ? '#004521' : '';

    const banner = document.getElementById('schedule-active-banner');
    if (banner) banner.classList.toggle('hidden', !scheduleConfig.masterEnabled);
    
    syncScheduleEntryBadge(scheduleConfig.masterEnabled);
    
    const masterSub = document.getElementById('schedule-master-sub');
    if (masterSub) masterSub.textContent = scheduleConfig.masterEnabled ? 'Scheduling is active' : 'Scheduling is off';

    // Per-device toggles + labels
    const devices = [
        { key: 'misters', cbId: 'toggle-sched-misters', lblId: 'lbl-schedule-misters', knobId: 'toggle-sched-misters-knob' },
        { key: 'fan', cbId: 'toggle-sched-fan', lblId: 'lbl-schedule-fan', knobId: 'toggle-sched-fan-knob' },
        { key: 'lights', cbId: 'toggle-sched-lights', lblId: 'lbl-schedule-lights', knobId: 'toggle-sched-lights-knob' }
    ];
    devices.forEach(({ key, cbId, lblId, knobId }) => {
        const cb = document.getElementById(cbId);
        const lbl = document.getElementById(lblId);
        const knob = document.getElementById(knobId);
        const enabled = scheduleConfig[key]?.enabled || false;
        if (cb) cb.checked = enabled;
        if (lbl) lbl.textContent = enabled ? 'ON' : 'OFF';
        if (lbl) { lbl.classList.toggle('text-primary', enabled); lbl.classList.toggle('dark:text-primary-fixed', enabled); }
        if (knob) knob.style.transform = enabled ? 'translateX(1rem)' : '';
        syncDeskToggle(key, enabled);
    });

    // Input values
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
    set('sched-misters-duration', scheduleConfig.misters.duration);
    set('sched-misters-interval', scheduleConfig.misters.interval);
    set('sched-fan-on1', scheduleConfig.fan.on1);
    set('sched-fan-off1', scheduleConfig.fan.off1);
    set('sched-fan-on2', scheduleConfig.fan.on2);
    set('sched-fan-off2', scheduleConfig.fan.off2);
    set('sched-lights-on', scheduleConfig.lights.on);
    set('sched-lights-off', scheduleConfig.lights.off);

    // Update display spans (visible time labels on the time-picker buttons)
    const fmtDisp = t => {
        if (!t) return '--:--';
        const [h, m] = t.split(':').map(Number);
        const ampm = h < 12 ? 'AM' : 'PM';
        const hh = h % 12 || 12;
        return `${hh}:${String(m).padStart(2, '0')} ${ampm}`;
    };
    const setDisp = (id, val) => { const el = document.getElementById(id + '-display'); if (el) el.textContent = fmtDisp(val); };
    setDisp('sched-fan-on1', scheduleConfig.fan.on1);
    setDisp('sched-fan-off1', scheduleConfig.fan.off1);
    setDisp('sched-fan-on2', scheduleConfig.fan.on2);
    setDisp('sched-fan-off2', scheduleConfig.fan.off2);
    setDisp('sched-lights-on', scheduleConfig.lights.on);
    setDisp('sched-lights-off', scheduleConfig.lights.off);

    // Summaries
    updateMisterSummary();
    updateFanSummary();
    updateLightsSummary();
    renderAutomationInsights();
}

function toggleScheduleMaster(enabled) {
    // If enabling while in manual mode, auto-switch to auto mode first
    if (enabled && state.systemMode === 'manual') {
        setSystemMode('auto');
    }
    scheduleConfig.masterEnabled = enabled;
    const lbl = document.getElementById('lbl-schedule-master');
    const knob = document.getElementById('toggle-schedule-master-knob');
    const track = document.getElementById('toggle-schedule-master-track');
    if (lbl) lbl.textContent = enabled ? 'ON' : 'OFF';
    if (knob) knob.style.transform = enabled ? 'translateX(15px)' : 'translateX(0)';
    if (track) track.style.backgroundColor = enabled ? '#004521' : '';
    const banner = document.getElementById('schedule-active-banner');
    if (banner) banner.classList.toggle('hidden', !enabled);
    
    syncScheduleEntryBadge(enabled);
    
    const masterSub = document.getElementById('schedule-master-sub');
    if (masterSub) masterSub.textContent = enabled ? 'Scheduling is active' : 'Scheduling is off';
    try { localStorage.setItem('kb_schedule_config', JSON.stringify(scheduleConfig)); } catch (e) { }
    addLog(`Scheduled configuration ${enabled ? 'enabled' : 'disabled'}.`, enabled ? 'success' : 'info');
    pushSchedNotification(
        enabled
            ? '<strong>Scheduling enabled</strong> — devices will follow their set timers'
            : '<strong>Scheduling disabled</strong> — timers are paused',
        enabled ? 'success' : 'warning'
    );
    syncDeviceButtons();
    renderAutomationInsights();
}

function pushSchedNotification(msg, type) {
    const feed = document.getElementById('sched-notifications-feed');
    if (!feed) return;
    const styles = {
        info: { bg: '#e8f5ee', border: '#a7d4b8', color: '#1a6640', icon: 'check_circle' },
        success: { bg: '#d4edda', border: '#5cb85c', color: '#155724', icon: 'check_circle' },
        warning: { bg: '#fff8e6', border: '#f0b429', color: '#92600a', icon: 'toggle_off' },
        saved: { bg: '#e8f5ee', border: '#5cb85c', color: '#155724', icon: 'save' }
    };
    const s = styles[type] || styles.info;
    const notif = document.createElement('div');
    notif.style.cssText = `display:inline-flex;align-items:center;gap:6px;border:1px solid ${s.border};border-radius:10px;padding:8px 16px;background:${s.bg};color:${s.color};opacity:0;transform:translateY(-6px);transition:opacity 0.3s ease,transform 0.3s ease;max-width:min(640px,100%);width:fit-content;`;
    notif.innerHTML = `<span class="material-symbols-outlined" style="font-size:13px;flex-shrink:0;font-variation-settings:'FILL' 1">${s.icon}</span>
                <p style="font-size:9.5px;font-weight:600;line-height:1.3;margin:0">${msg}</p>
                <button onclick="this.parentElement.style.opacity='0';setTimeout(()=>this.parentElement.remove(),300)" style="background:none;border:none;cursor:pointer;padding:1px;opacity:0.5;flex-shrink:0;color:inherit;display:flex">
                    <span class="material-symbols-outlined" style="font-size:12px">close</span>
                </button>`;
    feed.prepend(notif);
    requestAnimationFrame(() => requestAnimationFrame(() => {
        notif.style.opacity = '1';
        notif.style.transform = 'translateY(0)';
    }));
    setTimeout(() => {
        notif.style.opacity = '0';
        notif.style.transform = 'translateY(-6px)';
        setTimeout(() => notif.remove(), 300);
    }, 4000);
    while (feed.children.length > 3) feed.lastElementChild.remove();
}

function toggleDeviceSchedule(device, enabled) {
    if (!scheduleConfig[device]) return;
    scheduleConfig[device].enabled = enabled;
    const lblId = `lbl-schedule-${device}`;
    const knobId = `toggle-sched-${device}-knob`;
    const lbl = document.getElementById(lblId);
    const knob = document.getElementById(knobId);
    if (lbl) { lbl.textContent = enabled ? 'ON' : 'OFF'; lbl.classList.toggle('text-primary', enabled); }
    if (knob) knob.style.transform = enabled ? 'translateX(1rem)' : '';
    syncDeskToggle(device, enabled);
    try { localStorage.setItem('kb_schedule_config', JSON.stringify(scheduleConfig)); } catch (e) { }
    const deviceLabel = { misters: 'Misters', fan: 'Fan', lights: 'Grow Lights' }[device] || device;
    const deviceIcon = { misters: 'water_drop', fan: 'mode_fan', lights: 'wb_incandescent' }[device] || 'toggle_on';
    addLog(`${deviceLabel} schedule ${enabled ? 'enabled' : 'disabled'}.`, 'info');
    pushSchedNotification(`<strong>${deviceLabel}</strong> schedule turned <strong>${enabled ? 'ON' : 'OFF'}</strong>`, enabled ? 'success' : 'warning');
    renderAutomationInsights();
}

// ── Desktop-redesign helpers (subpage-schedule-config) ────────────
// Keeps the >=768px two-column layout's toggle switches, sliders,
// and Automation Insights panel in sync with the exact same
// scheduleConfig object the mobile cards read/write.
function syncDeskToggle(device, enabled) {
    const track = document.getElementById(`toggle-sched-${device}-dsk-track`);
    const cb = document.getElementById(`toggle-sched-${device}-dsk`);
    if (cb) cb.checked = enabled;
    if (track) track.classList.toggle('on', enabled);
}

// ── Summary text helpers ──────────────────────────────────────────
function updateMisterSummary() {
    const dur = scheduleConfig.misters.duration || 30;
    const intv = scheduleConfig.misters.interval || 2;
    const el = document.getElementById('mister-summary-text');
    const elIntv = document.getElementById('mister-summary-interval');
    if (el) el.textContent = `${dur} min`;
    if (elIntv) elIntv.textContent = `${intv} hr`;
    // also update display fields
    const durDisp = document.getElementById('sched-misters-duration-display');
    const intvDisp = document.getElementById('sched-misters-interval-display');
    if (durDisp) durDisp.textContent = dur;
    if (intvDisp) intvDisp.textContent = intv;

    // Desktop layout: sliders + labels + cycle preview
    const durRange = document.getElementById('sched-misters-duration-range');
    const intvRange = document.getElementById('sched-misters-interval-range');
    if (durRange) durRange.value = dur;
    if (intvRange) intvRange.value = intv;
    const durDispDsk = document.getElementById('sched-misters-duration-display-dsk');
    const intvDispDsk = document.getElementById('sched-misters-interval-display-dsk');
    if (durDispDsk) durDispDsk.textContent = `${dur} min`;
    if (intvDispDsk) intvDispDsk.textContent = `Every ${intv} hr`;
    updateCyclePreview(dur, intv);
}

function setMisterSlider(type, rawVal) {
    const val = Math.max(1, Math.min(type === 'duration' ? 120 : 24, parseInt(rawVal) || 1));
    const hiddenEl = document.getElementById(`sched-misters-${type}`);
    if (hiddenEl) hiddenEl.value = val;
    const mobileDisp = document.getElementById(`sched-misters-${type}-display`);
    if (mobileDisp) mobileDisp.textContent = val;
    scheduleConfig.misters[type] = val;
    updateMisterSummary();
    saveScheduleConfig();
    renderAutomationInsights();
}

function updateCyclePreview(dur, intv) {
    const bar = document.getElementById('sched-dsk-cycle-bar');
    const text = document.getElementById('sched-dsk-cycle-text');
    if (text) text.textContent = `${dur}m ON / ${intv}h OFF`;
    if (!bar) return;
    const segments = 10;
    const onFraction = Math.min(1, dur / (Math.max(intv, 0.1) * 60));
    const activeCount = Math.max(1, Math.min(segments - 1, Math.round(onFraction * segments)));
    let html = '';
    for (let i = 0; i < segments; i++) {
        html += `<span class="${i < activeCount ? 'active' : ''}"></span>`;
    }
    bar.innerHTML = html;
}

function stepMisterVal(type, delta) {
    const hiddenId = `sched-misters-${type}`;
    const displayId = `sched-misters-${type}-display`;
    const el = document.getElementById(hiddenId);
    const disp = document.getElementById(displayId);
    if (!el) return;
    let val = parseInt(el.value) || (type === 'duration' ? 30 : 2);
    if (type === 'duration') {
        val = Math.max(1, Math.min(120, val + delta)); // 1-120 minutes
    } else {
        val = Math.max(1, Math.min(24, val + delta)); // 1-24 hours
    }
    el.value = val;
    if (disp) disp.textContent = val;
    scheduleConfig.misters[type] = val;
    updateMisterSummary();
    saveScheduleConfig();
}

function updateFanSummary() {
    const fmt = t => {
        if (!t) return '--:--';
        const [h, m] = t.split(':').map(Number);
        const ampm = h < 12 ? 'AM' : 'PM';
        const hh = h % 12 || 12;
        return `${hh}:${String(m).padStart(2, '0')} ${ampm}`;
    };
    const sc = scheduleConfig.fan;
    const el = document.getElementById('fan-summary-text');
    if (el) el.textContent = `${fmt(sc.on1)}–${fmt(sc.off1)} & ${fmt(sc.on2)}–${fmt(sc.off2)}`;

    // Desktop layout window boxes
    const setDsk = (id, val) => { const dEl = document.getElementById(id + '-display-dsk'); if (dEl) dEl.textContent = fmt(val); };
    setDsk('sched-fan-on1', sc.on1);
    setDsk('sched-fan-off1', sc.off1);
    setDsk('sched-fan-on2', sc.on2);
    setDsk('sched-fan-off2', sc.off2);
}

function updateLightsSummary() {
    const sc = scheduleConfig.lights;
    const toMin = t => { if (!t) return 0; const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    const fmt = t => {
        if (!t) return '--:--';
        const [h, m] = t.split(':').map(Number);
        const ampm = h < 12 ? 'AM' : 'PM';
        const hh = h % 12 || 12;
        return `${hh}:${String(m).padStart(2, '0')} ${ampm}`;
    };
    let diff = toMin(sc.off) - toMin(sc.on);
    if (diff < 0) diff += 1440; // crosses midnight
    const h = Math.floor(diff / 60), m = diff % 60;
    const period = `${h > 0 ? h + 'h ' : ''}${m > 0 ? m + 'min' : ''}`.trim() || '0min';
    const periodEl = document.getElementById('lights-photoperiod');
    const badgeEl = document.getElementById('lights-period-badge');
    if (periodEl) periodEl.textContent = period;
    if (badgeEl) badgeEl.textContent = `${fmt(sc.on)} – ${fmt(sc.off)}`;

    // Desktop layout
    const setDsk = (id, val) => { const dEl = document.getElementById(id + '-display-dsk'); if (dEl) dEl.textContent = fmt(val); };
    setDsk('sched-lights-on', sc.on);
    setDsk('sched-lights-off', sc.off);
    const periodElDsk = document.getElementById('lights-photoperiod-dsk');
    if (periodElDsk) periodElDsk.textContent = period;
}

// ── Toast ─────────────────────────────────────────────────────────
let _schedToastTimer = null;
function showScheduleSavedToast() {
    pushSchedNotification('Schedule <strong>saved</strong>', 'saved');
}

// ── Automation Insights (desktop right-column panel) ──────────────
// Purely a read-out of the live scheduleConfig object below — no
// separate state of its own, so it never drifts from what the
// Misters / Circulation Fans / Grow Lights cards actually say.
function _schedTimeToMin(t) {
    if (!t) return 0;
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
}
function _schedMinToLabel(min) {
    min = ((min % 1440) + 1440) % 1440;
    const h = Math.floor(min / 60), m = min % 60;
    const ampm = h < 12 ? 'AM' : 'PM';
    const hh = h % 12 || 12;
    return `${hh}:${String(m).padStart(2, '0')} ${ampm}`;
}

function renderAutomationInsights() {
    const timelineEl = document.getElementById('sched-dsk-timeline');
    if (!timelineEl) return; // desktop layout not present (mobile viewport)

    const sc = scheduleConfig;
    const events = [];
    if (sc.fan.enabled) {
        events.push({ min: _schedTimeToMin(sc.fan.on1), label: 'Fans start — Window 1' });
        events.push({ min: _schedTimeToMin(sc.fan.off1), label: 'Fans end — Window 1' });
        events.push({ min: _schedTimeToMin(sc.fan.on2), label: 'Fans start — Window 2' });
        events.push({ min: _schedTimeToMin(sc.fan.off2), label: 'Fans end — Window 2' });
    }
    if (sc.lights.enabled) {
        events.push({ min: _schedTimeToMin(sc.lights.on), label: 'Lights start' });
        events.push({ min: _schedTimeToMin(sc.lights.off), label: 'Lights end' });
    }

    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    events.push({ min: nowMin, label: 'NOW', isNow: true });
    events.sort((a, b) => a.min - b.min);

    let html = '';
    if (events.length <= 1) {
        html = '<p class="sched-dsk-tl-empty">Enable a device schedule to see its timeline.</p>';
    } else {
        events.forEach(ev => {
            html += `<div class="sched-dsk-tl-row${ev.isNow ? ' sched-dsk-tl-now' : ''}">
                        <span class="sched-dsk-tl-time">${ev.isNow ? 'NOW · ' + _schedMinToLabel(ev.min) : _schedMinToLabel(ev.min)}</span>
                        <span class="sched-dsk-tl-label">${ev.label}</span>
                    </div>`;
        });
    }
    if (sc.misters.enabled) {
        html += `<p class="sched-dsk-tl-empty" style="margin-top:-8px">Misters cycle every <strong>${sc.misters.interval}h</strong> (${sc.misters.duration}min run)</p>`;
    }
    timelineEl.innerHTML = html;

    // Daily energy forecast: rough draw estimate per device based on
    // typical grow-house component wattage (mister pump ~45W, each
    // ventilation fan ~30W, full-spectrum LED panel ~60W).
    let kwh = 0;
    if (sc.lights.enabled) {
        let diff = _schedTimeToMin(sc.lights.off) - _schedTimeToMin(sc.lights.on);
        if (diff < 0) diff += 1440;
        kwh += (diff / 60) * 0.06;
    }
    if (sc.fan.enabled) {
        const seg = (a, b) => { let d = _schedTimeToMin(b) - _schedTimeToMin(a); if (d < 0) d += 1440; return d / 60; };
        kwh += (seg(sc.fan.on1, sc.fan.off1) + seg(sc.fan.on2, sc.fan.off2)) * 0.03;
    }
    if (sc.misters.enabled) {
        const cyclesPerDay = 24 / Math.max(sc.misters.interval, 0.1);
        kwh += cyclesPerDay * (sc.misters.duration / 60) * 0.045;
    }
    const cost = kwh * 0.12; // assumed $0.12/kWh
    const kwhEl = document.getElementById('sched-dsk-energy-kwh');
    const costEl = document.getElementById('sched-dsk-energy-cost');
    const barEl = document.getElementById('sched-dsk-energy-bar');
    if (kwhEl) kwhEl.textContent = kwh.toFixed(1);
    if (costEl) costEl.textContent = `$${cost.toFixed(2)}`;
    if (barEl) barEl.style.width = `${Math.max(4, Math.min(100, (kwh / 20) * 100))}%`;
}

function togglePresetMenu() {
    const menu = document.getElementById('sched-dsk-preset-menu');
    if (menu) menu.classList.toggle('hidden');
}

const SCHEDULE_PRESETS = {
    fruiting: {
        label: 'Standard Fruiting',
        misters: { duration: 30, interval: 2 },
        fan: { on1: '06:00', off1: '08:00', on2: '14:00', off2: '16:00' },
        lights: { on: '06:30', off: '19:00' }
    },
    humidity: {
        label: 'High Humidity Boost',
        misters: { duration: 45, interval: 1 },
        fan: { on1: '06:00', off1: '07:00', on2: '15:00', off2: '16:00' },
        lights: { on: '06:30', off: '18:30' }
    },
    saver: {
        label: 'Energy Saver',
        misters: { duration: 15, interval: 3 },
        fan: { on1: '06:30', off1: '07:30', on2: '15:30', off2: '16:30' },
        lights: { on: '07:00', off: '17:00' }
    }
};

function applySchedulePreset(key) {
    const preset = SCHEDULE_PRESETS[key];
    if (!preset) return;
    scheduleConfig.misters.duration = preset.misters.duration;
    scheduleConfig.misters.interval = preset.misters.interval;
    Object.assign(scheduleConfig.fan, preset.fan);
    Object.assign(scheduleConfig.lights, preset.lights);
    try { localStorage.setItem('kb_schedule_config', JSON.stringify(scheduleConfig)); } catch (e) { }
    applyScheduleConfigToUI();
    const menu = document.getElementById('sched-dsk-preset-menu');
    if (menu) menu.classList.add('hidden');
    addLog(`Applied "${preset.label}" schedule preset.`, 'success');
    pushSchedNotification(`Preset <strong>${preset.label}</strong> applied to all devices`, 'success');
}

function exportProtocolSummary() {
    const sc = scheduleConfig;
    const fmt = t => _schedMinToLabel(_schedTimeToMin(t));
    const lines = [
        'KabuTech — Device Schedule Protocol Summary',
        `Generated: ${new Date().toLocaleString()}`,
        `Master scheduling: ${sc.masterEnabled ? 'ON' : 'OFF'}`,
        '',
        `Misters — ${sc.misters.enabled ? 'ENABLED' : 'disabled'}`,
        `  Run duration: ${sc.misters.duration} min, every ${sc.misters.interval} hr`,
        '',
        `Circulation Fans — ${sc.fan.enabled ? 'ENABLED' : 'disabled'}`,
        `  Window 1 (Morning): ${fmt(sc.fan.on1)} – ${fmt(sc.fan.off1)}`,
        `  Window 2 (Afternoon): ${fmt(sc.fan.on2)} – ${fmt(sc.fan.off2)}`,
        '',
        `Full-Spectrum Grow Lights — ${sc.lights.enabled ? 'ENABLED' : 'disabled'}`,
        `  Lights ON at ${fmt(sc.lights.on)}, OFF at ${fmt(sc.lights.off)}`,
        '',
        `Estimated daily energy: ${document.getElementById('sched-dsk-energy-kwh')?.textContent || '0.0'} kWh (${document.getElementById('sched-dsk-energy-cost')?.textContent || '$0.00'}/day)`
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kabutech-protocol-summary-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    pushSchedNotification('Protocol summary <strong>exported</strong>', 'saved');
}

// ── Time Picker ───────────────────────────────────────────────────
let _tpTargetId = null; // hidden input id to write back to
let _tpHour = 6, _tpMin = 0, _tpAmpm = 'AM';
let _tpChainId = null; // if set, opens this target right after confirming the current one
let _tpChainLabel = null;

function openTimePicker(targetId, label, chainId, chainLabel) {
    _tpTargetId = targetId;
    _tpChainId = chainId || null;
    _tpChainLabel = chainLabel || null;
    const hiddenEl = document.getElementById(targetId);
    if (hiddenEl && hiddenEl.value) {
        const [h, m] = hiddenEl.value.split(':').map(Number);
        _tpAmpm = h < 12 ? 'AM' : 'PM';
        _tpHour = h % 12 || 12;
        _tpMin = m;
    } else {
        _tpHour = 6; _tpMin = 0; _tpAmpm = 'AM';
    }
    const modal = document.getElementById('time-picker-modal');
    const labelEl = document.getElementById('time-picker-label');
    if (labelEl) labelEl.textContent = label || 'Set Time';
    _tpRefreshDisplay();
    if (modal) modal.classList.remove('hidden');
}

function closeTimePicker() {
    const modal = document.getElementById('time-picker-modal');
    if (modal) modal.classList.add('hidden');
}

function _tpRefreshDisplay() {
    const hEl = document.getElementById('tp-hour');
    const mEl = document.getElementById('tp-min');
    const pEl = document.getElementById('tp-ampm');
    const dispEl = document.getElementById('time-picker-display');
    if (hEl) hEl.textContent = _tpHour;
    if (mEl) mEl.textContent = String(_tpMin).padStart(2, '0');
    if (pEl) pEl.textContent = _tpAmpm;
    if (dispEl) dispEl.textContent = `${_tpHour}:${String(_tpMin).padStart(2, '0')} ${_tpAmpm}`;
}

function stepTime(part, delta) {
    if (part === 'h') {
        _tpHour = ((_tpHour - 1 + delta + 12) % 12) + 1;
    } else if (part === 'm') {
        _tpMin = (_tpMin + delta * 5 + 60) % 60;
    } else if (part === 'p') {
        _tpAmpm = _tpAmpm === 'AM' ? 'PM' : 'AM';
    }
    _tpRefreshDisplay();
}

function confirmTimePicker() {
    if (!_tpTargetId) { closeTimePicker(); return; }
    // Convert to 24h
    let h24 = _tpHour % 12;
    if (_tpAmpm === 'PM') h24 += 12;
    const timeStr = `${String(h24).padStart(2, '0')}:${String(_tpMin).padStart(2, '0')}`;
    // Write to hidden input
    const hiddenEl = document.getElementById(_tpTargetId);
    if (hiddenEl) hiddenEl.value = timeStr;
    // Update display span (mobile + desktop mirror, if present)
    const displayEl = document.getElementById(_tpTargetId + '-display');
    const formatted = `${_tpHour}:${String(_tpMin).padStart(2, '0')} ${_tpAmpm}`;
    if (displayEl) displayEl.textContent = formatted;
    // Save and update summaries
    saveScheduleConfig();
    renderAutomationInsights();
    // Guided two-step edit (e.g. a fan window's ON time chains to its OFF time)
    if (_tpChainId) {
        const nextId = _tpChainId, nextLabel = _tpChainLabel;
        _tpChainId = null; _tpChainLabel = null;
        closeTimePicker();
        setTimeout(() => openTimePicker(nextId, nextLabel), 220);
        return;
    }
    closeTimePicker();
}

// Desktop "Circulation Fans" window boxes edit both ON and OFF times
// in one guided flow, reusing the exact same hidden inputs / save
// pipeline as the mobile ON/OFF button pair.
function openFanWindowEditor(windowNum) {
    const onId = `sched-fan-on${windowNum}`;
    const offId = `sched-fan-off${windowNum}`;
    const label = windowNum === 1 ? 'Morning' : 'Afternoon';
    openTimePicker(onId, `Fan ON — Window ${windowNum} (${label})`, offId, `Fan OFF — Window ${windowNum} (${label})`);
}

// ── Schedule tick — called inside runSimulationTick every 3s ──────
function runScheduleTick() {
    if (!scheduleConfig.masterEnabled) return;

    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const nowMin = now.getHours() * 60 + now.getMinutes();

    // ── Lights schedule ───────────────────────────────────────────
    if (scheduleConfig.lights.enabled) {
        const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
        const onMin = toMin(scheduleConfig.lights.on || '06:30');
        const offMin = toMin(scheduleConfig.lights.off || '19:00');
        const shouldBeOn = onMin <= offMin
            ? (nowMin >= onMin && nowMin < offMin)
            : (nowMin >= onMin || nowMin < offMin); // crosses midnight
        if (state.deviceStates.lights !== shouldBeOn) {
            state.deviceStates.lights = shouldBeOn;
            if (shouldBeOn) state.deviceUptimeStart.lights = Date.now();
            else state.deviceUptimeStart.lights = null;
            updateQuickControlsUI();
            saveSetpoints();
        }
    }

    // ── Fan schedule ──────────────────────────────────────────────
    if (scheduleConfig.fan.enabled) {
        const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
        const inWindow = (onT, offT) => {
            const onM = toMin(onT), offM = toMin(offT);
            return onM <= offM
                ? (nowMin >= onM && nowMin < offM)
                : (nowMin >= onM || nowMin < offM);
        };
        const fanOn = inWindow(scheduleConfig.fan.on1 || '06:00', scheduleConfig.fan.off1 || '08:00')
            || inWindow(scheduleConfig.fan.on2 || '14:00', scheduleConfig.fan.off2 || '16:00');
        if (state.deviceStates.fans !== fanOn) {
            state.deviceStates.fans = fanOn;
            if (fanOn) state.deviceUptimeStart.fans = Date.now();
            else state.deviceUptimeStart.fans = null;
            updateQuickControlsUI();
            saveSetpoints();
        }
    }

    // ── Misters schedule (interval + duration) ────────────────────
    if (scheduleConfig.misters.enabled) {
        const intervalHours = scheduleConfig.misters.interval || 2; // hours
        const intervalMinutes = intervalHours * 60;
        const durationMin = scheduleConfig.misters.duration || 30; // minutes
        // Fire at the start of every nth minute (interval in minutes)
        const cycleMin = Math.floor(nowMin / intervalMinutes) * intervalMinutes;
        if (now.getSeconds() < 4 && cycleMin !== _lastMisterCycleMin) {
            _lastMisterCycleMin = cycleMin;
            // Turn ON
            state.deviceStates.misters = true;
            state.deviceUptimeStart.misters = Date.now();
            updateQuickControlsUI();
            saveSetpoints();
            addLog(`Scheduled misting started (${durationMin} min).`, 'info');
            // Schedule turn OFF after duration minutes
            if (_misterOffTimer) clearTimeout(_misterOffTimer);
            _misterOffTimer = setTimeout(() => {
                state.deviceStates.misters = false;
                state.deviceUptimeStart.misters = null;
                updateQuickControlsUI();
                saveSetpoints();
                addLog('Scheduled misting cycle complete.', 'success');
            }, durationMin * 60 * 1000);
        }
    }
}

function updateQuickControlsUI() {
    // Sync quick-control chips on home tab with current device state
    ['fans', 'misters', 'lights'].forEach(dev => {
        const on = state.deviceStates[dev];
        const btn = document.getElementById(`btn-quick-${dev}`);
        const icon = document.getElementById(`icon-quick-${dev}`);
        const statusEl = document.getElementById(`status-quick-${dev}`);
        if (btn) {
            btn.className = btn.className
                .replace(/bg-\S+/g, '')
                .replace(/border-\S+/g, '')
                .trim();
            if (on) {
                btn.classList.add('bg-primary', 'border-primary');
            } else {
                btn.classList.add('bg-surface-container-lowest', 'dark:bg-zinc-900', 'border-border-muted', 'dark:border-zinc-700');
            }
        }
        if (statusEl) statusEl.textContent = on ? 'ON' : 'OFF';
    });
}

