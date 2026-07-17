// --- 7. SENSOR SIMULATION ENGINE ---

// Demo drift cycle: each sensor cycles normal → warning → critical → recovery
// Tick interval: 3s. Phase length: 10 ticks = 30s per phase, full cycle = 120s
// Each sensor is staggered so they don't all change at the same time
// Drift overrides device physics while active so the color change is actually visible

let simDriftTick = 0;
const DRIFT_PHASE_LEN = 10; // ticks per phase (30s)

// Returns 0=normal, 1=warning, 2=critical, 3=recovery
function getDriftPhase(offset) {
    return Math.floor((simDriftTick + offset) / DRIFT_PHASE_LEN) % 4;
}

// Thresholds (must match updateSensorCardStatus exactly):
// Temp:     normal 18-28, warn <18|>28, critical <15|>32
// Humidity: normal 60-85, warn <60|>85, critical <45|>95
// Light:    normal 200-800, warn <200|>800, critical <80|>950
// CO2:      normal <800, warn 800-1200, critical >1200

// Target values for each drift phase (pushing HIGH for temp/CO2, LOW for humidity/light)
const DRIFT_TARGETS = {
    temp: [24, 30, 34, 24],  // normal, warn(>28), critical(>32), recover
    humidity: [72, 55, 40, 72],  // normal, warn(<60), critical(<45), recover
    light: [420, 150, 50, 420],  // normal, warn(<200), critical(<80), recover
    co2: [450, 950, 1350, 450],  // normal, warn(>800), critical(>1200), recover
};

// How fast to move toward target each tick (units/tick)
const DRIFT_SPEEDS = { temp: 0.7, humidity: 1.5, light: 18, co2: 55 };

function applyDrift(current, target, speed) {
    const diff = target - current;
    if (Math.abs(diff) < speed) return target;
    return current + Math.sign(diff) * speed;
}

function runSimulationTick() {
    // Run scheduled automation (admin traditional-routine config)
    runScheduleTick();

    simDriftTick++;

    const tempPhase = getDriftPhase(0);
    const humPhase = getDriftPhase(13); // staggered ~39s
    const lightPhase = getDriftPhase(7);  // staggered ~21s
    const co2Phase = getDriftPhase(20); // staggered ~60s

    // Apply drift — overrides device physics so color changes are visible
    if (!state.anomalies.overheat) {
        state.currentTemp = applyDrift(state.currentTemp, DRIFT_TARGETS.temp[tempPhase], DRIFT_SPEEDS.temp);
    }
    if (!state.anomalies.misterJammed) {
        state.currentHumidity = applyDrift(state.currentHumidity, DRIFT_TARGETS.humidity[humPhase], DRIFT_SPEEDS.humidity);
    }
    // Light drift only when device light is OFF (on = 850 cap dominates)
    if (!state.deviceStates.lights) {
        state.currentLight = applyDrift(state.currentLight, DRIFT_TARGETS.light[lightPhase], DRIFT_SPEEDS.light);
    }
    if (!state.anomalies.co2Spike) {
        state.currentCO2 = applyDrift(state.currentCO2, DRIFT_TARGETS.co2[co2Phase], DRIFT_SPEEDS.co2);
    }


    // Small random noise on top of drift (realistic jitter, doesn't override direction)
    state.currentTemp += (Math.random() - 0.5) * 0.1;
    state.currentHumidity += (Math.random() - 0.5) * 0.4;
    state.currentCO2 += Math.floor((Math.random() - 0.5) * 8);
    state.currentLight += Math.floor((Math.random() - 0.5) * 5);

    // Anomaly overrides (hard spikes, take priority over drift)
    if (state.anomalies.co2Spike) {
        state.currentCO2 += 40;
        if (state.currentCO2 > 1500) state.currentCO2 = 1500;
    }
    if (state.anomalies.misterJammed) {
        state.deviceStates.misters = false;
        state.currentHumidity -= 2.0;
    }
    if (state.anomalies.overheat) {
        state.currentTemp += 0.5;
    }

    // Constrain hard limits
    state.currentTemp = Math.max(10, Math.min(45, state.currentTemp));
    state.currentHumidity = Math.max(20, Math.min(100, state.currentHumidity));
    state.currentCO2 = Math.max(300, Math.min(2000, state.currentCO2));
    state.currentLight = Math.max(0, Math.min(1000, state.currentLight));

    // AUTOMATED ENVIRONMENT CONTROL LOOP — suspended; drift cycle drives simulation
    if (false) {
        let autoLogged = false;
        // Temperature control
        if (state.currentTemp > state.tempSetpoint + 0.5) {
            if (!state.deviceStates.fans) {
                state.deviceStates.fans = true;
                addLog(`Auto Mode triggered Circulation Fans ON. (Temp: ${state.currentTemp.toFixed(1)}°C, Target: ${state.tempSetpoint}°C)`, 'success');
            }
        } else if (state.currentTemp <= state.tempSetpoint) {
            if (state.deviceStates.fans) {
                state.deviceStates.fans = false;
                addLog(`Auto Mode triggered Circulation Fans OFF. (Temp: ${state.currentTemp.toFixed(1)}°C reached setpoint)`, 'success');
            }
        }

        // Humidity control
        if (state.currentHumidity < state.humiditySetpoint - 3.0) {
            if (!state.deviceStates.misters && !state.anomalies.misterJammed) {
                state.deviceStates.misters = true;
                addLog(`Auto Mode triggered Misting System ON. (Humidity: ${state.currentHumidity.toFixed(0)}%, Target: ${state.humiditySetpoint}%)`, 'success');
            }
        } else if (state.currentHumidity >= state.humiditySetpoint) {
            if (state.deviceStates.misters) {
                state.deviceStates.misters = false;
                addLog(`Auto Mode triggered Misting System OFF. (Humidity: ${state.currentHumidity.toFixed(0)}% reached setpoint)`, 'success');
            }
        }
    }

    // AUTOMATIC ANOMALY TRIP ALERTS
    checkAlertThresholds();

    // Refresh UI
    updateSensorDOM();
    syncControlsUI();
    updateSystemStatusMsg();
}

