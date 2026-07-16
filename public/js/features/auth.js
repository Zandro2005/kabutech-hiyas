// --- 5. AUTHENTICATION LOGIC ---
let selectedLoginRole = 'admin';

function selectLoginRole(role) {
    selectedLoginRole = role;
    const pill = document.getElementById('login-toggle-pill');
    const btnAdmin = document.getElementById('btn-login-admin');
    const btnStaff = document.getElementById('btn-login-staff');
    const emailInput = document.getElementById('login-email');
    const passInput = document.getElementById('login-password');

    if (role === 'admin') {
        pill.style.transform = 'translateX(0)';
        btnAdmin.className = 'flex-1 py-2 relative z-10 text-body-md font-bold text-primary dark:text-white transition-colors duration-300';
        btnStaff.className = 'flex-1 py-2 relative z-10 text-body-sm text-on-surface-variant dark:text-zinc-400 transition-colors duration-300 hover:text-primary';
        emailInput.value = 'admin@kabutech.com';
        passInput.value = 'admin123';
    } else {
        pill.style.transform = 'translateX(100%)';
        btnStaff.className = 'flex-1 py-2 relative z-10 text-body-md font-bold text-primary dark:text-white transition-colors duration-300';
        btnAdmin.className = 'flex-1 py-2 relative z-10 text-body-sm text-on-surface-variant dark:text-zinc-400 transition-colors duration-300 hover:text-primary';
        emailInput.value = 'staff@kabutech.com';
        passInput.value = 'staff123';
    }
}

function togglePasswordVisibility() {
    const input = document.getElementById('login-password');
    const icon = document.getElementById('login-password-toggle-icon');
    if (input.type === 'password') {
        input.type = 'text';
        icon.textContent = 'visibility';
    } else {
        input.type = 'password';
        icon.textContent = 'visibility_off';
    }
}

function showForgotPasswordToast() {
    // RATE LIMITING: Max 3 attempts, lockout for 1 hour
    const lockoutUntil = parseInt(localStorage.getItem('kb_reset_lockout_until') || '0', 10);
    if (Date.now() < lockoutUntil) {
        const remainingMinutes = Math.ceil((lockoutUntil - Date.now()) / 60000);
        showToast(`Too many password reset requests. Please try again in ${remainingMinutes} minute(s).`, 'error');
        return;
    }

    const emailInput = document.getElementById('login-email').value.trim();
    if (!emailInput) {
        showToast('Please enter your email address first.', 'warning');
        return;
    }
    
    // Increment attempts
    let attempts = parseInt(localStorage.getItem('kb_reset_attempts') || '0', 10);
    attempts++;
    if (attempts >= 3) {
        localStorage.setItem('kb_reset_lockout_until', Date.now() + 60 * 60 * 1000); // 1 hour
        localStorage.setItem('kb_reset_attempts', '0');
    } else {
        localStorage.setItem('kb_reset_attempts', attempts.toString());
    }
    
    if (typeof fbAuth !== 'undefined') {
        const actionCodeSettings = {
            url: 'https://kabutech-hiyas.web.app/reset-password.html',
            handleCodeInApp: true
        };
        
        fbAuth.sendPasswordResetEmail(emailInput, actionCodeSettings)
            .then(() => {
                showToast('Reset password link sent to ' + emailInput, 'success');
            })
            .catch((error) => {
                let msg = 'Error sending reset email.';
                if (error.code === 'auth/user-not-found') msg = 'No account found with this email.';
                else if (error.code === 'auth/invalid-email') msg = 'Please enter a valid email address.';
                showToast(msg, 'error');
            });
    } else {
        showToast('Database connection not found.', 'error');
    }
}

// --- ONBOARDING SCENE (full-screen swipe carousel) ---
const ONBOARDING_SLIDE_COUNT = 3;
let onboardingIndex = 0;
let onboardingDragStartX = null;
let onboardingDragDeltaX = 0;
let onboardingDragging = false;
let onboardingLocked = false; // prevents double-taps from skipping a slide

// Reveals the onboarding scene with a smooth fade-in (used after the loading screen,
// first-time visitors only)
function revealOnboardingWithFade() {
    const ob = document.getElementById('scene-onboarding');
    onboardingIndex = 0;
    onboardingLocked = false;
    updateOnboardingTrack(false);
    setOnboardingImage();
    ob.style.transition = 'none';
    ob.classList.add('opacity-0');
    ob.classList.remove('hidden', 'ob-fade-out');
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            ob.style.transition = 'opacity 0.5s ease';
            ob.classList.remove('opacity-0');
        });
    });
    initOnboardingSwipe();
    initOnboardingDots();
}

