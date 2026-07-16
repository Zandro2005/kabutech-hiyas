function animateYieldTabEntrance() {
    // Reset init flag so every tab entry replays bar animations
    _yaInitDone = false;

    // Sync target-dependent UI before animating
    syncYieldTargetUI();

    // Delay count-up until after the slide-in transition finishes (320ms)
    setTimeout(() => {
        // Animate actual yield number counting up from 0
        const actualYieldEl = document.getElementById('val-actual-yield');
        if (actualYieldEl) {
            let target = parseFloat(actualYieldEl.getAttribute('data-target'));
            if (isNaN(target)) target = parseFloat(actualYieldEl.textContent) || 0;
            actualYieldEl.setAttribute('data-target', target);
            countUpElement(actualYieldEl, target, { decimals: 2, duration: 800, from: 0, key: 'val-actual-yield' });
        }

        // Animate yield target number counting up from 0
        const targetEl = document.getElementById('val-yield-target');
        if (targetEl) {
            countUpElement(targetEl, state.yieldTarget, { decimals: 2, duration: 800, from: 0, key: 'val-yield-target' });
        }

        // Reset and animate actual yield progress bar
        const actualBar = document.getElementById('actual-yield-progress');
        if (actualBar) {
            let targetWidth = actualBar.getAttribute('data-target');
            if (!targetWidth) targetWidth = actualBar.style.width || '77%';
            actualBar.setAttribute('data-target', targetWidth);
            actualBar.style.width = '0%';
            void actualBar.offsetWidth;
            setTimeout(() => { actualBar.style.width = targetWidth; }, 80);
        }

        // If the actual yield breakdown panel is open, re-animate its sub-bars
        const actualDetailPanel = document.getElementById('actual-yield-detail-panel');
        if (actualDetailPanel && parseFloat(actualDetailPanel.style.maxHeight) > 0) {
            animateActualSubBars();
        }
    }, 340);

    // Init yield analytics after slide-in so bars are visible when they grow
    setTimeout(() => { initYieldAnalytics(); }, 340);
}

// Sync all yield-target-dependent UI elements from state.yieldTarget
function syncYieldTargetUI() {
    const target = state.yieldTarget;
    
    // Calculate REAL actual yield from database for the current month
    let actualGrams = 0;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    if (state.growBatches) {
        Object.values(state.growBatches || {}).filter(r => r != null).forEach(rack => {
            if (rack.bags) {
                Object.values(rack.bags || {}).filter(b => b != null).forEach(bag => {
                    if (bag.harvestLog) {
                        Object.values(bag.harvestLog || {}).filter(l => l != null).forEach(log => {
                            const d = new Date(log.date);
                            if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
                                actualGrams += (log.grams || 0);
                            }
                        });
                    }
                });
            }
            if (rack.historicalHarvests) {
                Object.values(rack.historicalHarvests || {}).filter(l => l != null).forEach(log => {
                    const d = new Date(log.date);
                    if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
                        actualGrams += (log.grams || 0);
                    }
                });
            }
        });
    }
    const actual = actualGrams > 0 ? (actualGrams / 1000) : 0; // kg
    
    const actualYieldEl = document.getElementById('val-actual-yield');
    if (actualYieldEl) {
        actualYieldEl.setAttribute('data-target', actual);
        if (!actualYieldEl.classList.contains('counting')) {
            actualYieldEl.textContent = actual.toFixed(2);
        }
    }

    // Update target value display
    const targetEl = document.getElementById('val-yield-target');
    if (targetEl) targetEl.textContent = target.toFixed(2);

    // Update "Target: X kg" label in actual yield bar
    const targetLabel = document.getElementById('actual-yield-target-label');
    if (targetLabel) targetLabel.textContent = `Target: ${target.toFixed(2)} kg`;

    // Update actual yield progress bar width (actual / target, capped at 100%)
    const progressBar = document.getElementById('actual-yield-progress');
    if (progressBar) {
        const pct = Math.min(100, Math.round((actual / target) * 100));
        progressBar.setAttribute('data-target', pct + '%');
        progressBar.style.width = pct + '%';
    }

    // Update efficiency on target card
    const efficiency = Math.round((actual / target) * 100);
    const effLabel = document.getElementById('yield-efficiency-label');
    const effBar = document.getElementById('yield-efficiency-bar');
    if (effLabel) {
        effLabel.textContent = efficiency + '%';
        effLabel.className = efficiency >= 100
            ? 'text-secondary dark:text-emerald-400'
            : efficiency >= 80
                ? 'text-warning-gold'
                : 'text-error-red dark:text-red-400';
    }
    if (effBar) effBar.style.width = Math.min(100, efficiency) + '%';
}

