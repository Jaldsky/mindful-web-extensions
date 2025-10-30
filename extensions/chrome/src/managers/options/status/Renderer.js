/**
 * Отвечает за работу с DOM для отображения и скрытия статусов.
 */
class StatusRenderer {
    constructor({ element = null, log = () => {}, logError = () => {} } = {}) {
        this.statusElement = element || null;
        this.hideTimeout = null;
        this._log = log;
        this._logError = logError;
        if (this.statusElement) this.validateElement();
    }

    setElement(element) {
        if (!(element instanceof HTMLElement)) {
            throw new TypeError('element должен быть HTMLElement');
        }
        this.statusElement = element;
        this.validateElement();
        this._log('Элемент статуса установлен и валидирован');
    }

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

    clearHideTimeout() {
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
            this.hideTimeout = null;
            this._log('Таймер скрытия очищен');
        }
    }

    scheduleHide(duration, hideFn) {
        this.hideTimeout = setTimeout(() => { hideFn(); }, duration);
        this._log(`Скрытие статуса запланировано через ${duration}мс`);
    }

    display(message, type) {
        if (!this.statusElement) {
            this._logError('Элемент статуса не установлен');
            return false;
        }
        if (!document.body.contains(this.statusElement)) {
            this._logError('Элемент статуса не находится в DOM');
            return false;
        }
        this.clearHideTimeout();
        this.statusElement.textContent = message;
        this.statusElement.className = `status-message ${type} visible`;

        const isVisible = this.statusElement.classList.contains('visible');
        const hasCorrectClass = this.statusElement.classList.contains('status-message') && this.statusElement.classList.contains(type);
        const hasCorrectText = this.statusElement.textContent === message;
        if (!isVisible || !hasCorrectClass || !hasCorrectText) {
            this._logError('Верификация отображения не удалась', { isVisible, hasCorrectClass, hasCorrectText });
            return false;
        }
        return true;
    }

    hide() {
        if (!this.statusElement) {
            this._log('Нет элемента статуса для скрытия');
            return false;
        }
        this.clearHideTimeout();
        this.statusElement.textContent = '';
        this.statusElement.className = 'status-message hidden';
        const isHidden = this.statusElement.classList.contains('hidden');
        const isCleared = this.statusElement.textContent === '';
        if (!isHidden || !isCleared) {
            this._logError('Верификация скрытия не удалась', { isHidden, isCleared });
            return false;
        }
        return true;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = StatusRenderer;
    module.exports.default = StatusRenderer;
}
