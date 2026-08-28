function setTheme(theme) {
    const html = document.documentElement;
    const isDark = html.classList.contains('dark');
    if (theme === 'dark' && !isDark) {
        toggleDarkMode(false);
    } else if (theme === 'light' && isDark) {
        toggleDarkMode(false);
    }
}


// Dark Mode Toggle
let isTogglingTheme = false;

function toggleDarkMode(animate = true) {
    if (isTogglingTheme) return;
    
    // Fallback if browser doesn't support View Transitions or animation is disabled
    if (!animate || !document.startViewTransition) {
        performThemeSwap();
        return;
    }
    
    isTogglingTheme = true;
    document.documentElement.classList.add('theme-transitioning');
    
    // Create an invisible dummy element to generate the vt-wiper transition group
    const wiperBlade = document.createElement('div');
    wiperBlade.style.cssText = 'position: fixed; inset: 0; pointer-events: none; view-transition-name: vt-wiper; z-index: -1; background: transparent;';
    document.body.appendChild(wiperBlade);
    
    const transition = document.startViewTransition(() => {
        performThemeSwap();
    });
    
    transition.finished.finally(() => {
        isTogglingTheme = false;
        document.documentElement.classList.remove('theme-transitioning');
        if (wiperBlade.parentNode) wiperBlade.remove();
    });
}

function performThemeSwap() {
    const html = document.documentElement;
    const isDark = html.classList.contains('dark');

    // Swap theme class instantly
    if (isDark) {
        html.classList.remove('dark');
        state.theme = 'light';
        addLog('Switched interface to Light Mode.', 'info');
    } else {
        html.classList.add('dark');
        state.theme = 'dark';
        addLog('Switched interface to Dark Mode.', 'info');
    }

    // Persist to Firebase for this specific user
    if (state.currentUser && window.fbDB) {
        state.currentUser.theme = state.theme;
        window.fbDB.ref('kabutech/users/' + state.currentUser.uid).update({ theme: state.theme });
    }

    // Update the toggle icons
    const icon = document.getElementById('theme-toggle-icon');
    if (icon) icon.innerText = isDark ? 'dark_mode' : 'light_mode';
    
    const sbIcon = document.getElementById('sidebar-theme-toggle-icon');
    if (sbIcon) sbIcon.innerText = isDark ? 'dark_mode' : 'light_mode';

    // Re-paint slider fills with updated colors
    ['slider-temp', 'slider-humidity', 'slider-light', 'slider-co2'].forEach(id => {
        const el = document.getElementById(id);
        if (el) updateSliderFill(el);
    });
}

