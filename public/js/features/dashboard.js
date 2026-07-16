// Dynamic time-based greeting
function updateGreeting() {
    const hour = new Date().getHours();
    let name = 'User';
    if (state.currentUser && state.currentUser.name) {
        // Use first name
        name = state.currentUser.name.split(' ')[0];
    }
    let timeGreet = 'Good morning';
    if (hour >= 12 && hour < 17) timeGreet = 'Good afternoon';
    else if (hour >= 17) timeGreet = 'Good evening';
    const greetEl = document.getElementById('greeting-text');
    if (greetEl) greetEl.innerText = `${timeGreet}, ${name}`;
}

function updateCropsHealthPanel() {
    const panel = document.getElementById('crops-health-summary');
    if (!panel) return; // Not on the Add Crop tab / not desktop layout

    function setMetric(fillId, valueId, pct, text, level) {
        const fill = document.getElementById(fillId);
        const value = document.getElementById(valueId);
        if (fill) {
            fill.style.width = Math.max(0, Math.min(100, pct)) + '%';
            fill.classList.remove('level-warning', 'level-critical');
            if (level === 'warning') fill.classList.add('level-warning');
            if (level === 'critical') fill.classList.add('level-critical');
        }
        if (value) value.innerText = text;
    }

    const t = state.currentTemp;
    const h = state.currentHumidity;
    const co2 = state.currentCO2;
    const l = state.currentLight;

    const tempLevel = (t < 15 || t > 32) ? 'critical' : (t < 18 || t > 28) ? 'warning' : 'normal';
    const humLevel = (h < 45 || h > 95) ? 'critical' : (h < 60 || h > 85) ? 'warning' : 'normal';
    const co2Level = co2 > 1200 ? 'critical' : co2 > 800 ? 'warning' : 'normal';
    const lightLevel = (l < 80 || l > 950) ? 'critical' : (l < 200 || l > 800) ? 'warning' : 'normal';

    setMetric('crops-health-temp-fill', 'crops-health-temp',
        ((t - 10) / (35 - 10)) * 100, t.toFixed(1) + '\u00B0C', tempLevel);
    setMetric('crops-health-humidity-fill', 'crops-health-humidity',
        h, Math.round(h) + '%', humLevel);
    setMetric('crops-health-co2-fill', 'crops-health-co2',
        (co2 / 1500) * 100, Math.round(co2) + ' ppm', co2Level);
    setMetric('crops-health-light-fill', 'crops-health-light',
        (l / 1000) * 100, Math.round(l) + ' \u00B5mol', lightLevel);

    // Roll the four metrics up into one overall status line
    const levels = [tempLevel, humLevel, co2Level, lightLevel];
    const worst = levels.includes('critical') ? 'critical' : levels.includes('warning') ? 'warning' : 'normal';
    const badMetrics = [];
    if (tempLevel !== 'normal') badMetrics.push('Temperature');
    if (humLevel !== 'normal') badMetrics.push('Humidity');
    if (co2Level !== 'normal') badMetrics.push('CO2');
    if (lightLevel !== 'normal') badMetrics.push('Light');

    const icon = panel.querySelector('.material-symbols-outlined');
    const textEl = document.getElementById('crops-health-summary-text');
    panel.classList.remove('level-warning', 'level-critical');

    if (worst === 'critical') {
        panel.classList.add('level-critical');
        if (icon) icon.innerText = 'error';
        if (textEl) textEl.innerText = `Critical: ${badMetrics.join(', ')} out of safe range`;
    } else if (worst === 'warning') {
        panel.classList.add('level-warning');
        if (icon) icon.innerText = 'warning';
        if (textEl) textEl.innerText = `Warning: ${badMetrics.join(', ')} needs attention`;
    } else {
        if (icon) icon.innerText = 'check_circle';
        if (textEl) textEl.innerText = 'All systems nominal';
    }

    const updatedEl = document.getElementById('crops-health-updated');
    if (updatedEl) {
        const now = new Date();
        updatedEl.innerText = 'Updated ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
}

// Dynamic system status message
function renderActivityFeed() {
    const feed = document.getElementById('home-activity-feed');
    if (!feed) return;
    const recent = state.eventLogs.slice(0, 5);
    if (recent.length === 0) {
        feed.innerHTML = `<div class="text-center text-slate-400 py-2">No activity recorded.</div>`;
        return;
    }
    feed.innerHTML = recent.map(log => {
        let colorClass = "text-on-surface-variant dark:text-zinc-400";
        let icon = "info";
        if (log.type === 'success') {
            colorClass = "text-emerald-600 dark:text-emerald-400 font-semibold";
            icon = "check_circle";
        } else if (log.type === 'error') {
            colorClass = "text-error-red dark:text-red-400 font-semibold";
            icon = "error";
        } else if (log.type === 'warning') {
            colorClass = "text-amber-600 dark:text-amber-400";
            icon = "warning";
        }
        return `
                    <div class="flex items-start gap-2 py-1.5 border-b border-slate-100 dark:border-zinc-800/50 last:border-none">
                        <span class="material-symbols-outlined text-[14px] shrink-0 mt-0.5 ${colorClass}">${icon}</span>
                        <div class="flex-1 min-w-0">
                            <span class="${colorClass}">${log.msg}</span>
                            <span class="text-[9px] text-slate-400 dark:text-zinc-500 block mt-0.5">${log.timestamp}</span>
                        </div>
                    </div>
                `;
    }).join('');
}

function updateEnvironmentOverview() {
    const tempVal = state.currentTemp;
    const humVal = state.currentHumidity;
    const lightVal = state.currentLight;
    const co2Val = state.currentCO2;

    const tElVal = document.getElementById('env-val-temp');
    const hElVal = document.getElementById('env-val-humidity');
    const lElVal = document.getElementById('env-val-light');
    const cElVal = document.getElementById('env-val-co2');

    if (tElVal) tElVal.innerText = tempVal.toFixed(1) + '°C';
    if (hElVal) hElVal.innerText = Math.round(humVal) + '%';
    if (lElVal) lElVal.innerText = Math.round(lightVal) + 'µ';
    if (cElVal) cElVal.innerText = Math.round(co2Val);

    const tStatus = (tempVal < 15 || tempVal > 32) ? 'critical' : (tempVal < 18 || tempVal > 28) ? 'warning' : 'normal';
    const hStatus = (humVal < 45 || humVal > 95) ? 'critical' : (humVal < 60 || humVal > 85) ? 'warning' : 'normal';
    const lStatus = (lightVal < 80 || lightVal > 950) ? 'critical' : (lightVal < 200 || lightVal > 800) ? 'warning' : 'normal';
    const cStatus = co2Val > 1200 ? 'critical' : co2Val > 800 ? 'warning' : 'normal';

    const colors = {
        critical: 'bg-error-red shadow-[0_0_8px_rgba(220,38,38,0.6)] animate-pulse',
        warning: 'bg-warning-gold shadow-[0_0_8px_rgba(202,138,4,0.6)]',
        normal: 'bg-success-green'
    };

    const tDot = document.getElementById('env-dot-temp');
    const hDot = document.getElementById('env-dot-humidity');
    const lDot = document.getElementById('env-dot-light');
    const cDot = document.getElementById('env-dot-co2');

    if (tDot) tDot.className = 'w-2.5 h-2.5 rounded-full ' + colors[tStatus];
    if (hDot) hDot.className = 'w-2.5 h-2.5 rounded-full ' + colors[hStatus];
    if (lDot) lDot.className = 'w-2.5 h-2.5 rounded-full ' + colors[lStatus];
    if (cDot) cDot.className = 'w-2.5 h-2.5 rounded-full ' + colors[cStatus];
}

function applyRoleNavRestrictions(role) {
    const adminOnlyNavs = ['nav-yield'];
    const adminOnlyTabs = ['tab-yield'];
    const staffOnlyNavs = ['nav-history'];
    const staffOnlyTabs = ['tab-history'];

    if (role === 'staff') {
        adminOnlyNavs.forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
        adminOnlyTabs.forEach(id => { const el = document.getElementById(id); if (el) el.classList.add('hidden'); });
        staffOnlyNavs.forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'flex'; });
        staffOnlyTabs.forEach(id => { const el = document.getElementById(id); if (el) el.classList.remove('hidden'); });
        // Hide target-setting sliders for staff (they can still see the Target pill,
        // they just can't change it — that's admin-only)
        ['temp-slider-wrapper', 'humidity-slider-wrapper', 'light-slider-wrapper', 'co2-slider-wrapper'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
        // Set the center nav button to "Manage Crop" (staff read-only mode)
        setNavFabMode('manage-crop-staff');
        // Hide admin-only sections
        ['btn-mobile-init-batch', 'simulation-console', 'btn-add-task-modal', 'more-staff-reports-widget', 'staff-account-mgmt-widget', 'schedule-config-section', 'schedule-config-section-mobile', 'yield-target-card'].forEach(id => {
            const el = document.getElementById(id); if (el) el.classList.add('hidden');
        });
        // Actual yield card goes full-width when target card is hidden
        const actualYieldCard = document.getElementById('actual-yield-card');
        if (actualYieldCard) { actualYieldCard.classList.remove('col-span-3'); actualYieldCard.classList.add('col-span-5'); }
        // Show live farm viewing card for staff (same as admin)
        const liveCard = document.getElementById('live-farm-dashboard-card');
        if (liveCard) liveCard.classList.remove('hidden');
        // Hide shift summary card — replaced by live view widget
        const shiftCard = document.getElementById('shift-summary-card');
        if (shiftCard) shiftCard.classList.add('hidden');
        // Desktop Home: swap the admin Activity Feed card for a staff-relevant
        // Today's Shift Summary card (devices active / reports filed / open reports)
        const activityFeedCard = document.getElementById('farm-activity-feed-card');
        if (activityFeedCard) { activityFeedCard.classList.add('hidden'); activityFeedCard.style.setProperty('display', 'none', 'important'); }
        const shiftSummaryDesktop = document.getElementById('shift-summary-card-desktop');
        if (shiftSummaryDesktop) shiftSummaryDesktop.classList.remove('hidden');
        updateShiftSummary();
        // Desktop Crops page: staff can't add batches, so swap the admin
        // "Quick Batch Add" widget for a "Report a Crop Issue" quick-launch card
        const quickBatchAddCard = document.getElementById('quick-batch-add-card');
        if (quickBatchAddCard) { quickBatchAddCard.classList.add('hidden'); quickBatchAddCard.style.display = 'none'; }
        const cropReportIssueCard = document.getElementById('crop-report-issue-card');
        if (cropReportIssueCard) { cropReportIssueCard.classList.remove('hidden'); cropReportIssueCard.style.display = ''; }
        // Desktop More/Profile page: staff shouldn't see the full Staff Directory
        // (admin-only), swap it for a "My Recent Reports" widget instead
        const staffDirectoryCard = document.getElementById('pd-staff-directory-card');
        if (staffDirectoryCard) staffDirectoryCard.classList.add('hidden');
        const myReportsCard = document.getElementById('pd-my-reports-card');
        if (myReportsCard) myReportsCard.classList.remove('hidden');
        // Make grow-log tab accessible to staff (show nav is handled by FAB)
        const growLogTab = document.getElementById('tab-grow-log');
        if (growLogTab) growLogTab.classList.remove('hidden');
        // Hide Add Rack button for staff (read-only)
        const addBatchBtn = document.getElementById('btn-add-batch-inline');
        if (addBatchBtn) addBatchBtn.style.display = 'none';
        // Hide rack-level edit/delete inside the subpage for staff
        const editBtn = document.getElementById('rack-detail-edit-btn');
        if (editBtn) editBtn.style.display = 'none';
        const deleteBtn = document.getElementById('rack-detail-delete-btn');
        if (deleteBtn) deleteBtn.style.display = 'none';
    } else {
        adminOnlyNavs.forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'flex'; });
        adminOnlyTabs.forEach(id => { const el = document.getElementById(id); if (el) el.classList.remove('hidden'); });
        staffOnlyNavs.forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
        staffOnlyTabs.forEach(id => { const el = document.getElementById(id); if (el) el.classList.add('hidden'); });
        // Show target-setting sliders for admin
        ['temp-slider-wrapper', 'humidity-slider-wrapper', 'light-slider-wrapper', 'co2-slider-wrapper'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = '';
        });
        // Set the center nav button to "Manage Crop" for admin (with add-rack hint)
        setNavFabMode('add-crop');
        // Show admin-only sections
        ['btn-mobile-init-batch', 'simulation-console', 'btn-add-task-modal', 'more-staff-reports-widget', 'staff-account-mgmt-widget', 'schedule-config-section', 'schedule-config-section-mobile', 'yield-target-card'].forEach(id => {
            const el = document.getElementById(id); if (el) el.classList.remove('hidden');
        });
        // Restore actual yield card to 3/5 width
        const actualYieldCard = document.getElementById('actual-yield-card');
        if (actualYieldCard) { actualYieldCard.classList.remove('col-span-5'); actualYieldCard.classList.add('col-span-3'); }
        // Show live farm viewing card for admin
        const liveCard = document.getElementById('live-farm-dashboard-card');
        if (liveCard) liveCard.classList.remove('hidden');
        // Hide shift summary card for admin (Live Farm card occupies that space instead)
        const shiftCard = document.getElementById('shift-summary-card');
        if (shiftCard) shiftCard.classList.add('hidden');
        // Desktop Home: restore the admin Activity Feed card, hide staff's Shift Summary card
        const activityFeedCard = document.getElementById('farm-activity-feed-card');
        if (activityFeedCard) { activityFeedCard.classList.remove('hidden'); activityFeedCard.style.removeProperty('display'); }
        const shiftSummaryDesktop = document.getElementById('shift-summary-card-desktop');
        if (shiftSummaryDesktop) shiftSummaryDesktop.classList.add('hidden');
        // Desktop Crops page: restore Quick Batch Add, hide staff's Report Issue card
        const quickBatchAddCard = document.getElementById('quick-batch-add-card');
        if (quickBatchAddCard) { quickBatchAddCard.classList.remove('hidden'); quickBatchAddCard.style.display = ''; }
        const cropReportIssueCard = document.getElementById('crop-report-issue-card');
        if (cropReportIssueCard) { cropReportIssueCard.classList.add('hidden'); cropReportIssueCard.style.display = 'none'; }
        // Desktop More/Profile page: restore Staff Directory, hide staff's My Reports widget
        const staffDirectoryCard = document.getElementById('pd-staff-directory-card');
        if (staffDirectoryCard) staffDirectoryCard.classList.remove('hidden');
        const myReportsCard = document.getElementById('pd-my-reports-card');
        if (myReportsCard) myReportsCard.classList.add('hidden');
        // Restore Add Rack button for admin
        const addBatchBtn = document.getElementById('btn-add-batch-inline');
        if (addBatchBtn) addBatchBtn.style.display = '';
        // Restore rack-level edit/delete inside subpage for admin
        const editBtn = document.getElementById('rack-detail-edit-btn');
        if (editBtn) editBtn.style.display = '';
        const deleteBtn = document.getElementById('rack-detail-delete-btn');
        if (deleteBtn) deleteBtn.style.display = '';
    }
}

