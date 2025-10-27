// Mindful Web Chrome Extension - Tracker Service Worker
// Отслеживает события активности пользователя на вкладках браузера

const TrackerManager = require('./src/managers/tracker/TrackerManager.js');

/**
 * Главный экземпляр трекера
 * @type {TrackerManager}
 */
let tracker = null;

/**
 * Инициализирует трекер.
 * @returns {void}
 */
function initializeTracker() {
    console.log('[Tracker] Создание экземпляра TrackerManager...');
    
    try {
        tracker = new TrackerManager({
            enableLogging: true
        });
        
        console.log('[Tracker] TrackerManager успешно создан и инициализирован');
    } catch (error) {
        console.error('[Tracker] Ошибка инициализации TrackerManager:', error);
    }
}

// Запускаем инициализацию
initializeTracker();

// Экспортируем для доступа из других модулей (если потребуется)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { tracker };
}