// Set sensor values instantly (no animation) — used before the dashboard
// is visible, so the count-up animation in updateSensorDOM() has a
// clean "from 0" start once the user actually sees the dashboard.
const SENSOR_CONFIGS = [
    { key: 'temp', getVal: () => state.currentTemp, decimals: 1, suffix: '\u00B0C' },
    { key: 'humidity', getVal: () => state.currentHumidity, decimals: 0, suffix: '%' },
    { key: 'light', getVal: () => state.currentLight, decimals: 0, suffix: ' \u00B5mol' },
    { key: 'co2', getVal: () => state.currentCO2, decimals: 0, suffix: ' ppm' }
];

function setSensorDOMStatic() {
    SENSOR_CONFIGS.forEach(s => {
        const v = s.getVal();
        const text = v.toFixed(s.decimals) + s.suffix;
        const el = document.getElementById(`sensor-${s.key}`);
        if (el) el.innerText = text;
        const mobileEl = document.getElementById(`sensor-${s.key}-mobile`);
        if (mobileEl) mobileEl.innerText = text;
        const ctrlEl = document.getElementById(`ctrl-current-${s.key}`);
        if (ctrlEl) ctrlEl.innerText = v.toFixed(s.decimals);
    });
}

// Replay the "count up from 0 to current value" intro animation for the
// dashboard sensor widgets (and setpoint-page mirrors), without touching
// trend badges or prevReadings. Used whenever the Home/Dashboard tab
// becomes visible (initial login, or switching back to it).
function playSensorIntroAnimation() {
    const duration = 2800;
    SENSOR_CONFIGS.forEach(s => {
        const v = s.getVal();
        countUpElement(document.getElementById(`sensor-${s.key}`), v, { decimals: s.decimals, suffix: s.suffix, duration, from: 0 });
        const mobileEl = document.getElementById(`sensor-${s.key}-mobile`);
        if (mobileEl) countUpElement(mobileEl, v, { decimals: s.decimals, suffix: s.suffix, duration, from: 0 });
        const ctrlEl = document.getElementById(`ctrl-current-${s.key}`);
        if (ctrlEl) countUpElement(ctrlEl, v, { decimals: s.decimals, duration, from: 0, key: `ctrl-current-${s.key}` });
    });
    dashboardEnteredOnce = true;
}

