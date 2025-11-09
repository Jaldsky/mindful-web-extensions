const TrackerManager = require('./managers/tracker/TrackerManager.js');

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

initializeTracker();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { tracker };
}
