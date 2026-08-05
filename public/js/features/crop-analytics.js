function renderCropAnalyticsWidgets() {
    try {
        const racks = state.growBatches || [];
        // Ignore null racks (if any from Firebase arrays)
        const validRacks = Object.values(racks).filter(r => r != null);

        computeHarvestSummary(validRacks);
        computeRackUtilization(validRacks);
        computeCropHealth(validRacks);
        computeGrowthCycles(validRacks);
    } catch (e) {
        console.error("Error in renderCropAnalyticsWidgets:", e);
    }
}

function computeHarvestSummary(racks) {
    const container = document.getElementById('crop-widget-harvest-content');
    if (!container) return;

    let totalGrams = 0;
    let totalHarvests = 0;
    let rackData = [];
    let totalBagsWithHarvest = 0;

    racks.forEach(rack => {
        const bags = Object.values(rack.bags || {}).filter(b => b != null);
        let rackGrams = 0;
        
        if (rack.historicalHarvests) {
            const hist = Object.values(rack.historicalHarvests).filter(h => h != null);
            rackGrams += hist.reduce((s, h) => s + h.grams, 0);
            totalHarvests += hist.length;
        }

        bags.forEach(bag => {
            if (bag.harvestLog && bag.harvestLog.length > 0) {
                const bagGrams = bag.harvestLog.reduce((s, h) => s + h.grams, 0);
                rackGrams += bagGrams;
                totalHarvests += bag.harvestLog.length;
                totalBagsWithHarvest++;
            }
        });

        totalGrams += rackGrams;
        rackData.push({ id: rack.id, name: rack.rack, grams: rackGrams });
    });

    rackData.sort((a, b) => b.grams - a.grams);
    
    // Convert to kg if large enough, else keep g
    const formatWeight = (g) => g >= 1000 ? (g / 1000).toFixed(2) + 'kg' : g + 'g';
    const avgPerBag = totalBagsWithHarvest > 0 ? Math.round(totalGrams / totalBagsWithHarvest) : 0;

    let html = `
        <div class="flex flex-wrap items-end justify-between mb-6 gap-y-3">
            <div>
                <p class="text-[11px] text-on-surface-variant dark:text-zinc-400 uppercase tracking-widest font-bold mb-2">Total Yield</p>
                <div class="flex items-baseline gap-1">
                    <span class="text-[28px] md:text-[36px] font-extrabold text-brand-deep dark:text-white leading-none tracking-tighter">${formatWeight(totalGrams)}</span>
                </div>
            </div>
            <div class="text-right pb-2">
                <p class="text-[13px] text-on-surface-variant dark:text-zinc-400 font-medium">Avg: ${avgPerBag}g / bag</p>
                <p class="text-[13px] text-on-surface-variant dark:text-zinc-400 font-medium">${totalHarvests} total harvests</p>
            </div>
        </div>
        <div class="space-y-4 mb-8">
    `;

    if (totalGrams === 0) {
        html += `<p class="text-[11px] text-slate-400 dark:text-zinc-500 text-center py-2">No harvests recorded yet.</p>`;
    } else {
        rackData.slice(0, 3).forEach(r => { // Show top 3
            const pct = Math.round((r.grams / totalGrams) * 100);
            html += `
                <div class="flex items-center gap-2 xl:gap-4 group">
                    <span class="text-[11px] md:text-[13px] font-bold text-on-surface dark:text-zinc-300 flex-1 min-w-[50px] truncate">${r.name}</span>
                    <div class="flex-1 bg-surface-variant dark:bg-zinc-800 rounded-full h-3 md:h-4 relative overflow-hidden">
                        <div class="absolute top-0 left-0 bottom-0 bg-primary dark:bg-primary-fixed rounded-full transition-all duration-1000 ease-out" style="width: 0%;" data-target-width="${pct}%"></div>
                    </div>
                    <span class="text-[11px] md:text-[13px] font-semibold text-on-surface-variant dark:text-zinc-400 w-auto text-right whitespace-nowrap ml-2">${formatWeight(r.grams)} <span class="hidden md:inline">(${pct}%)</span></span>
                </div>
            `;
        });
    }

    html += `</div>`;
    
    html += `
        <button onclick="openWidgetModal('modal-log-harvest')" class="w-full mt-2 py-3 rounded-xl bg-primary/10 text-primary dark:text-primary-fixed font-bold text-[13px] hover:bg-primary/20 transition-colors flex items-center justify-center gap-2">
            <span class="material-symbols-outlined text-[18px]">add</span>
            Log Harvest
        </button>
    `;
    
    container.innerHTML = html;

    // Trigger animations
    setTimeout(() => {
        container.querySelectorAll('[data-target-width]').forEach(el => {
            el.style.width = el.getAttribute('data-target-width');
        });
    }, 100);
}