// Animate the small progress bars inside the actual yield breakdown panel
function animateActualSubBars() {
    document.querySelectorAll('.actual-sub-bar').forEach(bar => {
        const target = bar.getAttribute('data-width');
        bar.style.width = '0%';
        void bar.offsetWidth;
        setTimeout(() => { bar.style.width = target + '%'; }, 200);
    });
}

// Toggle the confidence breakdown panel on tap
function toggleYieldDetail() {
    const panel = document.getElementById('yield-detail-panel');
    if (!panel) return;
    const opening = panel.style.maxHeight === '0px' || !panel.style.maxHeight;
    if (opening) {
        panel.style.maxHeight = panel.scrollHeight + 'px';
        panel.style.opacity = '1';
        panel.style.marginTop = '0';
    } else {
        panel.style.maxHeight = '0px';
        panel.style.opacity = '0';
    }
}

function toggleActualYieldDetail() {
    const panel = document.getElementById('actual-yield-detail-panel');
    if (!panel) return;
    const opening = panel.style.maxHeight === '0px' || !panel.style.maxHeight;
    if (opening) {
        panel.style.maxHeight = panel.scrollHeight + 'px';
        panel.style.opacity = '1';
        setTimeout(() => animateActualSubBars(), 80);
    } else {
        panel.style.maxHeight = '0px';
        panel.style.opacity = '0';
    }
}

// ===================== YIELD ANALYTICS ENGINE =====================
// Data: monthly yield data (actual kg, predicted kg) for the past 12 months
// Indexed Jan=0 … Dec=11. Current month = May 2025 (index 4).
const YA_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const YA_DATA = {
    actual: [1.82, 1.95, 2.08, 2.20, 2.31, null, null, null, null, null, null, null],
    predicted: [1.90, 2.00, 2.10, 2.25, 2.45, 2.50, 2.48, 2.52, 2.55, 2.60, 2.58, 2.65]
};
const YA_YEAR = new Date().getFullYear();
const YA_NOW_MONTH = new Date().getMonth(); 

// Period definitions: [startMonthIdx, endMonthIdx (inclusive)]
const YA_PERIODS = {
    monthly: { label: `Monthly (${YA_MONTHS[Math.max(0, YA_NOW_MONTH - 4)]}–${YA_MONTHS[YA_NOW_MONTH]})`, start: Math.max(0, YA_NOW_MONTH - 4), end: YA_NOW_MONTH },
    semi: { label: `6-Month (${YA_MONTHS[Math.max(0, YA_NOW_MONTH - 5)]}–${YA_MONTHS[YA_NOW_MONTH]})`, start: Math.max(0, YA_NOW_MONTH - 5), end: YA_NOW_MONTH },
    annual: { label: 'Annual (Jan–Dec)', start: 0, end: 11 }
};

let _yaCurPeriod = 'monthly';
let _yaSelectedIdx = null;
let _yaInitDone = false;

function switchYieldPeriod(period) {
    if (_yaCurPeriod === period && _yaInitDone) return;
    _yaCurPeriod = period;
    // Update tab button styles
    document.querySelectorAll('.ya-period-tab').forEach(btn => {
        const isActive = btn.id === `ya-tab-${period}`;
        btn.className = `ya-period-tab text-[9px] font-extrabold px-2.5 py-1 rounded-full transition-all duration-200 ` +
            (isActive
                ? 'bg-primary text-on-primary dark:bg-primary-container dark:text-white'
                : 'text-on-surface-variant dark:text-zinc-400');
    });
    _yaSelectedIdx = null;
    closeYAPinpoint();
    renderYieldAnalytics(true);
}

function initYieldAnalytics() {
    if (!document.getElementById('ya-bars')) return;
    renderYieldAnalytics(!_yaInitDone);
    _yaInitDone = true;
}

