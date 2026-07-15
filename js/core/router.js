// --- 4. NAVIGATION / ROUTER ---
function switchTab(tabId) {
    // Role-based access control - staff cannot access admin tabs, and vice versa
    const userRole = state.currentUser ? state.currentUser.role : 'admin';
    const staffRestrictedTabs = ['yield']; // admin-only tabs (grow-log now accessible to staff as read-only)
    const adminRestrictedTabs = ['history']; // staff-only tabs

    if (userRole === 'staff' && staffRestrictedTabs.includes(tabId)) {
        showToast('Access denied. Admin privileges required.', 'warning');
        return;
    }
    if (userRole === 'admin' && adminRestrictedTabs.includes(tabId)) {
        showToast('This section is only available to staff accounts.', 'warning');
        return;
    }

    const tabs = ['home', 'controls', 'yield', 'grow-log', 'diagnostics', 'history', 'profile'];
    const currentTabEl = document.getElementById(`tab-${state.currentTab}`);
    const activeTabEl = document.getElementById(`tab-${tabId}`);

    // Don't re-trigger if same tab clicked
    if (state.currentTab === tabId && !activeTabEl.classList.contains('hidden')) return;

    const doSwitch = () => {
        // Hide all tabs
        tabs.forEach(t => {
            document.getElementById(`tab-${t}`).classList.add('hidden');
            document.getElementById(`tab-${t}`).classList.remove('tab-exit-out');
            const navEl = document.getElementById(`nav-${t}`);
            if (!navEl) return;
            navEl.className = "flex flex-col items-center justify-center flex-1 text-on-surface-variant dark:text-zinc-400 py-1 active:scale-95 transition-transform duration-150";

            // Remove FILL attribute from icons
            const icon = navEl.querySelector('.material-symbols-outlined');
            if (icon) icon.style.fontVariationSettings = "'FILL' 0";
        });

        // Show active tab
        activeTabEl.classList.remove('hidden');
        activeTabEl.classList.remove('tab-animate-in');
        // restart animation
        void activeTabEl.offsetWidth;
        activeTabEl.classList.add('tab-animate-in');

        // Diagnostics is now a sub-page of More — highlight the More icon instead
        // grow-log is accessed via the FAB — highlight the FAB label instead
        const navTargetId = (tabId === 'diagnostics') ? 'profile' : tabId;
        if (tabId === 'grow-log') {
            // Highlight the center FAB label for grow-log tab
            const fabLabel = document.getElementById('nav-fab-label');
            if (fabLabel) fabLabel.className = 'text-[10px] font-bold text-primary dark:text-primary-fixed whitespace-nowrap mt-0.5';
        } else {
            // Reset FAB label style when leaving grow-log
            const fabLabel = document.getElementById('nav-fab-label');
            if (fabLabel) fabLabel.className = 'text-[10px] font-semibold text-on-surface-variant dark:text-zinc-400 whitespace-nowrap mt-0.5';
            const navTargetEl = document.getElementById(`nav-${navTargetId}`);
            if (navTargetEl) {
                navTargetEl.className = "flex flex-col items-center justify-center flex-1 text-primary dark:text-primary-fixed py-1 relative active:scale-95 transition-transform duration-150";
                const activeIcon = navTargetEl.querySelector('.material-symbols-outlined');
                if (activeIcon) activeIcon.style.fontVariationSettings = "'FILL' 1";
            }
        }

        state.currentTab = tabId;

        // Desktop Sidebar Sync
        const desktopSidebarTabs = ['home', 'controls', 'yield', 'grow-log', 'diagnostics'];
        desktopSidebarTabs.forEach(t => {
            const sid = `sidebar-tab-${t}`;
            const el = document.getElementById(sid);
            if (!el) return;
            const icon = el.querySelector('.material-symbols-outlined');
            const text = el.querySelector('span:not(.material-symbols-outlined)');
            
            const navTarget = (tabId === 'profile') ? 'diagnostics' : tabId;
            if (t === navTarget) {
                // Active
                el.classList.add('bg-[#adf2bc]/10');
                if(icon) { icon.classList.add('text-primary', 'dark:text-primary-fixed'); icon.classList.remove('text-on-surface-variant'); icon.style.fontVariationSettings = "'FILL' 1"; }
                if(text) { text.classList.add('text-primary', 'dark:text-primary-fixed'); text.classList.remove('text-on-surface-variant'); }
            } else {
                // Inactive
                el.classList.remove('bg-[#adf2bc]/10');
                if(icon) { icon.classList.remove('text-primary', 'dark:text-primary-fixed'); icon.classList.add('text-on-surface-variant'); icon.style.fontVariationSettings = "'FILL' 0"; }
                if(text) { text.classList.remove('text-primary', 'dark:text-primary-fixed'); text.classList.add('text-on-surface-variant'); }
            }
        });

        // Scroll content area back to top on tab change
        const scrollArea = document.getElementById('app-scroll-area');
        if (scrollArea) scrollArea.scrollTo({ top: 0, behavior: 'instant' });

        // Refresh staff accounts list when More/Profile tab is opened
        if (tabId === 'profile') renderStaffAccountsList();
        // Refresh shift summary stats (e.g. open report count) when Home tab is opened
        if (tabId === 'home' || tabId === 'grow-log') updateShiftSummary();
        // Refresh report history when History tab is opened
        if (tabId === 'history') renderStaffReports();

        // Re-trigger stagger animations on dynamically-rendered lists
        triggerTabContentAnimations(tabId);
    };

    // Brief exit animation on the currently visible tab before swapping
    if (currentTabEl && !currentTabEl.classList.contains('hidden')) {
        currentTabEl.classList.add('tab-exit-out');
        setTimeout(doSwitch, 250);
    } else {
        doSwitch();
    }
}

