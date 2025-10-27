const BaseManager = require('../BaseManager.js');

/**
 * Менеджер для синхронизации темы между страницами расширения.
 * Отвечает за прослушивание изменений в chrome.storage и уведомление об изменениях.
 * 
 * @class SyncManager
 * @extends BaseManager
 */
class SyncManager extends BaseManager {
    /**
     * Ключ хранилища для темы
     * @readonly
     * @static
     */
    static STORAGE_KEY = 'mindful_theme';

    /**
     * Создает экземпляр SyncManager.
     * 
     * @param {Object} [options={}] - Опции конфигурации
     * @param {boolean} [options.enableLogging] - Включить логирование
     * @param {Function} [options.onThemeChange] - Callback при изменении темы
     */
    constructor(options = {}) {
        super(options);

        /** @type {Function|null} */
        this.onThemeChangeCallback = options.onThemeChange || null;

        /** @type {Function|null} */
        this.storageListener = null;

        /** @type {Object} */
        this.statistics = {
            changes: 0,
            errors: 0,
            lastChange: null
        };

        this._log('SyncManager создан', {
            hasCallback: !!this.onThemeChangeCallback
        });
    }

    /**
     * Проверяет доступность Chrome Storage API.
     * 
     * @private
     * @returns {boolean} true если API доступен
     */
    _isStorageAvailable() {
        return typeof chrome !== 'undefined' && 
               chrome.storage && 
               chrome.storage.onChanged;
    }

    /**
     * Начинает слушать изменения темы в хранилище.
     * 
     * @param {Function} callback - Callback при изменении темы
     * @returns {boolean} true если слушатель успешно установлен
     */
    startListening(callback) {
        try {
            if (!this._isStorageAvailable()) {
                this._log('Chrome storage onChanged API недоступен');
                return false;
            }

            if (callback) {
                this.onThemeChangeCallback = callback;
            }

            if (!this.onThemeChangeCallback) {
                this._log('Callback не установлен');
                return false;
            }

            // Удаляем старый слушатель если есть
            this.stopListening();

            this.storageListener = (changes, areaName) => {
                if (areaName === 'local' && changes[SyncManager.STORAGE_KEY]) {
                    const newTheme = changes[SyncManager.STORAGE_KEY].newValue;
                    
                    this.statistics.changes++;
                    this.statistics.lastChange = Date.now();
                    this.updateState({ 
                        lastChangeTime: Date.now(),
                        lastTheme: newTheme 
                    });
                    
                    try {
                        this.onThemeChangeCallback(newTheme);
                        this._log('Тема изменена из storage', { newTheme });
                    } catch (error) {
                        this.statistics.errors++;
                        this._logError('Ошибка в callback изменения темы', error);
                    }
                }
            };

            chrome.storage.onChanged.addListener(this.storageListener);
            this._log('Слушатель изменений темы установлен');
            return true;
        } catch (error) {
            this.statistics.errors++;
            this._logError('Ошибка установки слушателя темы', error);
            return false;
        }
    }

    /**
     * Останавливает прослушивание изменений темы.
     * 
     * @returns {boolean} true если слушатель успешно удален
     */
    stopListening() {
        try {
            if (this.storageListener && this._isStorageAvailable()) {
                chrome.storage.onChanged.removeListener(this.storageListener);
                this.storageListener = null;
                this._log('Слушатель изменений темы удален');
                return true;
            }
            return false;
        } catch (error) {
            this.statistics.errors++;
            this._logError('Ошибка удаления слушателя', error);
            return false;
        }
    }

    /**
     * Проверяет, активен ли слушатель.
     * 
     * @returns {boolean} true если слушатель активен
     */
    isListening() {
        return !!this.storageListener;
    }

    /**
     * Получает статистику синхронизации.
     * 
     * @returns {Object} Статистика
     */
    getStatistics() {
        return {
            ...this.statistics,
            isListening: this.isListening()
        };
    }

    /**
     * Очищает ресурсы.
     * 
     * @returns {void}
     */
    destroy() {
        this._log('Очистка ресурсов SyncManager');
        
        try {
            this.stopListening();
            this.onThemeChangeCallback = null;
            this._log('SyncManager уничтожен');
        } catch (error) {
            this._logError('Ошибка при уничтожении SyncManager', error);
        }

        super.destroy();
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SyncManager;
    module.exports.default = SyncManager;
}

if (typeof window !== 'undefined') {
    window.ThemeSyncManager = SyncManager;
}