function renderYieldDrivers() {
    const listEl = document.getElementById('yield-drivers-list');
    if (!listEl) return;
    
    if (!state.growBatches || state.growBatches.length === 0) {
        listEl.innerHTML = '<p class="text-[11px] text-on-surface-variant dark:text-zinc-500 italic">No active racks found.</p>';
        return;
    }
    
    let html = '';
    const validRacks = Object.values(state.growBatches || {}).filter(r => r != null);
    
    if (validRacks.length === 0) {
        listEl.innerHTML = '<p class="text-[11px] text-on-surface-variant dark:text-zinc-500 italic">No active racks found.</p>';
        return;
    }
    
    validRacks.forEach(rack => {
        const name = rack.rack || 'Unnamed Rack';
        const letter = name.replace('Rack ', '').charAt(0) || 'R';
        const strain = rack.strain || 'Unknown Strain';
        const phase = rack.phase || 'Standard Growth';
        
        let totalGrams = 0;
        if (rack.bags) {
            Object.values(rack.bags).filter(b => b != null).forEach(bag => {
                if (bag.harvestLog) {
                    Object.values(bag.harvestLog).filter(l => l != null).forEach(log => {
                        totalGrams += (log.grams || 0);
                    });
                }
            });
        }
        
        let perfBadge = '';
        if (totalGrams > 3000) {
            perfBadge = '<span class="shrink-0 text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-secondary/15 text-secondary dark:bg-emerald-950/40 dark:text-emerald-400">PEAK</span>';
        } else if (totalGrams > 1000) {
            perfBadge = '<span class="shrink-0 text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-secondary/15 text-secondary dark:bg-emerald-950/40 dark:text-emerald-400">HIGH</span>';
        } else {
            perfBadge = '<span class="shrink-0 text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-surface-variant text-on-surface-variant dark:bg-zinc-700 dark:text-zinc-300">NORM</span>';
        }
        
        html += `
        <div class="flex items-center gap-3 bg-surface-soft dark:bg-zinc-800 rounded-xl p-3 border border-border-muted dark:border-zinc-700">
            <div class="w-9 h-9 rounded-lg bg-surface-container-lowest dark:bg-zinc-900 border border-muted dark:border-zinc-700 flex items-center justify-center font-extrabold text-[13px] text-brand-deep dark:text-white shrink-0">
                ${letter}
            </div>
            <div class="flex-1 min-w-0">
                <p class="text-[12px] font-bold text-on-background dark:text-white truncate">${name}</p>
                <p class="text-[10px] text-on-surface-variant dark:text-zinc-400 truncate">${strain} • ${phase}</p>
            </div>
            ${perfBadge}
        </div>`;
    });
    
    listEl.innerHTML = html;
}

