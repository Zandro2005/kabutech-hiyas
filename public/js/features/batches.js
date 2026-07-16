function openAddRackModal() { openAddBatchModal(); }

// Reads the Quick Batch Add sidebar card (desktop Add Crop / Grow Log
// view) and carries its values into the full Add Rack modal so the
// person doesn't have to re-enter what they already picked.
function initQuickBatchFromSidebar() {
    const substrateEl = document.getElementById('quick-batch-substrate');
    const qtyEl = document.getElementById('quick-batch-qty');
    const qty = parseInt(qtyEl && qtyEl.value, 10);

    if (!qty || qty < 1) {
        showToast('Enter a valid quantity of bags first.', 'error');
        if (qtyEl) qtyEl.focus();
        return;
    }

    openAddBatchModal();

    const batchSubstrate = document.getElementById('batch-substrate');
    const batchQty = document.getElementById('batch-qty');
    const batchDate = document.getElementById('batch-date');
    const batchRack = document.getElementById('batch-rack');

    if (batchSubstrate && substrateEl) batchSubstrate.value = substrateEl.value;
    if (batchQty) batchQty.value = qty;
    if (batchDate && !batchDate.value) batchDate.value = new Date().toISOString().substring(0, 10);
    if (batchRack) setTimeout(() => batchRack.focus(), 50);
}

function renderBatches() {
    const container = document.getElementById('active-batches-list');
    container.innerHTML = '';
    const racks = state.growBatches;
    const countEl = document.getElementById('grow-log-batch-count');
    const bagEl = document.getElementById('grow-log-bag-count');
    if (countEl) countEl.textContent = racks.length === 1 ? '1 rack' : `${racks.length} racks`;
    if (bagEl) {
        const total = racks.reduce((s, r) => s + (r.bags ? r.bags.length : 0), 0);
        bagEl.textContent = total === 1 ? '1 bag' : `${total} bags`;
    }
    if (racks.length === 0) {
        container.innerHTML = `<div class="flex flex-col items-center justify-center py-8 gap-2 text-slate-400 dark:text-zinc-500"><span class="material-symbols-outlined text-[36px]">shelves</span><p class="text-[11px] font-semibold">No racks yet. Add one to start.</p></div>`;
        // Refresh the detail subpage if open (rack was deleted)
        if (_activeSubPage === 'subpage-rack-detail') closeSubPage('subpage-rack-detail');
        return;
    }
    // Refresh rack detail subpage if it's currently open
    if (_activeSubPage === 'subpage-rack-detail') {
        const titleEl = document.getElementById('rack-detail-title');
        if (titleEl) {
            const rackName = titleEl.textContent;
            const rack = racks.find(r => r.rack === rackName);
            if (rack) renderRackDetailSubpage(rack);
            else closeSubPage('subpage-rack-detail');
        }
    }
    
    // Filter out nulls created by manual Firebase array deletions
    const validRacks = Object.values(racks || {}).filter(r => r != null);
    
    if (countEl) countEl.textContent = validRacks.length === 1 ? '1 rack' : `${validRacks.length} racks`;
    if (bagEl) {
        const total = validRacks.reduce((s, r) => s + (r.bags ? Object.values(r.bags).filter(b => b != null).length : 0), 0);
        bagEl.textContent = total === 1 ? '1 bag' : `${total} bags`;
    }
    
    validRacks.forEach(rack => {
        const bags = Object.values(rack.bags || {}).filter(b => b != null);
        const activeBags = bags.filter(b => b.status === 'Active').length;
        const replaced = bags.filter(b => b.status === 'Replaced').length;
        const contaminated = bags.filter(b => b.status === 'Contaminated').length;
        let totalG = bags.reduce((s, b) => s + b.harvestLog.reduce((hs, h) => hs + h.grams, 0), 0);
        if (rack.historicalHarvests) {
            totalG += rack.historicalHarvests.reduce((s, h) => s + h.grams, 0);
        }
        const rackFilterKey = `_slotFilter_${rack.id}`;
        const isAdmin = state.currentUser && state.currentUser.role === 'admin';

        const buildSlotGrid = (filter) => bags.filter(bag => {
            if (filter === 'all') return true;
            if (filter === 'active') return bag.status === 'Active' && bag.harvestLog.length === 0;
            if (filter === 'harvested') return bag.status === 'Active' && bag.harvestLog.length > 0;
            if (filter === 'replaced') return bag.status === 'Replaced';
            if (filter === 'contaminated') return bag.status === 'Contaminated';
            if (filter === 'empty') return bag.status === 'Empty';
            return true;
        }).map(bag => {
            if (bag.status === 'Empty') {
                return `<button onclick="event.stopPropagation(); openBagActionModal(${rack.id},${bag.id})"
                            class="flex flex-col items-center justify-center gap-0.5 w-14 h-14 flex-shrink-0 rounded-xl border-2 border-dashed border-slate-300 dark:border-zinc-600 bg-surface-soft dark:bg-zinc-800/40 opacity-70 active:scale-90 transition-all hover:ring-2 hover:ring-primary/40">
                            <span class="material-symbols-outlined text-[16px] text-slate-400 dark:text-zinc-500">add</span>
                            <span class="text-[8px] font-semibold text-slate-400 dark:text-zinc-500 leading-none">${bag.id}</span>
                        </button>`;
            }
            let color, textColor, label;
            if (bag.status === 'Replaced') { color = 'bg-slate-200 dark:bg-zinc-700'; textColor = 'text-slate-500 dark:text-white'; label = 'Replaced'; }
            else if (bag.status === 'Contaminated') { color = 'bg-red-100 dark:bg-red-950/60'; textColor = 'text-red-600 dark:text-white'; label = 'Flagged'; }
            else if (bag.harvestLog.length > 0) { color = 'bg-amber-100 dark:bg-amber-950/50'; textColor = 'text-amber-700 dark:text-white'; label = bag.harvestLog.length + 'x'; }
            else { color = 'bg-primary/10 dark:bg-zinc-800'; textColor = 'text-primary dark:text-white'; label = 'Active'; }
            return `<button onclick="event.stopPropagation(); openBagActionModal(${rack.id},${bag.id})"
                        class="flex flex-col items-center justify-center gap-0.5 w-14 h-14 flex-shrink-0 rounded-xl border ${bag.status === 'Contaminated' ? 'border-red-300 dark:border-red-800' : bag.status === 'Replaced' ? 'border-slate-300 dark:border-zinc-600' : 'border-primary/20 dark:border-zinc-700'} ${color} active:scale-90 transition-all hover:ring-2 hover:ring-primary/40">
                        <span class="text-[9px] font-extrabold ${textColor}">${bag.id}</span>
                        <span class="text-[8px] font-semibold ${textColor} leading-none text-center">${label}</span>
                    </button>`;
        }).join('') || `<p class="text-[10px] text-slate-400 dark:text-zinc-500 py-2">No slots match this filter.</p>`;

        const cycles = bags.reduce((s, b) => s + b.harvestLog.length, 0);
        const fillRatio = bags.length ? activeBags / bags.length : 0;
        let statusLabel, statusClass;
        if (activeBags === 0) { statusLabel = 'NEW SYSTEM'; statusClass = 'crops-badge-blue'; }
        else if (contaminated > 0 || fillRatio < 0.5) { statusLabel = 'LOW CAPACITY'; statusClass = 'crops-badge-amber'; }
        else { statusLabel = 'OPTIMAL'; statusClass = 'crops-badge-green'; }

        const card = document.createElement('div');
        card.className = `batch-card-clickable bg-surface-container-lowest dark:bg-zinc-900 border ${contaminated > 0 ? 'border-red-300 dark:border-red-800' : 'border-muted dark:border-zinc-800'} rounded-2xl p-5 shadow-sm flex flex-col gap-3`;
        card.draggable = false;
        card.dataset.rackId = rack.id;

        card.innerHTML = `
                    <div class="flex items-center justify-between gap-2">
                        <div class="flex items-center gap-2.5 min-w-0">
                            <span class="drag-handle material-symbols-outlined text-[18px] text-slate-300 dark:text-zinc-600 cursor-grab active:cursor-grabbing shrink-0 touch-none select-none">drag_indicator</span>
                            <div class="w-9 h-9 shrink-0 rounded-xl ${contaminated > 0 ? 'bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400' : 'bg-surface-soft dark:bg-zinc-800 text-primary dark:text-primary-fixed'} flex items-center justify-center relative">
                                <span class="material-symbols-outlined text-[20px]" style="font-variation-settings:'FILL' 1">shelves</span>
                                ${contaminated > 0 ? `<span class="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-surface-container-lowest dark:border-zinc-900 flex items-center justify-center"><span class="text-[8px] font-extrabold text-white">${contaminated}</span></span>` : ''}
                            </div>
                            <div class="min-w-0">
                                <div class="flex items-center gap-1.5 flex-wrap">
                                    <p class="text-[15px] font-extrabold text-on-background dark:text-white leading-tight">${rack.rack}</p>
                                    <span class="crops-desktop-only crops-status-badge ${statusClass}">${statusLabel}</span>
                                </div>
                                <p class="text-[11px] ${contaminated > 0 ? 'text-red-500 dark:text-red-400 font-semibold' : 'text-on-surface-variant dark:text-zinc-300'} leading-tight">${contaminated > 0 ? `⚠ ${contaminated} contaminated · ` : ''}${rack.substrate} · ${bags.length} slots</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-1.5 shrink-0">
                            <span class="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-lg border bg-primary/10 border-primary/20 text-primary dark:bg-emerald-950 dark:text-emerald-300">${activeBags} Active</span>
                            <span class="material-symbols-outlined text-[20px] text-on-surface-variant dark:text-zinc-300">chevron_right</span>
                        </div>
                    </div>

                    <!-- Stats row (mobile) -->
                    <div class="crops-stats-row-mobile flex items-center gap-3 flex-wrap text-[11px] text-on-surface-variant dark:text-zinc-300 bg-surface-soft dark:bg-white/5 rounded-xl px-4 py-2.5">
                        <span><span class="font-bold text-on-background dark:text-white">${activeBags}</span> active</span>
                        <span class="text-slate-300 dark:text-zinc-500">·</span>
                        <span><span class="font-bold text-on-background dark:text-white">${replaced}</span> replaced</span>
                        ${contaminated > 0 ? `<span class="text-slate-300 dark:text-zinc-500">·</span><span class="font-bold text-error-red">${contaminated} contaminated</span>` : ''}
                        <span class="text-slate-300 dark:text-zinc-500">·</span>
                        <span class="font-bold text-success-green dark:text-emerald-400">${totalG}g yield</span>
                    </div>

                    <!-- Stats grid (desktop-only) -->
                    <div class="crops-desktop-only crops-stat-grid">
                        <div class="crops-stat-box">
                            <p class="crops-stat-label">Active Bags</p>
                            <p class="crops-stat-value">${activeBags} <span class="crops-stat-of">/ ${bags.length}</span></p>
                        </div>
                        <div class="crops-stat-box">
                            <p class="crops-stat-label">Cycles</p>
                            <p class="crops-stat-value">${cycles}</p>
                        </div>
                        <div class="crops-stat-box crops-stat-box-yield">
                            <p class="crops-stat-label">Est. Yield</p>
                            <p class="crops-stat-value">${totalG}g</p>
                        </div>
                    </div>

                    <div class="flex items-center justify-between gap-2 flex-wrap">
                        <div class="flex items-center gap-1.5 text-[11px] text-on-surface-variant dark:text-zinc-400">
                            <span class="material-symbols-outlined text-[14px]">calendar_today</span>
                            <span>Set up ${rack.setupDate}</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <button onclick="event.stopPropagation(); openRackDetailSubpage(${rack.id})"
                                class="crops-desktop-only crops-metrics-btn">View Full Metrics</button>
                            ${isAdmin ? `
                            <button onclick="event.stopPropagation(); openEditBatchModal(${rack.id})"
                                title="Edit Rack"
                                class="w-8 h-8 rounded-full bg-surface-soft dark:bg-zinc-800 border border-outline-variant dark:border-zinc-700 text-on-surface-variant dark:text-zinc-300 hover:bg-primary hover:text-white hover:border-primary flex items-center justify-center transition-colors active:scale-90">
                                <span class="material-symbols-outlined text-[16px]">edit</span>
                            </button>
                            <button onclick="event.stopPropagation(); removeRack(${rack.id})"
                                title="Delete Rack"
                                class="w-8 h-8 rounded-full bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 text-error-red hover:bg-error hover:text-white hover:border-error flex items-center justify-center transition-colors active:scale-90">
                                <span class="material-symbols-outlined text-[16px]">delete</span>
                            </button>` : ''}
                        </div>
                    </div>
                `;
        container.appendChild(card);
        const dragHandle = card.querySelector('.drag-handle');

        dragHandle.addEventListener('click', e => e.stopPropagation());

        // Click anywhere on the card (except drag handle) → open rack detail subpage
        // Use pointerdown/pointerup with movement threshold to distinguish taps from scrolls
        let _cardPointerStart = null;
        card.addEventListener('pointerdown', (e) => {
            if (e.target.closest('.drag-handle')) return;
            if (e.target.closest('button')) return; // let inner buttons handle themselves
            _cardPointerStart = { x: e.clientX, y: e.clientY };
        }, { passive: true });
        card.addEventListener('pointerup', (e) => {
            if (!_cardPointerStart) return;
            if (e.target.closest('.drag-handle')) return;
            if (e.target.closest('button')) return;
            const dx = Math.abs(e.clientX - _cardPointerStart.x);
            const dy = Math.abs(e.clientY - _cardPointerStart.y);
            _cardPointerStart = null;
            if (dx > 8 || dy > 10) return; // moved too much → was a scroll, not a tap
            openRackDetailSubpage(rack.id);
        }, { passive: true });
        card.addEventListener('pointercancel', () => { _cardPointerStart = null; }, { passive: true });

        dragHandle.addEventListener('pointerdown', e => {
            e.preventDefault();
            e.stopPropagation();

            const cardRect = card.getBoundingClientRect();
            const grabOffsetY = e.clientY - cardRect.top;

            // Spacer holds layout gap
            const spacer = document.createElement('div');
            spacer.style.cssText = `height:${cardRect.height}px;flex-shrink:0;border-radius:1rem;`;
            card.after(spacer);

            // Move card to body to escape overflow:hidden parents
            document.body.appendChild(card);
            card.style.cssText = `
                        position:fixed;
                        top:${cardRect.top}px;
                        left:${cardRect.left}px;
                        width:${cardRect.width}px;
                        z-index:9999;
                        pointer-events:none;
                        box-shadow:0 28px 56px rgba(0,0,0,0.25),0 8px 20px rgba(0,0,0,0.15);
                        border-radius:1rem;
                        transform:scale(1.03) rotate(0.8deg);
                        transition:box-shadow 0.12s,transform 0.12s;
                        margin:0;
                    `;

            function onMove(mv) {
                // Only move vertically — X stays locked to original position
                card.style.top = (mv.clientY - grabOffsetY) + 'px';

                const siblings = [...container.children].filter(c => c !== spacer);
                let insertBeforeEl = null;
                for (const s of siblings) {
                    const r = s.getBoundingClientRect();
                    if (mv.clientY < r.top + r.height / 2) { insertBeforeEl = s; break; }
                }
                if (insertBeforeEl) {
                    if (spacer.nextSibling !== insertBeforeEl) container.insertBefore(spacer, insertBeforeEl);
                } else {
                    if (container.lastChild !== spacer) container.appendChild(spacer);
                }
            }

            function onUp() {
                document.removeEventListener('pointermove', onMove);
                document.removeEventListener('pointerup', onUp);

                const snapRect = spacer.getBoundingClientRect();
                card.style.transition = 'top 0.18s cubic-bezier(0.25,0.46,0.45,0.94),left 0.18s,transform 0.18s,box-shadow 0.18s';
                card.style.top = snapRect.top + 'px';
                card.style.left = snapRect.left + 'px';
                card.style.transform = 'scale(1) rotate(0deg)';
                card.style.boxShadow = '';

                setTimeout(() => {
                    card.style.cssText = '';
                    spacer.replaceWith(card);
                    const newOrder = [...container.querySelectorAll('[data-rack-id]')].map(el => parseInt(el.dataset.rackId));
                    state.growBatches.sort((a, b) => newOrder.indexOf(a.id) - newOrder.indexOf(b.id));
                    saveBatches();
                }, 180);
            }

            document.addEventListener('pointermove', onMove);
            document.addEventListener('pointerup', onUp);
        });
    });
}

