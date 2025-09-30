// layout.js - Общие функции для всех страниц приложения
// Версия: 1.1.0

(function () {
    const root = document.documentElement;
    if (!root) {
        return;
    }

    const FOCUSABLE_SELECTOR = 'input, textarea, select, [contenteditable="true"]';
    const KEYBOARD_THRESHOLD = 120; // px
    let focusScrollTimeout = null;
    let baseViewportHeight = window.visualViewport?.height || window.innerHeight || 0;

    const resetBaseViewportHeight = (nextHeight) => {
        const candidate = typeof nextHeight === 'number' && Number.isFinite(nextHeight) ? nextHeight : null;
        if (candidate && candidate > 0) {
            baseViewportHeight = candidate;
            return;
        }

        const current = window.visualViewport?.height || window.innerHeight;
        if (current && current > 0) {
            baseViewportHeight = current;
        }
    };

    const ensureHexColor = (value) => {
        if (typeof value !== 'string' || value.trim() === '') {
            return null;
        }
        return value.startsWith('#') ? value : `#${value}`;
    };

    const applyTelegramTheme = () => {
        const tg = window.Telegram?.WebApp;
        if (!tg) {
            return;
        }

        const params = tg.themeParams || {};
        const colorMap = {
            bg_color: '--bg',
            secondary_bg_color: '--card',
            text_color: '--text',
            hint_color: '--muted',
            button_color: '--primary',
            link_color: '--accent',
            button_text_color: '--button-text'
        };

        Object.entries(colorMap).forEach(([key, variable]) => {
            const value = ensureHexColor(params[key]);
            if (value) {
                root.style.setProperty(variable, value);
            }
        });

        if (typeof tg.colorScheme === 'string') {
            root.dataset.colorScheme = tg.colorScheme;
        }
    };

    const updateViewportMetrics = (eventState) => {
        const viewport = window.visualViewport;
        const height = viewport ? viewport.height : window.innerHeight;
        if (!height) {
            return;
        }

        root.style.setProperty('--app-height', `${Math.round(height)}px`);

        if (!viewport) {
            root.style.setProperty('--keyboard-offset', '0px');
            root.classList.remove('keyboard-open');
            return;
        }

        if (eventState?.isStateStable && typeof eventState.height === 'number') {
            resetBaseViewportHeight(eventState.height);
        }

        if (!baseViewportHeight) {
            baseViewportHeight = height;
        }

        let keyboardOffset = Math.max(0, baseViewportHeight - height);
        const isKeyboardOpen = keyboardOffset > KEYBOARD_THRESHOLD;

        if (!isKeyboardOpen) {
            resetBaseViewportHeight(height);
            keyboardOffset = 0;
        }

        root.style.setProperty('--keyboard-offset', `${Math.round(keyboardOffset)}px`);
        root.classList.toggle('keyboard-open', isKeyboardOpen);

        if (isKeyboardOpen) {
            const activeElement = document.activeElement;
            if (activeElement instanceof HTMLElement && activeElement.matches(FOCUSABLE_SELECTOR)) {
                scrollIntoView(activeElement);
            }
        }
    };

    const scrollIntoView = (element) => {
        if (!element || typeof element.scrollIntoView !== 'function') {
            return;
        }

        window.requestAnimationFrame(() => {
            element.scrollIntoView({ block: 'center', behavior: 'smooth' });
        });
    };

    const handleFocusIn = (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) {
            return;
        }

        if (!target.matches(FOCUSABLE_SELECTOR)) {
            return;
        }

        window.clearTimeout(focusScrollTimeout);
        focusScrollTimeout = window.setTimeout(() => {
            scrollIntoView(target);
        }, 220);
    };

    const handleFocusOut = () => {
        window.clearTimeout(focusScrollTimeout);
    };

    applyTelegramTheme();
    updateViewportMetrics();

    const handleResize = () => {
        if (!root.classList.contains('keyboard-open')) {
            resetBaseViewportHeight();
        }
        updateViewportMetrics();
    };

    const handleOrientationChange = () => {
        resetBaseViewportHeight();
        updateViewportMetrics();
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);
    document.addEventListener('focusin', handleFocusIn, true);
    document.addEventListener('focusout', handleFocusOut, true);

    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', (event) => {
            if (!root.classList.contains('keyboard-open')) {
                const nextHeight = event?.target?.height ?? window.visualViewport?.height;
                resetBaseViewportHeight(nextHeight);
            }
            updateViewportMetrics();
        });
        window.visualViewport.addEventListener('scroll', updateViewportMetrics);
    }

    const tg = window.Telegram?.WebApp;
    if (tg?.onEvent) {
        tg.onEvent('themeChanged', applyTelegramTheme);
        tg.onEvent('viewportChanged', (state) => {
            if (state && typeof state.height === 'number' && state.is_state_stable) {
                resetBaseViewportHeight(state.height);
            }
            updateViewportMetrics({
                height: state?.height,
                isStateStable: state?.is_state_stable ?? state?.isStateStable
            });
        });
    }
})();