// Slide 3's photo is set here (rather than hardcoded in the src attribute) so it's
// easy to swap the image source in one place.
function setOnboardingImage() {
    const img = document.getElementById('onboarding-image');
    if (img && !img.src) {
        img.src = './assets/onboarding.jpg';
    }
}

function updateOnboardingTrack(animate = true) {
    const track = document.getElementById('onboarding-track');
    track.style.transition = animate ? '' : 'none';
    track.style.transform = `translateX(-${onboardingIndex * (100 / ONBOARDING_SLIDE_COUNT)}%)`;
    if (!animate) {
        void track.offsetHeight; // force reflow so the next change transitions cleanly
        track.style.transition = '';
    }

    // Re-trigger the active slide's content entrance animation, and sync every
    // slide's own dot row (each slide carries its own 3 dots).
    document.querySelectorAll('.ob-slide').forEach((slide, i) => {
        slide.classList.toggle('ob-active', i === onboardingIndex);
        if (i === onboardingIndex) {
            slide.classList.remove('ob-active');
            void slide.offsetWidth;
            slide.classList.add('ob-active');
        }
        slide.querySelectorAll('.ob-dot').forEach((dot, dotIdx) => {
            dot.classList.toggle('active', dotIdx === onboardingIndex);
        });
    });
}

// Single source of truth for moving exactly one slide at a time. Locks input for
// the duration of the CSS transition (450ms) so a fast double-tap on "Continue"
// can never advance two slides at once or jump straight past slide 3 to login.
function onboardingGoTo(index, animate = true) {
    if (onboardingLocked) return;
    const next = Math.max(0, Math.min(ONBOARDING_SLIDE_COUNT - 1, index));
    if (next === onboardingIndex) return;
    onboardingIndex = next;
    if (animate) {
        onboardingLocked = true;
        setTimeout(() => { onboardingLocked = false; }, 500);
    }
    updateOnboardingTrack(animate);
}

function onboardingNext() {
    if (onboardingLocked) return;
    if (onboardingIndex < ONBOARDING_SLIDE_COUNT - 1) {
        onboardingGoTo(onboardingIndex + 1);
    } else {
        finishOnboarding();
    }
}

function skipOnboarding() {
    finishOnboarding();
}

function finishOnboarding() {
    if (onboardingLocked) return;
    onboardingLocked = true;
    try { localStorage.setItem('kb_onboarded', '1'); } catch (e) { }
    const ob = document.getElementById('scene-onboarding');
    const login = document.getElementById('scene-login');

    login.style.transition = 'none';
    login.classList.remove('slide-out-left', 'slide-out-right', 'slide-in');
    login.classList.add('opacity-0');
    login.classList.remove('hidden');

    void login.offsetHeight; // Force reflow

    ob.style.transition = 'opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1), transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
    login.style.transition = 'opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1)';

    ob.style.opacity = '0';
    ob.style.transform = 'scale(0.96)';
    login.classList.remove('opacity-0');

    setTimeout(() => {
        ob.classList.add('hidden');
        ob.style.opacity = '';
        ob.style.transform = '';
        ob.style.transition = '';
        onboardingLocked = false;
    }, 600);
}

// Tap any slide's dots to jump directly to that slide
function initOnboardingDots() {
    document.querySelectorAll('.ob-dot').forEach((dot, i) => {
        if (dot.dataset.bound) return;
        dot.dataset.bound = '1';
        const idx = i % ONBOARDING_SLIDE_COUNT;
        dot.style.cursor = 'pointer';
        dot.addEventListener('click', () => onboardingGoTo(idx));
    });
}