function updateSensorDOM(forceFromZero) {
    // Calculate trends vs previous reading
    function getTrendHTML(current, previous, unit, higherIsBad, isMobile=false) {
        const diff = current - previous;
        const pct = previous !== 0 ? Math.abs((diff / previous) * 100).toFixed(1) : '0.0';
        const isUp = diff > 0.05;
        const isDown = diff < -0.05;
        const textSz = isMobile ? 'text-[10px]' : 'text-[10px] md:text-[11px]';
        
        if (!isUp && !isDown) {
            return `<span class="flex items-center justify-center gap-0.5 w-full font-extrabold text-slate-400 dark:text-zinc-500 ${textSz}"><span class="material-symbols-outlined text-[12px]">horizontal_rule</span> 0%</span>`;
        }
        const alertTrend = (higherIsBad && isUp) || (!higherIsBad && isDown);
        const color = alertTrend ? 'text-red-500' : 'text-emerald-500 dark:text-emerald-400';
        const arrow = isUp ? 'arrow_upward' : 'arrow_downward';
        return `<span class="flex items-center justify-center gap-0.5 w-full font-extrabold ${color} ${textSz}"><span class="material-symbols-outlined text-[12px]">${arrow}</span>${pct}%</span>`;
    }

    // Use short animation on recurring ticks so numbers are never mid-animation
    // when card colors are evaluated. Intro (first load) uses longer count-up.
    const playIntro = forceFromZero || !dashboardEnteredOnce;
    const introDuration = playIntro ? 2200 : 600;
    const animFrom = playIntro ? { temp: 0, humidity: 0, light: 0, co2: 0 } : prevReadings;

    SENSOR_CONFIGS.forEach(s => {
        const v = s.getVal();
        countUpElement(document.getElementById(`sensor-${s.key}`), v, { decimals: s.decimals, suffix: s.suffix, duration: introDuration, from: animFrom[s.key] });
        const mobileEl = document.getElementById(`sensor-${s.key}-mobile`);
        if (mobileEl) countUpElement(mobileEl, v, { decimals: s.decimals, suffix: s.suffix, duration: introDuration, from: animFrom[s.key] });
        
        if (s.key !== 'co2') {
            const trendEl = document.getElementById(`${s.key}-trend`);
            if (trendEl) {
                trendEl.outerHTML = getTrendHTML(v, prevReadings[s.key], s.suffix.trim(), false, false).replace('<span class="flex', `<span id="${s.key}-trend" class="flex`);
            }
            const trendElMobile = document.getElementById(`${s.key}-trend-mobile`);
            if (trendElMobile) {
                trendElMobile.outerHTML = getTrendHTML(v, prevReadings[s.key], s.suffix.trim(), false, true).replace('<span class="flex', `<span id="${s.key}-trend-mobile" class="flex`);
            }
        }
        
        const ctrlEl = document.getElementById(`ctrl-current-${s.key}`);
        if (ctrlEl) countUpElement(ctrlEl, v, { decimals: s.decimals, duration: introDuration, from: animFrom[s.key], key: `ctrl-current-${s.key}` });
    });

    // Store current as previous for next tick
    prevReadings = { temp: state.currentTemp, humidity: state.currentHumidity, co2: state.currentCO2, light: state.currentLight };
    dashboardEnteredOnce = true;

    // Apply card state colors immediately from state (no animation dependency)
    updateSensorCardStatus();
}

