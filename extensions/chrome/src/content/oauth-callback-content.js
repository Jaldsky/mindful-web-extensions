/**
 * Content script для страницы OAuth callback фронтенда.
 * Запускается на странице /oauth/google/callback, извлекает code и state из URL
 * и отправляет их в service worker расширения для обмена на токены.
 */
(function () {
    const OAUTH_CALLBACK_TYPE = 'oauthCallback';

    function run() {
        const pathname = window.location.pathname || '';
        if (!pathname.includes('/oauth/google/callback')) {
            return;
        }

        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const state = params.get('state');

        if (!code || !state) {
            return;
        }

        if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) {
            return;
        }

        chrome.runtime.sendMessage(
            {
                type: OAUTH_CALLBACK_TYPE,
                code: code,
                state: state
            },
            function (response) {
                if (chrome.runtime.lastError) {
                    console.error('[Mindful Web OAuth]', chrome.runtime.lastError.message);
                }
            }
        );
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', run);
    } else {
        run();
    }
})();