// Swipe / drag support (touch + mouse) for the full-screen onboarding carousel
function initOnboardingSwipe() {
    const track = document.getElementById('onboarding-track');
    if (track.dataset.swipeInit) return;
    track.dataset.swipeInit = '1';

    const getX = (e) => (e.touches ? e.touches[0].clientX : e.clientX);
    let onboardingDragStartY = null;

    const onStart = (e) => {
        // Ignore drags that start on interactive elements (buttons, links)
        if (e.target.closest('button') || e.target.closest('.ob-dot')) return;
        onboardingDragging = true;
        onboardingDragStartX = getX(e);
        onboardingDragStartY = e.touches ? e.touches[0].clientY : e.clientY;
        onboardingDragDeltaX = 0;
        track.style.transition = 'none';
    };

    const onMove = (e) => {
        if (!onboardingDragging) return;
        const currentX = getX(e);
        const currentY = e.touches ? e.touches[0].clientY : e.clientY;
        onboardingDragDeltaX = currentX - onboardingDragStartX;
        if (onboardingIndex === 0 && onboardingDragDeltaX > 0) onboardingDragDeltaX = 0;
        if (onboardingIndex === ONBOARDING_SLIDE_COUNT - 1 && onboardingDragDeltaX < 0) onboardingDragDeltaX = 0;
        const deltaY = currentY - onboardingDragStartY;

        // Lock vertical scroll if swiping horizontally
        if (Math.abs(onboardingDragDeltaX) > Math.abs(deltaY)) {
            if (e.cancelable) e.preventDefault();
        }

        const basePercent = -(onboardingIndex * (100 / ONBOARDING_SLIDE_COUNT));
        const dragPercent = (onboardingDragDeltaX / track.clientWidth) * 100;
        track.style.transform = `translateX(${basePercent + dragPercent}%)`;
    };

    const onEnd = () => {
        if (!onboardingDragging) return;
        onboardingDragging = false;
        track.style.transition = '';
        const threshold = track.clientWidth * 0.18;
        if (onboardingDragDeltaX < -threshold && onboardingIndex < ONBOARDING_SLIDE_COUNT - 1) {
            onboardingGoTo(onboardingIndex + 1);
        } else if (onboardingDragDeltaX > threshold && onboardingIndex > 0) {
            onboardingGoTo(onboardingIndex - 1);
        } else {
            updateOnboardingTrack(true);
        }
        onboardingDragDeltaX = 0;
    };

    track.addEventListener('touchstart', onStart, { passive: true });
    track.addEventListener('touchmove', onMove, { passive: false });
    track.addEventListener('touchend', onEnd);

    track.addEventListener('mousedown', onStart);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
}

// Reveals the login scene with a smooth fade-in (used after the loading screen)
function revealLoginWithFade() {
    const login = document.getElementById('scene-login');
    login.style.transition = 'none';
    login.classList.remove('slide-out-left', 'slide-out-right', 'slide-in');
    login.classList.add('opacity-0');
    login.classList.remove('hidden');
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            login.style.transition = '';
            login.classList.remove('opacity-0');
        });
    });
}

// --- REGISTER SCENE ---
let selectedRegisterRole = 'staff';

// Tablet/desktop breakpoint check, shared by onboarding gating and the
// login<->register transition (below 768px we use the mobile whole-screen
// slide; at 768px+ we use the form-only "pop" swap instead).
function isDesktopViewport() {
    return window.matchMedia('(min-width: 768px)').matches;
}

function showRegisterScene() {
    const login = document.getElementById('scene-login');
    const register = document.getElementById('scene-register');

    ['reg-name', 'reg-email', 'reg-password', 'reg-confirm'].forEach(id => {
        document.getElementById(id).value = '';
        setAuthFieldError(id, false);
    });
    document.getElementById('reg-email-error').classList.add('hidden');
    document.getElementById('reg-confirm-error').classList.add('hidden');

    // Reset password visibility toggles
    document.getElementById('reg-password').type = 'password';
    document.getElementById('reg-password-toggle-icon').innerText = 'visibility_off';
    document.getElementById('reg-confirm').type = 'password';
    document.getElementById('reg-confirm-toggle-icon').innerText = 'visibility_off';

    // Reset register button state
    const submitBtn = document.querySelector('#scene-register form button[type="submit"]');
    if (submitBtn && submitBtn.originalText) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = submitBtn.originalText;
        submitBtn.classList.remove('opacity-80', 'cursor-not-allowed');
    }

    // Desktop/tablet and mobile: only the form card animates
    desktopAuthFormSwap(login, register);
}

function showLoginScene() {
    const login = document.getElementById('scene-login');
    const register = document.getElementById('scene-register');

    // Desktop/tablet and mobile: only the form card animates
    desktopAuthFormSwap(register, login);
}

