function setAuthFieldError(id, hasError) {
    const el = document.getElementById(id);
    if (!el) return;
    const errorClasses = ['border-red-500', 'dark:border-red-500', 'ring-2', 'ring-red-100', 'dark:ring-red-900/40'];
    if (hasError) {
        el.classList.add(...errorClasses);
    } else {
        el.classList.remove(...errorClasses);
    }
}

function clearLoginFieldError(el) {
    setAuthFieldError(el.id, false);
    const errEl = document.getElementById(el.id + '-error');
    if (errEl) errEl.classList.add('hidden');
}
