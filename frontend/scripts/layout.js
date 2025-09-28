// layout.js - Общие функции для всех страниц приложения
// Версия: 1.0.6

(function () {
    const root = document.documentElement;
    if (!root) {
        return;
    }

    const FOCUSABLE_SELECTOR = 'input, textarea, select, [contenteditable="true"]';
    const KEYBOARD_THRESHOLD = 120; // px
    let focusScrollTimeout = null;

    const updateViewportMetrics = () => {
        const viewport = window.visualViewport;
        const height = viewport ? viewport.height : window.innerHeight;
        if (height) {
            root.style.setProperty('--app-height', `${Math.round(height)}px`);
        }

        if (!viewport) {
            root.style.setProperty('--keyboard-offset', '0px');
            root.classList.remove('keyboard-open');
            return;
        }

        const baseHeight = window.innerHeight || root.clientHeight;
        const keyboardOffset = Math.max(0, baseHeight - viewport.height);
        const isKeyboardOpen = keyboardOffset > KEYBOARD_THRESHOLD;

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

    updateViewportMetrics();

    window.addEventListener('resize', updateViewportMetrics);
    window.addEventListener('orientationchange', updateViewportMetrics);
    document.addEventListener('focusin', handleFocusIn, true);
    document.addEventListener('focusout', handleFocusOut, true);

    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', updateViewportMetrics);
        window.visualViewport.addEventListener('scroll', updateViewportMetrics);
    }
})();
