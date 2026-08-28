// --- INFO MODAL (Guide / FAQ / Support / About) — powers the desktop
// top-right nav links and the shared main-content footer links ---
const INFO_MODAL_CONTENT = {
    guide: {
        icon: 'menu_book',
        title: 'Cultivation Guide',
        body: `
                    <p><strong>Reading your racks.</strong> Each rack card shows live temperature, humidity,
                    and CO2 alongside the crop's current growth stage. Most gourmet mushrooms (oyster, shiitake,
                    lion's mane) thrive at 75–85% relative humidity, 65–75°F during fruiting, and CO2 kept
                    under 800 ppm — higher CO2 encourages long, thin stems instead of healthy caps.</p>
                    <p><strong>AUTO vs. MANUAL mode.</strong> The mode pill in the header/sidebar toggles
                    whether misting, fans, and vents respond automatically to sensor readings, or wait for
                    you to trigger them manually from Controls.</p>
                    <p><strong>Adding a crop.</strong> Use Add Crop to assign a rack, choose a species, and
                    log the setup date — the system then tracks days-in-stage automatically.</p>
                    <p><strong>Bulk actions.</strong> On a Rack Detail page, select multiple slots to harvest,
                    flag, or update several at once instead of one at a time.</p>
                `
    },
    faq: {
        icon: 'help',
        title: 'Frequently Asked Questions',
        body: `
                    <p><strong>Why did I get an alert?</strong> Alerts fire when a sensor reading drifts
                    outside the safe range you've set for that crop stage, or when a device stops reporting.</p>
                    <p><strong>What can staff accounts see?</strong> Staff can view and update day-to-day
                    operations (tasks, grow logs, rack readings) but yield planning and farm-wide history are
                    admin-only.</p>
                    <p><strong>How do I log a harvest?</strong> Open the rack, select the ready slots, and use
                    the harvest action — it records weight and timestamp to your Grow Log automatically.</p>
                    <p><strong>Can I undo a bulk action?</strong> Most bulk actions ask for confirmation first
                    since they apply to multiple slots at once — double-check the selection before confirming.</p>
                `
    },
    support: {
        icon: 'support_agent',
        title: 'Contact Support',
        body: `
                    <p>Something not behaving as expected? Reach the KabuTech team and we'll help sort it out.</p>
                    <p><strong>Email:</strong> zguinialpe@gmail.com<br>
                    <strong>Contact Number:</strong> 09426738818<br>
                    <strong>Hours:</strong> Monday–Saturday, 7:00 AM–7:00 PM</p>
                    <p>For urgent hardware faults (sensors offline, misting failure), use Report Farm Issue
                    from the Diagnostics area so it's logged with your farm's device history.</p>
                `
    },
    about: {
        icon: 'info',
        title: 'About This System',
        body: `
                    <p>KabuTech Hiyas is a farm operations dashboard built for small and mid-size mushroom
                    cultivation operations. It centralizes rack-level environmental monitoring, task
                    management, yield tracking, and staff coordination in one place.</p>
                    <p>The goal is simple: fewer surprises in the grow room. Automated alerts catch drifting
                    conditions early, and the shared grow log keeps a running record of what was planted,
                    harvested, and adjusted along the way.</p>
                `
    }
};

function openHelpMenu() {
    const modal = document.getElementById('modal-help-menu');
    const card = document.getElementById('modal-help-menu-card');
    modal.classList.remove('hidden');
    // Force reflow for transitions
    void modal.offsetWidth;
    card.classList.remove('translate-y-full', 'sm:scale-95', 'opacity-0');
    card.classList.add('translate-y-0', 'sm:scale-100', 'opacity-100');
}

function closeHelpMenu() {
    const modal = document.getElementById('modal-help-menu');
    const card = document.getElementById('modal-help-menu-card');
    card.classList.remove('translate-y-0', 'sm:scale-100', 'opacity-100');
    card.classList.add('translate-y-full', 'sm:scale-95', 'opacity-0');
    setTimeout(() => modal.classList.add('hidden'), 300);
}