function desktopAuthFormSwap(hideScene, showScene) {
    // Clear out any leftover mobile slide state so the split layout
    // renders normally underneath the form animation.
    [hideScene, showScene].forEach(el => {
        el.style.transition = 'none';
        el.style.transform = 'none';
        el.classList.remove('slide-out-left', 'slide-out-right', 'slide-in');
    });

    const isMobile = window.innerWidth < 768;
    const outgoingAnimTarget = isMobile ? hideScene : hideScene.querySelector('.auth-card-animate');
    const incomingAnimTarget = isMobile ? showScene : showScene.querySelector('.auth-card-animate');

    if (outgoingAnimTarget) {
        outgoingAnimTarget.classList.remove('form-pop-in');
        outgoingAnimTarget.classList.add('form-pop-out');
    }

    setTimeout(() => {
        hideScene.classList.add('hidden');
        showScene.classList.remove('hidden');

        if (outgoingAnimTarget) outgoingAnimTarget.classList.remove('form-pop-out');
        if (incomingAnimTarget) {
            incomingAnimTarget.classList.remove('form-pop-out');
            void incomingAnimTarget.offsetWidth; // force reflow so the animation replays every time
            incomingAnimTarget.classList.add('form-pop-in');
        }
    }, 260);
}

function selectRegisterRole(role) {
    selectedRegisterRole = role;
    const pill = document.getElementById('reg-toggle-pill');
    pill.style.transform = role === 'staff' ? 'translateX(100%)' : 'translateX(0)';
    document.getElementById('btn-reg-admin').className = `flex-1 py-2 relative z-10 transition-colors duration-300 ${role === 'admin' ? 'text-body-md font-bold text-primary dark:text-white' : 'text-body-sm text-on-surface-variant dark:text-zinc-400 hover:text-primary'}`;
    document.getElementById('btn-reg-staff').className = `flex-1 py-2 relative z-10 transition-colors duration-300 ${role === 'staff' ? 'text-body-md font-bold text-primary dark:text-white' : 'text-body-sm text-on-surface-variant dark:text-zinc-400 hover:text-primary'}`;
}

function toggleRegPasswordVisibility() {
    const input = document.getElementById('reg-password');
    const icon = document.getElementById('reg-password-toggle-icon');
    const isHidden = input.type === 'password';
    input.type = isHidden ? 'text' : 'password';
    icon.innerText = isHidden ? 'visibility' : 'visibility_off';
}

function toggleRegConfirmVisibility() {
    const input = document.getElementById('reg-confirm');
    const icon = document.getElementById('reg-confirm-toggle-icon');
    const isHidden = input.type === 'password';
    input.type = isHidden ? 'text' : 'password';
    icon.innerText = isHidden ? 'visibility' : 'visibility_off';
}

function getAccounts() {
    return window.fbUsersCache || [];
}

function saveAccounts(accounts) {
    // Handled via Firebase now
}

// Adds/removes a red error highlight on a register field's input box
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

// Clears the red highlight and inline error message as soon as the user types
function clearRegFieldError(el) {
    setAuthFieldError(el.id, false);
    const errEl = document.getElementById(el.id + '-error');
    if (errEl) errEl.classList.add('hidden');
}

function clearLoginFieldError(el) {
    setAuthFieldError(el.id, false);
    const errEl = document.getElementById(el.id + '-error');
    if (errEl) errEl.classList.add('hidden');
}

function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim().toLowerCase();
    const password = document.getElementById('reg-password').value;
    const confirm = document.getElementById('reg-confirm').value;
    const role = typeof selectedRegisterRole !== 'undefined' ? selectedRegisterRole : 'staff';
    
    const submitBtn = e.target.querySelector('button[type="submit"]');

    document.getElementById('reg-email-error')?.classList.add('hidden');
    document.getElementById('reg-password-error')?.classList.add('hidden');
    document.getElementById('reg-confirm-error')?.classList.add('hidden');

    let hasError = false;

    if (!name || !email || !password || !confirm) {
        showToast('Please fill in all fields to create an account.', 'error');
        return;
    }

    if (password !== confirm) {
        setAuthFieldError('reg-confirm', true);
        const errEl = document.getElementById('reg-confirm-error');
        const errText = document.getElementById('reg-confirm-error-text');
        if (errEl && errText) {
            errText.innerText = 'Passwords do not match.';
            errEl.classList.remove('hidden');
        }
        hasError = true;
    }

    if (hasError) return;

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<span class="flex items-center justify-center gap-2"><span class="material-symbols-outlined animate-spin text-[18px]">sync</span> Signing up...</span>';
        submitBtn.classList.add('opacity-80', 'cursor-not-allowed');
    }

    fbAuth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            fbDB.ref('kabutech/users/' + user.uid).set({
                name: name,
                email: email,
                role: role,
                approved: true,
                createdAt: firebase.database.ServerValue.TIMESTAMP
            });
            showToast(`Account created! Welcome, ${name}.`, 'success');
            addLog(`New account registered: ${email}`, 'success');
            // onAuthStateChanged will handle the rest
        })
        .catch((error) => {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = submitBtn.originalText || 'Sign Up';
                submitBtn.classList.remove('opacity-80', 'cursor-not-allowed');
            }
            if (error.code === 'auth/email-already-in-use') {
                setAuthFieldError('reg-email', true);
                const errEl = document.getElementById('reg-email-error');
                const errText = document.getElementById('reg-email-error-text');
                if (errEl && errText) {
                    errText.innerText = 'Email already registered.';
                    errEl.classList.remove('hidden');
                }
            } else if (error.code === 'auth/weak-password' || error.code === 'auth/password-does-not-meet-requirements') {
                setAuthFieldError('reg-password', true);
                const errEl = document.getElementById('reg-password-error');
                const errText = document.getElementById('reg-password-error-text');
                if (errEl && errText) {
                    errText.innerText = error.code === 'auth/password-does-not-meet-requirements'
                        ? 'Password needs 8+ chars, 1 uppercase, and 1 symbol.'
                        : 'Password is too weak.';
                    errEl.classList.remove('hidden');
                }
            } else if (error.code === 'auth/invalid-email') {
                setAuthFieldError('reg-email', true);
                const errEl = document.getElementById('reg-email-error');
                const errText = document.getElementById('reg-email-error-text');
                if (errEl && errText) {
                    errText.innerText = 'Invalid email address.';
                    errEl.classList.remove('hidden');
                }
            } else {
                showToast(error.message, 'error');
            }
        });
}