// --- DAYS ELAPSED + HARVEST ESTIMATE helpers ---
function getDaysElapsed(inocDate) {
    return Math.max(0, Math.floor((new Date() - new Date(inocDate)) / 86400000));
}
function getFruitingDays(batch) {
    if (!batch.fruitingDate) return null;
    return Math.max(0, Math.floor((new Date() - new Date(batch.fruitingDate)) / 86400000));
}
function getHarvestEstimate(batch) {
    const base = batch.fruitingDate || batch.inocDate;
    const d = new Date(base);
    d.setDate(d.getDate() + (batch.fruitingDate ? 10 : 28));
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// --- FARM HEALTH SCORE ---
function updateFarmHealthScore(forceFromZero) {
    const el = document.getElementById('farm-health-score');
    if (!el) return;

    // Use same absolute thresholds as sensor cards
    const t = state.currentTemp, h = state.currentHumidity, l = state.currentLight, c = state.currentCO2;

    // Each sensor contributes up to 20pts. 2-tier deductions: warning = -10, critical = -20
    const tempLevel = (t < 15 || t > 32) ? 'critical' : (t < 18 || t > 28) ? 'warning' : 'normal';
    const humLevel = (h < 45 || h > 95) ? 'critical' : (h < 60 || h > 85) ? 'warning' : 'normal';
    const lightLevel = (l < 80 || l > 950) ? 'critical' : (l < 200 || l > 800) ? 'warning' : 'normal';
    const co2Level = c > 1200 ? 'critical' : c > 800 ? 'warning' : 'normal';
    const activeAlerts = state.alerts.filter(a => !a.acknowledged).length;

    const deduct = lvl => lvl === 'critical' ? 20 : lvl === 'warning' ? 10 : 0;
    let score = 100;
    score -= deduct(tempLevel);
    score -= deduct(humLevel);
    score -= deduct(lightLevel);
    score -= deduct(co2Level);
    score -= Math.min(20, activeAlerts * 7);
    score = Math.max(0, score);

    // Color matches score range exactly
    const isGreen = score >= 80;
    const isAmber = score >= 50 && score < 80;
    const isRed = score < 50;
    const color = isGreen ? 'text-success-green dark:text-emerald-400' : isAmber ? 'text-warning-gold' : 'text-error-red';

    // Card background: tint red on critical, amber on warning, neutral on healthy
    const card = el.closest('.bg-surface-container-lowest, .bg-surface-container-low') || el.closest('[class*="rounded-2xl"]');
    if (card) {
        card.classList.remove('bg-error', 'bg-error/20', 'bg-warning-gold/10', 'border-error', 'border-warning-gold/40', 'border-muted');
        if (isRed) {
            card.classList.add('bg-error/20', 'border-error');
        } else if (isAmber) {
            card.classList.add('bg-warning-gold/10', 'border-warning-gold/40');
        } else {
            card.classList.add('border-muted');
        }
    }

    // Animate the score count-up
    const prevScore = forceFromZero ? 0 : parseInt(el.dataset.score || '0', 10);
    const scoreDuration = forceFromZero ? 2200 : 1400;
    el.innerHTML = `<span class="${color} font-extrabold text-headline-sm" id="farm-health-score-number">${prevScore}</span><span class="text-on-surface-variant dark:text-zinc-400 text-caption">/100</span>`;
    el.dataset.score = score;
    animateCountUp({
        key: 'farm-health-score',
        from: prevScore,
        to: score,
        duration: scoreDuration,
        decimals: 0,
        onUpdate: (val) => {
            const numEl = document.getElementById('farm-health-score-number');
            if (numEl) {
                const v = Math.round(val);
                const c2 = v >= 80 ? 'text-success-green dark:text-emerald-400' : v >= 50 ? 'text-warning-gold' : 'text-error-red';
                numEl.className = `${c2} font-extrabold text-headline-sm`;
                numEl.innerText = v;
            }
        }
    });

    const breakdown = document.getElementById('health-score-breakdown');
    if (breakdown) {
        const fmt = (label, lvl) => {
            if (lvl === 'normal') return `<span class="text-success-green dark:text-emerald-400">${label} ✓</span>`;
            if (lvl === 'warning') return `<span class="text-warning-gold">${label} −10pts</span>`;
            return `<span class="text-error-red">${label} −20pts</span>`;
        };
        const alertStr = activeAlerts === 0
            ? `<span class="text-success-green dark:text-emerald-400">Alerts ✓</span>`
            : `<span class="text-error-red">Alerts −${Math.min(20, activeAlerts * 7)}pts</span>`;
        breakdown.innerHTML = [fmt('Temp', tempLevel), fmt('Humidity', humLevel), fmt('Light', lightLevel), fmt('CO2', co2Level), alertStr].join(' • ');
    }
    // Shift summary
    const tasksDone = document.getElementById('summary-tasks-done');
    const alertsCount = document.getElementById('summary-alerts');
    const batchesCount = document.getElementById('summary-batches');
    if (tasksDone) countUpElement(tasksDone, state.tasks.filter(t => t.status === 'Completed').length, { duration: forceFromZero ? 2200 : 1200, from: forceFromZero ? 0 : undefined, key: 'summary-tasks-done' });
    if (alertsCount) countUpElement(alertsCount, state.alerts.length, { duration: forceFromZero ? 2200 : 1200, from: forceFromZero ? 0 : undefined, key: 'summary-alerts' });
    if (batchesCount) countUpElement(batchesCount, state.growBatches.filter(r => !r.contaminated).length, { duration: forceFromZero ? 2200 : 1200, from: forceFromZero ? 0 : undefined, key: 'summary-batches' });

    // ===== Desktop-only "More" redesign — all real data, no placeholders =====
    const scoreDesktop = document.getElementById('farm-health-score-desktop');
    if (scoreDesktop) scoreDesktop.innerText = score;
    const ring = document.getElementById('health-ring-desktop');
    if (ring) {
        const circumference = 2 * Math.PI * 36;
        ring.setAttribute('stroke-dasharray', `${(score / 100 * circumference).toFixed(2)} ${circumference.toFixed(2)}`);
        ring.setAttribute('stroke', isRed ? '#dc2626' : isAmber ? '#d97706' : '#16a34a');
    }
    const dotClass = lvl => lvl === 'critical' ? 'bg-error-red' : lvl === 'warning' ? 'bg-warning-gold' : 'bg-success-green';
    const tempRow = document.getElementById('health-row-temp-desktop');
    if (tempRow) tempRow.innerHTML = `${Number(t).toFixed(1)}&deg;C`;
    const tempDot = document.getElementById('health-row-temp-dot-desktop');
    if (tempDot) tempDot.className = `w-1.5 h-1.5 rounded-full ${dotClass(tempLevel)}`;
    const humRow = document.getElementById('health-row-humidity-desktop');
    if (humRow) humRow.innerText = `${Number(h).toFixed(1)}%`;
    const humDot = document.getElementById('health-row-humidity-dot-desktop');
    if (humDot) humDot.className = `w-1.5 h-1.5 rounded-full ${dotClass(humLevel)}`;
    const alertsRow = document.getElementById('health-row-alerts-desktop');
    if (alertsRow) {
        alertsRow.innerText = activeAlerts;
        alertsRow.className = `font-bold ${activeAlerts > 0 ? 'text-error-red' : 'text-on-background dark:text-white'}`;
    }
    const alertsDot = document.getElementById('health-row-alerts-dot-desktop');
    if (alertsDot) alertsDot.className = `w-1.5 h-1.5 rounded-full ${activeAlerts > 0 ? 'bg-error-red' : 'bg-success-green'}`;
    const footer = document.getElementById('farm-health-footer-desktop');
    if (footer) footer.innerText = isGreen ? 'OPTIMAL FLOW' : isAmber ? 'NEEDS ATTENTION' : 'CRITICAL CONDITIONS';

    const tasksDoneDesktop = document.getElementById('pd-summary-tasks-done');
    const alertsDesktop = document.getElementById('pd-summary-alerts');
    const batchesDesktop = document.getElementById('pd-summary-batches');
    if (tasksDoneDesktop) tasksDoneDesktop.innerText = state.tasks.filter(t => t.status === 'Completed').length;
    if (alertsDesktop) alertsDesktop.innerText = state.alerts.length;
    if (batchesDesktop) batchesDesktop.innerText = state.growBatches.filter(r => !r.contaminated).length;
}

// --- STAFF REPORTS ---
// Populates the staff-only "Today's Shift Summary" card on the Home tab:
// how many devices are currently active, how many reports were filed
// today, and how many reports are still open (across all staff).
function updateShiftSummary() {
    const devicesEl = document.getElementById('shift-devices-active');
    const reportsTodayEl = document.getElementById('shift-reports-today');
    const openReportsEl = document.getElementById('shift-open-reports');
    const devicesElHome = document.getElementById('shift-devices-active-home');
    const reportsTodayElHome = document.getElementById('shift-reports-today-home');
    const openReportsElHome = document.getElementById('shift-open-reports-home');
    if (!devicesEl || !reportsTodayEl || !openReportsEl) return;

    const activeDevices = ['fans', 'misters', 'lights'].filter(d => state.deviceStates && state.deviceStates[d]).length;
    devicesEl.innerText = activeDevices;
    if (devicesElHome) devicesElHome.innerText = activeDevices;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const reports = state.staffReports || [];
    const reportsToday = reports.filter(r => r.id >= startOfToday.getTime()).length;
    const openReports = reports.filter(r => (r.status || 'Open') !== 'Resolved').length;
    reportsTodayEl.innerText = reportsToday;
    openReportsEl.innerText = openReports;
    if (reportsTodayElHome) reportsTodayElHome.innerText = reportsToday;
    if (openReportsElHome) openReportsElHome.innerText = openReports;

    const cropOpenCountEl = document.getElementById('crop-report-open-count');
    if (cropOpenCountEl) cropOpenCountEl.innerText = openReports;
}

function renderStaffReports() {
    const isAdmin = state.currentUser && state.currentUser.role === 'admin';
    const unread = isAdmin
        ? state.staffReports.filter(r => !r.read).length
        : state.staffReports.filter(r => r.adminNote && !r.noteRead).length;
    ['more-reports-badge'].forEach(id => {
        const b = document.getElementById(id);
        if (b) { b.innerText = `${unread} New`; b.classList.toggle('hidden', unread === 0); }
    });

    const historySubtitle = document.getElementById('history-subtitle');
    if (historySubtitle) historySubtitle.textContent = isAdmin
        ? "A record of every issue staff have reported and their status"
        : "A record of issues you've reported and their status";

    // Report Overview stats card (Reports page, desktop sidebar)
    const totalEl = document.getElementById('report-stats-total');
    const openEl = document.getElementById('report-stats-open');
    const investigatingEl = document.getElementById('report-stats-investigating');
    const resolvedEl = document.getElementById('report-stats-resolved');
    if (totalEl) totalEl.innerText = state.staffReports.length;
    if (openEl) openEl.innerText = state.staffReports.filter(r => (r.status || 'Open') === 'Open').length;
    if (investigatingEl) investigatingEl.innerText = state.staffReports.filter(r => r.status === 'Investigating').length;
    if (resolvedEl) resolvedEl.innerText = state.staffReports.filter(r => r.status === 'Resolved').length;

    const emptyHTML = `<div class="flex flex-col items-center justify-center py-4 gap-1 text-slate-400 dark:text-zinc-500"><span class="material-symbols-outlined text-[36px]">mark_email_read</span><p class="text-[14px] font-semibold">No staff reports yet.</p></div>`;

    const sortedReports = [...state.staffReports].sort((a, b) => {
        const sevScore = { 'Critical': 3, 'High': 2, 'Low': 1 };
        const scoreA = sevScore[a.severity] || 0;
        const scoreB = sevScore[b.severity] || 0;
        if (scoreA !== scoreB) return scoreB - scoreA;
        return (b.id || 0) - (a.id || 0);
    });

    ['more-staff-reports-container', 'history-reports-container'].forEach(containerId => {
        const container = document.getElementById(containerId);
        if (!container) return;
        if (state.staffReports.length === 0) { container.innerHTML = emptyHTML; return; }
        container.innerHTML = '';
        sortedReports.forEach(r => {
            const isCrit = r.severity === 'Critical';
            const isHigh = r.severity === 'High';
            
            const accentColor = isCrit ? 'bg-red-500' : isHigh ? 'bg-amber-500' : 'bg-slate-400';
            const glowColor = isCrit ? 'red-500' : isHigh ? 'amber-500' : 'slate-400';
            const iconBg = isCrit ? 'bg-red-100 dark:bg-red-900/30' : isHigh ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-slate-100 dark:bg-slate-800';
            const iconColor = isCrit ? 'text-red-600 dark:text-red-400' : isHigh ? 'text-amber-600 dark:text-amber-400' : 'text-slate-600 dark:text-slate-300';
            const iconName = isCrit ? 'error' : isHigh ? 'warning' : 'info';
            
            const badgeColor = isCrit ? 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20' : isHigh ? 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20' : 'text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800';
            const badgeBorder = isCrit ? 'border-red-200 dark:border-red-800/50' : isHigh ? 'border-amber-200 dark:border-amber-800/50' : 'border-slate-200 dark:border-slate-700';

            const stat = r.status || 'Open';
            const statusColor = stat === 'Resolved' ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20' : stat === 'Investigating' ? 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20' : 'text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-zinc-800';
            const statusBorder = stat === 'Resolved' ? 'border-emerald-200 dark:border-emerald-800/50' : stat === 'Investigating' ? 'border-amber-200 dark:border-amber-800/50' : 'border-slate-200 dark:border-zinc-700';

            const hasUnreadNote = !!r.adminNote && !r.noteRead;
            const highlight = isAdmin ? !r.read : (hasUnreadNote || !r.read);
            
            const div = document.createElement('div');
            div.className = `group relative report-card-container border rounded-xl p-4 sm:p-5 flex flex-col gap-3 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-${glowColor}/5 hover:border-${glowColor}/30 transition-all duration-300 overflow-hidden ${!highlight ? 'opacity-80 hover:opacity-100' : 'ring-1 ring-primary/20'}`;
            div.innerHTML = `
                <div class="absolute left-0 top-0 bottom-0 w-1 ${accentColor}"></div>
                
                <div class="flex items-start justify-between gap-2">
                    <div class="flex items-start gap-2">
                        <div class="w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${iconBg} ${iconColor} transition-transform group-hover:scale-110">
                            <span class="material-symbols-outlined" style="font-size: 14px;">${iconName}</span>
                        </div>
                        <div>
                            <div class="flex items-center gap-2 flex-wrap mb-1.5">
                                <h3 class="font-bold report-card-title leading-none" style="font-size: 13px;">${r.title}</h3>
                                ${!isAdmin && hasUnreadNote ? `<span class="font-extrabold uppercase bg-primary text-white px-1.5 py-0.5 rounded animate-pulse" style="font-size: 9px;">New Note</span>` : (!r.read ? `<span class="font-extrabold uppercase bg-primary text-white px-1.5 py-0.5 rounded animate-pulse" style="font-size: 9px;">New</span>` : '')}
                            </div>
                            <div class="flex items-center gap-1 font-bold mt-1" style="font-size: 9px;">
                                <span class="${badgeColor} uppercase tracking-wider px-1 py-0.5 rounded border ${badgeBorder}">${r.severity}</span>
                                <span class="${statusColor} uppercase tracking-wider px-1 py-0.5 rounded border ${statusBorder}">${stat}</span>
                            </div>
                        </div>
                    </div>
                    <span class="hidden md:block font-semibold report-card-meta whitespace-nowrap px-1.5 py-0.5 rounded" style="font-size: 10px;">${r.timestamp}</span>
                </div>

                <p class="report-card-desc leading-snug md:ml-[32px] font-medium" style="font-size: 11px;">${r.desc}</p>
                
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mt-0.5 md:ml-[32px]">
                    <div class="inline-flex items-center gap-1.5 font-semibold report-card-meta" style="font-size: 10px;">
                        <span class="flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">person</span> ${r.reporter}</span>
                        <span class="w-1 h-1 rounded-full bg-slate-300 dark:bg-zinc-500"></span>
                        <span class="flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">location_on</span> ${r.category} • ${r.sector}${r.bag ? ' • Bag ' + r.bag : ''}</span>
                    </div>
                    <span class="md:hidden font-semibold text-slate-400 dark:text-white" style="font-size: 10px;">${r.timestamp}</span>
                </div>

                ${r.adminNote ? `
                <div class="mt-1 md:ml-[32px] relative overflow-hidden rounded-lg bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900 dark:to-teal-900 border border-emerald-100 dark:border-emerald-800 p-2 shadow-sm">
                    <div class="absolute left-0 top-0 bottom-0 w-[2px] bg-emerald-400"></div>
                    <div class="flex items-start justify-between gap-2">
                        <div class="flex gap-2">
                            <span class="material-symbols-outlined text-emerald-600 dark:text-emerald-400 mt-0.5" style="font-size: 14px;">speaker_notes</span>
                            <div>
                                <span class="font-bold uppercase tracking-wider text-emerald-700 dark:text-white mb-0.5 block" style="font-size: 9px;">Admin Note</span>
                                <p class="font-medium text-emerald-900 dark:text-white leading-snug" style="font-size: 11px;">${r.adminNote}</p>
                            </div>
                        </div>
                        ${!isAdmin && hasUnreadNote ? `<button onclick="dismissAdminNote(${r.id})" class="shrink-0 font-bold text-emerald-700 dark:text-emerald-300 bg-white dark:bg-emerald-950 hover:bg-emerald-100 dark:hover:bg-emerald-900 px-1.5 py-0.5 rounded transition-colors border border-emerald-200 dark:border-emerald-800" style="font-size: 9px;">Acknowledge</button>` : ''}
                    </div>
                </div>
                ` : ''}

                ${isAdmin ? `
                <div class="flex flex-wrap items-center gap-1.5 mt-1.5 pt-1.5 border-t border-slate-100 dark-no-border md:ml-[32px]">
                    ${!r.read ? `<button onclick="markReportRead(${r.id})" class="flex items-center gap-1 px-1.5 py-0.5 rounded font-bold text-primary bg-primary/5 hover:bg-primary/10 transition-colors" style="font-size: 10px;"><span class="material-symbols-outlined" style="font-size: 13px;">done_all</span> Mark Read</button>` : ''}
                    ${stat !== 'Investigating' ? `<button onclick="updateReportStatus(${r.id},'Investigating')" class="flex items-center gap-1 px-1.5 py-0.5 rounded font-bold text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors" style="font-size: 10px;"><span class="material-symbols-outlined" style="font-size: 13px;">search</span> Investigating</button>` : ''}
                    ${stat !== 'Resolved' ? `<button onclick="updateReportStatus(${r.id},'Resolved')" class="flex items-center gap-1 px-2 py-1 rounded font-bold text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 transition-colors" style="font-size: 10px;"><span class="material-symbols-outlined" style="font-size: 13px;">check_circle</span> Resolve</button>` : `<button onclick="confirmDeleteReport(${r.id})" class="flex items-center gap-1 px-2 py-1 rounded font-bold text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors" style="font-size: 10px;"><span class="material-symbols-outlined" style="font-size: 13px;">delete</span> Delete</button>`}
                    <div class="flex-1"></div>
                    <button onclick="promptAdminNote(${r.id})" class="flex items-center gap-1 px-2 py-1 rounded font-bold text-slate-600 bg-slate-50 dark:text-slate-300 dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors" style="font-size: 10px;"><span class="material-symbols-outlined" style="font-size: 13px;">edit_note</span> Add Note</button>
                </div>
                ` : `<div class="mt-2 pt-2 border-t border-slate-100 dark-no-border md:ml-[52px] flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-white">
                    ${stat === 'Resolved' ? '<span class="material-symbols-outlined text-[16px] text-emerald-500">check_circle</span> <span class="text-emerald-600 dark:text-emerald-400 font-bold">Resolved by Admin</span>' : (stat === 'Investigating' ? '<span class="material-symbols-outlined text-[16px] text-amber-500">search</span> <span class="text-amber-600 dark:text-amber-400 font-bold">Admin is investigating</span>' : '<span class="material-symbols-outlined text-[16px]">schedule</span> Awaiting admin review')}
                </div>`}
            `;
            container.appendChild(div);
        });
    });

    // Desktop-only "More" redesign — real badge + top 2 reports
    const pdBadge = document.getElementById('pd-reports-badge');
    if (pdBadge) { pdBadge.innerText = `${unread} New`; pdBadge.classList.toggle('hidden', unread === 0); }
    const pdList = document.getElementById('pd-reports-inbox-list');
    if (pdList) {
        if (state.staffReports.length === 0) {
            pdList.innerHTML = `<div class="flex flex-col items-center justify-center py-4 gap-1 text-slate-400 dark:text-zinc-500">
                        <span class="material-symbols-outlined text-[28px]">mark_email_read</span>
                        <p class="text-[12px] font-semibold">No staff reports yet.</p>
                    </div>`;
        } else {
            pdList.innerHTML = '';
            sortedReports.slice(0, 2).forEach(r => {
                const ageMs = Date.now() - (typeof r.id === 'number' ? r.id : Date.now());
                const mins = Math.max(0, Math.floor(ageMs / 60000));
                const ageStr = mins < 1 ? 'Just now' : mins < 60 ? `${mins}m ago` : mins < 1440 ? `${Math.floor(mins / 60)}h ago` : `${Math.floor(mins / 1440)}d ago`;
                const row = document.createElement('div');
                row.onclick = () => openSubPage('subpage-staff-reports');
                row.className = 'pd-msg-row cursor-pointer hover:bg-surface-soft dark:hover:bg-zinc-800/50 -mx-2 px-2 rounded-lg transition-colors';
                row.innerHTML = `
                            <div class="flex items-center justify-between">
                                <p class="text-[12.5px] font-bold text-on-background dark:text-white">${r.reporter}</p>
                                <span class="text-[10px] text-on-surface-variant dark:text-zinc-500">${ageStr}</span>
                            </div>
                            <p class="text-[11.5px] text-on-surface-variant dark:text-zinc-400 truncate">${r.desc}</p>`;
                pdList.appendChild(row);
            });
        }
    }

    // Staff-only "My Recent Reports" widget on the desktop More/Profile page
    renderMyReportsDesktop();
}

// Sync the ctrl-slider filled-track CSS variable
