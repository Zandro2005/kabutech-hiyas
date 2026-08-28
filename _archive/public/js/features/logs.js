// --- 13. AUDIT LOGS DISPLAY ---
function renderLogs() {
    const container = document.getElementById('logs-container');
    container.innerHTML = '';

    state.eventLogs.forEach(log => {
        let color = "text-slate-600 dark:text-zinc-400";
        if (log.type === 'success') color = "text-emerald-600 dark:text-emerald-400 font-semibold";
        if (log.type === 'error') color = "text-error-red dark:text-red-400 font-semibold";
        if (log.type === 'warning') color = "text-amber-600 dark:text-amber-400";

        const row = document.createElement('div');
        row.className = `py-0.5 border-b border-slate-50 dark:border-zinc-900 last:border-none ${color}`;
        row.innerHTML = `[${log.timestamp}] ${log.msg}`;
        container.appendChild(row);
    });
}

function filterLogs() {
    const val = document.getElementById('log-search-input').value.toLowerCase();
    const rows = document.getElementById('logs-container').children;

    for (let i = 0; i < rows.length; i++) {
        const text = rows[i].innerText.toLowerCase();
        if (text.includes(val)) {
            rows[i].classList.remove('hidden');
        } else {
            rows[i].classList.add('hidden');
        }
    }
}

// Called by the search input — auto-loads logs if not yet loaded, then filters
function onLogSearch() {
    const container = document.getElementById('logs-container');
    if (container && container.classList.contains('hidden')) {
        loadSystemLogs();
    } else {
        filterLogs();
    }
}

// Show the empty "not loaded" state when the logs panel is first opened
function resetLogsPanel() {
    const emptyState = document.getElementById('logs-empty-state');
    const container = document.getElementById('logs-container');
    const reloadBar = document.getElementById('logs-reload-bar');
    const hideBtn = document.getElementById('btn-hide-logs');
    const searchInput = document.getElementById('log-search-input');
    if (emptyState) emptyState.classList.remove('hidden');
    if (container) { container.classList.add('hidden'); container.innerHTML = ''; }
    if (reloadBar) reloadBar.classList.add('hidden');
    if (hideBtn) hideBtn.classList.add('hidden');
    if (searchInput) searchInput.value = '';
}

// Called when user taps "Load Logs" or "Refresh"
function loadSystemLogs() {
    const emptyState = document.getElementById('logs-empty-state');
    const container = document.getElementById('logs-container');
    const reloadBar = document.getElementById('logs-reload-bar');
    const hideBtn = document.getElementById('btn-hide-logs');
    if (emptyState) emptyState.classList.add('hidden');
    if (container) container.classList.remove('hidden');
    if (reloadBar) reloadBar.classList.remove('hidden');
    if (hideBtn) hideBtn.classList.remove('hidden');
    renderLogs();
}

// Called when user taps "Hide" in the header
function hideSystemLogs() {
    const emptyState = document.getElementById('logs-empty-state');
    const container = document.getElementById('logs-container');
    const reloadBar = document.getElementById('logs-reload-bar');
    const hideBtn = document.getElementById('btn-hide-logs');
    const searchInput = document.getElementById('log-search-input');
    if (emptyState) emptyState.classList.remove('hidden');
    if (container) { container.classList.add('hidden'); container.innerHTML = ''; }
    if (reloadBar) reloadBar.classList.add('hidden');
    if (hideBtn) hideBtn.classList.add('hidden');
    if (searchInput) searchInput.value = '';
}