function setSlotFilter(rackId, filter, btn) {
    const rack = state.growBatches.find(r => r.id === rackId);
    if (!rack) return;
    const bags = rack.bags || [];
    const key = `_slotFilter_${rackId}`;
    window[key] = filter;
    // Update chip active styles
    const chipsContainer = btn.closest('.slot-filter-chips');
    chipsContainer.querySelectorAll('.slot-filter-chip').forEach(c => {
        const isContamChip = c.dataset.filter === 'contaminated';
        const isEmptyChip = c.dataset.filter === 'empty';
        const contCount = bags.filter(b => b.status === 'Contaminated').length;
        if (c.dataset.filter === filter) {
            c.classList.remove('bg-surface-soft', 'dark:bg-zinc-800', 'text-on-surface-variant', 'dark:text-zinc-400', 'text-red-500', 'dark:text-red-400', 'bg-red-50', 'dark:bg-red-950/30', 'bg-primary', 'dark:bg-primary-fixed', 'dark:text-brand-deep', 'bg-red-500', 'border-red-500', 'border-primary', 'text-slate-500', 'bg-slate-200');
            c.classList.add(...(isContamChip ? ['bg-red-500', 'text-white', 'border-red-500'] : isEmptyChip ? ['bg-slate-500', 'text-white', 'border-slate-500'] : ['bg-primary', 'text-white', 'border-primary']));
        } else {
            c.classList.remove('bg-primary', 'text-white', 'border-primary', 'bg-red-500', 'border-red-500', 'bg-slate-500', 'border-slate-500');
            c.classList.add(...(isContamChip && contCount > 0 ? ['text-red-500', 'dark:text-red-400', 'bg-red-50', 'dark:bg-red-950/30'] : ['text-on-surface-variant', 'dark:text-zinc-400', 'bg-surface-soft', 'dark:bg-zinc-800']));
        }
    });
    // Re-render slot grid only
    const grid = chipsContainer.closest('.batch-detail').querySelector('.slot-grid-container');
    grid.className = 'slot-grid-container flex flex-wrap gap-2.5 justify-center max-h-48 overflow-y-auto px-1';
    const filtered = bags.filter(bag => {
        if (filter === 'all') return true;
        if (filter === 'active') return bag.status === 'Active' && bag.harvestLog.length === 0;
        if (filter === 'harvested') return bag.status === 'Active' && bag.harvestLog.length > 0;
        if (filter === 'replaced') return bag.status === 'Replaced';
        if (filter === 'contaminated') return bag.status === 'Contaminated';
        if (filter === 'empty') return bag.status === 'Empty';
        return true;
    });
    grid.innerHTML = filtered.map(bag => {
        if (bag.status === 'Empty') {
            return `<button onclick="event.stopPropagation(); openBagActionModal(${rackId},${bag.id})"
                        class="flex flex-col items-center justify-center gap-0.5 w-14 h-14 flex-shrink-0 rounded-xl border-2 border-dashed border-slate-300 dark:border-zinc-600 bg-surface-soft dark:bg-zinc-800/40 opacity-70 active:scale-90 transition-all hover:ring-2 hover:ring-primary/40">
                        <span class="material-symbols-outlined text-[16px] text-slate-400 dark:text-zinc-500">add</span>
                        <span class="text-[8px] font-semibold text-slate-400 dark:text-zinc-500 leading-none">${bag.id}</span>
                    </button>`;
        }
        let color, textColor, label;
        if (bag.status === 'Replaced') { color = 'bg-slate-200 dark:bg-zinc-700'; textColor = 'text-slate-500 dark:text-white'; label = 'Replaced'; }
        else if (bag.status === 'Contaminated') { color = 'bg-red-100 dark:bg-red-950/60'; textColor = 'text-red-600 dark:text-white'; label = 'Flagged'; }
        else if (bag.harvestLog.length > 0) { color = 'bg-amber-100 dark:bg-amber-950/50'; textColor = 'text-amber-700 dark:text-white'; label = bag.harvestLog.length + 'x'; }
        else { color = 'bg-primary/10 dark:bg-zinc-800'; textColor = 'text-primary dark:text-white'; label = 'Active'; }
        return `<button onclick="event.stopPropagation(); openBagActionModal(${rackId},${bag.id})"
                    class="flex flex-col items-center justify-center gap-0.5 w-14 h-14 flex-shrink-0 rounded-xl border ${bag.status === 'Contaminated' ? 'border-red-300 dark:border-red-800' : bag.status === 'Replaced' ? 'border-slate-300 dark:border-zinc-600' : 'border-primary/20 dark:border-zinc-700'} ${color} active:scale-90 transition-all hover:ring-2 hover:ring-primary/40">
                    <span class="text-[9px] font-extrabold ${textColor}">${bag.id}</span>
                    <span class="text-[8px] font-semibold ${textColor} leading-none text-center">${label}</span>
                </button>`;
    }).join('') || `<p class="text-[10px] text-slate-400 dark:text-zinc-500 py-2">No slots match this filter.</p>`;
}

