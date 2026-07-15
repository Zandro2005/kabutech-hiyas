// --- 6. TOAST MESSAGES ---
let toastQueue = [];
let toastActive = false;

function showToast(msg, type = 'success') {
    // Queue the toast instead of showing it immediately, so that
    // flooding (rapid repeated actions) doesn't stack many toasts
    // at once — they play one at a time.
    toastQueue.push({ msg, type });
    processToastQueue();
}

function processToastQueue() {
    if (toastActive || toastQueue.length === 0) return;
    toastActive = true;

    const { msg, type } = toastQueue.shift();
    const container = document.getElementById('toast-container');

    // Position toasts at the very top on login/register (and during the
    // login-success greeting, before the app header is shown). Once the
    // main app scene with its top header is visible, drop toasts below it.
    const appScene = document.getElementById('scene-app');
    const appVisible = appScene && !appScene.classList.contains('hidden');
    container.style.top = appVisible ? 'calc(3.5rem + 0.5rem)' : '2rem';

    const toast = document.createElement('div');

    let bgClass = "bg-primary dark:bg-emerald-950 text-white";
    let icon = "check_circle";

    if (type === 'error') {
        bgClass = "bg-error text-white dark:bg-red-950/90";
        icon = "error";
    } else if (type === 'warning') {
        bgClass = "bg-warning-gold text-slate-900";
        icon = "warning";
    } else if (type === 'info') {
        bgClass = "bg-slate-800 text-white dark:bg-zinc-800";
        icon = "info";
    }

    toast.className = `toast-item pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl cursor-pointer ${bgClass}`;
    toast.innerHTML = `
                <span class="material-symbols-outlined text-[18px] shrink-0">${icon}</span>
                <span class="text-caption font-bold">${msg}</span>
            `;

    container.appendChild(toast);

    // Tap-to-dismiss
    const dismiss = () => {
        toast.classList.add('toast-dismiss');
        setTimeout(() => {
            toast.remove();
            toastActive = false;
            processToastQueue();
        }, 150);
    };
    toast.addEventListener('click', dismiss);

    // Swipe-to-dismiss (touch)
    let startX = 0;
    toast.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
    toast.addEventListener('touchmove', (e) => {
        const dx = e.touches[0].clientX - startX;
        if (dx > 0) toast.style.transform = `translateX(${dx}px)`;
    }, { passive: true });
    toast.addEventListener('touchend', (e) => {
        const dx = e.changedTouches[0].clientX - startX;
        if (dx > 60) {
            dismiss();
        } else {
            toast.style.transform = '';
        }
    });

    // Auto-dismiss — shorter if more toasts are queued
    const displayTime = toastQueue.length > 0 ? 900 : 2500;
    setTimeout(dismiss, displayTime);
}