function computeRackUtilization(racks) {
    const container = document.getElementById('crop-widget-util-content');
    if (!container) return;

    let totalSlots = 0;
    let active = 0, empty = 0, contam = 0, replaced = 0;
    let rackStats = [];

    racks.forEach(rack => {
        const bags = Object.values(rack.bags || {}).filter(b => b != null);
        const rActive = bags.filter(b => b.status === 'Active').length;
        const rEmpty = bags.filter(b => b.status === 'Empty').length;
        const rContam = bags.filter(b => b.status === 'Contaminated').length;
        const rReplaced = bags.filter(b => b.status === 'Replaced').length;

        active += rActive;
        empty += rEmpty;
        contam += rContam;
        replaced += rReplaced;
        totalSlots += bags.length;

        rackStats.push({
            id: rack.id, name: rack.rack,
            total: bags.length, active: rActive, empty: rEmpty, contam: rContam,
            pct: bags.length ? Math.round(((rActive + rReplaced) / bags.length) * 100) : 0
        });
    });

    const overallPct = totalSlots ? Math.round(((active + replaced) / totalSlots) * 100) : 0;

    let html = `
        <div class="mb-8">
            <div class="flex flex-wrap justify-between items-end mb-3 gap-y-1">
                <span class="text-[12px] md:text-[14px] font-bold text-on-surface dark:text-zinc-300">Overall Capacity</span>
                <span class="text-[12px] md:text-[14px] font-extrabold text-brand-deep dark:text-primary-fixed">${active + replaced} / ${totalSlots} <span class="text-on-surface-variant dark:text-zinc-500 font-medium ml-1">(${overallPct}%)</span></span>
            </div>
            <div class="w-full bg-surface-variant dark:bg-zinc-800 rounded-full h-5 flex overflow-hidden">
                <div class="bg-emerald-500 h-full transition-all duration-1000" style="width: 0%" data-target-width="${totalSlots ? (active/totalSlots)*100 : 0}%" title="Active"></div>
                <div class="bg-slate-400 h-full transition-all duration-1000" style="width: 0%" data-target-width="${totalSlots ? (replaced/totalSlots)*100 : 0}%" title="Replaced"></div>
                <div class="bg-red-500 h-full transition-all duration-1000" style="width: 0%" data-target-width="${totalSlots ? (contam/totalSlots)*100 : 0}%" title="Contaminated"></div>
            </div>
        </div>
        
        <div class="flex flex-wrap gap-2 md:gap-4 mb-6 text-[10px] md:text-[12px] font-bold uppercase tracking-wider text-on-surface-variant dark:text-zinc-400">
            <span class="flex items-center gap-1.5"><span class="w-3.5 h-3.5 rounded-full bg-emerald-500"></span> ${active} Active</span>
            <span class="flex items-center gap-1.5"><span class="w-3.5 h-3.5 rounded-full bg-surface-variant dark:bg-zinc-700"></span> ${empty} Empty</span>
            <span class="flex items-center gap-1.5"><span class="w-3.5 h-3.5 rounded-full bg-red-500"></span> ${contam} Flagged</span>
        </div>
        
        <div class="space-y-4 mb-8">
    `;

    rackStats.slice(0, 3).forEach(r => {
        const color = r.pct > 80 ? 'bg-emerald-500' : r.pct > 40 ? 'bg-amber-500' : 'bg-red-500';
        html += `
            <div class="flex items-center gap-2 group">
                <span class="text-[11px] md:text-[13px] font-bold text-on-surface dark:text-zinc-300 flex-1 min-w-[50px] truncate">${r.name}</span>
                <div class="flex-1 bg-surface-variant dark:bg-zinc-800 rounded-full h-3.5 relative overflow-hidden">
                    <div class="absolute top-0 left-0 bottom-0 ${color} rounded-full transition-all duration-1000 ease-out" style="width: 0%;" data-target-width="${r.pct}%"></div>
                </div>
                <div class="flex items-center gap-1 md:gap-2 w-auto justify-end ml-2">
                    <span class="text-[11px] md:text-[13px] font-semibold text-on-surface-variant dark:text-zinc-400 text-right whitespace-nowrap">${r.active}/${r.total}</span>
                    <button onclick="removeRack(${r.id})" class="text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded p-1 transition-colors flex items-center justify-center" title="Delete Rack">
                        <span class="material-symbols-outlined text-[14px] md:text-[16px]">delete</span>
                    </button>
                </div>
            </div>
        `;
    });

    html += `</div>`;
    
    html += `
        <button onclick="openWidgetModal('modal-update-capacity')" class="w-full mt-2 py-3 rounded-xl bg-slate-100 dark:bg-zinc-800 text-on-surface-variant dark:text-zinc-300 font-bold text-[13px] hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2">
            <span class="material-symbols-outlined text-[18px]">edit</span>
            Update Capacity
        </button>
    `;
    
    container.innerHTML = html;

    setTimeout(() => {
        container.querySelectorAll('[data-target-width]').forEach(el => {
            el.style.width = el.getAttribute('data-target-width');
        });
    }, 150);
}