// ── Bag Action Modal (per-slot: harvest / replant / flag / edit / delete) ──────────
function openBagActionModal(rackId, bagId) {
    const rack = state.growBatches.find(r => r.id === rackId);
    if (!rack) return;
    const bag = rack.bags.find(b => b.id === bagId);
    if (!bag) return;

    // Build action modal dynamically
    let existing = document.getElementById('modal-bag-action');
    if (existing) existing.remove();

    const isEmpty = bag.status === 'Empty';
    const totalG = bag.harvestLog.reduce((s, h) => s + h.grams, 0);
    const statusLabel = isEmpty ? 'Empty' : bag.status === 'Replaced' ? 'Replaced' : bag.status === 'Contaminated' ? 'Contaminated' : bag.harvestLog.length > 0 ? 'Active (harvested)' : 'Active';
    const canHarvest = bag.status === 'Active';
    const canReplant = bag.status === 'Replaced' || isEmpty; // Contaminated slots cannot be replanted until cleared
    const canFlag = bag.status === 'Active';
    const canReplace = bag.status !== 'Contaminated' && !isEmpty;

    const modal = document.createElement('div');
    modal.id = 'modal-bag-action';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm';

    if (isEmpty) {
        // Empty slot — show only a prominent Plant New Bag button
        modal.innerHTML = `
                <div class="bg-surface-container-lowest dark:bg-zinc-900 border border-muted dark:border-zinc-800 rounded-3xl p-5 w-full max-w-[320px] shadow-2xl flex flex-col gap-3">
                    <div class="flex justify-between items-center">
                        <h3 class="text-body-lg font-bold text-brand-deep dark:text-primary-fixed flex items-center gap-1.5">
                            <span class="material-symbols-outlined text-[18px]" style="font-variation-settings:'FILL' 1">inventory_2</span>
                            ${rack.rack} — Slot ${bagId}
                        </h3>
                        <button onclick="document.getElementById('modal-bag-action').remove()" class="text-slate-400 p-1 rounded-full"><span class="material-symbols-outlined">close</span></button>
                    </div>
                    <!-- Empty status badge -->
                    <div class="flex items-center justify-center bg-slate-100 dark:bg-zinc-800 rounded-xl px-3 py-3 gap-2">
                        <span class="material-symbols-outlined text-[22px] text-slate-400 dark:text-zinc-400">inbox</span>
                        <span class="text-[12px] font-bold text-slate-500 dark:text-zinc-400">This slot is empty</span>
                    </div>
                    <!-- Plant new bag action -->
                    <div class="flex flex-col gap-2 pt-1">
                        <button onclick="document.getElementById('modal-bag-action').remove(); replantBag(${rackId},${bagId})"
                            class="w-full bg-primary dark:bg-primary-container text-on-primary dark:text-white py-3 rounded-xl font-bold text-[13px] flex items-center justify-center gap-2 active:scale-95 transition-all">
                            <span class="material-symbols-outlined text-[16px]">compost</span>Plant New Bag
                        </button>
                    </div>
                </div>`;
    } else {
        modal.innerHTML = `
                <div class="bg-surface-container-lowest dark:bg-zinc-900 border border-muted dark:border-zinc-800 rounded-3xl p-5 w-full max-w-[320px] shadow-2xl flex flex-col gap-3">
                    <div class="flex justify-between items-center">
                        <h3 class="text-body-lg font-bold text-brand-deep dark:text-primary-fixed flex items-center gap-1.5">
                            <span class="material-symbols-outlined text-[18px]" style="font-variation-settings:'FILL' 1">inventory_2</span>
                            ${rack.rack} — Slot ${bagId}
                        </h3>
                        <button onclick="document.getElementById('modal-bag-action').remove()" class="text-slate-400 p-1 rounded-full"><span class="material-symbols-outlined">close</span></button>
                    </div>
                    <!-- Status + harvest total -->
                    <div class="flex items-center justify-between bg-surface-soft dark:bg-zinc-800 rounded-xl px-3 py-2 text-[11px]">
                        <span class="text-on-surface-variant dark:text-zinc-400">Status: <span class="font-bold text-on-background dark:text-white">${statusLabel}</span></span>
                        <span class="font-bold text-success-green dark:text-emerald-400">${totalG} g total</span>
                    </div>
                    <!-- Harvest log mini list -->
                    ${bag.harvestLog.length > 0 ? `
                    <div class="max-h-24 overflow-y-auto space-y-1">
                        ${bag.harvestLog.slice().reverse().map(h => `
                        <div class="flex justify-between text-[10px] bg-surface-soft dark:bg-zinc-800/50 rounded-lg px-2.5 py-1.5">
                            <span class="text-on-surface-variant dark:text-zinc-400">${h.date}</span>
                            <span class="font-bold text-success-green dark:text-emerald-400">+${h.grams} g</span>
                        </div>`).join('')}
                    </div>` : ''}
                    <!-- Actions -->
                    <div class="flex flex-col gap-2 pt-1">
                        ${canHarvest ? `
                        <button onclick="document.getElementById('modal-bag-action').remove(); openBagHarvestModal(${rackId},${bagId})"
                            class="w-full bg-primary dark:bg-primary-container text-on-primary dark:text-white py-2.5 rounded-xl font-bold text-[12px] flex items-center justify-center gap-1.5 active:scale-95 transition-all">
                            <span class="material-symbols-outlined text-[15px]">grocery</span>Log Harvest
                        </button>` : ''}
                        ${canReplant ? `
                        <button onclick="document.getElementById('modal-bag-action').remove(); replantBag(${rackId},${bagId})"
                            class="w-full bg-primary dark:bg-primary-container text-on-primary dark:text-white py-2.5 rounded-xl font-bold text-[12px] flex items-center justify-center gap-1.5 active:scale-95 transition-all">
                            <span class="material-symbols-outlined text-[15px]">refresh</span>Replant New Bag
                        </button>` : ''}
                        <div class="grid grid-cols-4 gap-2">
                            <button onclick="document.getElementById('modal-bag-action').remove(); openBagEditModal(${rackId},${bagId})"
                                class="bg-surface-soft dark:bg-zinc-800 border border-muted dark:border-zinc-700 text-on-surface dark:text-white py-2 rounded-xl font-bold text-[10px] flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-all">
                                <span class="material-symbols-outlined text-[16px]">edit</span>Edit
                            </button>
                            ${canReplace ? `
                            <button onclick="document.getElementById('modal-bag-action').remove(); replantBag(${rackId},${bagId})"
                                class="bg-surface-soft dark:bg-zinc-800 border border-muted dark:border-zinc-700 text-on-surface dark:text-white py-2 rounded-xl font-bold text-[10px] flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-all">
                                <span class="material-symbols-outlined text-[16px]">swap_horiz</span>Replace
                            </button>` : `<div></div>`}
                            ${canFlag ? `
                            <button onclick="document.getElementById('modal-bag-action').remove(); flagBagContamination(${rackId},${bagId})"
                                class="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 py-2 rounded-xl font-bold text-[10px] flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-all">
                                <span class="material-symbols-outlined text-[16px]">bug_report</span>Flag
                            </button>` : `<div></div>`}
                            <button onclick="document.getElementById('modal-bag-action').remove(); deleteSlot(${rackId},${bagId})"
                                class="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 py-2 rounded-xl font-bold text-[10px] flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-all">
                                <span class="material-symbols-outlined text-[16px]">delete</span>Delete
                            </button>
                        </div>
                    </div>
                </div>`;
    }
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    document.body.appendChild(modal);
}

// Archive bag's harvest log to the rack's historical data before clearing
function archiveHarvestLog(rack, bag) {
    if (bag.harvestLog && bag.harvestLog.length > 0) {
        if (!rack.historicalHarvests) rack.historicalHarvests = [];
        bag.harvestLog.forEach(h => rack.historicalHarvests.push({ slot: bag.id, date: h.date, grams: h.grams }));
    }
    bag.harvestLog = [];
}

