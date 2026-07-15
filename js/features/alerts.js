const alertCooldowns = {};
const ALERT_COOLDOWN_MS = 120000; // 2 minutes between same alert re-firing

// Check environmental readings against bounds to auto-create alerts
function checkAlertThresholds() {
    const now = Date.now();

    function canFire(title) {
        if (alertCooldowns[title] && (now - alertCooldowns[title]) < ALERT_COOLDOWN_MS) return false;
        // Also don't fire if same alert is already active (unacknowledged)
        if (state.alerts.find(a => a.title === title && !a.acknowledged)) return false;
        return true;
    }

    // Alerts only fire when a simulation anomaly is active.
    // Normal sensor readings showing HIGH on the dashboard do NOT trigger alerts.
    const anySimulationActive = state.anomalies.co2Spike || state.anomalies.overheat || state.anomalies.misterJammed;

    if (anySimulationActive) {
        // CO2 alert — only during co2Spike simulation
        if (state.anomalies.co2Spike && state.currentCO2 > 1200 && canFire('CO2 Levels High')) {
            alertCooldowns['CO2 Levels High'] = now;
            triggerSystemAlert('CO2 Levels High', `CO2 level reached ${Math.round(state.currentCO2)} ppm in Sector B. Ventilation triggered.`, 'warning');
        }
        // Humidity alert — only during misterJammed simulation
        if (state.anomalies.misterJammed && state.currentHumidity < 45 && canFire('Critical Low Humidity')) {
            alertCooldowns['Critical Low Humidity'] = now;
            triggerSystemAlert('Critical Low Humidity', `Humidity dropped to ${Math.round(state.currentHumidity)}%. Crop growth impaired!`, 'critical');
        }
        // Temp alert — only during overheat simulation
        if (state.anomalies.overheat && state.currentTemp > 32 && canFire('High Temperature Alarm')) {
            alertCooldowns['High Temperature Alarm'] = now;
            triggerSystemAlert('High Temperature Alarm', `Crop temperature spiked to ${state.currentTemp.toFixed(1)}°C. Cooldown fans enabled.`, 'critical');
        }
    }

    // Adjust indicator dot on navigation bar
    const dot = document.getElementById('nav-alert-dot');
    const activeAlerts = state.alerts.filter(a => !a.acknowledged);
    if (activeAlerts.length > 0) {
        dot.classList.remove('hidden');
        dot.innerText = activeAlerts.length;

        // Show banner of the highest severity alert
        const topAlert = activeAlerts[0];
        document.getElementById('active-alert-banner').classList.remove('hidden');
        document.getElementById('banner-alert-title').innerText = topAlert.title;
        document.getElementById('banner-alert-desc').innerText = topAlert.desc;

        // Red glowing border on app shell
        document.getElementById('app-wrapper').classList.add('alert-active');
    } else {
        dot.classList.add('hidden');
        document.getElementById('active-alert-banner').classList.add('hidden');
        document.getElementById('app-wrapper').classList.remove('alert-active');
    }
}

function triggerSystemAlert(title, desc, severity) {
    // Check if alert already active to avoid duplicates
    const activeDuplicate = state.alerts.find(a => a.title === title && !a.acknowledged);
    if (activeDuplicate) return;

    const newAlert = {
        id: Date.now(),
        severity,
        title,
        desc,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        acknowledged: false
    };

    state.alerts.unshift(newAlert);
    saveAlerts();
    renderAlertsList();
    showToast(`${title} alert triggered!`, 'error');
    addLog(`SYSTEM ALERT: ${title} (${desc})`, 'error');
}

function dismissBannerAlert() {
    // Acknowledge all active alerts and permanently suppress them from re-firing
    state.alerts.forEach(a => {
        if (!a.acknowledged) {
            a.acknowledged = true;
            alertCooldowns[a.title] = Infinity; // never re-fire this alert title
        }
    });
    saveAlerts();
    renderAlertsList();
    document.getElementById('active-alert-banner').classList.add('hidden');
    document.getElementById('app-wrapper').classList.remove('alert-active');
    showToast('All active alerts acknowledged.', 'info');
    addLog('Alerts cleared and acknowledged by operator.', 'info');
}

