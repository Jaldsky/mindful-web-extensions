const CONFIG = require('../../../config.js');

/**
 * Менеджер для рендеринга статусных сообщений в DOM.
 * 
 * @class StatusRendererManager
 */
class StatusRendererManager {
    /**
     * Создает экземпляр StatusRendererManager.
     * 
     * @param {Object} options - Опции конфигурации
     * @param {HTMLElement|null} [options.element=null] - Элемент для отображения статуса
     * @param {Function} [options.log] - Функция логирования
     * @param {Function} [options.logError] - Функция логирования ошибок
     */
    constructor({ element = null, log = () => {}, logError = () => {} } = {}) {
        /** @type {HTMLElement|null} */
        this.statusElement = element || null;
        
        /** @type {number|null} */
        this.hideTimeout = null;
        
        /** @type {Function} */
        this._log = log;
        
        /** @type {Function} */
        this._logError = logError;
        
        if (this.statusElement) {
            this.validateElement();
        }
    }

    /**
     * Устанавливает элемент статуса.
     * 
     * @param {HTMLElement} element - DOM элемент для статуса
     * @throws {TypeError} Если element не является HTMLElement
     * @returns {void}
     */
    setElement(element) {
        if (!(element instanceof HTMLElement)) {
            throw new TypeError('element должен быть HTMLElement');
        }
        this.statusElement = element;
        this.validateElement();
        this._log('Элемент статуса установлен и валидирован');
    }

    /**
     * Валидирует элемент статуса.
     * 
     * @throws {Error} Если statusElement некорректен
     * @returns {void}
     */
    validateElement() {
        if (!this.statusElement) return;
        if (!(this.statusElement instanceof HTMLElement)) {
            const error = new Error('statusElement должен быть HTMLElement');
            this._logError('Критическая ошибка валидации', error);
            throw error;
        }
        if (!document.body.contains(this.statusElement)) {
            this._log('Предупреждение: statusElement не находится в DOM');
        }
        this._log('statusElement валиден');
    }

    /**
     * Очищает таймер скрытия статуса.
     * 
     * @returns {void}
     */
    clearHideTimeout() {
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
            this.hideTimeout = null;
            this._log('Таймер скрытия очищен');
        }
    }

    /**
     * Планирует скрытие статуса через указанное время.
     * 
     * @param {number} duration - Время в миллисекундах
     * @param {Function} hideFn - Функция для скрытия статуса
     * @returns {void}
     */
    scheduleHide(duration, hideFn) {
        this.hideTimeout = setTimeout(() => { hideFn(); }, duration);
        this._log(`Скрытие статуса запланировано через ${duration}мс`);
    }

    /**
     * Отображает статус в DOM элементе.
     * 
     * @param {string} message - Текст сообщения
     * @param {string} type - Тип статуса
     * @returns {boolean} true если отображено успешно
     */
    display(message, type) {
        if (!this.statusElement || !document.body.contains(this.statusElement)) {
            this._log('Элемент статуса недоступен, отображение пропущено');
            return false;
        }
        this.clearHideTimeout();
        this.statusElement.textContent = message;
        this.statusElement.className = `${CONFIG.STATUS_SETTINGS.CSS_CLASSES.BASE} ${type} ${CONFIG.STATUS_SETTINGS.CSS_CLASSES.VISIBLE}`;

        const isVisible = this.statusElement.classList.contains(CONFIG.STATUS_SETTINGS.CSS_CLASSES.VISIBLE);
        const hasCorrectClass = this.statusElement.classList.contains(CONFIG.STATUS_SETTINGS.CSS_CLASSES.BASE) && this.statusElement.classList.contains(type);
        const hasCorrectText = this.statusElement.textContent === message;
        if (!isVisible || !hasCorrectClass || !hasCorrectText) {
            this._logError('Верификация отображения не удалась', { isVisible, hasCorrectClass, hasCorrectText });
            return false;
        }
        return true;
    }

    /**
     * Скрывает статус в DOM элементе.
     * 
     * @returns {boolean} true если скрыто успешно
     */
    hide() {
        if (!this.statusElement || !document.body.contains(this.statusElement)) {
            this._log('Элемент статуса недоступен, скрытие пропущено');
            return false;
        }
        this.clearHideTimeout();
        this.statusElement.textContent = '';
        this.statusElement.className = `${CONFIG.STATUS_SETTINGS.CSS_CLASSES.BASE} ${CONFIG.STATUS_SETTINGS.CSS_CLASSES.HIDDEN}`;
        const isHidden = this.statusElement.classList.contains(CONFIG.STATUS_SETTINGS.CSS_CLASSES.HIDDEN);
        const isCleared = this.statusElement.textContent === '';
        if (!isHidden || !isCleared) {
            this._logError('Верификация скрытия не удалась', { isHidden, isCleared });
            return false;
        }
        return true;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = StatusRendererManager;
    module.exports.default = StatusRendererManager;
}

if (typeof window !== 'undefined') {
    window.StatusRendererManager = StatusRendererManager;
}