// Replant: reset bag to fresh Active state, clear harvest log
function replantBag(rackId, bagId) {
    const rack = state.growBatches.find(r => r.id === rackId);
    if (!rack) return;
    const bag = rack.bags.find(b => b.id === bagId);
    if (!bag) return;
    const totalG = bag.harvestLog.reduce((s, h) => s + h.grams, 0);
    const hasData = bag.harvestLog.length > 0;
    const isEmptySlot = bag.status === 'Empty';
    showConfirm({
        title: isEmptySlot ? `Plant New Bag in Slot ${bagId}?` : `Replace Slot ${bagId}?`,
        body: isEmptySlot
            ? `A new substrate bag will be planted in Slot ${bagId} of ${rack.rack}.`
            : hasData
                ? `This slot has ${bag.harvestLog.length} harvest record${bag.harvestLog.length !== 1 ? 's' : ''} (${totalG}g). Replacing will reset the bag to Active and clear its harvest history.`
                : `Slot ${bagId} will be reset to a fresh Active bag.`,
        icon: isEmptySlot ? 'compost' : 'swap_horiz',
        iconBg: 'bg-primary/10 dark:bg-emerald-950/40', iconColor: 'text-primary dark:text-emerald-400',
        okLabel: isEmptySlot ? 'Plant Bag' : 'Replace Bag',
        okIcon: isEmptySlot ? 'compost' : 'refresh',
        okBg: 'bg-primary hover:bg-primary/90',
        onConfirm: () => {
            bag.status = 'Active';
            archiveHarvestLog(rack, bag);
            bag.plantedDate = new Date().toLocaleDateString('en-CA');
            saveBatches(); renderBatches();
            // Re-render rack detail if open
            const openRack = state.growBatches.find(r => r.id === rackId);
            if (openRack) renderRackDetailSubpage(openRack);
            addLog(`Slot ${bagId} on ${rack.rack} ${isEmptySlot ? 'planted with a new bag' : 'replaced with a new bag'}.`, 'success');
            showToast(`Slot ${bagId} on ${rack.rack} ${isEmptySlot ? 'planted' : 'replaced'}.`, 'success');
        }
    });
}

// Flag individual bag as contaminated
function flagBagContamination(rackId, bagId) {
    showConfirm({
        title: 'Flag Bag as Contaminated?',
        body: `Slot ${bagId} will be marked contaminated. You can replant it after removal.`,
        icon: 'biotech', iconBg: 'bg-red-100 dark:bg-red-950/40', iconColor: 'text-red-500',
        okLabel: 'Flag Bag', okIcon: 'flag', okBg: 'bg-red-500 hover:bg-red-600',
        onConfirm: () => {
            const rack = state.growBatches.find(r => r.id === rackId);
            if (!rack) return;
            const bag = rack.bags.find(b => b.id === bagId);
            if (!bag) return;
            bag.status = 'Contaminated';
            saveBatches(); renderBatches();
            addLog(`Slot ${bagId} on ${rack.rack} flagged as contaminated.`, 'error');
            showToast(`Slot ${bagId} flagged. Tap slot to replant after removal.`, 'warning');
            triggerSystemAlert(`Contamination: ${rack.rack} Slot ${bagId}`, `Bag in Slot ${bagId} of ${rack.rack} flagged for contamination.`, 'warning');
        }
    });
}

// Delete bag from slot — slot stays (becomes Empty) so it can be replanted
function deleteSlot(rackId, bagId) {
    const rack = state.growBatches.find(r => r.id === rackId);
    if (!rack) return;
    const bag = rack.bags.find(b => b.id === bagId);
    if (!bag) return;
    const totalG = bag.harvestLog.reduce((s, h) => s + h.grams, 0);
    const hasData = bag.harvestLog.length > 0;
    showConfirm({
        title: `Remove Bag from Slot ${bagId}?`,
        body: hasData
            ? `Slot ${bagId} has ${bag.harvestLog.length} harvest record${bag.harvestLog.length !== 1 ? 's' : ''} (${totalG}g total). Removing the bag will clear all its data. The slot will remain empty and can be replanted.`
            : `The bag in Slot ${bagId} will be removed. The slot will remain empty and ready for replanting.`,
        icon: 'delete_forever', iconBg: 'bg-red-100 dark:bg-red-950/40', iconColor: 'text-red-500',
        okLabel: 'Remove Bag', okIcon: 'delete', okBg: 'bg-red-600 hover:bg-red-700',
        onConfirm: () => {
            bag.status = 'Empty';
            archiveHarvestLog(rack, bag);
            bag.substrate = null;
            bag.plantedDate = null;
            bag.notes = null;
            saveBatches(); renderBatches();
            // Re-render rack detail if it's currently open
            const openRack = state.growBatches.find(r => r.id === rackId);
            if (openRack) renderRackDetailSubpage(openRack);
            addLog(`Bag removed from Slot ${bagId} on ${rack.rack}. Slot is now empty.`, 'warning');
            showToast(`Slot ${bagId} is now empty. Tap to replant.`, 'warning');
        }
    });
}

// Edit individual bag (substrate, planted date, notes)
function openBagEditModal(rackId, bagId) {
    const rack = state.growBatches.find(r => r.id === rackId);
    if (!rack) return;
    const bag = rack.bags.find(b => b.id === bagId);
    if (!bag) return;

    let existing = document.getElementById('modal-bag-edit');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'modal-bag-edit';
    modal.className = 'fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm';
    const inputCls = 'bg-surface-soft dark:bg-zinc-800 border border-outline-variant dark:border-zinc-700 rounded-xl py-2.5 px-3 text-body-sm focus:border-primary text-on-surface dark:text-white';
    const labelCls = 'text-[10px] font-bold text-on-surface-variant dark:text-zinc-400 uppercase tracking-wide';
    modal.innerHTML = `
                <div class="bg-surface-container-lowest dark:bg-zinc-900 border border-muted dark:border-zinc-800 rounded-3xl p-5 w-full max-w-[320px] shadow-2xl flex flex-col gap-3">
                    <div class="flex justify-between items-center">
                        <h3 class="text-body-lg font-bold text-brand-deep dark:text-primary-fixed flex items-center gap-1.5">
                            <span class="material-symbols-outlined text-[18px]" style="font-variation-settings:'FILL' 1">edit</span>
                            Edit Slot ${bagId}
                        </h3>
                        <button onclick="document.getElementById('modal-bag-edit').remove()" class="text-slate-400 p-1 rounded-full"><span class="material-symbols-outlined">close</span></button>
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="${labelCls}">Substrate</label>
                        <select id="bag-edit-substrate" class="${inputCls}">
                            <option value="Sawdust + Bran" ${(bag.substrate || rack.substrate) === 'Sawdust + Bran' ? 'selected' : ''}>Sawdust + Bran</option>
                            <option value="Straw Mix" ${(bag.substrate || rack.substrate) === 'Straw Mix' ? 'selected' : ''}>Straw Mix</option>
                            <option value="Coco Coir" ${(bag.substrate || rack.substrate) === 'Coco Coir' ? 'selected' : ''}>Coco Coir</option>
                        </select>
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="${labelCls}">Date Planted</label>
                        <input id="bag-edit-date" type="date" value="${bag.plantedDate || rack.setupDate}" class="${inputCls}">
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="${labelCls}">Notes (optional)</label>
                        <input id="bag-edit-notes" type="text" value="${bag.notes || ''}" placeholder="e.g. thicker mycelium" class="${inputCls}">
                    </div>
                    <div class="grid grid-cols-2 gap-2 pt-1">
                        <button onclick="document.getElementById('modal-bag-edit').remove()"
                            class="py-2.5 rounded-xl font-bold text-[12px] border border-outline-variant dark:border-zinc-700 text-on-surface-variant dark:text-zinc-400 active:scale-95">Cancel</button>
                        <button onclick="saveBagEdit(${rackId},${bagId})"
                            class="py-2.5 rounded-xl font-bold text-[12px] bg-primary text-white active:scale-95">Save</button>
                    </div>
                </div>`;
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    document.body.appendChild(modal);
}

function saveBagEdit(rackId, bagId) {
    const rack = state.growBatches.find(r => r.id === rackId);
    if (!rack) return;
    const bag = rack.bags.find(b => b.id === bagId);
    if (!bag) return;
    bag.substrate = document.getElementById('bag-edit-substrate').value;
    bag.plantedDate = document.getElementById('bag-edit-date').value;
    bag.notes = document.getElementById('bag-edit-notes').value;
    document.getElementById('modal-bag-edit').remove();
    saveBatches(); renderBatches();
    showToast(`Slot ${bagId} updated.`, 'success');
}

// Open harvest modal for a specific bag slot
function openBagHarvestModal(rackId, bagId) {
    const rack = state.growBatches.find(r => r.id === rackId);
    if (!rack) return;
    const bag = rack.bags.find(b => b.id === bagId);
    if (!bag || bag.status !== 'Active') { showToast('Only active bags can be harvested.', 'info'); return; }
    document.getElementById('harvest-batch-id').value = rackId;
    document.getElementById('harvest-bag-id').value = bagId;
    document.getElementById('harvest-modal-rack').innerText = `${rack.rack} — Slot ${bagId}`;
    document.getElementById('harvest-kg').value = '';
    document.getElementById('harvest-replace-no').checked = true;
    document.getElementById('modal-harvest').classList.remove('hidden');
}

function removeRack(id) {
    showConfirm({
        title: 'Remove Rack Permanently?',
        body: 'This will delete the rack and all its bag data. This cannot be undone.',
        icon: 'delete_forever', iconBg: 'bg-red-100 dark:bg-red-950/40', iconColor: 'text-red-500',
        okLabel: 'Remove Rack', okIcon: 'delete', okBg: 'bg-red-500 hover:bg-red-600',
        onConfirm: () => {
            const removed = state.growBatches.find(r => r.id === id);
            state.growBatches = state.growBatches.filter(r => r.id !== id);
            saveBatches(); renderBatches();
            addLog(`Rack "${removed ? removed.rack : id}" removed.`, 'warning');
            showToast('Rack removed.', 'info');
        }
    });
}

