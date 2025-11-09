const BaseManager = require('../../../base/BaseManager.js');
const { normalizeDomainList } = require('../../../utils/domainUtils.js');

/**
 * Менеджер для обработки запросов изменения настроек.
 * Отвечает за обновление URL backend, исключений доменов и состояния отслеживания.
 * 
 * @class SettingsHandlerManager
 * @extends BaseManager
 */
class SettingsHandlerManager extends BaseManager {
    /**
     * Создает экземпляр SettingsHandlerManager.
     * 
     * @param {Object} dependencies - Зависимости менеджера
     * @param {Object} dependencies.backendManager - Менеджер backend
     * @param {Object} dependencies.storageManager - Менеджер хранилища
     * @param {Object} dependencies.eventQueueManager - Менеджер очереди событий
     * @param {Object} dependencies.trackingController - Контроллер трекера
     * @param {Object} [options={}] - Опции конфигурации
     * @param {boolean} [options.enableLogging=false] - Включить логирование
     */
    constructor(dependencies, options = {}) {
        super(options);

        if (!dependencies || !dependencies.backendManager || !dependencies.storageManager || 
            !dependencies.eventQueueManager || !dependencies.trackingController) {
            const t = this._getTranslateFn();
            throw new Error(t('logs.settingsHandler.dependenciesRequired'));
        }

        /** 
         * Менеджер backend для обновления URL
         * @type {Object}
         */
        this.backendManager = dependencies.backendManager;
        
        /** 
         * Менеджер хранилища для сохранения/загрузки данных
         * @type {Object}
         */
        this.storageManager = dependencies.storageManager;
        
        /** 
         * Менеджер очереди событий для управления очередью
         * @type {Object}
         */
        this.eventQueueManager = dependencies.eventQueueManager;

        /** 
         * Контроллер трекера для управления состоянием отслеживания
         * @type {Object}
         */
        this.trackingController = dependencies.trackingController;
        
        this._log({ key: 'logs.settingsHandler.created' });
    }

    /**
     * Обрабатывает запрос обновления URL backend.
     * 
     * Обновляет URL backend API в BackendManager и сохраняет его в хранилище.
     * 
     * @param {Object} request - Объект запроса
     * @param {string} [request.url] - Новый URL backend
     * @param {Object} [request.data] - Данные запроса
     * @param {string} [request.data.url] - Новый URL backend
     * @param {Function} sendResponse - Функция для отправки ответа
     * @returns {void}
     */
    handleUpdateBackendUrl(request, sendResponse) {
        const url = request.url || request.data?.url;
        
        if (!url) {
            this._log({ key: 'logs.settingsHandler.urlNotProvided' });
            const t = this._getTranslateFn();
            sendResponse({ 
                success: false, 
                error: t('logs.settingsHandler.urlRequired')
            });
            return;
        }

        this._log({ key: 'logs.settingsHandler.backendUrlUpdating', params: { url } });
        
        this.backendManager.setBackendUrl(url);
        
        this.storageManager.saveBackendUrl(url)
            .then(success => {
                if (success) {
                    this._log({ key: 'logs.settingsHandler.backendUrlUpdated' });
                    sendResponse({ success: true });
                } else {
                    this._log({ key: 'logs.settingsHandler.backendUrlSaveError' });
                    const t = this._getTranslateFn();
                    sendResponse({ 
                        success: false, 
                        error: t('logs.settingsHandler.backendUrlSaveError')
                    });
                }
            })
            .catch(error => {
                this._logError({ key: 'logs.settingsHandler.backendUrlUpdateError' }, error);
                sendResponse({ 
                    success: false, 
                    error: error.message 
                });
            });
    }

    /**
     * Обрабатывает запрос обновления исключений доменов.
     * 
     * @param {Object} request - Объект запроса
     * @param {Array<string>} [request.domains] - Массив доменов для исключения
     * @param {Object} [request.data] - Данные запроса
     * @param {Array<string>} [request.data.domains] - Массив доменов для исключения
     * @param {Function} sendResponse - Функция для отправки ответа
     * @returns {void}
     */
    handleUpdateDomainExceptions(request, sendResponse) {
        try {
            const incoming = Array.isArray(request.domains)
                ? request.domains
                : (Array.isArray(request.data?.domains) ? request.data.domains : []);

            const normalized = normalizeDomainList(incoming);
            this._log({ key: 'logs.settingsHandler.domainExceptionsUpdating', params: { count: normalized.length } });

            this.storageManager.saveDomainExceptions(normalized)
                .then(success => {
                    if (!success) {
                        const t = this._getTranslateFn();
                        throw new Error(t('logs.settingsHandler.domainExceptionsUpdateError'));
                    }
                    return this.eventQueueManager.setDomainExceptions(normalized);
                })
                .then(result => {
                    sendResponse({
                        success: true,
                        count: normalized.length,
                        removedFromQueue: result?.removedFromQueue || 0
                    });
                })
                .catch(error => {
                    this._logError({ key: 'logs.settingsHandler.domainExceptionsUpdateError' }, error);
                    sendResponse({
                        success: false,
                        error: error.message
                    });
                });
        } catch (error) {
            this._logError({ key: 'logs.settingsHandler.domainExceptionsRequestError' }, error);
            sendResponse({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Обрабатывает запрос изменения состояния отслеживания.
     * 
     * @param {Object} request - Объект запроса
     * @param {boolean} [request.enabled] - Флаг включения отслеживания
     * @param {Object} [request.data] - Данные запроса
     * @param {boolean} [request.data.enabled] - Флаг включения отслеживания
     * @param {Function} sendResponse - Функция для отправки ответа
     * @returns {void}
     */
    handleSetTrackingEnabled(request, sendResponse) {
        try {
            const enabled = typeof request.enabled === 'boolean'
                ? request.enabled
                : (typeof request.data?.enabled === 'boolean' ? request.data.enabled : null);

            if (enabled === null) {
                this._log({ key: 'logs.settingsHandler.enabledFieldMissing' });
                const t = this._getTranslateFn();
                sendResponse({
                    success: false,
                    error: t('logs.settingsHandler.enabledRequired')
                });
                return;
            }

            this._log({ key: 'logs.settingsHandler.trackingStateChanging', params: { enabled } });

            this.trackingController.setTrackingEnabled(enabled)
                .then(result => {
                    sendResponse({
                        success: Boolean(result?.success),
                        isTracking: Boolean(result?.isTracking)
                    });
                })
                .catch(error => {
                    this._logError({ key: 'logs.settingsHandler.trackingStateChangeError' }, error);
                    sendResponse({
                        success: false,
                        error: error.message
                    });
                });
        } catch (error) {
            this._logError({ key: 'logs.settingsHandler.trackingStateRequestError' }, error);
            sendResponse({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Уничтожает менеджер и освобождает ресурсы.
     * 
     * @returns {void}
     */
    destroy() {
        this.backendManager = null;
        this.storageManager = null;
        this.eventQueueManager = null;
        this.trackingController = null;
        super.destroy();
        this._log({ key: 'logs.settingsHandler.destroyed' });
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SettingsHandlerManager;
    module.exports.default = SettingsHandlerManager;
}

if (typeof window !== 'undefined') {
    window.SettingsHandlerManager = SettingsHandlerManager;
}