function openInfoModal(type) {
    const data = INFO_MODAL_CONTENT[type] || INFO_MODAL_CONTENT.guide;
    document.getElementById('info-modal-icon').textContent = data.icon;
    document.getElementById('info-modal-title-text').textContent = data.title;
    document.getElementById('info-modal-body').innerHTML = data.body;
    document.getElementById('modal-info').classList.remove('hidden');
}

function closeInfoModal() {
    document.getElementById('modal-info').classList.add('hidden');
}

// --- STAFF ACCOUNT MANAGEMENT (ADMIN CRUD) ---
function renderStaffAccountsList() {
    renderStaffDirectoryDesktop();
    const container = document.getElementById('staff-accounts-list');
    if (!container) return;
    const query = (document.getElementById('staff-search-input')?.value || '').toLowerCase().trim();
    const accounts = getAccounts().filter(a => a.role !== 'admin');
    const filtered = query
        ? accounts.filter(a => a.name.toLowerCase().includes(query) || a.email.toLowerCase().includes(query))
        : accounts;

    if (filtered.length === 0) {
        container.innerHTML = `<div class="flex flex-col items-center justify-center py-6 gap-1.5 text-slate-400 dark:text-zinc-500">
                    <span class="material-symbols-outlined text-[36px]">group_off</span>
                    <p class="text-[14px] font-semibold">${query ? 'No matching staff found.' : 'No staff accounts yet.'}</p>
                </div>`;
        return;
    }

    container.innerHTML = '';
    filtered.forEach(acc => {
        const initials = acc.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
        const card = document.createElement('div');
        card.className = 'flex items-center gap-3 bg-surface-soft dark:bg-zinc-800 border border-outline-variant/50 dark:border-zinc-700 rounded-xl px-3 py-3 group';
        card.innerHTML = `
                    <div class="w-10 h-10 rounded-full bg-primary/10 dark:bg-zinc-700 text-primary dark:text-primary-fixed flex items-center justify-center font-extrabold text-[13px] shrink-0">${initials}</div>
                    <div class="flex-1 min-w-0">
                        <p class="text-[15px] font-bold text-on-background dark:text-white truncate">${acc.name}</p>
                        <p class="text-[13px] text-on-surface-variant dark:text-zinc-400 truncate">${acc.email}</p>
                    </div>
                    <div class="flex items-center gap-1 shrink-0">
                        <button onclick="openStaffAccountModal('${acc.email}')" title="Edit"
                            class="w-8 h-8 rounded-full bg-surface-container-high dark:bg-zinc-700 text-secondary dark:text-primary-fixed hover:bg-primary hover:text-on-primary flex items-center justify-center transition-colors active:scale-90">
                            <span class="material-symbols-outlined text-[17px]">edit</span>
                        </button>
                        <button onclick="openStaffDeleteModal('${acc.email}', '${acc.name.replace(/'/g, "\\'")}')" title="Delete"
                            class="w-8 h-8 rounded-full bg-error-container/30 dark:bg-red-950/40 text-error-red hover:bg-error hover:text-white flex items-center justify-center transition-colors active:scale-90">
                            <span class="material-symbols-outlined text-[17px]">delete</span>
                        </button>
                    </div>`;
        container.appendChild(card);
    });
}

// Desktop-only "More" redesign — real staff directory (top 3 accounts)
function renderStaffDirectoryDesktop() {
    const container = document.getElementById('pd-staff-directory-list');
    if (!container) return;
    const accounts = getAccounts().filter(a => a.role !== 'admin');
    if (accounts.length === 0) {
        container.innerHTML = `<div class="flex flex-col items-center justify-center py-6 gap-1.5 text-slate-400 dark:text-zinc-500">
                    <span class="material-symbols-outlined text-[32px]">group_off</span>
                    <p class="text-[13px] font-semibold">No staff accounts yet.</p>
                </div>`;
        return;
    }
    container.innerHTML = '';
    accounts.slice(0, 3).forEach(acc => {
        const initials = acc.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
        const row = document.createElement('div');
        row.onclick = () => openSubPage('subpage-staff-accounts');
        row.className = 'pd-staff-row flex items-center gap-3 cursor-pointer hover:bg-surface-soft dark:hover:bg-zinc-800/50 -mx-2 px-2 rounded-lg transition-colors';
        row.innerHTML = `
                    <div class="w-10 h-10 rounded-full bg-surface-soft dark:bg-zinc-800 border border-border-muted dark:border-zinc-700 flex items-center justify-center text-on-surface-variant dark:text-zinc-400 shrink-0 font-extrabold text-[13px]">${initials}</div>
                    <div class="min-w-0 flex-1">
                        <p class="text-[13px] font-bold text-on-background dark:text-white truncate">${acc.name}</p>
                        <p class="text-[11px] text-on-surface-variant dark:text-zinc-400 truncate">${acc.email}</p>
                    </div>
                    <div class="text-right shrink-0">
                        <p class="text-[11px] font-bold text-on-background dark:text-white">Staff</p>
                    </div>
                    <span class="material-symbols-outlined text-[18px] text-on-surface-variant dark:text-zinc-500 shrink-0">more_vert</span>`;
        container.appendChild(row);
    });
}