function advanceBatchStage(id) { /* deprecated: rack model has no stage */ }
function _advanceBatchStageOld(id) {
    const batch = state.growBatches.find(b => b.id === id);
    if (!batch) return;

    const stages = ['Inoculation', 'Spawn Run', 'Primordia', 'Fruiting', 'Harvested'];
    const currIdx = stages.indexOf(batch.stage);
    if (currIdx < stages.length - 1) {
        batch.stage = stages[currIdx + 1];
        if (batch.stage === 'Fruiting') batch.fruitingDate = new Date().toISOString().substring(0, 10);
        saveBatches();
        renderBatches();
        addLog(`Batch #${id} (${batch.rack || batch.variety}) advanced to ${batch.stage}.`, 'success');
        showToast(`Batch #${id} advanced to ${batch.stage}.`, 'success');
        // Auto-create task suggestion when advancing to Fruiting
        if (batch.stage === 'Fruiting') {
            const harvestDate = new Date(); harvestDate.setDate(harvestDate.getDate() + 10);
            const dueDateStr = harvestDate.toISOString().substring(0, 10);
            const autoTask = { id: Date.now(), title: `Schedule harvest check — Batch #${id} (${batch.rack})`, desc: 'Auto-suggested: batch entered Fruiting stage.', assignee: 'Unassigned', priority: 'High', status: 'Pending', dueDate: dueDateStr };
            state.tasks.unshift(autoTask);
            saveTasks(); renderTasks();
            showToast(`Task auto-created: harvest check for Batch #${id}.`, 'info');
        }
    }
}

function flagContamination(id) { showToast("Tap individual bag slots to flag contamination.", "info"); }

function removeBatch(id) { removeRack(id); }

function openHarvestModal(rackId, bagId) { openBagHarvestModal(rackId, bagId); }

function closeHarvestModal() {
    document.getElementById('modal-harvest').classList.add('hidden');
    document.getElementById('harvest-kg').value = '';
}

// --- YIELD TARGET MODAL ---
function openYieldTargetModal() {
    const input = document.getElementById('yield-target-input');
    if (input) input.value = state.yieldTarget.toFixed(2);
    positionModalOverApp('modal-yield-target');
}

function closeYieldTargetModal() {
    const el = document.getElementById('modal-yield-target');
    el.classList.add('hidden');
    el.style.display = '';
}

function submitYieldTarget() {
    const input = document.getElementById('yield-target-input');
    const val = parseFloat(input.value);
    if (isNaN(val) || val <= 0) {
        showToast('Please enter a valid target (e.g. 2.50).', 'error');
        return;
    }
    state.yieldTarget = Math.round(val * 100) / 100;
    saveYieldTarget();

    // Sync yield tab UI (if tab is loaded)
    syncYieldTargetUI();

    closeYieldTargetModal();
    addLog(`Yield target updated to ${state.yieldTarget.toFixed(2)} kg by admin.`, 'info');
    showToast(`Yield target set to ${state.yieldTarget.toFixed(2)} kg.`, 'success');
}

function submitHarvest(e) {
    e.preventDefault();
    const rackId = parseInt(document.getElementById('harvest-batch-id').value);
    const bagId = parseInt(document.getElementById('harvest-bag-id').value);
    const grams = parseFloat(document.getElementById('harvest-kg').value);
    const replace = document.getElementById('harvest-replace-yes').checked;
    const rack = state.growBatches.find(r => r.id === rackId);
    if (!rack) return;
    const bag = rack.bags.find(b => b.id === bagId);
    if (!bag) return;
    bag.harvestLog.push({ date: new Date().toLocaleDateString('en-CA'), grams });
    if (replace) bag.status = 'Replaced';
    saveBatches(); renderBatches();
    closeHarvestModal();
    addLog(`Harvest logged: Slot ${bagId} on ${rack.rack} — ${grams}g${replace ? ' (bag replaced)' : ''}.`, 'success');
    if (replace) {
        // Show replant prompt after a brief delay
        setTimeout(() => {
            showConfirm({
                title: 'Replant Slot ' + bagId + '?',
                body: `The old bag has been replaced. Plant a new substrate bag in Slot ${bagId} of ${rack.rack}?`,
                icon: 'refresh', iconBg: 'bg-primary/10 dark:bg-emerald-950/40', iconColor: 'text-primary dark:text-emerald-400',
                okLabel: 'Yes, Replant', okIcon: 'eco', okBg: 'bg-primary hover:bg-primary/90',
                onConfirm: () => replantBag(rackId, bagId)
            });
        }, 400);
    } else {
        showToast(`${grams}g harvested from ${rack.rack} Slot ${bagId}.`, 'success');
    }
}

function markBatchHarvested(id) {
    openHarvestModal(id);
}

function openEditBatchModal(id) {
    const rack = state.growBatches.find(r => r.id === id);
    if (!rack) return;
    document.getElementById('edit-batch-id').value = id;
    document.getElementById('edit-batch-rack').value = rack.rack;
    document.getElementById('edit-batch-bags').value = rack.slots;
    document.getElementById('edit-batch-substrate').value = rack.substrate;
    document.getElementById('edit-batch-date').value = rack.setupDate;
    document.getElementById('modal-edit-batch').classList.remove('hidden');
}

function closeEditBatchModal() {
    document.getElementById('modal-edit-batch').classList.add('hidden');
}

function submitEditBatch(e) {
    e.preventDefault();
    const id = parseInt(document.getElementById('edit-batch-id').value);
    const rack = state.growBatches.find(r => r.id === id);
    if (!rack) return;
    const newName = document.getElementById('edit-batch-rack').value;
    const newSlots = parseInt(document.getElementById('edit-batch-bags').value);
    const newSubstrate = document.getElementById('edit-batch-substrate').value;
    const newDate = document.getElementById('edit-batch-date').value;
    const cur = rack.bags ? rack.bags.length : 0;

    const applyEdit = () => {
        rack.rack = newName;
        rack.substrate = newSubstrate;
        rack.setupDate = newDate;
        if (newSlots > cur) {
            for (let i = cur + 1; i <= newSlots; i++) {
                rack.bags.push({ id: i, status: 'Active', harvestLog: [], plantedDate: new Date().toLocaleDateString('en-CA') });
            }
        } else if (newSlots < cur) {
            rack.bags = rack.bags.slice(0, newSlots);
        }
        rack.slots = newSlots;
        saveBatches(); renderBatches();
        closeEditBatchModal();
        addLog(`Rack "${rack.rack}" details updated.`, 'info');
        showToast(`${rack.rack} updated.`, 'success');
    };

    if (newSlots < cur) {
        const trimmed = rack.bags.slice(newSlots);
        const withData = trimmed.filter(b => b.harvestLog.length > 0 || b.status !== 'Active');
        const totalLostG = trimmed.reduce((s, b) => s + b.harvestLog.reduce((hs, h) => hs + h.grams, 0), 0);
        if (withData.length > 0) {
            closeEditBatchModal();
            showConfirm({
                title: `Remove ${cur - newSlots} slot${cur - newSlots > 1 ? 's' : ''}?`,
                body: `${withData.length} of the removed slot${withData.length > 1 ? 's have' : ' has'} harvest data (${totalLostG}g total). This data will be permanently lost.`,
                icon: 'warning', iconBg: 'bg-red-100 dark:bg-red-950/40', iconColor: 'text-red-500',
                okLabel: 'Remove Slots', okIcon: 'delete', okBg: 'bg-red-600 hover:bg-red-700',
                onConfirm: applyEdit
            });
            return;
        }
    }
    applyEdit();
}

function createTaskFromBatch(id) {
    const rack = state.growBatches.find(r => r.id === id);
    if (!rack) return;
    const title = `Check ${rack.rack} — inspect bags and harvest ripe mushrooms`;
    const newTask = { id: Date.now(), title, desc: `Auto-generated from ${rack.rack}.`, assignee: 'Unassigned', priority: 'Normal', status: 'Pending', dueDate: '' };
    state.tasks.unshift(newTask);
    saveTasks(); renderTasks();
    showToast(`Task created for ${rack.rack}.`, 'success');
    addLog(`Task auto-created from ${rack.rack}: "${title}"`, 'info');
}

function openAddBatchModal() {
    const overlay = document.getElementById('modal-add-batch');
    overlay.classList.remove('hidden');
    // Reset scroll to top of overlay each time modal opens
    overlay.scrollTop = 0;
}

// Configures the center nav button per role.
// 'add-crop' = admin (navigates to Manage Crop with add hint)
// 'manage-crop-staff' = staff (navigates to Manage Crop read-only)
let _navFabMode = 'add-crop';
function setNavFabMode(mode) {
    _navFabMode = mode;
    const icon = document.getElementById('nav-fab-icon');
    const label = document.getElementById('nav-fab-label');
    const btn = document.getElementById('nav-fab');
    if (!icon || !label || !btn) return;
    // Both admin and staff show "Manage Crop" on the FAB
    icon.textContent = 'agriculture';
    label.textContent = 'Manage Crop';
    btn.setAttribute('aria-label', 'Manage Crop');
}

function handleNavFabClick() {
    if (_navFabMode === 'add-crop') {
        goToAddCrop();
    } else {
        // Staff: navigate to Manage Crop (read-only, no add hint)
        goToManageCropStaff();
    }
}

// Staff: navigate to the Manage Crop tab (view-only, no add-rack hint)
function goToManageCropStaff() {
    const alreadyOnCrops = state.currentTab === 'grow-log' && !document.getElementById('tab-grow-log').classList.contains('hidden');
    if (!alreadyOnCrops) {
        switchTab('grow-log');
    }
}