function computeCropHealth(racks) {
    const container = document.getElementById('crop-widget-health-content');
    if (!container) return;

    let totalBags = 0;
    let totalContam = 0;
    let rackHealth = [];

    racks.forEach(rack => {
        const bags = Object.values(rack.bags || {}).filter(b => b != null);
        const contam = bags.filter(b => b.status === 'Contaminated').length;
        totalBags += bags.length;
        totalContam += contam;
        
        rackHealth.push({
            id: rack.id, name: rack.rack, contam,
            status: contam === 0 ? 'Healthy' : (contam <= 2 ? 'Monitor' : 'At Risk')
        });
    });

    const contamRate = totalBags ? ((totalContam / totalBags) * 100).toFixed(1) : 0;
    
    // Health score: start at 100, minus (contamRate * 5)
    let healthScore = 100 - (parseFloat(contamRate) * 5);
    healthScore = Math.max(0, Math.min(100, Math.round(healthScore)));

    const scoreColor = healthScore >= 90 ? 'text-emerald-500' : healthScore >= 70 ? 'text-amber-500' : 'text-red-500';
    const rateColor = totalContam === 0 ? 'text-emerald-500' : 'text-red-500';

    let html = `
        <div class="flex flex-col md:flex-row gap-3 md:gap-4 mb-6">
            <div class="flex-1 bg-surface-soft dark:bg-zinc-800/50 rounded-2xl p-3 md:p-5 border border-slate-100 dark:border-zinc-800">
                <p class="text-[10px] md:text-[12px] text-on-surface-variant dark:text-zinc-400 font-bold uppercase tracking-wider mb-2 md:mb-3">Health Score</p>
                <div class="flex items-baseline gap-1">
                    <span class="text-[28px] md:text-[36px] font-extrabold ${scoreColor} leading-none tracking-tight">${healthScore}</span>
                    <span class="text-[12px] md:text-[14px] text-on-surface-variant dark:text-zinc-500 font-bold">/100</span>
                </div>
            </div>
            <div class="flex-1 bg-surface-soft dark:bg-zinc-800/50 rounded-2xl p-3 md:p-5 border border-slate-100 dark:border-zinc-800">
                <p class="text-[10px] md:text-[12px] text-on-surface-variant dark:text-zinc-400 font-bold uppercase tracking-wider mb-2 md:mb-3">Contam. Rate</p>
                <div class="flex items-baseline gap-1">
                    <span class="text-[28px] md:text-[36px] font-extrabold ${rateColor} leading-none tracking-tight">${contamRate}%</span>
                </div>
            </div>
        </div>
        <div class="space-y-4 mb-8">
    `;

    rackHealth.sort((a, b) => b.contam - a.contam); // worst first
    
    rackHealth.slice(0, 3).forEach(r => {
        let icon = r.status === 'Healthy' ? 'check_circle' : r.status === 'Monitor' ? 'warning' : 'error';
        let color = r.status === 'Healthy' ? 'text-emerald-500' : r.status === 'Monitor' ? 'text-amber-500' : 'text-red-500';
        let bg = r.status === 'Healthy' ? 'bg-emerald-50 dark:bg-emerald-950/30' : r.status === 'Monitor' ? 'bg-amber-50 dark:bg-amber-950/30' : 'bg-red-50 dark:bg-red-950/30';
        
        html += `
            <div class="flex flex-wrap items-center justify-between gap-y-2 px-3 py-2 md:px-4 md:py-3 rounded-xl ${bg}">
                <div class="flex items-center gap-2 md:gap-3 flex-1 min-w-[50%]">
                    <span class="material-symbols-outlined text-[16px] md:text-[18px] ${color}" style="font-variation-settings: 'FILL' 1;">${icon}</span>
                    <span class="text-[11px] md:text-[13px] font-bold text-on-surface dark:text-zinc-200 truncate pr-2">${r.name}</span>
                </div>
                <div class="flex flex-wrap md:flex-nowrap items-center gap-2 md:gap-3 w-full md:w-auto justify-end">
                    <span class="text-[11px] md:text-[13px] ${color} font-semibold whitespace-nowrap">${r.contam} flagged</span>
                    <span class="text-[9px] md:text-[11px] uppercase tracking-wider font-extrabold ${color} px-2 py-1 rounded border border-current opacity-70 whitespace-nowrap ml-auto md:ml-0">${r.status}</span>
                </div>
            </div>
        `;
    });

    html += `</div>`;
    
    html += `
        <button onclick="openWidgetModal('modal-flag-contamination')" class="w-full mt-2 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-500 font-bold text-[13px] hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors flex items-center justify-center gap-2">
            <span class="material-symbols-outlined text-[18px]">flag</span>
            Flag Contamination
        </button>
    `;
    
    container.innerHTML = html;
}