// Apply staggered entrance animation to dynamically-rendered list items per tab
function triggerTabContentAnimations(tabId) {
    let containerIds = [];
    if (tabId === 'grow-log') containerIds = ['active-batches-list'];
    else if (tabId === 'diagnostics') containerIds = ['alerts-list-container'];
    else if (tabId === 'profile') containerIds = ['more-staff-reports-container', 'staff-accounts-list'];
    else if (tabId === 'history') containerIds = ['history-reports-container'];

    containerIds.forEach(id => {
        const container = document.getElementById(id);
        if (!container) return;
        Array.from(container.children).forEach((child, i) => {
            child.classList.remove('item-animate-in');
            void child.offsetWidth;
            child.style.animationDelay = `${Math.min(i * 0.06, 0.4)}s`;
            child.classList.add('item-animate-in');
        });
    });

    // Yield tab: animate progress bars, confidence ring, and chart bars
    if (tabId === 'yield') {
        animateYieldTabEntrance();
    }

    // Home/Dashboard tab: replay the sensor count-up-from-0 animation
    if (tabId === 'home') {
        const firstEntry = !dashboardEnteredOnce;
        playSensorIntroAnimation();
        updateFarmHealthScore(firstEntry);
    }
}

// Set Theme
// --- Sub-page slide-in navigation ---
let _activeSubPage = null;

// ── Rack Detail Subpage ─────────────────────────────────────────────
let _rackDetailFilter = 'all';
// Desktop-only bulk selection state
let _rackDetailSelected = new Set();
let _rackDetailCurrentRackId = null;

// ────────────────────────────────────────────────────────────────────

function openSubPage(id) {
    // Close any currently open sub-page first (instant, no animation)
    if (_activeSubPage && _activeSubPage !== id) {
        const prev = document.getElementById(_activeSubPage);
        if (prev) { prev.classList.remove('subpage-open', 'subpage-closing'); }
    }
    _activeSubPage = id;
    const panel = document.getElementById(id);
    if (!panel) return;
    // Trigger refresh hooks
    if (id === 'subpage-alerts') triggerTabContentAnimations('alerts-subpage');
    if (id === 'subpage-staff-accounts') renderStaffAccountsList();
    if (id === 'subpage-staff-reports') triggerTabContentAnimations('profile');
    if (id === 'subpage-tasks') { renderTasks(); triggerTabContentAnimations('tasks-subpage'); }
    // NOTE: subpage-logs no longer auto-renders — user taps "Load Logs" button
    if (id === 'subpage-logs') resetLogsPanel();

    // Slide in
    panel.classList.remove('subpage-closing');
    requestAnimationFrame(() => {
        panel.classList.add('subpage-open');
    });
}

function closeSubPage(id) {
    const panel = document.getElementById(id);
    if (!panel) return;
    panel.classList.add('subpage-closing');
    panel.classList.remove('subpage-open');
    setTimeout(() => {
        panel.classList.remove('subpage-closing');
        _activeSubPage = null;
    }, 340);
}

// Close any open sub-page when switching main tabs
const _origSwitchTab = switchTab;
// Patch switchTab to also close sub-pages
(function () {
    const _st = window.switchTab;
    if (!_st) return;
    window.switchTab = function (tabId) {
        // Close all sub-pages on tab switch
        ['subpage-alerts', 'subpage-staff-reports', 'subpage-staff-accounts', 'subpage-tasks', 'subpage-logs', 'subpage-rack-detail', 'subpage-live-view', 'subpage-schedule-config'].forEach(id => {
            const p = document.getElementById(id);
            if (p) { p.classList.remove('subpage-open', 'subpage-closing'); }
        });
        _activeSubPage = null;
        _st(tabId);
    };
})();
