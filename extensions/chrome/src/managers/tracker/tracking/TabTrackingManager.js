const BaseManager = require('../../../base/BaseManager.js');
const CONFIG = require('../../../config/config.js');

/**
 * @typedef {Object} TabInfo
 * @property {number} id - ID вкладки
 * @property {string} url - URL вкладки
 * @property {string} [domain] - Извлеченный домен
 */

/**
 * Менеджер для отслеживания активности вкладок и окон браузера.
 * Отвечает за мониторинг событий переключения, обновления и закрытия вкладок.
 * 
 * @class TabTrackingManager
 * @extends BaseManager
 */
class TabTrackingManager extends BaseManager {
    /**
     * Создает экземпляр TabTrackingManager.
     * 
     * @param {Object} dependencies - Зависимости менеджера
     * @param {Object} dependencies.eventQueueManager - Менеджер очереди событий
     * @param {Object} [options={}] - Опции конфигурации
     * @param {boolean} [options.enableLogging=false] - Включить логирование
     */
    constructor(dependencies, options = {}) {
        super(options);

        if (!dependencies || !dependencies.eventQueueManager) {
            const t = this._getTranslateFn();
            throw new Error(t('logs.tabTracking.dependenciesRequired'));
        }

        /** @type {Object} */
        this.eventQueueManager = dependencies.eventQueueManager;
        
        /** @type {TabInfo|null} */
        this.previousActiveTab = null;
        
        /** @type {Map<string, Function>} */
        this.eventListeners = new Map();
        
        this.updateState({
            isTracking: false,
            previousTabId: null
        });
        
        this._log({ key: 'logs.tabTracking.created' });
    }

    /**
     * Инициализирует отслеживание вкладок.
     * Настраивает слушатели событий Chrome API.
     * 
     * @async
     * @returns {Promise<void>}
     */
    async init() {
        await this.startTracking();
    }

    /**
     * Запускает отслеживание вкладок, если оно ещё не активно.
     * 
     * Настраивает слушатели событий Chrome API для отслеживания изменений вкладок
     * и окон, инициализирует предыдущую активную вкладку.
     * 
     * @async
     * @returns {Promise<void>}
     */
    async startTracking() {
        if (this.state.isTracking) {
            this._log({ key: 'logs.tabTracking.alreadyActive' });
            return;
        }

        await this._executeWithTimingAsync('startTracking', async () => {
            this._setupEventListeners();

            await this._initializePreviousTab();

            this.updateState({ isTracking: true });
            this._log({ key: 'logs.tabTracking.started' });
        });
    }

    /**
     * Настраивает слушатели событий Chrome API.
     * 
     * @private
     * @returns {void}
     */
    _setupEventListeners() {
        const onActivatedListener = (activeInfo) => {
            this._handleTabActivated(activeInfo);
        };
        chrome.tabs.onActivated.addListener(onActivatedListener);
        this.eventListeners.set('onActivated', onActivatedListener);

        const onUpdatedListener = (tabId, changeInfo, tab) => {
            if (changeInfo.status === CONFIG.TRACKER.TAB_STATUS.COMPLETE && tab.active) {
                this._handleTabUpdated(tab);
            }
        };
        chrome.tabs.onUpdated.addListener(onUpdatedListener);
        this.eventListeners.set('onUpdated', onUpdatedListener);

        const onRemovedListener = (tabId, removeInfo) => {
            this._handleTabRemoved(tabId, removeInfo);
        };
        chrome.tabs.onRemoved.addListener(onRemovedListener);
        this.eventListeners.set('onRemoved', onRemovedListener);

        const onFocusChangedListener = (windowId) => {
            this._handleWindowFocusChanged(windowId);
        };
        chrome.windows.onFocusChanged.addListener(onFocusChangedListener);
        this.eventListeners.set('onFocusChanged', onFocusChangedListener);
        
        this._log({ key: 'logs.tabTracking.listenersConfigured' });
    }

