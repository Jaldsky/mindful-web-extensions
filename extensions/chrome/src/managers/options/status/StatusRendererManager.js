const CONFIG = require('../../../config/config.js');

/**
 * Менеджер для рендеринга статусных сообщений в DOM.
 * Отвечает за отображение, скрытие и валидацию статусных уведомлений в DOM элементах.
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
     * @param {Function} [options.t] - Функция локализации
     */
    constructor({ element = null, log = () => {}, logError = () => {}, t = (key) => key } = {}) {
        /** @type {HTMLElement|null} */
        this.statusElement = element || null;
        
        /** @type {number|null} */
        this.hideTimeout = null;
        
        /** @type {Function} */
        this._log = log;
        
        /** @type {Function} */
        this._logError = logError;
        
        /** @type {Function} */
        this.t = t;
        
        if (this.statusElement) {
            this.validateElement();
        }
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
            const error = new Error(this.t('logs.status.statusElementMustBeHTMLElement'));
            this._logError({ key: 'logs.status.criticalValidationError' }, error);
            throw error;
        }
        if (!document.body.contains(this.statusElement)) {
            this._log({ key: 'logs.status.elementNotInDOM' });
        }
        this._log({ key: 'logs.status.elementValid' });
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
            this._log({ key: 'logs.status.hideTimeoutCleared' });
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
        this._log({ key: 'logs.status.hideScheduled', params: { duration } });
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
            this._log({ key: 'logs.status.elementUnavailableDisplaySkipped' });
            return false;
        }
        this.clearHideTimeout();
        this.statusElement.textContent = message;
        this.statusElement.className = `${CONFIG.STATUS_SETTINGS.CSS_CLASSES.BASE} ${type} ${CONFIG.STATUS_SETTINGS.CSS_CLASSES.VISIBLE}`;

        const isVisible = this.statusElement.classList.contains(CONFIG.STATUS_SETTINGS.CSS_CLASSES.VISIBLE);
        const hasCorrectClass = this.statusElement.classList.contains(CONFIG.STATUS_SETTINGS.CSS_CLASSES.BASE) && this.statusElement.classList.contains(type);
        const hasCorrectText = this.statusElement.textContent === message;
        if (!isVisible || !hasCorrectClass || !hasCorrectText) {
            this._logError({ key: 'logs.status.displayVerificationFailed' }, { isVisible, hasCorrectClass, hasCorrectText });
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
            this._log({ key: 'logs.status.elementUnavailableHideSkipped' });
            return false;
        }
        this.clearHideTimeout();
        this.statusElement.textContent = '';
        this.statusElement.className = `${CONFIG.STATUS_SETTINGS.CSS_CLASSES.BASE} ${CONFIG.STATUS_SETTINGS.CSS_CLASSES.HIDDEN}`;
        const isHidden = this.statusElement.classList.contains(CONFIG.STATUS_SETTINGS.CSS_CLASSES.HIDDEN);
        const isCleared = this.statusElement.textContent === '';
        if (!isHidden || !isCleared) {
            this._logError({ key: 'logs.status.hideVerificationFailed' }, { isHidden, isCleared });
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
