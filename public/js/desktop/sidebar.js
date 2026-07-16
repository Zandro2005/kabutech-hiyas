
// Desktop Sidebar Sync
(function () {
    function patchApp() {
        if (typeof window.switchTab !== 'function' || typeof window.applyRoleNavRestrictions !== 'function') {
            setTimeout(patchApp, 50);
            return;
        }

        // 1. Patch switchTab to highlight active sidebar button
        const origSwitchTab = window.switchTab;
        window.switchTab = function (tabId) {
            origSwitchTab(tabId);

            // Reset all sidebar buttons
            const sbButtons = ['home', 'controls', 'yield', 'history', 'profile'];
            sbButtons.forEach(btnId => {
                const btn = document.getElementById(`sb-nav-${btnId}`);
                if (btn) {
                    btn.classList.remove('sb-active');
                    const icon = btn.querySelector('.material-symbols-outlined');
                    if (icon) icon.style.fontVariationSettings = "'FILL' 0";
                }
            });

            // Set active sidebar button (grow-log has its own dedicated
            // highlight on the Add Crop button below, so it should NOT
            // also light up "More" — only diagnostics belongs there)
            const targetId = (tabId === 'diagnostics') ? 'profile' : tabId;
            const activeBtn = document.getElementById(`sb-nav-${targetId}`);
            if (activeBtn && targetId !== 'grow-log') {
                activeBtn.classList.add('sb-active');
                const icon = activeBtn.querySelector('.material-symbols-outlined');
                if (icon) icon.style.fontVariationSettings = "'FILL' 1";
            }

            // Special highlight behavior for center FAB on desktop
            const sbFab = document.getElementById('sb-nav-fab');
            if (sbFab) {
                if (tabId === 'grow-log') {
                    sbFab.classList.add('bg-primary', 'text-on-primary');
                    sbFab.classList.remove('bg-[#adf2bc]', 'text-[#072211]');
                } else {
                    sbFab.classList.remove('bg-primary', 'text-on-primary');
                    sbFab.classList.add('bg-[#adf2bc]', 'text-[#072211]');
                }
            }
        };

        // 2. Patch applyRoleNavRestrictions to sync sidebar role visibility
        const origApplyRoleNavRestrictions = window.applyRoleNavRestrictions;
        window.applyRoleNavRestrictions = function (role) {
            origApplyRoleNavRestrictions(role);

            const sbYield = document.getElementById('sb-nav-yield');
            const sbHistory = document.getElementById('sb-nav-history');

            if (role === 'staff') {
                if (sbYield) sbYield.style.display = 'none';
                if (sbHistory) sbHistory.style.display = 'flex';
                // Staff avatar info
                const avatar = document.getElementById('sidebar-user-avatar');
                const name = document.getElementById('sidebar-user-name');
                const roleEl = document.getElementById('sidebar-user-role');
                if (avatar) avatar.innerText = 'S';
                if (name && window.state && window.state.currentUser) name.innerText = window.state.currentUser.name || 'Staff';
                if (roleEl) roleEl.innerText = 'Staff Member';
            } else {
                if (sbYield) sbYield.style.display = 'flex';
                if (sbHistory) sbHistory.style.display = 'none';
                // Admin avatar info
                const avatar = document.getElementById('sidebar-user-avatar');
                const name = document.getElementById('sidebar-user-name');
                const roleEl = document.getElementById('sidebar-user-role');
                if (avatar) avatar.innerText = 'A';
                if (name) name.innerText = 'Admin';
                if (roleEl) roleEl.innerText = 'Administrator';
            }
        };

        // 3. Patch setNavFabMode to sync sidebar FAB labels/icons
        const origSetNavFabMode = window.setNavFabMode;
        if (typeof origSetNavFabMode === 'function') {
            window.setNavFabMode = function (mode) {
                origSetNavFabMode(mode);
                const sbFabLabel = document.getElementById('sb-nav-fab-label');
                const sbFabIcon = document.getElementById('sb-nav-fab-icon');
                if (mode === 'add-crop') {
                    if (sbFabLabel) sbFabLabel.innerText = 'Add Crop';
                    if (sbFabIcon) sbFabIcon.innerText = 'add';
                } else if (mode === 'manage-crop-staff') {
                    if (sbFabLabel) sbFabLabel.innerText = 'View Crops';
                    if (sbFabIcon) sbFabIcon.innerText = 'agriculture';
                } else {
                    if (sbFabLabel) sbFabLabel.innerText = 'Manage Crop';
                    if (sbFabIcon) sbFabIcon.innerText = 'agriculture';
                }
            };
        }

        // 4. MutationObserver to sync Mode Pill state live
        const modePillText = document.getElementById('header-mode-text');
        if (modePillText) {
            const observer = new MutationObserver(function () {
                const sbModeText = document.getElementById('sidebar-mode-text');
                const sbModeIcon = document.getElementById('sidebar-mode-icon');
                const sbModePill = document.getElementById('sidebar-mode-pill');

                if (sbModeText) sbModeText.innerText = modePillText.innerText;

                if (modePillText.innerText === 'MANUAL') {
                    if (sbModeIcon) sbModeIcon.innerText = 'tune';
                    if (sbModePill) {
                        sbModePill.className = 'flex items-center gap-2 px-3.5 py-2.5 rounded-2xl border cursor-pointer active:scale-95 transition-all duration-300 bg-warning-gold/20 border-warning-gold/60 text-warning-gold';
                    }
                } else {
                    const isScheduled = window.scheduleConfig && window.scheduleConfig.masterEnabled;
                    if (sbModeIcon) sbModeIcon.innerText = isScheduled ? 'schedule' : 'smart_toy';
                    if (sbModePill) {
                        sbModePill.className = 'flex items-center gap-2 px-3.5 py-2.5 rounded-2xl border cursor-pointer active:scale-95 transition-all duration-300 bg-success-green/10 border-success-green/30 text-success-green dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-400';
                    }
                }
            });
            observer.observe(modePillText, { childList: true, characterData: true, subtree: true });
        }

        // 5. MutationObserver to sync Theme icon
        const themeIcon = document.getElementById('theme-toggle-icon');
        if (themeIcon) {
            const observer = new MutationObserver(function () {
                const sbThemeIcon = document.getElementById('sidebar-theme-toggle-icon');
                if (sbThemeIcon) sbThemeIcon.innerText = themeIcon.innerText;
            });
            observer.observe(themeIcon, { childList: true, characterData: true, subtree: true });
        }

        // 6. MutationObserver to sync user info (name, avatar)
        const headerName = document.getElementById('header-user-name');
        if (headerName) {
            const observer = new MutationObserver(function () {
                const sbName = document.getElementById('sidebar-user-name');
                if (sbName) sbName.innerText = headerName.innerText;

                const sbAvatar = document.getElementById('sidebar-user-avatar');
                const headerAvatar = document.getElementById('header-user-avatar');
                if (sbAvatar && headerAvatar) sbAvatar.innerText = headerAvatar.innerText;
            });
            observer.observe(headerName, { childList: true, characterData: true, subtree: true });
        }

        // Initial synchronization
        if (window.state && window.state.currentTab) {
            window.switchTab(window.state.currentTab);
        }
        if (window.state && window.state.currentUser) {
            window.applyRoleNavRestrictions(window.state.currentUser.role);
        }
    }

    // Start patching once page is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', patchApp);
    } else {
        patchApp();
    }
})();