function updateSensorCardStatus() {
    function applyCardState(cardId, gaugeId, statusId, level, defaultColorClass) {
        const gauge = document.getElementById(gaugeId);
        const status = document.getElementById(statusId);

        const textSz = cardId.includes('-mobile') ? 'text-[10px]' : 'text-[10px] md:text-[11px]';

        if (level === 'critical') {
            if (gauge) gauge.className.baseVal = `gauge-path text-red-500`;
            if (status) { status.className = `${textSz} font-extrabold text-red-600 dark:text-red-400`; status.innerText = 'Critical'; }
        } else if (level === 'warning') {
            if (gauge) gauge.className.baseVal = `gauge-path text-amber-500`;
            if (status) { status.className = `${textSz} font-extrabold text-amber-600 dark:text-amber-400`; status.innerText = 'Warning'; }
        } else {
            if (gauge) gauge.className.baseVal = `gauge-path ${defaultColorClass}`;
            if (status) { status.className = `${textSz} font-extrabold text-emerald-600 dark:text-emerald-400`; status.innerText = 'Nominal'; }
        }
    }

    setSensorDOMStatic();
    if (typeof updateRadialGauges === 'function') updateRadialGauges();

    const t = state.currentTemp;
    const tLevel = (t < 15 || t > 32) ? 'critical' : (t < 18 || t > 28) ? 'warning' : 'normal';
    applyCardState('sensor-temp-card', 'gauge-temp', 'sensor-temp-status', tLevel, 'text-emerald-500');
    applyCardState('sensor-temp-card-mobile', 'gauge-temp-mobile', 'sensor-temp-status-mobile', tLevel, 'text-emerald-500');

    const h = state.currentHumidity;
    const hLevel = (h < 45 || h > 95) ? 'critical' : (h < 60 || h > 85) ? 'warning' : 'normal';
    applyCardState('sensor-humidity-card', 'gauge-humidity', 'sensor-humidity-status', hLevel, 'text-emerald-500');
    applyCardState('sensor-humidity-card-mobile', 'gauge-humidity-mobile', 'sensor-humidity-status-mobile', hLevel, 'text-emerald-500');

    const l = state.currentLight;
    const lLevel = (l < 80 || l > 950) ? 'critical' : (l < 200 || l > 800) ? 'warning' : 'normal';
    applyCardState('sensor-light-card', 'gauge-light', 'sensor-light-status', lLevel, 'text-emerald-500');
    applyCardState('sensor-light-card-mobile', 'gauge-light-mobile', 'sensor-light-status-mobile', lLevel, 'text-emerald-500');

    const c = state.currentCO2;
    const cLevel = c > 1200 ? 'critical' : c > 800 ? 'warning' : 'normal';
    applyCardState('sensor-co2-card', 'gauge-co2', 'sensor-co2-status', cLevel, 'text-emerald-500');
    applyCardState('sensor-co2-card-mobile', 'gauge-co2-mobile', 'sensor-co2-status-mobile', cLevel, 'text-emerald-500');
    // Keep co2-trend badge in sync
    const co2Trend = document.getElementById('co2-trend');
    if (co2Trend && cLevel === 'critical') {
        co2Trend.className = 'flex items-center text-error-red font-caption text-caption bg-error-container px-1.5 py-0.5 rounded-full';
        co2Trend.innerHTML = `<span class="material-symbols-outlined text-[12px] mr-0.5 animate-bounce">arrow_upward</span> DANGER`;
    } else if (co2Trend && cLevel === 'warning') {
        co2Trend.className = 'flex items-center text-warning-gold font-caption text-caption bg-warning-gold/15 px-1.5 py-0.5 rounded-full';
        co2Trend.innerHTML = `<span class="material-symbols-outlined text-[12px] mr-0.5">warning</span> HIGH`;
    } else if (co2Trend) {
        co2Trend.className = 'flex items-center text-on-surface-variant dark:text-zinc-400 text-caption bg-surface-variant dark:bg-zinc-800 px-1.5 py-0.5 rounded-full';
        co2Trend.innerHTML = `<span class="material-symbols-outlined text-[12px] mr-0.5">horizontal_rule</span><span class="co2-trend-val">0%</span>`;
    }
    updateEnvironmentOverview();
    updateCropsHealthPanel();
}

