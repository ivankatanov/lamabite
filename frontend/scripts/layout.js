// layout.js - Общие функции для всех страниц приложения
// Версия: 1.0.6

(function () {
    const root = document.documentElement;
    if (!root) {
        return;
    }

    const setAppHeight = () => {
        const viewport = window.visualViewport;
        const height = viewport ? viewport.height : window.innerHeight;
        if (!height) {
            return;
        }
        root.style.setProperty('--app-height', `${Math.round(height)}px`);
    };

    setAppHeight();

    window.addEventListener('resize', setAppHeight);
    window.addEventListener('orientationchange', setAppHeight);

    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', setAppHeight);
        window.visualViewport.addEventListener('scroll', setAppHeight);
    }
})();
