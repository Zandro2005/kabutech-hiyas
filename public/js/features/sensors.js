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
        const el = document.getElementById(`sensor-${s.key}`);
        if (el) el.innerText = v.toFixed(s.decimals) + s.suffix;
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
        const ctrlEl = document.getElementById(`ctrl-current-${s.key}`);
        if (ctrlEl) countUpElement(ctrlEl, v, { decimals: s.decimals, duration, from: 0, key: `ctrl-current-${s.key}` });
    });
    dashboardEnteredOnce = true;
}

function updateSensorDOM(forceFromZero) {
    // Calculate trends vs previous reading
    function getTrendHTML(current, previous, unit, higherIsBad) {
        const diff = current - previous;
        const pct = previous !== 0 ? Math.abs((diff / previous) * 100).toFixed(1) : '0.0';
        const isUp = diff > 0.05;
        const isDown = diff < -0.05;
        if (!isUp && !isDown) {
            return `<span class="flex items-center text-on-surface-variant dark:text-zinc-400 text-caption bg-surface-variant dark:bg-zinc-800 px-1.5 py-0.5 rounded-full"><span class="material-symbols-outlined text-[12px] mr-0.5">horizontal_rule</span> 0%</span>`;
        }
        const alertTrend = (higherIsBad && isUp) || (!higherIsBad && isDown);
        const color = alertTrend ? 'text-error-red bg-error-container' : 'text-success-green dark:text-emerald-400 bg-success-green/10 dark:bg-emerald-950/40';
        const arrow = isUp ? 'arrow_upward' : 'arrow_downward';
        return `<span class="flex items-center ${color} text-caption px-1.5 py-0.5 rounded-full"><span class="material-symbols-outlined text-[12px] mr-0.5">${arrow}</span>${pct}%</span>`;
    }

    // Use short animation on recurring ticks so numbers are never mid-animation
    // when card colors are evaluated. Intro (first load) uses longer count-up.
    const playIntro = forceFromZero || !dashboardEnteredOnce;
    const introDuration = playIntro ? 2200 : 600;
    const animFrom = playIntro ? { temp: 0, humidity: 0, light: 0, co2: 0 } : prevReadings;

    SENSOR_CONFIGS.forEach(s => {
        const v = s.getVal();
        countUpElement(document.getElementById(`sensor-${s.key}`), v, { decimals: s.decimals, suffix: s.suffix, duration: introDuration, from: animFrom[s.key] });
        
        if (s.key !== 'co2') {
            const trendEl = document.getElementById(`${s.key}-trend`);
            if (trendEl) {
                trendEl.outerHTML = getTrendHTML(v, prevReadings[s.key], s.suffix.trim(), false).replace('<span class="flex', `<span id="${s.key}-trend" class="flex`);
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
    // Helper: apply normal / warning / critical classes to a card
    function applyCardState(cardId, iconBgId, statusId, level) {
        const card = document.getElementById(cardId);
        const icon = document.getElementById(iconBgId);
        const status = document.getElementById(statusId);
        if (!card) return;

        const base = 'sensor-card bg-green-gradient border rounded-3xl p-4 shadow-sm flex flex-col justify-between relative overflow-hidden group transition-all duration-300';
        const wasExpanded = card.classList.contains('expanded');

        if (level === 'critical') {
            card.className = base + ' border-slate-100 dark:border-zinc-800';
            if (icon) icon.className = 'w-9 h-9 rounded-xl flex items-center justify-center bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400';
            if (status) { status.className = 'font-bold text-red-600 dark:text-red-400'; status.innerText = 'Critical'; }
        } else if (level === 'warning') {
            card.className = base + ' border-slate-100 dark:border-zinc-800';
            if (icon) icon.className = 'w-9 h-9 rounded-xl flex items-center justify-center bg-yellow-100 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-400';
            if (status) { status.className = 'font-bold text-yellow-600 dark:text-yellow-400'; status.innerText = 'Warning'; }
        } else {
            // Normal state: use specific design colors for each card's icon; border stays neutral (no highlight)
            let iconClass = 'w-9 h-9 rounded-xl flex items-center justify-center ';
            let borderClass = ' border-slate-100 dark:border-zinc-800';

            if (cardId === 'sensor-temp-card') {
                iconClass += 'bg-[#e6fcf0] dark:bg-emerald-950/40 text-[#054f24] dark:text-emerald-400';
            } else if (cardId === 'sensor-humidity-card') {
                iconClass += 'bg-[#e8f4fd] dark:bg-sky-950/40 text-[#0284c7] dark:text-sky-400';
            } else if (cardId === 'sensor-light-card') {
                iconClass += 'bg-[#fff7ed] dark:bg-amber-950/40 text-[#ea580c] dark:text-amber-400';
            } else if (cardId === 'sensor-co2-card') {
                iconClass += 'bg-[#faf5ff] dark:bg-purple-950/40 text-[#9333ea] dark:text-purple-400';
            } else {
                iconClass += 'bg-slate-50 dark:bg-zinc-800 text-slate-500';
            }

            card.className = base + borderClass;
            if (icon) icon.className = iconClass;
            if (status) { status.className = 'font-bold text-[#15803d] dark:text-emerald-400'; status.innerText = 'Nominal'; }
        }
        if (wasExpanded) card.classList.add('expanded');
    }

    // Snap displayed values immediately — no animation lag so color always matches number
    setSensorDOMStatic();

    // Evaluate state from actual state values (never from DOM)
    const t = state.currentTemp;
    applyCardState('sensor-temp-card', 'sensor-temp-icon-bg', 'sensor-temp-status',
        (t < 15 || t > 32) ? 'critical' : (t < 18 || t > 28) ? 'warning' : 'normal');

    const h = state.currentHumidity;
    applyCardState('sensor-humidity-card', 'sensor-humidity-icon-bg', 'sensor-humidity-status',
        (h < 45 || h > 95) ? 'critical' : (h < 60 || h > 85) ? 'warning' : 'normal');

    const l = state.currentLight;
    applyCardState('sensor-light-card', 'sensor-light-icon-bg', 'sensor-light-status',
        (l < 80 || l > 950) ? 'critical' : (l < 200 || l > 800) ? 'warning' : 'normal');

    const co2Level = state.currentCO2;
    const co2Status = co2Level > 1200 ? 'critical' : co2Level > 800 ? 'warning' : 'normal';
    applyCardState('sensor-co2-card', 'sensor-co2-icon-bg', 'sensor-co2-status', co2Status);
    // Keep co2-trend badge in sync
    const co2Trend = document.getElementById('co2-trend');
    if (co2Trend && co2Status === 'critical') {
        co2Trend.className = 'flex items-center text-error-red font-caption text-caption bg-error-container px-1.5 py-0.5 rounded-full';
        co2Trend.innerHTML = `<span class="material-symbols-outlined text-[12px] mr-0.5 animate-bounce">arrow_upward</span> DANGER`;
    } else if (co2Trend && co2Status === 'warning') {
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
// --- SPARKLINES ---
const sparkHistory = { temp: [], humidity: [], light: [], co2: [] };
const sparkPoints = {}; // canvasId -> { points, data, unit }
const SPARK_MAX = 20;
const sparkUnits = { 'spark-temp': '°C', 'spark-humidity': '%', 'spark-light': ' µmol', 'spark-co2': ' ppm' };
const sparkDecimals = { 'spark-temp': 1, 'spark-humidity': 0, 'spark-light': 0, 'spark-co2': 0 };

function pushSparkData() {
    sparkHistory.temp.push(state.currentTemp);
    sparkHistory.humidity.push(state.currentHumidity);
    sparkHistory.light.push(state.currentLight);
    sparkHistory.co2.push(state.currentCO2);
    ['temp', 'humidity', 'light', 'co2'].forEach(k => { if (sparkHistory[k].length > SPARK_MAX) sparkHistory[k].shift(); });
}
function drawSparkline(canvasId, data, color) {
    const canvases = [];
    const el1 = document.getElementById(canvasId);
    if (el1) {
        const selector = `#${canvasId}, #${canvasId}-mobile`;
        const found = document.querySelectorAll(selector);
        found.forEach(c => canvases.push(c));
    }
    if (canvases.length === 0 || data.length < 2) return;

    canvases.forEach(canvas => {
        const ctx = canvas.getContext('2d');
        canvas.width = canvas.offsetWidth || 120;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const min = Math.min(...data), max = Math.max(...data), range = max - min || 1;
        const w = canvas.width, h = canvas.height, pad = 2;
        const points = data.map((v, i) => ({
            x: pad + (i / (data.length - 1)) * (w - pad * 2),
            y: h - pad - ((v - min) / range) * (h - pad * 2)
        }));

        // Save for tooltip hit-testing
        sparkPoints[canvas.id || canvasId] = { points, data };

        // Subtle gradient fill under the line for a richer, more "alive" look
        const gradient = ctx.createLinearGradient(0, 0, 0, h);
        gradient.addColorStop(0, color + '33');
        gradient.addColorStop(1, color + '00');
        ctx.beginPath();
        points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
        ctx.lineTo(points[points.length - 1].x, h);
        ctx.lineTo(points[0].x, h);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();

        // The line itself
        ctx.beginPath();
        points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
        ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.lineJoin = 'round'; ctx.stroke();

        // Pulsing dot on the latest reading
        const last = points[points.length - 1];
        ctx.beginPath();
        ctx.arc(last.x, last.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        // Highlight dot for tooltip hover (if active)
        const active = sparkActive[canvas.id || canvasId];
        if (active != null && points[active]) {
            const p = points[active];
            ctx.beginPath();
            ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
            ctx.beginPath();
            ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    });
}
function updateSparklines() {
    pushSparkData();
    drawSparkline('spark-temp', sparkHistory.temp, '#16a34a');
    drawSparkline('spark-humidity', sparkHistory.humidity, '#d9383a');
    drawSparkline('spark-light', sparkHistory.light, '#d9383a');
    drawSparkline('spark-co2', sparkHistory.co2, '#eab308');
}

// --- Sparkline tooltips ---
const sparkActive = {}; // canvasId -> index of active point (or null)
function getSparkTooltip() {
    let el = document.getElementById('spark-tooltip');
    if (!el) {
        el = document.createElement('div');
        el.id = 'spark-tooltip';
        el.className = 'fixed pointer-events-none z-[150] bg-slate-900/90 dark:bg-zinc-100/95 text-white dark:text-zinc-900 text-[10px] font-bold px-2 py-1 rounded-lg shadow-lg transition-opacity duration-100 opacity-0';
        document.body.appendChild(el);
    }
    return el;
}
function handleSparkPointer(e, canvasId) {
    const info = sparkPoints[canvasId];
    const canvas = document.getElementById(canvasId);
    if (!info || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;

    // Find nearest point by x position
    let nearest = 0, nearestDist = Infinity;
    info.points.forEach((p, i) => {
        const d = Math.abs(p.x - x);
        if (d < nearestDist) { nearestDist = d; nearest = i; }
    });

    sparkActive[canvasId] = nearest;
    const value = info.data[nearest];
    const decimals = sparkDecimals[canvasId] ?? 0;
    const unit = sparkUnits[canvasId] || '';
    const ago = info.data.length - 1 - nearest;
    const tooltip = getSparkTooltip();
    tooltip.textContent = `${value.toFixed(decimals)}${unit} · ${ago === 0 ? 'now' : ago * 3 + 's ago'}`;
    tooltip.style.opacity = '1';
    tooltip.style.left = clientX + 'px';
    tooltip.style.top = (clientY - 32) + 'px';
    tooltip.style.transform = 'translateX(-50%)';

    // Redraw to show highlight dot
    const colorMap = {
        'spark-temp': '#16a34a', 'spark-humidity': '#d9383a', 'spark-light': '#d9383a',
        'spark-co2': '#eab308'
    };
    drawSparkline(canvasId, sparkHistory[canvasId.replace('spark-', '')], colorMap[canvasId]);
}
function clearSparkPointer(canvasId) {
    sparkActive[canvasId] = null;
    const tooltip = document.getElementById('spark-tooltip');
    if (tooltip) tooltip.style.opacity = '0';
    const colorMap = {
        'spark-temp': '#16a34a', 'spark-humidity': '#d9383a', 'spark-light': '#d9383a',
        'spark-co2': '#eab308'
    };
    drawSparkline(canvasId, sparkHistory[canvasId.replace('spark-', '')], colorMap[canvasId]);
}
function initSparkTooltips() {
    ['spark-temp', 'spark-humidity', 'spark-light', 'spark-co2'].forEach(id => {
        const canvas = document.getElementById(id);
        if (!canvas) return;
        canvas.style.cursor = 'crosshair';
        canvas.addEventListener('mousemove', (e) => handleSparkPointer(e, id));
        canvas.addEventListener('mouseleave', () => clearSparkPointer(id));
        canvas.addEventListener('touchstart', (e) => { handleSparkPointer(e, id); }, { passive: true });
        canvas.addEventListener('touchmove', (e) => { handleSparkPointer(e, id); }, { passive: true });
        canvas.addEventListener('touchend', () => clearSparkPointer(id));
    });
}
initSparkTooltips();
setInterval(() => { updateSparklines(); updateLastUpdated(); updateFarmHealthScore(); }, 3000);

// --- LAST UPDATED TIMESTAMP ---
function updateLastUpdated() {
    const el = document.getElementById('last-updated-ts');
    if (el) el.innerText = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