function computeGrowthCycles(racks) {
    const container = document.getElementById('crop-widget-cycles-content');
    if (!container) return;

    const now = new Date();
    let cycles = [];
    let totalAge = 0;

    racks.forEach(rack => {
        if (!rack.setupDate) return;
        const setup = new Date(rack.setupDate);
        const days = Math.floor((now - setup) / (1000 * 60 * 60 * 24));
        
        let stage = 'Colonizing';
        let pct = 0;
        
        // Approx lifecycle: 0-14d colonize, 15-28d growing, 29-45d fruiting, 45+ mature
        if (days < 14) { stage = 'Colonizing'; pct = (days/14)*25; }
        else if (days < 28) { stage = 'Growing'; pct = 25 + ((days-14)/14)*25; }
        else if (days < 45) { stage = 'Fruiting'; pct = 50 + ((days-28)/17)*40; }
        else { stage = 'Mature'; pct = 95; } // Keep at 95 until actually fully replaced?
        
        pct = Math.min(100, Math.max(0, pct));
        
        cycles.push({
            id: rack.id, name: rack.rack, days, stage, pct, date: rack.setupDate
        });
        totalAge += days;
    });

    cycles.sort((a, b) => b.days - a.days); // Oldest first
    const avgAge = cycles.length ? Math.round(totalAge / cycles.length) : 0;
    
    // Find next harvest estimate (rough: look for racks in Fruiting or Mature)
    let nextHarvest = 'Unknown';
    if (cycles.some(c => c.stage === 'Mature' || c.stage === 'Fruiting')) {
        nextHarvest = '< 3 days';
    } else if (cycles.some(c => c.stage === 'Growing')) {
        nextHarvest = '~1-2 weeks';
    }

    let html = `
        <div class="flex flex-wrap justify-between items-end mb-6 gap-y-3">
            <div>
                <p class="text-[10px] md:text-[11px] text-on-surface-variant dark:text-zinc-400 uppercase tracking-widest font-bold mb-2">Avg Cycle Age</p>
                <div class="flex items-baseline gap-1">
                    <span class="text-[28px] md:text-[36px] font-extrabold text-brand-deep dark:text-white leading-none tracking-tighter">${avgAge}</span>
                    <span class="text-[13px] md:text-[15px] font-bold text-on-surface-variant dark:text-zinc-500 ml-1">days</span>
                </div>
            </div>
            <div class="text-left md:text-right pb-2">
                <p class="text-[11px] md:text-[13px] text-on-surface-variant dark:text-zinc-400 font-medium">Next Est. Harvest</p>
                <p class="text-[13px] md:text-[16px] font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 whitespace-nowrap">${nextHarvest}</p>
            </div>
        </div>
        <div class="space-y-6 mb-8">
    `;

    cycles.slice(0, 3).forEach(c => {
        let barColor = c.stage === 'Mature' ? 'bg-amber-500' : c.stage === 'Fruiting' ? 'bg-emerald-500' : 'bg-primary';
        
        html += `
            <div class="group">
                <div class="flex flex-wrap justify-between items-end mb-2 gap-y-1">
                    <div class="flex items-center gap-2 flex-1 min-w-[60%]">
                        <span class="text-[12px] md:text-[14px] font-bold text-on-surface dark:text-zinc-200 flex-1 truncate">${c.name}</span>
                        <span class="text-[10px] md:text-[12px] text-on-surface-variant dark:text-zinc-500 font-semibold whitespace-nowrap">• Day ${c.days}</span>
                    </div>
                    <span class="text-[10px] md:text-[11px] font-extrabold uppercase tracking-wider ${barColor.replace('bg-', 'text-')} whitespace-nowrap ml-auto">${c.stage}</span>
                </div>
                <div class="w-full bg-surface-variant dark:bg-zinc-800 rounded-full h-3.5 relative overflow-hidden">
                    <div class="absolute top-0 left-0 bottom-0 ${barColor} rounded-full transition-all duration-1000 ease-out" style="width: 0%;" data-target-width="${c.pct}%"></div>
                </div>
            </div>
        `;
    });

    html += `</div>`;
    
    html += `
        <button onclick="openAddBatchModal()" class="w-full mt-2 py-3 rounded-xl bg-slate-100 dark:bg-zinc-800 text-on-surface-variant dark:text-zinc-300 font-bold text-[13px] hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2">
            <span class="material-symbols-outlined text-[18px]">add_box</span>
            Initialize New Batch
        </button>
    `;
    
    container.innerHTML = html;

    setTimeout(() => {
        container.querySelectorAll('[data-target-width]').forEach(el => {
            el.style.width = el.getAttribute('data-target-width');
        });
    }, 200);
}