function renderYieldAnalytics(animate) {
    // Also re-render the right-side Yield Drivers UI
    if (typeof renderYieldDrivers === 'function') renderYieldDrivers();

    // 1. DYNAMICALLY OVERRIDE YA_DATA WITH REAL DATABASE HARVEST LOGS
    const currentYear = new Date().getFullYear();
    const monthlyTotals = new Array(12).fill(0);
    let totalHarvestGrams = 0;
    
    if (state.growBatches) {
        Object.values(state.growBatches || {}).filter(r => r != null).forEach(rack => {
            if (rack.bags) {
                Object.values(rack.bags || {}).filter(b => b != null).forEach(bag => {
                    if (bag.harvestLog) {
                        Object.values(bag.harvestLog || {}).filter(l => l != null).forEach(log => {
                            const d = new Date(log.date);
                            if (d.getFullYear() === currentYear) {
                                monthlyTotals[d.getMonth()] += (log.grams || 0);
                            }
                            totalHarvestGrams += (log.grams || 0);
                        });
                    }
                });
            }
            if (rack.historicalHarvests) {
                Object.values(rack.historicalHarvests || {}).filter(l => l != null).forEach(log => {
                    const d = new Date(log.date);
                    if (d.getFullYear() === currentYear) {
                        monthlyTotals[d.getMonth()] += (log.grams || 0);
                    }
                    totalHarvestGrams += (log.grams || 0);
                });
            }
        });
    }

    // Always override the mock data with actual database values (even if 0)
    const curMonth = new Date().getMonth();
    for (let i = 0; i < 12; i++) {
        if (i <= curMonth) {
            YA_DATA.actual[i] = monthlyTotals[i] > 0 ? (monthlyTotals[i] / 1000) : 0;
        } else {
            YA_DATA.actual[i] = null;
        }
        // Also sync the chart's predicted target to match the global yield target
        YA_DATA.predicted[i] = state.yieldTarget || 2.20;
    }

    const { start, end } = YA_PERIODS[_yaCurPeriod];
    const svg = document.getElementById('ya-svg');
    const barsG = document.getElementById('ya-bars');
    if (!barsG) return;
    barsG.innerHTML = '';

    // Collect visible months
    const months = [];
    for (let i = start; i <= end; i++) {
        months.push({
            idx: i,
            label: YA_MONTHS[i],
            actual: YA_DATA.actual[i],
            predicted: YA_DATA.predicted[i]
        });
    }

    const n = months.length;
    const chartX0 = 28, chartX1 = 298;
    const chartY0 = 10, chartY1 = 90;
    const chartW = chartX1 - chartX0;

    // Dynamic max — consider both actual and predicted
    const allVals = months.flatMap(m => [m.actual || 0, m.predicted || 0]).filter(Boolean);
    const rawMax = Math.max(...allVals, 1);
    const maxVal = Math.ceil(rawMax / 0.5) * 0.5 + 0.5;
    const scaleY = v => chartY1 - ((v / maxVal) * (chartY1 - chartY0));

    // Update y labels
    const steps = [maxVal, maxVal * 0.66, maxVal * 0.33, 0];
    const yEls = ['ya-y4', 'ya-y3', 'ya-y2', 'ya-y1'];
    const yPositions = [chartY0, chartY0 + (chartY1 - chartY0) * 0.33, chartY0 + (chartY1 - chartY0) * 0.66, chartY1];
    steps.forEach((v, i) => {
        const el = document.getElementById(yEls[i]);
        if (el) { el.textContent = v.toFixed(v % 1 === 0 ? 0 : 1); el.setAttribute('y', yPositions[i] + 3); }
    });
    const gridIds = ['ya-grid-1', 'ya-grid-2', 'ya-grid-3', 'ya-grid-4'];
    gridIds.forEach((id, i) => {
        const el = document.getElementById(id);
        if (el) { el.setAttribute('y1', yPositions[i]); el.setAttribute('y2', yPositions[i]); }
    });

    // Grouped bar layout: 2 bars per month (predicted left, actual right)
    const groupW = chartW / n;
    const totalBarW = Math.min(groupW * 0.70, 20);
    const singleBarW = totalBarW / 2 - 0.5; // gap of 1px between bars in a group
    const ns = 'http://www.w3.org/2000/svg';

    months.forEach((m, gi) => {
        const gx = chartX0 + gi * groupW + groupW / 2;
        const isSelected = _yaSelectedIdx === m.idx;
        const predX = gx - singleBarW - 0.5; // left bar center
        const actX = gx + singleBarW + 0.5;  // right bar center (shifted right)
        // Adjust: predX is left-edge + half, actX is right-edge - half
        const predXc = gx - singleBarW * 0.5 - 0.5;
        const actXc = gx + singleBarW * 0.5 + 0.5;

        // ── Predicted bar (outline style with fill) ──
        if (m.predicted !== null) {
            const py = scaleY(m.predicted);
            const ph = chartY1 - py;
            const predRect = document.createElementNS(ns, 'rect');
            predRect.setAttribute('x', predXc - singleBarW / 2);
            predRect.setAttribute('y', animate ? chartY1 : py);
            predRect.setAttribute('width', singleBarW);
            predRect.setAttribute('height', animate ? 0 : ph);
            predRect.setAttribute('rx', '2.5');
            predRect.setAttribute('fill', isSelected ? 'rgba(0,69,33,0.18)' : 'rgba(146,214,162,0.25)');
            predRect.setAttribute('stroke', isSelected ? '#004521' : '#92d6a2');
            predRect.setAttribute('stroke-width', '1.2');
            predRect.style.cursor = 'pointer';
            const tapP = () => selectYAMonth(m.idx);
            predRect.addEventListener('click', tapP);
            predRect.addEventListener('touchend', e => { e.preventDefault(); tapP(); });
            barsG.appendChild(predRect);
            if (animate) {
                void predRect.getBoundingClientRect();
                const delay = gi * 80;
                setTimeout(() => {
                    predRect.setAttribute('y', py);
                    predRect.setAttribute('height', ph);
                    predRect.style.transition = `y 900ms cubic-bezier(0.34,1.56,0.64,1) ${delay}ms, height 900ms cubic-bezier(0.34,1.56,0.64,1) ${delay}ms`;
                }, 30);
            }
            // Value label for selected predicted bar
            if (isSelected) {
                const pvl = document.createElementNS(ns, 'text');
                pvl.setAttribute('x', predXc);
                pvl.setAttribute('y', py - 3);
                pvl.setAttribute('text-anchor', 'middle');
                pvl.setAttribute('font-size', '6');
                pvl.setAttribute('fill', '#004521');
                pvl.setAttribute('font-weight', '700');
                pvl.textContent = m.predicted.toFixed(2);
                barsG.appendChild(pvl);
            }
        }

        // ── Actual bar (solid fill) ──
        if (m.actual !== null) {
            const ay = scaleY(m.actual);
            const ah = chartY1 - ay;
            const actRect = document.createElementNS(ns, 'rect');
            actRect.setAttribute('x', actXc - singleBarW / 2);
            actRect.setAttribute('y', animate ? chartY1 : ay);
            actRect.setAttribute('width', singleBarW);
            actRect.setAttribute('height', animate ? 0 : ah);
            actRect.setAttribute('rx', '2.5');
            actRect.setAttribute('fill', isSelected ? '#004521' : '#196c40');
            actRect.style.cursor = 'pointer';
            actRect.style.transition = 'fill 0.2s ease';
            const tap = () => selectYAMonth(m.idx);
            actRect.addEventListener('click', tap);
            actRect.addEventListener('touchend', e => { e.preventDefault(); tap(); });
            barsG.appendChild(actRect);
            if (animate) {
                void actRect.getBoundingClientRect();
                const delay = gi * 80 + 40;
                setTimeout(() => {
                    actRect.setAttribute('y', ay);
                    actRect.setAttribute('height', ah);
                    actRect.style.transition = `y 900ms cubic-bezier(0.34,1.56,0.64,1) ${delay}ms, height 900ms cubic-bezier(0.34,1.56,0.64,1) ${delay}ms, fill 0.2s ease`;
                }, 30);
            }
            // Value label for selected actual bar
            if (isSelected) {
                const avl = document.createElementNS(ns, 'text');
                avl.setAttribute('x', actXc);
                avl.setAttribute('y', ay - 3);
                avl.setAttribute('text-anchor', 'middle');
                avl.setAttribute('font-size', '6');
                avl.setAttribute('fill', '#004521');
                avl.setAttribute('font-weight', '800');
                avl.textContent = m.actual.toFixed(2);
                barsG.appendChild(avl);
            }
        } else {
            // No actual data — placeholder outline at actual bar position
            const emptyRect = document.createElementNS(ns, 'rect');
            emptyRect.setAttribute('x', actXc - singleBarW / 2);
            emptyRect.setAttribute('y', chartY0);
            emptyRect.setAttribute('width', singleBarW);
            emptyRect.setAttribute('height', chartY1 - chartY0);
            emptyRect.setAttribute('rx', '2.5');
            emptyRect.setAttribute('fill', 'none');
            emptyRect.setAttribute('stroke', '#e2e8e4');
            emptyRect.setAttribute('stroke-width', '1');
            emptyRect.setAttribute('stroke-dasharray', '3,2');
            barsG.appendChild(emptyRect);
        }

        // X label (centered on group)
        const xLabel = document.createElementNS(ns, 'text');
        xLabel.setAttribute('x', gx);
        xLabel.setAttribute('y', '108');
        xLabel.setAttribute('text-anchor', 'middle');
        xLabel.setAttribute('font-size', n > 9 ? '5.5' : '7');
        xLabel.setAttribute('fill', isSelected ? '#004521' : (m.actual !== null ? '#94a3b8' : '#c0c9be'));
        xLabel.setAttribute('font-weight', isSelected ? '800' : '600');
        xLabel.textContent = m.label;
        xLabel.style.cursor = 'pointer';
        xLabel.addEventListener('click', () => selectYAMonth(m.idx));
        barsG.appendChild(xLabel);
    });

    // ── Actual KPI strip ──
    const actualMonths = months.filter(m => m.actual !== null);
    const total = actualMonths.reduce((s, m) => s + m.actual, 0);
    const avg = actualMonths.length ? total / actualMonths.length : 0;
    const peak = actualMonths.length ? Math.max(...actualMonths.map(m => m.actual)) : 0;
    const kpiTotal = document.getElementById('ya-kpi-total');
    const kpiAvg = document.getElementById('ya-kpi-avg');
    const kpiPeak = document.getElementById('ya-kpi-peak');

    // ── Predicted KPI strip ──
    const predMonths = months.filter(m => m.predicted !== null);
    const predTotal = predMonths.reduce((s, m) => s + m.predicted, 0);
    const predAvg = predMonths.length ? predTotal / predMonths.length : 0;
    const predPeak = predMonths.length ? Math.max(...predMonths.map(m => m.predicted)) : 0;
    const kpiPredTotal = document.getElementById('ya-kpi-pred-total');
    const kpiPredAvg = document.getElementById('ya-kpi-pred-avg');
    const kpiPredPeak = document.getElementById('ya-kpi-pred-peak');

    if (kpiTotal) kpiTotal.textContent = total.toFixed(2) + ' kg';
    if (kpiAvg) kpiAvg.textContent = avg.toFixed(2) + ' kg';
    if (kpiPeak) kpiPeak.textContent = peak.toFixed(2) + ' kg';
    if (kpiPredTotal) kpiPredTotal.textContent = predTotal.toFixed(2) + ' kg';
    if (kpiPredAvg) kpiPredAvg.textContent = predAvg.toFixed(2) + ' kg';
    if (kpiPredPeak) kpiPredPeak.textContent = predPeak.toFixed(2) + ' kg';

    // Month chips
    renderYAChips(months, actualMonths, avg);
}