// Used by the center "+" button (admin only): jump to Crops first, then show hint + pulse Add Batch button
function goToAddCrop() {
    const userRole = state.currentUser ? state.currentUser.role : 'admin';
    if (userRole === 'staff') {
        // Staff shouldn't hit this path (FAB uses goToManageCropStaff instead)
        goToManageCropStaff();
        return;
    }

    const showPulse = () => {
        const btn = document.getElementById('btn-add-batch-inline');
        if (!btn) return;

        // Scroll button into view smoothly
        btn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        // After a beat, start the pulse on the button
        setTimeout(() => {
            btn.classList.add('add-crop-pulse');
        }, 400);

        // Stop pulsing after ~6s total
        setTimeout(() => {
            btn.classList.remove('add-crop-pulse');
        }, 6000);
    };

    const alreadyOnCrops = state.currentTab === 'grow-log' && !document.getElementById('tab-grow-log').classList.contains('hidden');
    if (alreadyOnCrops) {
        showPulse();
        return;
    }

    switchTab('grow-log');
    // switchTab runs a brief exit/enter animation when changing tabs (250ms); wait it out
    setTimeout(showPulse, 320);
}

function stopAddBatchHint() {
    const btn = document.getElementById('btn-add-batch-inline');
    if (btn) btn.classList.remove('add-crop-pulse');
}

function closeAddBatchModal() {
    document.getElementById('modal-add-batch').classList.add('hidden');
}

function submitAddBatch(e) {
    e.preventDefault();
    const rackName = document.getElementById('batch-rack').value.trim();
    const slots = parseInt(document.getElementById('batch-qty').value);
    const substrate = document.getElementById('batch-substrate').value;
    const setupDate = document.getElementById('batch-date').value;
    const newRack = {
        id: Date.now(),
        rack: rackName,
        slots,
        substrate,
        setupDate,
        bags: makeBags(slots)
    };
    state.growBatches.unshift(newRack);
    saveBatches(); renderBatches();
    closeAddBatchModal();
    addLog(`Rack "${rackName}" added with ${slots} slots (${substrate}).`, 'success');
    showToast(`${rackName} added with ${slots} bag slots.`, 'success');
}

function openRackDetailSubpage(rackId) {
    const rack = state.growBatches.find(r => r.id === rackId);
    if (!rack) return;
    _rackDetailFilter = 'all';
    _rackDetailSelected = new Set();
    _rackDetailCurrentRackId = rackId;
    renderRackDetailSubpage(rack);
    openSubPage('subpage-rack-detail');
}

