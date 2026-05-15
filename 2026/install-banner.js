(function () {
    const DISMISS_KEY = 'voimapuu-2026-install-dismissed';
    const SHOW_DELAY_MS = 250;
    const ALLOWED_SECTIONS = new Set(['info', 'ohjelma']);

    const ua = navigator.userAgent;
    const isStandalone = () =>
        window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true;
    const isMobile = () => window.matchMedia('(pointer: coarse)').matches;
    const isIOS = () =>
        /iPad|iPhone|iPod/.test(ua) ||
        (navigator.maxTouchPoints > 1 && /Mac/.test(ua));
    const isAndroid = () => /Android/i.test(ua);
    const isInAppBrowser = () =>
        /FBAN|FBAV|Instagram|Line|Telegram|MicroMessenger|; wv\)/.test(ua);

    const banner = document.getElementById('install-banner');
    if (!banner) return;

    const textEl = document.getElementById('install-banner-text');
    const stepsEl = document.getElementById('install-banner-steps');
    const ctaEl = document.getElementById('install-banner-cta');
    const closeEl = document.getElementById('install-banner-close');

    const SHARE_ICON_SVG = '<svg class="install-banner-share-icon" width="14" height="18" viewBox="0 0 14 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M7 1v11M3 5l4-4 4 4M1 9v7h12V9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    const MENU_ICON_SVG = '<svg class="install-banner-share-icon" width="4" height="16" viewBox="0 0 4 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="2" cy="2" r="1.6" fill="currentColor"/><circle cx="2" cy="8" r="1.6" fill="currentColor"/><circle cx="2" cy="14" r="1.6" fill="currentColor"/></svg>';

    let deferredPrompt = null;
    let currentSection = null;
    let showTimer = null;

    function dismissed() {
        try { return localStorage.getItem(DISMISS_KEY) === '1'; }
        catch (e) { return false; }
    }
    function setDismissed() {
        try { localStorage.setItem(DISMISS_KEY, '1'); } catch (e) {}
    }

    function isEligible() {
        return !isStandalone() && isMobile() && !dismissed();
    }

    function hide() {
        if (showTimer) { clearTimeout(showTimer); showTimer = null; }
        banner.classList.add('hidden');
    }
    function show() {
        if (!isEligible()) return;
        banner.classList.remove('hidden');
    }

    function applyVisibility() {
        if (showTimer) { clearTimeout(showTimer); showTimer = null; }
        if (ALLOWED_SECTIONS.has(currentSection) && isEligible()) {
            showTimer = setTimeout(show, SHOW_DELAY_MS);
        } else {
            banner.classList.add('hidden');
        }
    }

    function setSection(name) {
        currentSection = name;
        applyVisibility();
    }

    function renderAndroid() {
        textEl.textContent = 'Festivaalialueella signaali on heikko. Tallenna sivu niin ohjelma on aina käsillä.';
        stepsEl.classList.add('hidden');
        ctaEl.textContent = 'Tallenna';
        ctaEl.classList.remove('hidden');
    }

    function renderIOS() {
        textEl.innerHTML = 'Signaali on metsässä heikko. Paina ' + SHARE_ICON_SVG + ' ja valitse <strong>Lisää Koti-valikkoon</strong>, niin ohjelma kulkee mukana.';
        stepsEl.classList.add('hidden');
        ctaEl.classList.add('hidden');
    }

    function renderInAppBrowser() {
        textEl.textContent = 'Avaa sivu Safarissa tai Chromessa, niin voit tallentaa sen kotinäytölle.';
        stepsEl.classList.add('hidden');
        ctaEl.classList.add('hidden');
    }

    function renderAndroidInstructions() {
        textEl.innerHTML = 'Tallenna kotinäytölle selaimen ' + MENU_ICON_SVG + ' valikosta, niin ohjelma toimii ilman signaalia.';
        stepsEl.classList.add('hidden');
        ctaEl.classList.add('hidden');
    }

    function renderGeneric() {
        textEl.textContent = 'Tallenna kotinäytölle selaimen valikosta, niin ohjelma toimii ilman signaalia.';
        stepsEl.classList.add('hidden');
        ctaEl.classList.add('hidden');
    }

    function init() {
        // Expose API immediately so app.js can call setSection from its first render()
        window.__installBanner = { setSection };

        if (!isEligible()) return;

        closeEl.addEventListener('click', () => {
            setDismissed();
            hide();
        });

        ctaEl.addEventListener('click', async () => {
            if (!deferredPrompt) return;
            try {
                deferredPrompt.prompt();
                await deferredPrompt.userChoice;
            } catch (e) {}
            deferredPrompt = null;
            hide();
        });

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            renderAndroid();
            applyVisibility();
        });

        window.addEventListener('appinstalled', () => {
            setDismissed();
            hide();
        });

        const standaloneMQ = window.matchMedia('(display-mode: standalone)');
        if (standaloneMQ.addEventListener) {
            standaloneMQ.addEventListener('change', (e) => {
                if (e.matches) hide();
            });
        }

        // Pick the right copy variant upfront. Android may swap to renderAndroid
        // later if/when beforeinstallprompt fires.
        if (isInAppBrowser()) {
            renderInAppBrowser();
        } else if (isIOS()) {
            renderIOS();
        } else if (isAndroid()) {
            renderAndroidInstructions();
        } else {
            renderGeneric();
        }
    }

    init();
})();