function applyUserProfile(user) {
    const initials = user.initials || (user.name ? user.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() : (user.role === 'admin' ? 'AR' : 'SS'));
    const displayName = user.name || (user.role === 'admin' ? 'Admin Renz' : 'Staff Sarah');
    document.getElementById('header-user-name').innerText = displayName;
    document.getElementById('header-user-avatar').innerText = initials[0] || (user.role === 'admin' ? 'A' : 'S');
    document.getElementById('profile-initials').innerText = initials;
    document.getElementById('profile-name').innerText = displayName;
    document.getElementById('profile-email').innerText = user.email;
    document.getElementById('profile-role-badge').innerText = user.role === 'admin' ? 'Administrator Role' : 'Staff Operations Role';
    // Desktop-only "More" redesign — mirror the same real user data
    const initEl = document.getElementById('profile-initials-desktop');
    if (initEl) initEl.innerText = initials;
    const nameEl = document.getElementById('profile-name-desktop');
    if (nameEl) nameEl.innerText = displayName;
    const emailEl = document.getElementById('profile-email-desktop');
    if (emailEl) emailEl.innerText = user.email;
    const roleBadgeEl = document.getElementById('profile-role-badge-desktop');
    if (roleBadgeEl) roleBadgeEl.innerText = user.role === 'admin' ? 'Administrator Role' : 'Staff Operations Role';
    const taskModalBtn = document.getElementById('btn-add-task-modal');
    if (taskModalBtn) {
        if (user.role === 'admin') taskModalBtn.classList.remove('hidden');
        else taskModalBtn.classList.add('hidden');
    }
}