function renderRackDetailSubpage(rack) {
    const bags = rack.bags || [];
    const activeBags = bags.filter(b => b.status === 'Active').length;
    const replaced = bags.filter(b => b.status === 'Replaced').length;
    const contaminated = bags.filter(b => b.status === 'Contaminated').length;
    const emptySlots = bags.filter(b => b.status === 'Empty').length;
    let totalG = bags.reduce((s, b) => s + b.harvestLog.reduce((hs, h) => hs + h.grams, 0), 0);
    if (rack.historicalHarvests) {
        totalG += rack.historicalHarvests.reduce((s, h) => s + h.grams, 0);
    }

    _rackDetailCurrentRackId = rack.id;

    document.getElementById('rack-detail-title').textContent = rack.rack;

    const pillsEl = document.getElementById('rack-detail-pills');
    pillsEl.innerHTML = [
        { label: activeBags + ' Active', cls: 'bg-white/20 text-white' },
        { label: replaced + ' Replaced', cls: 'bg-white/15 text-white/80' },
        contaminated > 0 ? { label: contaminated + ' Flagged \u26A0', cls: 'bg-red-500/70 text-white' } : null,
        emptySlots > 0 ? { label: emptySlots + ' Empty', cls: 'bg-white/10 text-white/60' } : null,
        { label: rack.substrate, cls: 'bg-white/15 text-white/80' },
    ].filter(Boolean).map(p =>
        '<span class="text-[11px] font-bold px-3 py-1 rounded-full ' + p.cls + '">' + p.label + '</span>'
    ).join('');

    // Desktop-only: environment status badge (Stable vs Needs Attention)
    const statusBadge = document.getElementById('rd-status-badge');
    if (statusBadge) {
        if (contaminated > 0) {
            statusBadge.className = 'rd-desktop-only rd-attention items-center gap-1 text-[10px] font-extrabold uppercase tracking-wide px-2.5 py-1 rounded-full mb-1';
            statusBadge.innerHTML = '<span class="material-symbols-outlined text-[12px]">warning</span>Needs Attention';
        } else {
            statusBadge.className = 'rd-desktop-only rd-stable items-center gap-1 text-[10px] font-extrabold uppercase tracking-wide px-2.5 py-1 rounded-full mb-1';
            statusBadge.innerHTML = '\u25CF Stable Environment';
        }
    }

    // Desktop-only: header info chips
    const infoSubstrate = document.getElementById('rd-info-substrate');
    const infoSetup = document.getElementById('rd-info-setup');
    if (infoSubstrate) infoSubstrate.textContent = rack.substrate;
    if (infoSetup) infoSetup.textContent = rack.setupDate;

    // Desktop-only: Substrate Slots card badges
    const badgeAll = document.getElementById('rd-badge-all');
    const badgeEmpty = document.getElementById('rd-badge-empty');
    if (badgeAll) badgeAll.textContent = 'ALL ' + bags.length;
    if (badgeEmpty) badgeEmpty.textContent = 'EMPTY ' + emptySlots;

    _renderRackDetailChips(rack.id, bags, replaced, contaminated);
    renderRackDetailSlotGrid(rack, _rackDetailFilter);
    updateRackDetailBulkUI();

    document.getElementById('rack-detail-total-yield').textContent = totalG + ' g total';

    const harvestsEl = document.getElementById('rack-detail-harvests');
    
    // Inject Tab Buttons if historical data exists
    let tabsContainer = document.getElementById('rack-detail-harvest-tabs');
    if (!tabsContainer) {
        tabsContainer = document.createElement('div');
        tabsContainer.id = 'rack-detail-harvest-tabs';
        harvestsEl.parentNode.insertBefore(tabsContainer, harvestsEl);
    }
    if (rack.historicalHarvests && rack.historicalHarvests.length > 0) {
        tabsContainer.innerHTML = `
            <div class="flex items-center gap-2 mb-2">
                <button id="btn-harvests-current" class="px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${!window._currentHarvestTabIsHistory ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700'}">Current</button>
                <button id="btn-harvests-history" class="px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${window._currentHarvestTabIsHistory ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700'}">History (Archived)</button>
            </div>
        `;
    } else {
        tabsContainer.innerHTML = '';
        window._currentHarvestTabIsHistory = false;
    }

    function drawHarvests() {
        const isHistory = window._currentHarvestTabIsHistory;
        let aggregatedHarvests = [];

        if (isHistory) {
            const histMap = {};
            (rack.historicalHarvests || []).forEach(h => {
                if (!histMap[h.slot]) histMap[h.slot] = { slot: h.slot, grams: 0, count: 0, lastDate: h.date };
                histMap[h.slot].grams += h.grams;
                histMap[h.slot].count++;
                if (new Date(h.date) > new Date(histMap[h.slot].lastDate)) histMap[h.slot].lastDate = h.date;
            });
            aggregatedHarvests = Object.values(histMap).sort((a, b) => b.grams - a.grams);
        } else {
            aggregatedHarvests = bags
                .filter(b => b.harvestLog.length > 0)
                .map(b => {
                    const grams = b.harvestLog.reduce((s, h) => s + h.grams, 0);
                    const count = b.harvestLog.length;
                    const lastDate = b.harvestLog[b.harvestLog.length - 1].date;
                    return { slot: b.id, grams, count, lastDate };
                })
                .sort((a, b) => b.grams - a.grams);
        }

        if (aggregatedHarvests.length) {
            const half = Math.ceil(aggregatedHarvests.length / 2);
            const leftHarvests = aggregatedHarvests.slice(0, half);
            const rightHarvests = aggregatedHarvests.slice(half);

            const renderRow = (h) => `
                <div class="flex items-center justify-between border-b border-slate-100/60 dark:border-zinc-700/30 py-1.5 last:border-0 group ${!isHistory ? `cursor-pointer" onclick="openBagActionModal(${rack.id}, ${h.slot})"` : 'cursor-default"'} >
                    <div class="flex items-center gap-2">
                       <div class="w-[20px] h-[20px] rounded-md bg-primary/10 dark:bg-emerald-950/30 text-primary dark:text-emerald-400 flex items-center justify-center font-extrabold text-[10px] shadow-sm">${h.slot}</div>
                       <span class="text-[9px] font-bold text-slate-400 dark:text-zinc-500">${h.count}x</span>
                    </div>
                    <div class="flex flex-col items-end justify-center">
                        <span class="text-[11px] font-extrabold text-success-green dark:text-emerald-400 group-hover:scale-105 inline-block transition-transform transform origin-right">+${h.grams}g</span>
                        <span class="text-[8px] font-medium text-slate-400 dark:text-zinc-500">${h.lastDate.substring(5).replace('-', '/')}</span>
                    </div>
                </div>`;

            harvestsEl.className = ""; // clear previous classes
            harvestsEl.innerHTML = `
            <div class="w-full border border-slate-100 dark:border-zinc-700/50 rounded-xl bg-white dark:bg-zinc-900/40 shadow-sm flex flex-col overflow-hidden">
                <div class="grid grid-cols-2 px-3 py-1.5 bg-slate-50/80 dark:bg-zinc-800/30 border-b border-slate-100 dark:border-zinc-700/50 items-center">
                    <div class="flex justify-between items-center" style="padding-right: 20px;">
                        <span class="text-[8px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Slot</span>
                        <span class="text-[8px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Yield</span>
                    </div>
                    <div class="flex justify-between items-center border-l-2 border-slate-200 dark:border-zinc-600" style="padding-left: 20px;">
                        <span class="text-[8px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Slot</span>
                        <span class="text-[8px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Yield</span>
                    </div>
                </div>
                <div class="overflow-y-auto overscroll-contain max-h-[160px]" style="-webkit-overflow-scrolling: touch;">
                    <div class="grid grid-cols-2 px-3">
                        <div class="flex flex-col" style="padding-right: 20px;">
                            ${leftHarvests.map(renderRow).join('')}
                        </div>
                        <div class="flex flex-col border-l-2 border-slate-200 dark:border-zinc-600" style="padding-left: 20px;">
                            ${rightHarvests.map(renderRow).join('')}
                        </div>
                    </div>
                </div>
            </div>`;
        } else {
            harvestsEl.className = "space-y-2";
            harvestsEl.innerHTML = '<p class="text-[12px] text-slate-400 dark:text-zinc-500 text-center py-5">No ' + (isHistory ? 'historical ' : '') + 'harvests recorded yet.</p>';
        }
    }

    drawHarvests();

    const btnCurr = document.getElementById('btn-harvests-current');
    const btnHist = document.getElementById('btn-harvests-history');
    if (btnCurr && btnHist) {
        btnCurr.onclick = () => { window._currentHarvestTabIsHistory = false; renderRackDetailSubpage(rack); };
        btnHist.onclick = () => { window._currentHarvestTabIsHistory = true; renderRackDetailSubpage(rack); };
    }

    document.getElementById('rack-detail-setup-date').textContent = 'Set up: ' + rack.setupDate;
    document.getElementById('rack-detail-edit-btn').onclick = function () { closeSubPage('subpage-rack-detail'); setTimeout(function () { openEditBatchModal(rack.id); }, 360); };
    document.getElementById('rack-detail-delete-btn').onclick = function () { closeSubPage('subpage-rack-detail'); setTimeout(function () { removeRack(rack.id); }, 360); };

    // Show/hide edit & delete based on role (admin only)
    const isAdmin = state.currentUser && state.currentUser.role === 'admin';
    const editBtn = document.getElementById('rack-detail-edit-btn');
    const deleteBtn = document.getElementById('rack-detail-delete-btn');
    if (editBtn) editBtn.style.display = isAdmin ? '' : 'none';
    if (deleteBtn) deleteBtn.style.display = isAdmin ? '' : 'none';
}

function _renderRackDetailChips(rackId, bags, replaced, contaminated) {
    const emptyCount = bags.filter(b => b.status === 'Empty').length;
    const filters = [
        { key: 'all', label: 'All', count: bags.length },
        { key: 'active', label: 'Active', count: bags.filter(b => b.status === 'Active' && b.harvestLog.length === 0).length },
        { key: 'harvested', label: 'Harvested', count: bags.filter(b => b.status === 'Active' && b.harvestLog.length > 0).length },
        { key: 'replaced', label: 'Replaced', count: replaced },
        { key: 'contaminated', label: 'Flagged', count: contaminated },
        { key: 'empty', label: 'Empty', count: emptyCount },
    ];
    const chipsEl = document.getElementById('rack-detail-filter-chips');
    chipsEl.innerHTML = filters.map(function (f) {
        if (f.key !== 'all' && f.count === 0) return ''; // hide zero-count chips
        const isActive = f.key === _rackDetailFilter;
        const isContam = f.key === 'contaminated';
        const isEmpty = f.key === 'empty';
        const cls = isActive
            ? (isContam ? 'bg-red-500 text-white border-red-500' : isEmpty ? 'bg-slate-500 text-white border-slate-500' : 'bg-primary text-white border-primary')
            : (isContam && f.count > 0 ? 'text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-700' : isEmpty && f.count > 0 ? 'text-slate-500 dark:text-zinc-400 bg-slate-50 dark:bg-zinc-800 border-slate-300 dark:border-zinc-600' : 'text-on-surface-variant dark:text-zinc-400 bg-surface-soft dark:bg-zinc-800 border-outline-variant dark:border-zinc-700');
        return '<button onclick="setRackDetailFilter(' + rackId + ',\'' + f.key + '\')" class="text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all ' + cls + '">' + f.label + ' <span class="opacity-70">' + f.count + '</span></button>';
    }).join('');
}

// Shared filter predicate — used by both the slot grid and the bulk
// "Select All" logic so they always agree on what's "currently visible".
function _rackDetailMatchesFilter(bag, filter) {
    if (filter === 'all') return true;
    if (filter === 'active') return bag.status === 'Active' && bag.harvestLog.length === 0;
    if (filter === 'harvested') return bag.status === 'Active' && bag.harvestLog.length > 0;
    if (filter === 'replaced') return bag.status === 'Replaced';
    if (filter === 'contaminated') return bag.status === 'Contaminated';
    if (filter === 'empty') return bag.status === 'Empty';
    return true;
}

function renderRackDetailSlotGrid(rack, filter) {
    const bags = rack.bags || [];
    const filtered = bags.filter(function (bag) { return _rackDetailMatchesFilter(bag, filter); });
    const grid = document.getElementById('rack-detail-slot-grid');
    if (!filtered.length) {
        grid.innerHTML = '<p class="text-[12px] text-slate-400 dark:text-zinc-500 text-center w-full py-6">No slots match this filter.</p>';
        return;
    }
    grid.innerHTML = filtered.map(function (bag) {
        const isSelected = _rackDetailSelected.has(bag.id);
        // Desktop-only bulk-select checkbox overlay — stops propagation so the
        // slot's own click (which opens the bag action modal) still fires normally.
        const checkHtml = '<label class="rd-slot-check" onclick="event.stopPropagation()">' +
            '<input type="checkbox" ' + (isSelected ? 'checked' : '') + ' onchange="toggleRackDetailSlotSelect(' + bag.id + ', this)"></label>';
        let color, textColor, label, borderCls;
        if (bag.status === 'Empty') {
            return '<div onclick="openBagActionModal(' + rack.id + ',' + bag.id + ')" class="rack-slot-btn' + (isSelected ? ' rd-selected' : '') + ' bg-surface-soft dark:bg-zinc-800/40 border-2 border-dashed border-slate-300 dark:border-zinc-600 opacity-70 hover:opacity-100">' +
                checkHtml +
                '<span class="material-symbols-outlined text-[18px] text-slate-400 dark:text-zinc-500">add</span>' +
                '<span class="text-[8px] font-semibold text-slate-400 dark:text-zinc-500 leading-none text-center">' + bag.id + '</span>' +
                '</div>';
        }
        if (bag.status === 'Replaced') { color = 'bg-slate-200 dark:bg-zinc-700'; textColor = 'text-slate-500 dark:text-white'; label = 'Replaced'; borderCls = 'border-slate-300 dark:border-zinc-600'; }
        else if (bag.status === 'Contaminated') { color = 'bg-red-100 dark:bg-red-950/60'; textColor = 'text-red-600 dark:text-white'; label = 'Flagged'; borderCls = 'border-red-300 dark:border-red-800'; }
        else if (bag.harvestLog.length > 0) { color = 'bg-amber-100 dark:bg-amber-950/50'; textColor = 'text-amber-700 dark:text-white'; label = bag.harvestLog.length + '\u00D7'; borderCls = 'border-amber-300 dark:border-amber-800'; }
        else { color = 'bg-primary/10 dark:bg-zinc-800 rack-slot-active'; textColor = 'text-primary dark:text-white'; label = 'Active'; borderCls = 'border-primary/20 dark:border-zinc-700'; }
        return '<div onclick="openBagActionModal(' + rack.id + ',' + bag.id + ')" class="rack-slot-btn' + (isSelected ? ' rd-selected' : '') + ' ' + color + ' ' + borderCls + '">' +
            checkHtml +
            '<span class="text-[12px] font-extrabold ' + textColor + '">' + bag.id + '</span>' +
            '<span class="text-[10px] font-semibold ' + textColor + ' leading-none text-center">' + label + '</span>' +
            '</div>';
    }).join('');
}

function setRackDetailFilter(rackId, filter) {
    _rackDetailFilter = filter;
    const rack = state.growBatches.find(r => r.id === rackId);
    if (!rack) return;
    const bags = rack.bags || [];
    const replaced = bags.filter(b => b.status === 'Replaced').length;
    const contaminated = bags.filter(b => b.status === 'Contaminated').length;
    _renderRackDetailChips(rackId, bags, replaced, contaminated);
    renderRackDetailSlotGrid(rack, filter);
    updateRackDetailBulkUI();
}

// ── Rack Detail: Bulk selection & Bulk Action (desktop) ─────────────
function toggleRackDetailSlotSelect(bagId, checkboxEl) {
    if (checkboxEl.checked) _rackDetailSelected.add(bagId);
    else _rackDetailSelected.delete(bagId);
    const slotEl = checkboxEl.closest('.rack-slot-btn');
    if (slotEl) slotEl.classList.toggle('rd-selected', checkboxEl.checked);
    updateRackDetailBulkUI();
}

function toggleRackDetailSelectAll(cb) {
    const rack = state.growBatches.find(r => r.id === _rackDetailCurrentRackId);
    if (!rack) return;
    const filtered = (rack.bags || []).filter(b => _rackDetailMatchesFilter(b, _rackDetailFilter));
    filtered.forEach(function (b) {
        if (cb.checked) _rackDetailSelected.add(b.id);
        else _rackDetailSelected.delete(b.id);
    });
    renderRackDetailSlotGrid(rack, _rackDetailFilter);
    updateRackDetailBulkUI();
}

function updateRackDetailBulkUI() {
    const btn = document.getElementById('rd-bulk-action-btn');
    const selectAllCb = document.getElementById('rd-select-all-cb');
    if (!btn) return;
    const count = _rackDetailSelected.size;
    btn.disabled = count === 0;
    btn.innerHTML = '<span class="material-symbols-outlined text-[15px]">bolt</span>Bulk Action' + (count > 0 ? ' (' + count + ')' : '');
    if (selectAllCb) {
        const rack = state.growBatches.find(r => r.id === _rackDetailCurrentRackId);
        if (rack) {
            const filtered = (rack.bags || []).filter(b => _rackDetailMatchesFilter(b, _rackDetailFilter));
            const allSelected = filtered.length > 0 && filtered.every(b => _rackDetailSelected.has(b.id));
            const someSelected = filtered.some(b => _rackDetailSelected.has(b.id));
            selectAllCb.checked = allSelected;
            selectAllCb.indeterminate = someSelected && !allSelected;
        } else {
            selectAllCb.checked = false;
            selectAllCb.indeterminate = false;
        }
    }
    if (count === 0) closeRackDetailBulkMenu();
}

function toggleRackDetailBulkMenu(e) {
    if (e) e.stopPropagation();
    const menu = document.getElementById('rd-bulk-menu');
    if (!menu) return;
    if (_rackDetailSelected.size === 0) { showToast('Select at least one slot first.', 'info'); return; }
    if (menu.classList.contains('hidden')) {
        const rack = state.growBatches.find(r => r.id === _rackDetailCurrentRackId);
        const selectedIds = Array.from(_rackDetailSelected);
        const eligibleCounts = { harvest: 0, harvest_plant: 0, replaced: 0, contaminated: 0, empty: 0 };
        
        if (rack) {
            selectedIds.forEach(function (id) {
                const bag = rack.bags.find(b => b.id === id);
                if (!bag) return;
                if (bag.status === 'Active') { eligibleCounts.harvest++; eligibleCounts.replaced++; }
                if (bag.status !== 'Contaminated') eligibleCounts.harvest_plant++;
                if (bag.status !== 'Empty' && bag.status !== 'Contaminated') eligibleCounts.contaminated++;
                if (bag.status !== 'Empty') eligibleCounts.empty++;
            });
        }

        menu.innerHTML = [
            { key: 'harvest', icon: 'grocery', label: 'Log Harvest for Selected', eligible: eligibleCounts.harvest },
            { key: 'harvest_plant', icon: 'compost', label: 'Plant / Replant Selected', eligible: eligibleCounts.harvest_plant },
            { key: 'replaced', icon: 'swap_horiz', label: 'Mark as Replaced', eligible: eligibleCounts.replaced },
            { key: 'contaminated', icon: 'bug_report', label: 'Flag as Contaminated', danger: true, eligible: eligibleCounts.contaminated },
            { key: 'empty', icon: 'delete', label: 'Clear Slots (Empty)', danger: true, eligible: eligibleCounts.empty },
        ].map(function (a) {
            const disabled = a.eligible === 0;
            const label = a.label + (!disabled && a.eligible < selectedIds.length ? ' (' + a.eligible + ' valid)' : '');
            return '<button class="' + (a.danger ? 'rd-danger' : '') + (disabled ? ' rd-bulk-menu-btn-disabled' : '') + '" onclick="rackDetailBulkApply(\'' + a.key + '\')"' +
                (disabled ? ' title="No valid slots selected for this action"' : '') +
                '><span class="material-symbols-outlined text-[16px]">' + a.icon + '</span>' + label + '</button>';
        }).join('');
        menu.classList.remove('hidden');
        setTimeout(function () { document.addEventListener('click', _rackDetailBulkMenuOutsideClick); }, 0);
    } else {
        closeRackDetailBulkMenu();
    }
}

function closeRackDetailBulkMenu() {
    const menu = document.getElementById('rd-bulk-menu');
    if (menu) menu.classList.add('hidden');
    document.removeEventListener('click', _rackDetailBulkMenuOutsideClick);
}

function _rackDetailBulkMenuOutsideClick(e) {
    const menu = document.getElementById('rd-bulk-menu');
    const btn = document.getElementById('rd-bulk-action-btn');
    if (!menu || menu.classList.contains('hidden')) return;
    if (menu.contains(e.target) || (btn && btn.contains(e.target))) return;
    closeRackDetailBulkMenu();
}

// "Mark as Replaced" bulk action — only ever runs on ids that were
// already filtered down to Active slots by rackDetailBulkApply().
function rackDetailBulkApplyReplaced(rack, eligibleIds, skipped) {
    const body = eligibleIds.length + ' slot(s) will be marked Replaced and their harvest history cleared.' +
        (skipped > 0 ? ' (' + skipped + ' selected slot(s) skipped — no active plant.)' : '');
    showConfirm({
        title: 'Mark Selected Slots as Replaced?',
        body: body,
        icon: 'swap_horiz', okLabel: 'Mark Replaced', okBg: 'bg-primary hover:bg-primary/90',
        iconBg: 'bg-primary/10 dark:bg-emerald-950/40', iconColor: 'text-primary dark:text-emerald-400',
        onConfirm: function () {
            let applied = 0;
            eligibleIds.forEach(function (bagId) {
                const bag = rack.bags.find(b => b.id === bagId);
                if (!bag) return;
                bag.status = 'Replaced';
                archiveHarvestLog(rack, bag);
                applied++;
            });
            _rackDetailSelected.clear();
            saveBatches(); renderBatches();
            const openRack = state.growBatches.find(r => r.id === rack.id);
            if (openRack) renderRackDetailSubpage(openRack);
            addLog('Bulk action "Mark Replaced" applied to ' + applied + ' slot(s) on ' + rack.rack + '.', 'success');
            showToast('Mark Replaced applied to ' + applied + ' slot(s).', 'success');
        }
    });
}

function rackDetailBulkApply(action) {
    const rack = state.growBatches.find(r => r.id === _rackDetailCurrentRackId);
    if (!rack) return;
    const ids = Array.from(_rackDetailSelected);
    if (!ids.length) return;
    closeRackDetailBulkMenu();

    const eligibleIds = ids.filter(function (bagId) {
        const bag = rack.bags.find(b => b.id === bagId);
        if (!bag) return false;
        if (action === 'harvest' || action === 'replaced') return bag.status === 'Active';
        if (action === 'harvest_plant') return bag.status !== 'Contaminated';
        if (action === 'contaminated') return bag.status !== 'Empty' && bag.status !== 'Contaminated';
        if (action === 'empty') return bag.status !== 'Empty';
        return true;
    });

    const skipped = ids.length - eligibleIds.length;
    if (eligibleIds.length === 0) {
        showToast('None of the selected slots are valid for this action.', 'info');
        return;
    }

    if (action === 'harvest') {
        openBulkHarvestModal(eligibleIds, rack, skipped);
        return;
    }
    if (action === 'replaced') {
        rackDetailBulkApplyReplaced(rack, eligibleIds, skipped);
        return;
    }

    const actionMeta = {
        harvest_plant: { title: 'Plant / Replant Selected Slots?', body: eligibleIds.length + ' slot(s) will be set to a fresh Active bag. Any existing history will be archived.' + (skipped > 0 ? ' (' + skipped + ' flagged slot(s) skipped)' : ''), icon: 'compost', okLabel: 'Plant / Replant', okBg: 'bg-primary hover:bg-primary/90', iconBg: 'bg-primary/10 dark:bg-emerald-950/40', iconColor: 'text-primary dark:text-emerald-400', logType: 'success' },
        contaminated: { title: 'Flag Selected Slots as Contaminated?', body: eligibleIds.length + ' slot(s) will be flagged contaminated. You can replant them after removal.' + (skipped > 0 ? ' (' + skipped + ' empty/flagged slot(s) skipped)' : ''), icon: 'bug_report', okLabel: 'Flag Slots', okBg: 'bg-red-500 hover:bg-red-600', iconBg: 'bg-red-100 dark:bg-red-950/40', iconColor: 'text-red-500', logType: 'error' },
        empty: { title: 'Clear Selected Slots?', body: eligibleIds.length + ' slot(s) will be emptied and their data cleared. This cannot be undone.' + (skipped > 0 ? ' (' + skipped + ' already empty slot(s) skipped)' : ''), icon: 'delete_forever', okLabel: 'Clear Slots', okBg: 'bg-red-600 hover:bg-red-700', iconBg: 'bg-red-100 dark:bg-red-950/40', iconColor: 'text-red-500', logType: 'warning' },
    }[action];
    if (!actionMeta) return;

    showConfirm({
        title: actionMeta.title,
        body: actionMeta.body,
        icon: actionMeta.icon, iconBg: actionMeta.iconBg, iconColor: actionMeta.iconColor,
        okLabel: actionMeta.okLabel, okIcon: actionMeta.icon, okBg: actionMeta.okBg,
        onConfirm: function () {
            let applied = 0;
            eligibleIds.forEach(function (bagId) {
                const bag = rack.bags.find(b => b.id === bagId);
                if (!bag) return;
                if (action === 'harvest_plant') { bag.status = 'Active'; archiveHarvestLog(rack, bag); bag.plantedDate = new Date().toLocaleDateString('en-CA'); }
                else if (action === 'contaminated') { bag.status = 'Contaminated'; }
                else if (action === 'empty') { bag.status = 'Empty'; archiveHarvestLog(rack, bag); bag.substrate = null; bag.plantedDate = null; bag.notes = null; }
                applied++;
            });
            _rackDetailSelected.clear();
            saveBatches(); renderBatches();
            const openRack = state.growBatches.find(r => r.id === _rackDetailCurrentRackId);
            if (openRack) renderRackDetailSubpage(openRack);
            addLog('Bulk action "' + actionMeta.okLabel + '" applied to ' + applied + ' slot(s) on ' + rack.rack + '.', actionMeta.logType);
            showToast(actionMeta.okLabel + ' applied to ' + applied + ' slot(s).', actionMeta.logType === 'error' ? 'warning' : actionMeta.logType);
            if (action === 'contaminated') {
                triggerSystemAlert('Contamination flagged: ' + rack.rack, applied + ' slot(s) in ' + rack.rack + ' flagged for contamination via bulk action.', 'warning');
            }
        }
    });
}