// --- 11. ANOMALY SIMULATOR ---
function triggerSimulatedAnomaly(type) {
    if (type === 'co2') {
        state.anomalies.co2Spike = true;
        state.currentCO2 = 820;
        addLog('ANOMALY SIMULATION: High CO2 gas release spiked levels.', 'error');
        showToast('CO2 release spike triggered.', 'warning');
    } else if (type === 'mister') {
        state.anomalies.misterJammed = true;
        state.deviceStates.misters = false;
        addLog('ANOMALY SIMULATION: Misting nozzle feedback failure detected.', 'error');
        showToast('Misting Jam anomaly triggered.', 'error');
    } else if (type === 'temp') {
        state.anomalies.overheat = true;
        state.currentTemp = 29.5;
        addLog('ANOMALY SIMULATION: HVAC heater unit stuck in heating loop.', 'error');
        showToast('Overheating Stuck-Relay triggered.', 'error');
    }
}

function resetSimulationAnomalies() {
    state.anomalies.co2Spike = false;
    state.anomalies.misterJammed = false;
    state.anomalies.overheat = false;

    // Re-normalize readings
    state.currentCO2 = 420;
    state.currentTemp = 23.5;
    state.currentHumidity = 75.0;

    // Clear inactive alarms
    state.alerts = state.alerts.map(a => {
        a.acknowledged = true;
        return a;
    });
    saveAlerts();
    renderAlertsList();
    checkAlertThresholds();

    addLog('Anomaly sensors recalibrated. Operational variables reset.', 'success');
    showToast('All anomaly states cleared.', 'success');
}

let currentAlertFilter = 'all';
function filterAlerts(filter) {
    currentAlertFilter = filter;
    const map = { all: 'alert-filter-all', active: 'alert-filter-active', critical: 'alert-filter-critical', resolved: 'alert-filter-resolved' };
    Object.values(map).forEach(id => {
        const b = document.getElementById(id);
        if (b) b.className = 'flex-1 text-[10px] font-bold py-1 rounded-lg text-on-surface-variant dark:text-zinc-400 transition-all';
    });
    const active = document.getElementById(map[filter]);
    if (active) active.className = 'flex-1 text-[10px] font-bold py-1 rounded-lg bg-white dark:bg-zinc-700 text-primary dark:text-primary-fixed shadow-sm transition-all';
    renderAlertsList();
}

function renderAlertsList() {
    const container = document.getElementById('alerts-list-container');
    container.innerHTML = '';

    let alerts = [...state.alerts.filter(a => !a.acknowledged), ...state.alerts.filter(a => a.acknowledged)];
    if (currentAlertFilter === 'active') alerts = alerts.filter(a => !a.acknowledged);
    else if (currentAlertFilter === 'critical') alerts = alerts.filter(a => a.severity === 'critical');
    else if (currentAlertFilter === 'resolved') alerts = alerts.filter(a => a.acknowledged);

    // Update count badge
    const activeCount = state.alerts.filter(a => !a.acknowledged).length;
    const badge = document.getElementById('alerts-count-badge');
    if (badge) { badge.innerText = `${activeCount} Active`; badge.classList.toggle('hidden', activeCount === 0); }
    const moreBadge = document.getElementById('more-alerts-count-badge');
    if (moreBadge) { moreBadge.innerText = `${activeCount} Active`; moreBadge.classList.toggle('hidden', activeCount === 0); }

    if (alerts.length === 0) {
        container.innerHTML = `<div class="text-center py-6 text-slate-400 dark:text-zinc-500 font-bold text-caption flex flex-col items-center justify-center gap-1"><span class="material-symbols-outlined text-[32px] text-success-green">check_circle</span>No alerts in this filter</div>`;
        return;
    }

    alerts.forEach(alert => {
        let colorClass = "bg-warning-gold/15 border-warning-gold/30 text-warning-gold";
        if (alert.severity === 'critical') colorClass = "bg-error/15 border-error/30 text-error-red dark:text-red-400";
        if (alert.acknowledged) colorClass = "bg-slate-50 dark:bg-zinc-800/40 border-slate-200 dark:border-zinc-800 text-slate-400 dark:text-zinc-500";
        const div = document.createElement('div');
        div.className = `p-3 rounded-xl border flex flex-col gap-2 ${colorClass}`;
        div.innerHTML = `
                    <div class="flex items-start justify-between gap-2">
                        <div class="space-y-1 flex-1 min-w-0">
                            <div class="flex items-center gap-1.5 flex-wrap">
                                <span class="text-body-sm font-extrabold">${alert.title}</span>
                                ${alert.acknowledged ? `<span class="text-[8px] bg-slate-200 dark:bg-zinc-800 px-1 py-0.5 rounded font-bold uppercase">ACK</span>` : `<span class="text-[8px] bg-red-600 text-white px-1 py-0.5 rounded font-bold uppercase animate-pulse">ACTIVE</span>`}
                            </div>
                            <p class="text-[11px] leading-normal opacity-90">${alert.desc}</p>
                            <p class="text-[9px] font-bold opacity-60">Fired at ${alert.time}</p>
                            ${alert.acknowledgedBy ? `<p class="text-[9px] font-bold opacity-60">✓ Acknowledged by <span class="capitalize">${alert.acknowledgedBy}</span> at ${alert.acknowledgedAt}</p>` : ''}
                        </div>
                    </div>
                    ${!alert.acknowledged ? `
                        <div class="flex">
                            <button onclick="acknowledgeSingleAlert(${alert.id})" class="text-[9px] uppercase font-bold bg-white/20 hover:bg-white/40 dark:bg-zinc-800 dark:hover:bg-zinc-700 py-1.5 px-3 rounded-lg border border-current whitespace-nowrap">Acknowledge</button>
                        </div>
                    ` : ''}
                `;
        container.appendChild(div);
    });

    renderRecentAlertsDesktop();
}