function renderYAChips(months, actualMonths, avg) {
    const chipsEl = document.getElementById('ya-month-chips');
    if (!chipsEl) return;
    chipsEl.innerHTML = '';
    months.forEach(m => {
        const isSelected = _yaSelectedIdx === m.idx;
        const hasData = m.actual !== null;
        const chip = document.createElement('button');
        chip.className = `shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-extrabold border transition-all duration-200 active:scale-95 ` +
            (isSelected
                ? 'bg-primary text-on-primary dark:bg-primary-container dark:text-white border-primary dark:border-primary-container'
                : hasData
                    ? 'bg-surface-soft dark:bg-zinc-800 text-on-surface-variant dark:text-zinc-300 border-border-muted dark:border-zinc-700'
                    : 'bg-surface-soft dark:bg-zinc-800 text-slate-300 dark:text-zinc-600 border-dashed border-slate-300 dark:border-zinc-700');
        chip.innerHTML = (hasData
            ? `<span class="w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-on-primary dark:bg-white' : 'bg-secondary dark:bg-emerald-400'} shrink-0"></span>`
            : `<span class="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-zinc-600 shrink-0"></span>`) + m.label;
        chip.onclick = () => selectYAMonth(m.idx);
        chipsEl.appendChild(chip);
    });
}