// ==========================================
// WIDGET MODAL LOGIC
// ==========================================

function openWidgetModal(modalId) {
    const modal = document.getElementById(modalId);
    const inner = document.getElementById(modalId + "-inner");
    if (!modal || !inner) return;
    
    modal.classList.remove("hidden");
    
    // Reset scroll to top of overlay each time modal opens
    modal.scrollTop = 0;
    
    // Populate dropdowns based on modal
    if (modalId === "modal-log-harvest") {
        populateRackDropdown("harvest-rack-select");
        document.getElementById("harvest-grams").value = "";
        document.getElementById("harvest-error").classList.add("hidden");
    } else if (modalId === "modal-update-capacity") {
        populateRackDropdown("capacity-rack-select");
        document.getElementById("capacity-active").value = "";
        document.getElementById("capacity-empty").value = "";
        document.getElementById("capacity-error").classList.add("hidden");
        // add change listener to populate current capacity
        const select = document.getElementById("capacity-rack-select");
        select.onchange = () => {
            const rackId = parseInt(select.value);
            const rack = state.growBatches.find(r => r.id === rackId);
            if (rack && rack.bags) {
                const bags = Object.values(rack.bags).filter(b => b != null);
                document.getElementById("capacity-active").value = bags.filter(b => b.status === "Active").length;
                document.getElementById("capacity-empty").value = bags.filter(b => b.status === "Empty").length;
            }
        };
        // trigger initial
        if(select.options.length > 0) select.onchange();
    } else if (modalId === "modal-flag-contamination") {
        populateRackDropdown("contam-rack-select");
        document.getElementById("contam-count").value = "";
        document.getElementById("contam-error").classList.add("hidden");
    }
}

function closeWidgetModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.add("hidden");
}

