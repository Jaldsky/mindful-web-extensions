const CONFIG = require('../../../../config.js');
const { normalizeDomain, normalizeDomainList } = require('../../../utils/domainUtils.js');

/**
 * Менеджер для управления исключениями доменов.
 * Отвечает за добавление, удаление и отображение списка исключений доменов.
 * 
 * @class DomainExceptionsManager
 */
class DomainExceptionsManager {
    /**
     * Создает экземпляр DomainExceptionsManager.
     * 
     * @param {Object} manager - Экземпляр OptionsManager
     */
    constructor(manager) {
        this.manager = manager;
        this.domainExceptions = new Set();
    }

    /**
     * Получает текст локализации.
     * 
     * @private
     * @param {string} key - Ключ локализации
     * @param {string} fallback - Значение по умолчанию
     * @returns {string} Локализованный текст
     */
    _getLocaleText(key, fallback) {
        try {
            if (this.manager && this.manager.localeManager && typeof this.manager.localeManager.t === 'function') {
                const translated = this.manager.localeManager.t(key);
                if (translated && translated !== key) {
                    return translated;
                }
            }
        } catch (error) {
            this.manager._logError({ key: 'logs.ui.domainExceptions.localeTextError', params: { key } }, error);
        }
        return fallback;
    }

    /**
     * Устанавливает список исключений доменов.
     * 
     * @param {string[]} domains - Массив доменов
     * @returns {void}
     */
    setDomainExceptions(domains) {
        const normalizedList = normalizeDomainList(domains);
        this.domainExceptions = new Set(normalizedList);
        this.manager.domainExceptions = normalizedList;
        this.renderDomainExceptions();
    }

    /**
     * Получает список исключений доменов.
     * 
     * @returns {string[]} Массив доменов
     */
    getDomainExceptions() {
        return Array.from(this.domainExceptions);
    }

    /**
     * Показывает ошибку ввода домена.
     * 
     * @private
     * @param {string} key - Ключ локализации
     * @param {string} fallback - Значение по умолчанию
     * @returns {void}
     */
    _showDomainInputError(key, fallback) {
        const input = this.manager?.domManager?.elements?.domainExceptionInput;
        if (!input) {
            return;
        }
        const message = this._getLocaleText(key, fallback);
        try {
            input.setCustomValidity(message);
            input.reportValidity();
            setTimeout(() => {
                try { input.setCustomValidity(''); } catch (_) {}
            }, 0);
        } catch (error) {
            this.manager._logError({ key: 'logs.ui.domainExceptions.domainInputErrorDisplayError' }, error);
        }
    }

    /**
     * Добавляет домен в исключения.
     * 
     * @param {string} [value] - Значение домена
     * @returns {boolean} true если домен добавлен успешно
     */
    addDomainException(value) {
        const input = this.manager?.domManager?.elements?.domainExceptionInput;
        const rawValue = value !== undefined ? value : (input ? input.value : '');
        const normalized = normalizeDomain(rawValue);

        if (!normalized) {
            this._showDomainInputError('options.form.domainExceptionsInvalid', 'Enter a valid domain name');
            return false;
        }

        if (this.domainExceptions.has(normalized)) {
            this._showDomainInputError('options.form.domainExceptionsDuplicate', 'Domain is already in the exclusion list');
            return false;
        }

        this.domainExceptions.add(normalized);
        this.manager.domainExceptions = this.getDomainExceptions();
        this.renderDomainExceptions();

        if (input) {
            input.value = '';
            input.setCustomValidity('');
            input.focus();
        }

        this.manager._log({ key: 'logs.ui.domainExceptions.domainAdded' }, { domain: normalized });
        return true;
    }

    /**
     * Удаляет домен из исключений.
     * 
     * @param {string} domain - Домен для удаления
     * @returns {void}
     */
    removeDomainException(domain) {
        if (!domain) {
            return;
        }
        const normalized = normalizeDomain(domain);
        if (!normalized || !this.domainExceptions.has(normalized)) {
            return;
        }

        this.domainExceptions.delete(normalized);
        this.manager.domainExceptions = this.getDomainExceptions();
        this.renderDomainExceptions();

        this.manager._log({ key: 'logs.ui.domainExceptions.domainRemoved' }, { domain: normalized });
    }

    /**
     * Отображает список исключений доменов в DOM.
     * 
     * @returns {void}
     */
    renderDomainExceptions() {
        const list = this.manager?.domManager?.elements?.domainExceptionsList;
        if (!list) {
            this.manager?._log({ key: 'logs.ui.domainExceptions.domainExceptionsListNotFound' });
            return;
        }

        list.innerHTML = '';
        const domains = this.getDomainExceptions();

        if (domains.length === 0) {
            try {
                list.classList.remove('has-items');
            } catch (_) {}
            return;
        }

        try {
            list.classList.add('has-items');
        } catch (_) {}

        const removeLabel = this._getLocaleText('options.form.domainExceptionsRemove', 'Remove from exclusion list');

        domains.forEach(domain => {
            const item = document.createElement('li');
            item.className = CONFIG.UI.DOMAIN_EXCEPTIONS.CSS_CLASSES.ITEM;

            const text = document.createElement('span');
            text.textContent = domain;
            item.appendChild(text);

            const button = document.createElement('button');
            button.type = 'button';
            button.className = CONFIG.UI.DOMAIN_EXCEPTIONS.CSS_CLASSES.REMOVE_BUTTON;
            button.setAttribute('data-domain', domain);
            button.setAttribute('title', removeLabel);
            button.setAttribute('aria-label', `${removeLabel}: ${domain}`);
            button.textContent = CONFIG.UI.DOMAIN_EXCEPTIONS.REMOVE_SYMBOL;
            item.appendChild(button);

            list.appendChild(item);
        });
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DomainExceptionsManager;
    module.exports.default = DomainExceptionsManager;
}

if (typeof window !== 'undefined') {
    window.DomainExceptionsManager = DomainExceptionsManager;
}