function handleLogin(e) {
    e.preventDefault();
    
    // RATE LIMITING: Max 5 failed attempts, lockout for 5 minutes
    const lockoutUntil = parseInt(localStorage.getItem('kb_login_lockout_until') || '0', 10);
    if (Date.now() < lockoutUntil) {
        const remainingMinutes = Math.ceil((lockoutUntil - Date.now()) / 60000);
        showToast(`Too many login attempts. Please try again in ${remainingMinutes} minute(s).`, 'error');
        return;
    }

    const emailEl = document.getElementById('login-email');
    const passEl = document.getElementById('login-password');
    const rememberEl = document.getElementById('login-remember');
    const email = emailEl.value.trim().toLowerCase();
    const password = passEl.value;
    const rememberMe = rememberEl ? rememberEl.checked : false;

    const submitBtn = e.target.querySelector('button[type="submit"]');

    document.getElementById('login-email-error')?.classList.add('hidden');
    document.getElementById('login-password-error')?.classList.add('hidden');
    setAuthFieldError('login-email', false);
    setAuthFieldError('login-password', false);

    if (!email || !password) {
        showToast('Please fill in all fields before signing in.', 'error');
        return;
    }

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<span class="flex items-center justify-center gap-2"><span class="material-symbols-outlined animate-spin text-[18px]">sync</span> Logging in...</span>';
        submitBtn.classList.add('opacity-80', 'cursor-not-allowed');
    }

    const persistence = rememberMe ? firebase.auth.Auth.Persistence.LOCAL : firebase.auth.Auth.Persistence.SESSION;

    fbAuth.setPersistence(persistence)
        .then(() => {
            return fbAuth.signInWithEmailAndPassword(email, password);
        })
        .then(() => {
            // Reset attempts on successful login
            localStorage.removeItem('kb_login_attempts');
            localStorage.removeItem('kb_login_lockout_until');
            // onAuthStateChanged in firebase-config.js handles transition
        })
        .catch((error) => {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = submitBtn.originalText || 'Login';
                submitBtn.classList.remove('opacity-80', 'cursor-not-allowed');
            }
            
            // Increment failed login attempts
            let attempts = parseInt(localStorage.getItem('kb_login_attempts') || '0', 10);
            attempts++;
            if (attempts >= 5) {
                localStorage.setItem('kb_login_lockout_until', Date.now() + 5 * 60 * 1000); // 5 minutes
                localStorage.setItem('kb_login_attempts', '0');
                showToast('Maximum login attempts reached. Locked out for 5 minutes.', 'error');
            } else {
                localStorage.setItem('kb_login_attempts', attempts.toString());
            }

            if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-email') {
                setAuthFieldError('login-email', true);
                const errEl = document.getElementById('login-email-error');
                const errText = document.getElementById('login-email-error-text');
                if (errEl && errText) {
                    errText.innerText = 'Account not found or invalid email.';
                    errEl.classList.remove('hidden');
                }
            } else if (error.code === 'auth/wrong-password') {
                setAuthFieldError('login-password', true);
                const errEl = document.getElementById('login-password-error');
                const errText = document.getElementById('login-password-error-text');
                if (errEl && errText) {
                    errText.innerText = 'Incorrect password.';
                    errEl.classList.remove('hidden');
                }
            } else if (error.code === 'auth/invalid-credential' || error.code === 'auth/invalid-login-credentials') {
                // New Firebase generic error, apply to both or email
                setAuthFieldError('login-email', true);
                setAuthFieldError('login-password', true);
                const errEl = document.getElementById('login-email-error');
                const errText = document.getElementById('login-email-error-text');
                if (errEl && errText) {
                    errText.innerText = 'Invalid email or password.';
                    errEl.classList.remove('hidden');
                }
            } else {
                showToast(error.message || 'Invalid email or password.', 'error');
            }
        });
}

function transitionToApp() {
    // Show loading overlay briefly
    const loading = document.getElementById('scene-loading');
    loading.classList.remove('hidden');
    loading.classList.remove('opacity-0');
    document.getElementById('loading-status').innerText = "Authenticating Farm Security...";

    setTimeout(() => {
        loading.classList.add('opacity-0');
        document.getElementById('scene-login').classList.add('hidden');
        document.getElementById('scene-register').classList.add('hidden');
        document.getElementById('scene-app').classList.remove('hidden');

        // Preset matching role visuals
        if(state.currentUser) {
            applyUserProfile(state.currentUser);
            updateGreeting();
            applyRoleNavRestrictions(state.currentUser.role);
        }
        renderBatches(); // re-render so isAdmin-gated buttons reflect the logged-in role
        renderStaffReports();
        if(typeof renderStaffAccountsList === 'function') renderStaffAccountsList();

        // Always land on dashboard — switchTab triggers the
        // sensor count-up-from-0 intro animation automatically
        switchTab('home');

        setTimeout(() => {
            loading.classList.add('hidden');
        }, 400);
    }, 500);
}

function handleLogout() {
    fbAuth.signOut().then(() => {
        state.currentUser = null;
        
        const loading = document.getElementById('scene-loading');
        loading.classList.remove('hidden');
        loading.classList.remove('opacity-0');
        document.getElementById('loading-status').innerText = "Logging out securely...";

        setTimeout(() => {
            loading.classList.add('opacity-0');
            document.getElementById('scene-app').classList.add('hidden');
            document.getElementById('scene-login').classList.remove('hidden');
            document.getElementById('login-password').value = '';
            
            // Reset login button state
            const submitBtn = document.querySelector('#scene-login form button[type="submit"]');
            if (submitBtn && submitBtn.originalText) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = submitBtn.originalText;
                submitBtn.classList.remove('opacity-80', 'cursor-not-allowed');
            }
            
            setTimeout(() => {
                loading.classList.add('hidden');
            }, 400);
        }, 500);
    });
}