// Desktop-only "More" redesign — staff-only "My Recent Reports" (top 3, newest first)
function renderMyReportsDesktop() {
    const container = document.getElementById('pd-my-reports-list');
    if (!container) return;
    const reports = state.staffReports || [];
    if (reports.length === 0) {
        container.innerHTML = `<div class="flex flex-col items-center justify-center py-6 gap-1.5 text-slate-400 dark:text-zinc-500">
                    <span class="material-symbols-outlined text-[32px]">mark_email_read</span>
                    <p class="text-[13px] font-semibold">No reports submitted yet.</p>
                </div>`;
        return;
    }
    const statusColors = { 'Open': 'bg-slate-100 text-slate-500 dark:bg-zinc-700 dark:text-zinc-300', 'Investigating': 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400', 'Resolved': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' };
    container.innerHTML = '';
    
    const sortedReports = [...reports].sort((a, b) => {
        const sevScore = { 'Critical': 3, 'High': 2, 'Low': 1 };
        const scoreA = sevScore[a.severity] || 0;
        const scoreB = sevScore[b.severity] || 0;
        if (scoreA !== scoreB) return scoreB - scoreA;
        return (b.id || 0) - (a.id || 0);
    });

    sortedReports.slice(0, 3).forEach(r => {
        const statusColor = statusColors[r.status || 'Open'] || statusColors['Open'];
        const row = document.createElement('div');
        row.onclick = () => switchTab('history');
        row.className = 'pd-staff-row flex items-center gap-3 cursor-pointer hover:bg-surface-soft dark:hover:bg-zinc-800/50 -mx-2 px-2 rounded-lg transition-colors';
        row.innerHTML = `
                    <div class="w-10 h-10 rounded-full bg-surface-soft dark:bg-zinc-800 border border-border-muted dark:border-zinc-700 flex items-center justify-center text-on-surface-variant dark:text-zinc-400 shrink-0">
                        <span class="material-symbols-outlined text-[18px]">report_problem</span>
                    </div>
                    <div class="min-w-0 flex-1">
                        <p class="text-[13px] font-bold text-on-background dark:text-white truncate">${r.title}</p>
                        <p class="text-[11px] text-on-surface-variant dark:text-zinc-400 truncate">${r.timestamp}</p>
                    </div>
                    <span class="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full shrink-0 ${statusColor}">${r.status || 'Open'}</span>`;
        container.appendChild(row);
    });
}