function populateRackDropdown(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    select.innerHTML = "";
    
    if (!state.growBatches || state.growBatches.length === 0) {
        select.innerHTML = `<option value="">No racks available</option>`;
        return;
    }
    
    state.growBatches.forEach(rack => {
        const opt = document.createElement("option");
        opt.value = rack.id;
        opt.textContent = rack.rack;
        select.appendChild(opt);
    });
}

function submitLogHarvest() {
    const rackId = parseInt(document.getElementById("harvest-rack-select").value);
    const grams = parseFloat(document.getElementById("harvest-grams").value);
    const errEl = document.getElementById("harvest-error");
    
    if (isNaN(grams) || grams <= 0) {
        errEl.textContent = "Please enter a valid weight in grams.";
        errEl.classList.remove("hidden");
        return;
    }
    
    const rack = state.growBatches.find(r => r.id === rackId);
    if (!rack) return;
    
    if (!rack.historicalHarvests) rack.historicalHarvests = [];
    rack.historicalHarvests.push({
        date: new Date().toLocaleDateString("en-CA"),
        grams: grams
    });
    
    saveBatches(); // Sync to Firebase & Re-render
    closeWidgetModal("modal-log-harvest");
}

function submitUpdateCapacity() {
    const rackId = parseInt(document.getElementById("capacity-rack-select").value);
    const active = parseInt(document.getElementById("capacity-active").value);
    const empty = parseInt(document.getElementById("capacity-empty").value);
    const errEl = document.getElementById("capacity-error");
    
    if (isNaN(active) || active < 0 || isNaN(empty) || empty < 0) {
        errEl.textContent = "Please enter valid non-negative numbers.";
        errEl.classList.remove("hidden");
        return;
    }
    
    const rack = state.growBatches.find(r => r.id === rackId);
    if (!rack) return;
    
    // Preserve existing contaminated bags
    const existingBags = rack.bags ? Object.values(rack.bags).filter(b => b != null) : [];
    const contamBags = existingBags.filter(b => b.status === "Contaminated");
    const replacedBags = existingBags.filter(b => b.status === "Replaced");
    
    let newBags = {};
    let bagIndex = 0;
    
    // Generate Active
    for (let i = 0; i < active; i++) {
        newBags[bagIndex] = { id: bagIndex, status: "Active", setupDate: rack.setupDate };
        bagIndex++;
    }
    // Generate Empty
    for (let i = 0; i < empty; i++) {
        newBags[bagIndex] = { id: bagIndex, status: "Empty" };
        bagIndex++;
    }
    // Re-add Contaminated
    contamBags.forEach(b => {
        newBags[bagIndex] = { ...b, id: bagIndex };
        bagIndex++;
    });
    // Re-add Replaced
    replacedBags.forEach(b => {
        newBags[bagIndex] = { ...b, id: bagIndex };
        bagIndex++;
    });
    
    rack.bags = newBags;
    rack.totalSlots = bagIndex;
    
    saveBatches();
    closeWidgetModal("modal-update-capacity");
}

function submitContamination() {
    const rackId = parseInt(document.getElementById("contam-rack-select").value);
    const count = parseInt(document.getElementById("contam-count").value);
    const errEl = document.getElementById("contam-error");
    
    if (isNaN(count) || count <= 0) {
        errEl.textContent = "Please enter a valid number greater than 0.";
        errEl.classList.remove("hidden");
        return;
    }
    
    const rack = state.growBatches.find(r => r.id === rackId);
    if (!rack) return;
    
    if (!rack.bags) rack.bags = {};
    let bags = Object.values(rack.bags).filter(b => b != null);
    let activeBags = bags.filter(b => b.status === "Active");
    
    if (count > activeBags.length) {
        errEl.textContent = "Cannot flag more bags than are currently active (" + activeBags.length + ").";
        errEl.classList.remove("hidden");
        return;
    }
    
    // Flag the bags
    for (let i = 0; i < count; i++) {
        const bagToFlag = activeBags[i];
        if (bagToFlag) {
            bagToFlag.status = "Contaminated";
        }
    }
    
    // Re-assign to rack
    let newBagsMap = {};
    bags.forEach(b => {
        newBagsMap[b.id] = b;
    });
    rack.bags = newBagsMap;
    
    saveBatches();
    closeWidgetModal("modal-flag-contamination");
}