function selectYAMonth(idx) {
    _yaSelectedIdx = (_yaSelectedIdx === idx) ? null : idx;
    if (_yaSelectedIdx === null) { closeYAPinpoint(); renderYieldAnalytics(false); return; }
    renderYieldAnalytics(false);
    showYAPinpoint(idx);
}

function showYAPinpoint(idx) {
    const m = { idx, label: YA_MONTHS[idx], actual: YA_DATA.actual[idx], predicted: YA_DATA.predicted[idx] };
    const panel = document.getElementById('ya-pinpoint-panel');
    const { start, end } = YA_PERIODS[_yaCurPeriod];
    const actualInPeriod = [];
    for (let i = start; i <= end; i++) { if (YA_DATA.actual[i] !== null) actualInPeriod.push(YA_DATA.actual[i]); }
    const periodAvg = actualInPeriod.length ? actualInPeriod.reduce((a, b) => a + b, 0) / actualInPeriod.length : 0;

    document.getElementById('ya-pin-title').textContent = `${m.label} ${YA_YEAR} · Detail`;

    // Predicted value
    const predEl = document.getElementById('ya-pin-predicted');
    if (predEl) predEl.textContent = m.predicted !== null ? m.predicted.toFixed(2) + ' kg' : '—';

    if (m.actual !== null) {
        const vsAvg = m.actual - periodAvg;
        document.getElementById('ya-pin-actual').textContent = m.actual.toFixed(2) + ' kg';

        const vsEl = document.getElementById('ya-pin-var');
        vsEl.textContent = (vsAvg >= 0 ? '+' : '') + vsAvg.toFixed(2) + ' kg';
        vsEl.className = `text-[13px] font-extrabold ${vsAvg >= 0 ? 'text-secondary dark:text-emerald-400' : 'text-error dark:text-red-400'}`;

        // Delta vs predicted
        const deltaEl = document.getElementById('ya-pin-delta');
        if (deltaEl && m.predicted !== null) {
            const delta = m.actual - m.predicted;
            deltaEl.textContent = (delta >= 0 ? '+' : '') + delta.toFixed(2) + ' kg';
            deltaEl.className = `text-[13px] font-extrabold ${delta >= 0 ? 'text-secondary dark:text-emerald-400' : 'text-error dark:text-red-400'}`;
        } else if (deltaEl) {
            deltaEl.textContent = '—';
            deltaEl.className = 'text-[13px] font-extrabold text-on-surface-variant dark:text-zinc-400';
        }

        const rankArr = [...actualInPeriod].sort((a, b) => b - a);
        const rank = rankArr.indexOf(m.actual) + 1;
        const vsAvgEl = document.getElementById('ya-pin-vsavg');
        vsAvgEl.textContent = `#${rank} of ${rankArr.length}`;
        vsAvgEl.className = 'text-[13px] font-extrabold text-on-surface dark:text-white';

        const insights = [];
        if (vsAvg > 0.1) insights.push('Above-average month — great growing conditions.');
        else if (vsAvg < -0.1) insights.push('Below average — consider reviewing humidity or temp logs.');
        else insights.push('Close to the period average. Consistent performance.');
        if (rank === 1) insights.push('Best month in this period!');
        if (m.predicted !== null) {
            const delta = m.actual - m.predicted;
            if (Math.abs(delta) < 0.05) insights.push('AI prediction was highly accurate this month.');
            else if (delta > 0) insights.push('Outperformed AI prediction — excellent batch!');
            else insights.push('Fell short of prediction — check CO₂ or misting logs.');
        }
        document.getElementById('ya-pin-insight').textContent = insights.join(' ');
    } else {
        document.getElementById('ya-pin-actual').textContent = 'No data yet';
        document.getElementById('ya-pin-var').textContent = '—';
        document.getElementById('ya-pin-var').className = 'text-[13px] font-extrabold text-on-surface-variant dark:text-zinc-400';
        const deltaEl = document.getElementById('ya-pin-delta');
        if (deltaEl) { deltaEl.textContent = '—'; deltaEl.className = 'text-[13px] font-extrabold text-on-surface-variant dark:text-zinc-400'; }
        document.getElementById('ya-pin-vsavg').textContent = '—';
        document.getElementById('ya-pin-vsavg').className = 'text-[13px] font-extrabold text-on-surface-variant dark:text-zinc-400';
        document.getElementById('ya-pin-insight').textContent = m.predicted !== null
            ? `AI predicts ${m.predicted.toFixed(2)} kg for this month. No actual harvest recorded yet.`
            : 'No harvest data recorded for this month yet.';
    }

    if (panel) {
        panel.style.maxHeight = panel.scrollHeight + 120 + 'px';
        panel.style.opacity = '1';
        setTimeout(() => {
            panel.style.maxHeight = panel.scrollHeight + 'px';
            panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 320);
    }
}

function closeYAPinpoint() {
    const panel = document.getElementById('ya-pinpoint-panel');
    if (panel) { panel.style.maxHeight = '0px'; panel.style.opacity = '0'; }
}
// ================= END YIELD ANALYTICS ENGINE =================