function openStaffAccountModal(editEmail) {
    const title = document.getElementById('staff-modal-title');
    const saveLabel = document.getElementById('staff-modal-save-label');
    const saveIcon = document.getElementById('staff-modal-save-icon');
    const editHint = document.getElementById('staff-modal-edit-hint');
    const emailInput = document.getElementById('staff-modal-email');

    document.getElementById('staff-modal-name').value = '';
    document.getElementById('staff-modal-email').value = '';
    document.getElementById('staff-modal-password').value = '';
    document.getElementById('staff-modal-edit-email').value = editEmail || '';
    document.getElementById('staff-modal-email-error').classList.add('hidden');
    document.getElementById('staff-modal-general-error').classList.add('hidden');
    document.getElementById('staff-modal-general-error-text').textContent = 'Please fill in all required fields.';
    document.getElementById('staff-modal-pw-icon').textContent = 'visibility_off';
    document.getElementById('staff-modal-password').type = 'password';

    if (editEmail) {
        const acc = getAccounts().find(a => a.email === editEmail);
        if (!acc) return;
        document.getElementById('staff-modal-name').value = acc.name;
        emailInput.value = acc.email;
        emailInput.readOnly = true;
        emailInput.classList.add('opacity-60');
        title.innerHTML = `<span class="material-symbols-outlined text-[20px]" style="font-variation-settings:'FILL' 1">manage_accounts</span> Edit Staff Account`;
        saveLabel.textContent = 'Save Changes';
        saveIcon.textContent = 'save';
        editHint.classList.remove('hidden');
    } else {
        emailInput.readOnly = false;
        emailInput.classList.remove('opacity-60');
        title.innerHTML = `<span class="material-symbols-outlined text-[20px]" style="font-variation-settings:'FILL' 1">person_add</span> Add Staff Account`;
        saveLabel.textContent = 'Create Staff Account';
        saveIcon.textContent = 'person_add';
        editHint.classList.add('hidden');
    }
    positionModalOverApp('modal-staff-account');
}

function closeStaffAccountModal() {
    document.getElementById('modal-staff-account').style.display = 'none';
}

function toggleStaffModalPw() {
    const input = document.getElementById('staff-modal-password');
    const icon = document.getElementById('staff-modal-pw-icon');
    if (input.type === 'password') { input.type = 'text'; icon.textContent = 'visibility'; }
    else { input.type = 'password'; icon.textContent = 'visibility_off'; }
}

function saveStaffAccount() {
    const editEmail = document.getElementById('staff-modal-edit-email').value;
    const name = document.getElementById('staff-modal-name').value.trim();
    const email = document.getElementById('staff-modal-email').value.trim().toLowerCase();

    document.getElementById('staff-modal-email-error').classList.add('hidden');
    document.getElementById('staff-modal-general-error').classList.add('hidden');

    if (!name || !email) {
        document.getElementById('staff-modal-general-error-text').textContent = 'Please fill in all required fields.';
        document.getElementById('staff-modal-general-error').classList.remove('hidden');
        return;
    }

    if (editEmail) {
        // UPDATE
        const accounts = getAccounts();
        const acc = accounts.find(a => a.email === editEmail);
        if (!acc || !acc.uid) return;

        fbDB.ref('kabutech/users/' + acc.uid).update({ name: name }).then(() => {
            addLog(`Admin updated staff account: ${email}`, 'info');
            showToast(`${name}'s account updated.`, 'success');
            closeStaffAccountModal();
        });
    } else {
        // CREATE (Option A - admin tells staff to register)
        document.getElementById('staff-modal-general-error-text').textContent = 'To create an account, staff must sign up via the Register page.';
        document.getElementById('staff-modal-general-error').classList.remove('hidden');
    }
}

function openStaffDeleteModal(email, name) {
    document.getElementById('staff-delete-email').value = email;
    document.getElementById('staff-delete-name').textContent = name;
    positionModalOverApp('modal-staff-delete');
}

function closeStaffDeleteModal() {
    document.getElementById('modal-staff-delete').style.display = 'none';
}

function confirmDeleteStaff() {
    const email = document.getElementById('staff-delete-email').value;
    const accounts = getAccounts();
    const acc = accounts.find(a => a.email === email);
    if (!acc || !acc.uid) return;

    fbDB.ref('kabutech/users/' + acc.uid).remove().then(() => {
        addLog(`Admin deleted staff profile: ${email}`, 'warning');
        showToast('Staff account removed.', 'success');
        closeStaffDeleteModal();
    });
}

// --- REUSABLE CONFIRM MODAL (replaces all native confirm()) ---
let _confirmCallback = null;