    /**
     * Инициализирует предыдущую активную вкладку.
     * 
     * @private
     * @async
     * @returns {Promise<void>}
     */
    async _initializePreviousTab() {
        try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tabs.length > 0) {
                this.previousActiveTab = tabs[0];
                this.updateState({ previousTabId: this.previousActiveTab.id });
                this._log({ key: 'logs.tabTracking.previousTabInitialized', params: { tabId: this.previousActiveTab.id, url: this.previousActiveTab.url } });
            }
        } catch (error) {
            this._logError({ key: 'logs.tabTracking.previousTabInitError' }, error);
        }
    }

    /**
     * Обрабатывает активацию вкладки.
     * 
     * Отправляет событие inactive для предыдущей вкладки (если она была)
     * и событие active для новой активной вкладки.
     * 
     * @private
     * @async
     * @param {Object} activeInfo - Информация об активации
     * @param {number} activeInfo.tabId - ID активированной вкладки
     * @returns {Promise<void>}
     */
    async _handleTabActivated(activeInfo) {
        await this._executeWithTimingAsync('handleTabActivated', async () => {
            try {
                const tab = await chrome.tabs.get(activeInfo.tabId);
                if (tab && tab.url) {
                    const domain = this._extractDomain(tab.url);
                    if (domain) {
                        if (this.previousActiveTab && this.previousActiveTab.id !== tab.id) {
                            const previousDomain = this._extractDomain(this.previousActiveTab.url);
                            if (previousDomain) {
                                this.eventQueueManager.addEvent(CONFIG.TRACKER.EVENT_TYPES.INACTIVE, previousDomain);
                            }
                        }

                        this.eventQueueManager.addEvent(CONFIG.TRACKER.EVENT_TYPES.ACTIVE, domain);

                        this.previousActiveTab = tab;
                        this.updateState({ previousTabId: tab.id });
                        
                        this._log({ key: 'logs.tabTracking.tabActivated', params: { tabId: tab.id, domain } });
                    }
                }
            } catch (error) {
                this._logError({ key: 'logs.tabTracking.tabActivatedError' }, error);
            }
        });
    }

    /**
     * Обрабатывает обновление вкладки.
     * 
     * Вызывается когда вкладка полностью загружена (status === 'complete').
     * Отправляет события inactive/active аналогично обработке активации.
     * 
     * @private
     * @param {Object} tab - Объект вкладки
     * @param {number} tab.id - ID вкладки
     * @param {string} tab.url - URL вкладки
     * @returns {void}
     */
    _handleTabUpdated(tab) {
        this._executeWithTiming('handleTabUpdated', () => {
            if (tab && tab.url) {
                const domain = this._extractDomain(tab.url);
                if (domain) {
                    if (this.previousActiveTab && this.previousActiveTab.id !== tab.id) {
                        const previousDomain = this._extractDomain(this.previousActiveTab.url);
                        if (previousDomain) {
                            this.eventQueueManager.addEvent(CONFIG.TRACKER.EVENT_TYPES.INACTIVE, previousDomain);
                        }
                    }

                    this.eventQueueManager.addEvent(CONFIG.TRACKER.EVENT_TYPES.ACTIVE, domain);

                    this.previousActiveTab = tab;
                    this.updateState({ previousTabId: tab.id });
                    
                }
            }
        });
    }

    /**
     * Обрабатывает закрытие вкладки.
     * 
     * Отправляет событие inactive для активной вкладки, если окно закрывается.
     * 
     * @private
     * @async
     * @param {number} tabId - ID закрытой вкладки
     * @param {Object} removeInfo - Информация о закрытии
     * @param {boolean} removeInfo.windowClosing - Флаг закрытия окна
     * @returns {Promise<void>}
     */
    async _handleTabRemoved(tabId, removeInfo) {
        await this._executeWithTimingAsync('handleTabRemoved', async () => {
            if (removeInfo.windowClosing) {
                try {
                    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
                    if (tabs.length > 0) {
                        const activeTab = tabs[0];
                        const domain = this._extractDomain(activeTab.url);
                        if (domain) {
                            this.eventQueueManager.addEvent(CONFIG.TRACKER.EVENT_TYPES.INACTIVE, domain);
                            this._log({ key: 'logs.tabTracking.tabRemoved', params: { tabId, domain } });
                        }
                    }
                } catch (error) {
                    this._logError({ key: 'logs.tabTracking.tabRemovedError' }, error);
                }
            }
        });
    }

    /**
     * Обрабатывает изменение фокуса окна.
     * 
     * Если окно потеряло фокус (windowId === WINDOW_ID_NONE), отправляет
     * событие inactive для предыдущей вкладки. Если окно получило фокус,
     * отправляет событие active для активной вкладки.
     * 
     * @private
     * @async
     * @param {number} windowId - ID окна (или WINDOW_ID_NONE если фокус потерян)
     * @returns {Promise<void>}
     */
    async _handleWindowFocusChanged(windowId) {
        await this._executeWithTimingAsync('handleWindowFocusChanged', async () => {
            if (windowId === chrome.windows.WINDOW_ID_NONE) {
                if (this.previousActiveTab && this.previousActiveTab.url) {
                    const domain = this._extractDomain(this.previousActiveTab.url);
                    if (domain) {
                        this.eventQueueManager.addEvent(CONFIG.TRACKER.EVENT_TYPES.INACTIVE, domain);
                        this._log({ key: 'logs.tabTracking.windowLostFocus', params: { domain } });
                    }
                }
            } else {
                try {
                    const tabs = await chrome.tabs.query({ active: true, windowId: windowId });
                    if (tabs.length > 0) {
                        const tab = tabs[0];
                        if (tab.url) {
                            const domain = this._extractDomain(tab.url);
                            if (domain) {

                                this.eventQueueManager.addEvent(CONFIG.TRACKER.EVENT_TYPES.ACTIVE, domain);

                                this.previousActiveTab = tab;
                                this.updateState({ previousTabId: tab.id });
                                
                                this._log({ key: 'logs.tabTracking.windowGainedFocus', params: { windowId, tabId: tab.id, domain } });
                            }
                        }
                    }
                } catch (error) {
                    this._logError({ key: 'logs.tabTracking.windowFocusChangedError' }, error);
                }
            }
        });
    }

    /**
     * Извлекает домен из URL.
     * 
     * Удаляет префикс www. и проверяет, что домен валидный
     * (содержит точку и не является chrome-extension://).
     * 
     * @private
     * @param {string} url - URL для обработки
     * @returns {string|null} Извлеченный домен или null, если домен невалидный
     */
    _extractDomain(url) {
        try {
            const urlObj = new URL(url);
            let domain = urlObj.hostname;

            if (domain.startsWith(CONFIG.TRACKER.DOMAIN_PREFIXES.WWW)) {
                domain = domain.substring(CONFIG.TRACKER.DOMAIN_PREFIXES.WWW.length);
            }

            if (domain && domain.includes('.') && !domain.startsWith(CONFIG.TRACKER.DOMAIN_PREFIXES.CHROME_EXTENSION)) {
                return domain;
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Останавливает отслеживание вкладок.
     * 
     * Удаляет все слушатели событий Chrome API и очищает внутреннее состояние.
     * 
     * @returns {void}
     */
    stopTracking() {
        this._executeWithTiming('stopTracking', () => {
            this.eventListeners.forEach((listener, eventName) => {
                if (eventName === 'onActivated') {
                    chrome.tabs.onActivated.removeListener(listener);
                } else if (eventName === 'onUpdated') {
                    chrome.tabs.onUpdated.removeListener(listener);
                } else if (eventName === 'onRemoved') {
                    chrome.tabs.onRemoved.removeListener(listener);
                } else if (eventName === 'onFocusChanged') {
                    chrome.windows.onFocusChanged.removeListener(listener);
                }
            });
            
            this.eventListeners.clear();
            this.updateState({ isTracking: false });
            this._log({ key: 'logs.tabTracking.stopped' });
        });

        this.previousActiveTab = null;
    }

    /**
     * Получает информацию о предыдущей активной вкладке.
     * 
     * @returns {TabInfo|null} Информация о предыдущей активной вкладке или null
     */
    getPreviousActiveTab() {
        return this.previousActiveTab;
    }

    /**
     * Уничтожает менеджер и освобождает ресурсы.
     * 
     * @returns {void}
     */
    destroy() {
        this.stopTracking();
        this.previousActiveTab = null;
        super.destroy();
        this._log({ key: 'logs.tabTracking.destroyed' });
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = TabTrackingManager;
    module.exports.default = TabTrackingManager;
}

if (typeof window !== 'undefined') {
    window.TabTrackingManager = TabTrackingManager;
}
