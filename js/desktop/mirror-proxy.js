// Main Application Logic
// Mirror Proxy for Syncing Desktop & Mobile DOM Elements
(function () {
    const originalGetElementById = document.getElementById;

    // Map of IDs that are mirrored in the home mobile layout
    const mirroredIds = new Set([
        'greeting-text',
        'system-status-msg',
        'sensor-temp',
        'sensor-temp-status',
        'temp-trend',
        'sensor-humidity',
        'sensor-humidity-status',
        'humidity-trend',
        'sensor-light',
        'sensor-light-status',
        'light-trend',
        'sensor-co2',
        'sensor-co2-status',
        'co2-trend',
        'last-updated-ts',
        'env-overview-card',
        'env-dot-temp',
        'env-val-temp',
        'env-dot-humidity',
        'env-val-humidity',
        'env-dot-light',
        'env-val-light',
        'env-dot-co2',
        'env-val-co2',
        'farm-activity-feed-card',
        'home-activity-feed',
        'btn-quick-fans',
        'icon-container-quick-fans',
        'icon-quick-fans',
        'status-quick-fans',
        'uptime-quick-fans',
        'btn-quick-misters',
        'icon-container-quick-misters',
        'icon-quick-misters',
        'status-quick-misters',
        'uptime-quick-misters',
        'btn-quick-lights',
        'icon-container-quick-lights',
        'icon-quick-lights',
        'status-quick-lights',
        'uptime-quick-lights',
        'dynamic-simulation-label',
        'sim-fans-dot',
        'sim-misters-dot',
        'sim-lights-dot',
        'shift-summary-card',
        'shift-devices-active',
        'shift-reports-today',
        'shift-open-reports',
        'live-farm-dashboard-card',
        'home-mode-badge',
        'sensor-temp-card',
        'sensor-humidity-card',
        'sensor-light-card',
        'sensor-co2-card'
    ]);

    function translateMobileClassName(id, originalClassName) {
        // Sensor Cards
        if (id.endsWith('-card')) {
            let className = originalClassName
                .replace('p-4', 'p-3.5')
                .replace('p-5', 'p-4')
                .replace('rounded-3xl', 'rounded-2xl');

            return className;
        }

        // Sensor Icons
        if (id.includes('-icon-bg')) {
            if (!originalClassName.includes('text-red') && !originalClassName.includes('text-yellow')) {
                return 'bg-surface-soft dark:bg-zinc-800 p-2 rounded-lg text-primary dark:text-primary-fixed';
            } else {
                return originalClassName
                    .replace('w-9 h-9 rounded-xl flex items-center justify-center', 'p-2 rounded-lg');
            }
        }

        // Sensor Status
        if (id.includes('-status')) {
            if (originalClassName.includes('text-[#15803d]')) {
                return originalClassName.replace('text-[#15803d]', 'text-success-green');
            }
        }

        // Quick Controls Buttons
        if (id.startsWith('btn-quick-')) {
            if (originalClassName.includes('border-[#7ef4a2]') || originalClassName.includes('bg-[#7ef4a2]')) {
                return 'flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border bg-success-green/10 dark:bg-emerald-950/40 border-success-green dark:border-emerald-500 hover:bg-slate-50 dark:hover:bg-zinc-900 transition-all select-none';
            } else {
                // Inactive
                return 'flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border border-success-green/25 dark:border-emerald-800/50 hover:bg-slate-50 dark:hover:bg-zinc-900 transition-all select-none';
            }
        }

        // Quick Controls Icon Containers
        if (id.startsWith('icon-container-quick-')) {
            if (originalClassName.includes('bg-[#7ef4a2]')) {
                return 'w-10 h-10 rounded-full bg-success-green text-white dark:bg-emerald-500 dark:text-zinc-950 flex items-center justify-center';
            } else {
                // Inactive
                return 'w-10 h-10 rounded-full bg-surface-soft dark:bg-zinc-800 flex items-center justify-center text-on-surface-variant dark:text-zinc-300';
            }
        }

        // Quick Controls Status Texts
        if (id.startsWith('status-quick-')) {
            if (originalClassName.includes('text-[#15803d]')) {
                return 'text-[10px] text-success-green dark:text-emerald-400 font-bold uppercase tracking-wide';
            } else {
                return 'text-[10px] text-on-surface-variant dark:text-zinc-400 uppercase tracking-wide';
            }
        }

        return originalClassName;
    }

    function makeProxy(desktopEl, mobileEl, id) {
        return new Proxy(desktopEl, {
            get(target, prop, receiver) {
                if (prop === 'classList') {
                    const desktopList = target.classList;
                    const mobileList = mobileEl.classList;
                    return new Proxy(desktopList, {
                        get(listTarget, listProp) {
                            const value = listTarget[listProp];
                            if (typeof value === 'function') {
                                return function (...args) {
                                    const res = value.apply(listTarget, args);
                                    if (typeof mobileList[listProp] === 'function') {
                                        mobileList[listProp].apply(mobileList, args);
                                    }
                                    return res;
                                };
                            }
                            return value;
                        }
                    });
                }

                if (prop === 'style') {
                    return new Proxy(target.style, {
                        get(styleTarget, styleProp) {
                            return styleTarget[styleProp];
                        },
                        set(styleTarget, styleProp, value) {
                            styleTarget[styleProp] = value;
                            mobileEl.style[styleProp] = value;
                            return true;
                        }
                    });
                }

                const val = target[prop];
                if (typeof val === 'function') {
                    return function (...args) {
                        const res = val.apply(target, args);
                        if (prop === 'addEventListener') {
                            mobileEl.addEventListener.apply(mobileEl, args);
                        } else if (typeof mobileEl[prop] === 'function') {
                            mobileEl[prop].apply(mobileEl, args);
                        }
                        return res;
                    };
                }
                return val;
            },

            set(target, prop, value, receiver) {
                if (prop === 'className') {
                    target.className = value;
                    mobileEl.className = translateMobileClassName(id, value);
                    return true;
                }

                target[prop] = value;
                try {
                    mobileEl[prop] = value;
                } catch (e) { }
                return true;
            }
        });
    }

    document.getElementById = function (id) {
        const desktopEl = originalGetElementById.call(document, id);
        if (!desktopEl) return null;

        if (mirroredIds.has(id)) {
            const mobileEl = originalGetElementById.call(document, id + '-mobile');
            if (mobileEl) {
                return makeProxy(desktopEl, mobileEl, id);
            }
        }

        return desktopEl;
    };
})();