function showConfirm({ title, body, icon = 'warning', iconBg = 'bg-amber-100 dark:bg-amber-950/40', iconColor = 'text-amber-500', okLabel = 'Confirm', okIcon = 'check', okBg = 'bg-amber-500 hover:bg-amber-600', onConfirm }) {
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-body').textContent = body;
    document.getElementById('confirm-icon').textContent = icon;
    document.getElementById('confirm-icon').className = `material-symbols-outlined text-[26px] ${iconColor}`;
    document.getElementById('confirm-icon-wrap').className = `w-12 h-12 rounded-full flex items-center justify-center ${iconBg}`;
    document.getElementById('confirm-ok-label').textContent = okLabel;
    document.getElementById('confirm-ok-icon').textContent = okIcon;
    document.getElementById('confirm-ok-btn').className = `flex-1 py-2.5 rounded-xl font-bold text-[12px] active:scale-95 transition-all flex items-center justify-center gap-1.5 text-white ${okBg}`;
    _confirmCallback = onConfirm;
    positionModalOverApp('modal-confirm');
}

function _confirmOk() {
    _closeConfirmModal();
    if (typeof _confirmCallback === 'function') _confirmCallback();
    _confirmCallback = null;
}

function _confirmCancel() {
    _closeConfirmModal();
    _confirmCallback = null;
}

function _closeConfirmModal() {
    document.getElementById('modal-confirm').style.display = 'none';
}

// ── Bulk Harvest form modal (replaces window.prompt) ────────────────
let _bulkHarvestCtx = null;

function openBulkHarvestModal(ids, rack, skipped) {
    _bulkHarvestCtx = { ids: ids.slice(), rackId: rack.id };
    let countText = ids.length + ' slot' + (ids.length === 1 ? '' : 's') + ' selected — enter the amount to log for each.';
    if (skipped > 0) {
        countText += ' (' + skipped + ' selected slot(s) skipped — no active plant.)';
    }
    document.getElementById('bulk-harvest-count').textContent = countText;
    const input = document.getElementById('bulk-harvest-grams');
    input.value = '';
    document.getElementById('bulk-harvest-error').classList.add('hidden');
    document.getElementById('bulk-harvest-total-row').classList.add('hidden');
    positionModalOverApp('modal-bulk-harvest');
    setTimeout(function () { input.focus(); }, 50);
}

function closeBulkHarvestModal() {
    document.getElementById('modal-bulk-harvest').style.display = 'none';
    _bulkHarvestCtx = null;
}

function _updateBulkHarvestTotal() {
    if (!_bulkHarvestCtx) return;
    const grams = parseFloat(document.getElementById('bulk-harvest-grams').value);
    const totalRow = document.getElementById('bulk-harvest-total-row');
    document.getElementById('bulk-harvest-error').classList.add('hidden');
    if (!isNaN(grams) && grams > 0) {
        document.getElementById('bulk-harvest-total').textContent =
            (grams * _bulkHarvestCtx.ids.length).toLocaleString() + 'g total';
        totalRow.classList.remove('hidden');
        totalRow.classList.add('flex');
    } else {
        totalRow.classList.add('hidden');
        totalRow.classList.remove('flex');
    }
}

function _confirmBulkHarvest() {
    if (!_bulkHarvestCtx) return;
    const grams = parseFloat(document.getElementById('bulk-harvest-grams').value);
    const errEl = document.getElementById('bulk-harvest-error');
    if (isNaN(grams) || grams <= 0) {
        errEl.textContent = 'Please enter a valid harvest amount in grams.';
        errEl.classList.remove('hidden');
        return;
    }
    const { ids, rackId } = _bulkHarvestCtx;
    const rack = state.growBatches.find(r => r.id === rackId);
    if (!rack) { closeBulkHarvestModal(); return; }
    let applied = 0;
    ids.forEach(function (bagId) {
        const bag = rack.bags.find(b => b.id === bagId);
        if (!bag) return;
        bag.harvestLog.push({ date: new Date().toLocaleDateString('en-CA'), grams });
        applied++;
    });
    _rackDetailSelected.clear();
    closeBulkHarvestModal();
    saveBatches(); renderBatches();
    const openRack = state.growBatches.find(r => r.id === rackId);
    if (openRack) renderRackDetailSubpage(openRack);
    addLog('Bulk harvest logged: ' + grams + 'g on ' + applied + ' slot(s) on ' + rack.rack + '.', 'success');
    showToast('Harvest logged for ' + applied + ' slot(s).', 'success');
}