// Drives the "System Health" card in the desktop Add Crop / Grow Log
// sidebar from the same live state used by the Home dashboard sensor
// cards, so it's a real readout (not static placeholder numbers)
// and shares the same normal/warning/critical thresholds.
function updateSystemStatusMsg() {
    const el = document.getElementById('system-status-msg');
    if (!el) return;
    const activeAlerts = state.alerts.filter(a => !a.acknowledged);
    if (activeAlerts.length > 0) {
        el.innerText = `⚠ ${activeAlerts.length} active alert${activeAlerts.length > 1 ? 's' : ''}. Review alerts tab.`;
        el.className = 'text-body-sm text-error-red dark:text-red-400 font-semibold transition-colors duration-500';
    } else if (state.deviceStates.misters && !state.anomalies.misterJammed) {
        el.innerText = 'Misting system active. Humidity rising.';
        el.className = 'text-body-sm text-primary dark:text-primary-fixed transition-colors duration-500';
    } else if (state.deviceStates.fans) {
        el.innerText = 'Circulation fans running. Cooling in progress.';
        el.className = 'text-body-sm text-primary dark:text-primary-fixed transition-colors duration-500';
    } else {
        el.innerText = 'System is running optimally.';
        el.className = 'text-body-sm text-on-surface-variant dark:text-zinc-400 transition-colors duration-500';
    }
}

// Cooldown tracker: stores last trigger time per alert title (ms)
// --- RADIAL GAUGES ---
function updateRadialGauges() {
    const maxOffset = 119.38; // length of semi-circle path
    
    function getGaugePct(val, mapping) {
        if (val <= mapping[0][0]) return mapping[0][1];
        if (val >= mapping[mapping.length - 1][0]) return mapping[mapping.length - 1][1];
        for (let i = 0; i < mapping.length - 1; i++) {
            const v1 = mapping[i][0], p1 = mapping[i][1];
            const v2 = mapping[i+1][0], p2 = mapping[i+1][1];
            if (val >= v1 && val <= v2) {
                return p1 + (p2 - p1) * ((val - v1) / (v2 - v1));
            }
        }
        return 0.5;
    }

    // Map critical low to 0-10%, warn low to 10-25%, nominal to 25-75% (mid 50%),
    // warn high to 75-90%, critical high to 90-100%.
    const mappings = {
        temp: [ [12, 0], [15, 0.1], [18, 0.25], [23, 0.5], [28, 0.75], [32, 0.9], [35, 1] ],
        humidity: [ [30, 0], [45, 0.1], [60, 0.25], [72.5, 0.5], [85, 0.75], [95, 0.9], [100, 1] ],
        light: [ [0, 0], [80, 0.1], [200, 0.25], [500, 0.5], [800, 0.75], [950, 0.9], [1050, 1] ],
        co2: [ [400, 0], [600, 0.25], [800, 0.5], [1200, 0.9], [1500, 1] ]
    };

    const gauges = [
        { key: 'temp', val: state.currentTemp },
        { key: 'humidity', val: state.currentHumidity },
        { key: 'light', val: state.currentLight },
        { key: 'co2', val: state.currentCO2 }
    ];
    
    gauges.forEach(g => {
        let pct = getGaugePct(g.val, mappings[g.key]);
        const offset = maxOffset - (pct * maxOffset);
        
        const pathDesktop = document.getElementById(`gauge-${g.key}`);
        if (pathDesktop) pathDesktop.style.strokeDashoffset = offset;
        
        const pathMobile = document.getElementById(`gauge-${g.key}-mobile`);
        if (pathMobile) pathMobile.style.strokeDashoffset = offset;
    });
}

setInterval(() => { updateRadialGauges(); updateLastUpdated(); updateFarmHealthScore(); }, 3000);


// --- LAST UPDATED TIMESTAMP ---
function updateLastUpdated() {
    const el = document.getElementById('last-updated-ts');
    if (el) el.innerText = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}


// --- SENSOR CARD EXPANSION ---
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.sensor-card').forEach(card => {
        card.addEventListener('click', () => {
            const grid = card.querySelector('.sensor-info-grid');
            if (grid) {
                if (grid.classList.contains('max-h-0')) {
                    grid.classList.remove('max-h-0', 'opacity-0');
                    grid.classList.add('max-h-[200px]', 'opacity-100', 'mt-4');
                } else {
                    grid.classList.add('max-h-0', 'opacity-0');
                    grid.classList.remove('max-h-[200px]', 'opacity-100', 'mt-4');
                }
            }
        });
    });
});
