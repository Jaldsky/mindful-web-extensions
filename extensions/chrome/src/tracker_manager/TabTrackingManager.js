const BaseManager = require('../BaseManager.js');

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

        // Проверка зависимостей
        if (!dependencies || !dependencies.eventQueueManager) {
            throw new Error('TabTrackingManager требует eventQueueManager');
        }

        /** @type {Object} */
        this.eventQueueManager = dependencies.eventQueueManager;
        
        /** @type {TabInfo|null} */
        this.previousActiveTab = null;
        
        /** @type {number|null} */
        this.inactiveTimeout = null;
        
        /** @type {Map<string, number>} */
        this.performanceMetrics = new Map();
        
        /** @type {Map<string, Function>} */
        this.eventListeners = new Map();
        
        this.updateState({
            isTracking: false,
            previousTabId: null
        });
        
        this._log('TabTrackingManager инициализирован');
    }

    /**
     * Инициализирует отслеживание вкладок.
     * Настраивает слушатели событий Chrome API.
     * 
     * @async
     * @returns {Promise<void>}
     */
    async init() {
        await this._executeWithTimingAsync('init', async () => {
            // Настраиваем слушатели событий
            this._setupEventListeners();
            
            // Инициализируем предыдущую активную вкладку
            await this._initializePreviousTab();
            
            this.updateState({ isTracking: true });
            this._log('Отслеживание вкладок запущено');
        });
    }

    /**
     * Настраивает слушатели событий Chrome API.
     * 
     * @private
     * @returns {void}
     */
    _setupEventListeners() {
        // Отслеживание изменений вкладок
        const onActivatedListener = (activeInfo) => {
            this._handleTabActivated(activeInfo);
        };
        chrome.tabs.onActivated.addListener(onActivatedListener);
        this.eventListeners.set('onActivated', onActivatedListener);

        // Отслеживание обновлений вкладок
        const onUpdatedListener = (tabId, changeInfo, tab) => {
            if (changeInfo.status === 'complete' && tab.active) {
                this._handleTabUpdated(tab);
            }
        };
        chrome.tabs.onUpdated.addListener(onUpdatedListener);
        this.eventListeners.set('onUpdated', onUpdatedListener);

        // Отслеживание закрытия вкладок
        const onRemovedListener = (tabId, removeInfo) => {
            this._handleTabRemoved(tabId, removeInfo);
        };
        chrome.tabs.onRemoved.addListener(onRemovedListener);
        this.eventListeners.set('onRemoved', onRemovedListener);

        // Отслеживание изменений окна
        const onFocusChangedListener = (windowId) => {
            this._handleWindowFocusChanged(windowId);
        };
        chrome.windows.onFocusChanged.addListener(onFocusChangedListener);
        this.eventListeners.set('onFocusChanged', onFocusChangedListener);
        
        this._log('Слушатели событий настроены');
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
                this._log('Предыдущая вкладка инициализирована', { 
                    tabId: this.previousActiveTab.id,
                    url: this.previousActiveTab.url 
                });
            }
        } catch (error) {
            this._logError('Ошибка инициализации предыдущей вкладки', error);
        }
    }

    /**
     * Обрабатывает активацию вкладки.
     * 
     * @private
     * @async
     * @param {Object} activeInfo - Информация об активации
     * @returns {Promise<void>}
     */
    async _handleTabActivated(activeInfo) {
        await this._executeWithTimingAsync('handleTabActivated', async () => {
            try {
                const tab = await chrome.tabs.get(activeInfo.tabId);
                if (tab && tab.url) {
                    const domain = this._extractDomain(tab.url);
                    if (domain) {
                        // Отправляем inactive для предыдущей вкладки, если она была
                        if (this.previousActiveTab && this.previousActiveTab.id !== tab.id) {
                            const previousDomain = this._extractDomain(this.previousActiveTab.url);
                            if (previousDomain) {
                                this.eventQueueManager.addEvent('inactive', previousDomain);
                            }
                        }
                        
                        // Отправляем active для новой вкладки
                        this.eventQueueManager.addEvent('active', domain);
                        
                        // Сохраняем текущую вкладку как предыдущую
                        this.previousActiveTab = tab;
                        this.updateState({ previousTabId: tab.id });
                        
                        this._log('Вкладка активирована', { 
                            tabId: tab.id,
                            domain 
                        });
                    }
                }
            } catch (error) {
                this._logError('Ошибка обработки активации вкладки', error);
            }
        });
    }

    /**
     * Обрабатывает обновление вкладки.
     * 
     * @private
     * @param {Object} tab - Объект вкладки
     * @returns {void}
     */
    _handleTabUpdated(tab) {
        this._executeWithTiming('handleTabUpdated', () => {
            if (tab && tab.url) {
                const domain = this._extractDomain(tab.url);
                if (domain) {
                    // Отправляем inactive для предыдущей вкладки, если она была
                    if (this.previousActiveTab && this.previousActiveTab.id !== tab.id) {
                        const previousDomain = this._extractDomain(this.previousActiveTab.url);
                        if (previousDomain) {
                            this.eventQueueManager.addEvent('inactive', previousDomain);
                        }
                    }
                    
                    // Отправляем active для обновленной вкладки
                    this.eventQueueManager.addEvent('active', domain);
                    
                    // Обновляем предыдущую вкладку
                    this.previousActiveTab = tab;
                    this.updateState({ previousTabId: tab.id });
                    
                    this._log('Вкладка обновлена', { 
                        tabId: tab.id,
                        domain 
                    });
                }
            }
        });
    }

    /**
     * Обрабатывает закрытие вкладки.
     * 
     * @private
     * @async
     * @param {number} tabId - ID закрытой вкладки
     * @param {Object} removeInfo - Информация о закрытии
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
                            this.eventQueueManager.addEvent('inactive', domain);
                            this._log('Вкладка закрыта', { tabId, domain });
                        }
                    }
                } catch (error) {
                    this._logError('Ошибка обработки закрытия вкладки', error);
                }
            }
        });
    }

    /**
     * Обрабатывает изменение фокуса окна.
     * 
     * @private
     * @async
     * @param {number} windowId - ID окна
     * @returns {Promise<void>}
     */
    async _handleWindowFocusChanged(windowId) {
        await this._executeWithTimingAsync('handleWindowFocusChanged', async () => {
            if (windowId === chrome.windows.WINDOW_ID_NONE) {
                // Все окна потеряли фокус - отправляем inactive для предыдущей вкладки
                if (this.previousActiveTab && this.previousActiveTab.url) {
                    const domain = this._extractDomain(this.previousActiveTab.url);
                    if (domain) {
                        this.eventQueueManager.addEvent('inactive', domain);
                        this._log('Окно потеряло фокус', { domain });
                    }
                }
            } else {
                // Окно получило фокус
                try {
                    const tabs = await chrome.tabs.query({ active: true, windowId: windowId });
                    if (tabs.length > 0) {
                        const tab = tabs[0];
                        if (tab.url) {
                            const domain = this._extractDomain(tab.url);
                            if (domain) {
                                // Отправляем active для новой активной вкладки
                                this.eventQueueManager.addEvent('active', domain);
                                
                                // Обновляем предыдущую вкладку
                                this.previousActiveTab = tab;
                                this.updateState({ previousTabId: tab.id });
                                
                                this._log('Окно получило фокус', { 
                                    windowId,
                                    tabId: tab.id,
                                    domain 
                                });
                            }
                        }
                    }
                } catch (error) {
                    this._logError('Ошибка обработки изменения фокуса окна', error);
                }
            }
        });
    }

    /**
     * Извлекает домен из URL.
     * 
     * @private
     * @param {string} url - URL для обработки
     * @returns {string|null} Извлеченный домен или null
     */
    _extractDomain(url) {
        try {
            const urlObj = new URL(url);
            let domain = urlObj.hostname;
            
            // Убираем www. префикс
            if (domain.startsWith('www.')) {
                domain = domain.substring(4);
            }
            
            // Проверяем, что это валидный домен
            if (domain && domain.includes('.') && !domain.startsWith('chrome-extension://')) {
                return domain;
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Останавливает отслеживание вкладок.
     * Удаляет все слушатели событий.
     * 
     * @returns {void}
     */
    stopTracking() {
        this._executeWithTiming('stopTracking', () => {
            // Удаляем слушатели событий
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
            this._log('Отслеживание вкладок остановлено');
        });
    }

    /**
     * Получает информацию о текущей активной вкладке.
     * 
     * @returns {TabInfo|null} Информация о вкладке
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
        this.performanceMetrics.clear();
        super.destroy();
        this._log('TabTrackingManager уничтожен');
    }
}

module.exports = TabTrackingManager;