// Desktop-only "More" redesign — real recent alerts (top 3, newest first)
function renderRecentAlertsDesktop() {
    const container = document.getElementById('pd-recent-alerts-list');
    if (!container) return;
    if (state.alerts.length === 0) {
        container.innerHTML = `<div class="flex flex-col items-center justify-center py-4 gap-1 text-slate-400 dark:text-zinc-500">
                    <span class="material-symbols-outlined text-[28px] text-success-green">check_circle</span>
                    <p class="text-[12px] font-semibold">No alerts yet.</p>
                </div>`;
        return;
    }
    container.innerHTML = '';
    state.alerts.slice(0, 3).forEach(alert => {
        const dotClass = alert.acknowledged ? 'bg-on-surface-variant/40 dark:bg-zinc-600' : (alert.severity === 'critical' ? 'bg-error-red' : 'bg-warning-gold');
        const row = document.createElement('div');
        row.className = 'pd-alert-row flex items-start gap-2.5';
        row.innerHTML = `
                    <span class="w-2 h-2 rounded-full ${dotClass} mt-1.5 shrink-0"></span>
                    <div class="min-w-0">
                        <p class="text-[12.5px] font-bold text-on-background dark:text-white">${alert.title}</p>
                        <p class="text-[11px] text-on-surface-variant dark:text-zinc-500">${alert.time} &bull; ${alert.desc}</p>
                    </div>`;
        container.appendChild(row);
    });
}

function acknowledgeSingleAlert(id) {
    const alert = state.alerts.find(a => a.id === id);
    if (alert) {
        const user = state.currentUser ? state.currentUser.name || state.currentUser.username || state.currentUser.role : 'Unknown';
        const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        alert.acknowledged = true;
        alert.acknowledgedBy = user;
        alert.acknowledgedAt = ts;
        alertCooldowns[alert.title] = Infinity; // permanently suppress this alert from re-firing
        saveAlerts(); renderAlertsList(); checkAlertThresholds();
        showToast(`Alert acknowledged by ${user}.`, 'info');
        addLog(`Alert resolved: "${alert.title}" — acknowledged by ${user} at ${ts}`, 'success');
    }
}

function clearResolvedAlerts() {
    state.alerts = state.alerts.filter(a => !a.acknowledged);
    saveAlerts();
    renderAlertsList();
    showToast('Cleared resolved alerts log.', 'info');
}

// --- 12. TASK MANAGER BOARD ---
