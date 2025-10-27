const BaseManager = require('../../base/BaseManager.js');
const CONFIG = require('../../../config.js');

/**
 * @typedef {Object} StatusHistoryEntry
 * @property {string} type - Тип статуса
 * @property {string} message - Сообщение статуса
 * @property {string} timestamp - ISO строка времени
 * @property {number} duration - Время отображения в мс
 */

/**
 * @typedef {Object} StatusQueueItem
 * @property {string} message - Текст сообщения
 * @property {string} type - Тип статуса
 * @property {number} duration - Длительность отображения
 * @property {number} timestamp - Временная метка создания
 */

/**
 * Менеджер для отображения статусных сообщений на странице настроек.
 * Отвечает за создание, отображение и скрытие статусных уведомлений.
 * Поддерживает очередь сообщений, историю статусов и измерение производительности.
 * 
 * @class StatusManager
 * @extends BaseManager
 */
class StatusManager extends BaseManager {
    /**
     * Типы статусов
     * @readonly
     * @enum {string}
     */
    static STATUS_TYPES = CONFIG.STATUS_TYPES;

    /**
     * Длительность отображения статуса по умолчанию (мс)
     * @readonly
     */
    static DEFAULT_DISPLAY_DURATION = CONFIG.STATUS_SETTINGS.DEFAULT_DURATION;

    /**
     * Максимальный размер истории статусов
     * @readonly
     */
    static MAX_HISTORY_SIZE = CONFIG.STATUS_SETTINGS.MAX_HISTORY_SIZE;

    /**
     * Максимальный размер очереди
     * @readonly
     */
    static MAX_QUEUE_SIZE = CONFIG.STATUS_SETTINGS.MAX_QUEUE_SIZE;

    /**
     * Создает экземпляр StatusManager.
     * 
     * @param {Object} [options={}] - Опции конфигурации
     * @param {boolean} [options.enableLogging=false] - Включить детальное логирование
     * @param {HTMLElement|null} [options.statusElement=null] - Элемент для отображения статуса
     * @param {number} [options.defaultDuration] - Длительность отображения по умолчанию
     * @param {boolean} [options.enableHistory=true] - Включить ведение истории статусов
     * @param {boolean} [options.enableQueue=false] - Включить очередь сообщений
     * @param {number} [options.maxHistorySize] - Максимальный размер истории
     * @param {number} [options.maxQueueSize] - Максимальный размер очереди
     */
    constructor(options = {}) {
        super(options);
        
        /** @type {HTMLElement|null} */
        this.statusElement = options.statusElement || null;
        
        /** @type {number} */
        this.defaultDuration = options.defaultDuration || StatusManager.DEFAULT_DISPLAY_DURATION;
        
        /** @type {number|null} */
        this.hideTimeout = null;
        
        /** @type {boolean} */
        this.enableHistory = options.enableHistory !== false;
        
        /** @type {boolean} */
        this.enableQueue = options.enableQueue === true;
        
        /** @type {number} */
        this.maxHistorySize = options.maxHistorySize || StatusManager.MAX_HISTORY_SIZE;
        
        /** @type {number} */
        this.maxQueueSize = options.maxQueueSize || StatusManager.MAX_QUEUE_SIZE;
        
        /** @type {StatusHistoryEntry[]} */
        this.history = [];
        
        /** @type {StatusQueueItem[]} */
        this.queue = [];
        
        /** @type {boolean} */
        this.isProcessingQueue = false;
        
        /** @type {number|null} */
        this.lastDisplayTimestamp = null;
        
        this.updateState({
            currentType: null,
            currentMessage: null,
            isVisible: false,
            queueLength: 0,
            historyLength: 0
        });
        
        this._log('StatusManager инициализирован', {
            enableHistory: this.enableHistory,
            enableQueue: this.enableQueue,
            defaultDuration: this.defaultDuration,
            hasStatusElement: !!this.statusElement
        });
        
        // Валидируем элемент статуса если он предоставлен
        if (this.statusElement) {
            this._validateStatusElement();
        }
    }

    /**
     * Валидирует элемент статуса.
     * 
     * @private
     * @throws {Error} Если statusElement некорректен
     * @returns {void}
     */
    _validateStatusElement() {
        if (!this.statusElement) {
            return;
        }
        
        if (!(this.statusElement instanceof HTMLElement)) {
            const error = new Error('statusElement должен быть HTMLElement');
            this._logError('Критическая ошибка валидации', error);
            throw error;
        }
        
        // Проверяем, что элемент в DOM
        if (!document.body.contains(this.statusElement)) {
            this._log('Предупреждение: statusElement не находится в DOM');
        }
        
        this._log('statusElement валиден');
    }

    /**
     * Устанавливает элемент статуса с валидацией.
     * 
     * @param {HTMLElement} element - DOM элемент для статуса
     * @throws {TypeError} Если element не является HTMLElement
     * @returns {void}
     */
    setStatusElement(element) {
        if (!(element instanceof HTMLElement)) {
            throw new TypeError('element должен быть HTMLElement');
        }
        
        this.statusElement = element;
        this._validateStatusElement();
        
        this._log('Элемент статуса установлен и валидирован');
    }

    /**
     * Добавляет запись в историю статусов.
     * 
     * @private
     * @param {string} type - Тип статуса
     * @param {string} message - Сообщение статуса
     * @param {number} duration - Время отображения
     * @returns {void}
     */
    _addToHistory(type, message, duration) {
        if (!this.enableHistory) {
            return;
        }

        try {
            /** @type {StatusHistoryEntry} */
            const entry = {
                type,
                message,
                timestamp: new Date().toISOString(),
                duration
            };

            this.history.push(entry);

            // Ограничиваем размер истории
            if (this.history.length > this.maxHistorySize) {
                this.history.shift();
            }

            this.updateState({ historyLength: this.history.length });
            this._log('Добавлена запись в историю', { entriesCount: this.history.length });
        } catch (error) {
            this._logError('Ошибка добавления в историю', error);
        }
    }

    /**
     * Добавляет сообщение в очередь.
     * 
     * @private
     * @param {string} message - Текст сообщения
     * @param {string} type - Тип статуса
     * @param {number} duration - Длительность отображения
     * @returns {boolean} true если добавлено в очередь
     */
    _addToQueue(message, type, duration) {
        if (!this.enableQueue) {
            return false;
        }

        try {
            if (this.queue.length >= this.maxQueueSize) {
                this._log('Очередь переполнена, пропуск сообщения');
                return false;
            }

            /** @type {StatusQueueItem} */
            const item = {
                message,
                type,
                duration,
                timestamp: Date.now()
            };

            this.queue.push(item);
            this.updateState({ queueLength: this.queue.length });
            
            this._log('Сообщение добавлено в очередь', { queueLength: this.queue.length });
            
            // Запускаем обработку очереди если она не активна
            if (!this.isProcessingQueue && !this.state.isVisible) {
                this._processQueue();
            }

            return true;
        } catch (error) {
            this._logError('Ошибка добавления в очередь', error);
            return false;
        }
    }

    /**
     * Обрабатывает очередь сообщений с измерением производительности.
     * 
     * @private
     * @returns {Promise<void>}
     */
    async _processQueue() {
        if (this.isProcessingQueue || this.queue.length === 0) {
            return;
        }

        return this._executeWithTimingAsync('processQueue', async () => {
            this.isProcessingQueue = true;
            const queueStartSize = this.queue.length;
            this._log('Начало обработки очереди', { queueLength: queueStartSize });

            let processedCount = 0;
            let failedCount = 0;

            try {
                while (this.queue.length > 0) {
                    const item = this.queue.shift();
                    this.updateState({ queueLength: this.queue.length });

                    if (item) {
                        const success = await this._displayStatusInternal(
                            item.message, 
                            item.type, 
                            item.duration
                        );
                        
                        if (success) {
                            processedCount++;
                        } else {
                            failedCount++;
                        }
                        
                        // Ждем завершения отображения текущего статуса
                        if (item.duration > 0) {
                            await new Promise(resolve => setTimeout(resolve, item.duration));
                        }
                    }
                }

                this._log('Обработка очереди завершена', {
                    startSize: queueStartSize,
                    processed: processedCount,
                    failed: failedCount
                });
                
            } catch (error) {
                this._logError('Критическая ошибка обработки очереди', error);
            } finally {
                this.isProcessingQueue = false;
            }
        });
    }

    /**
     * Внутренний метод отображения статуса с полной верификацией.
     * 
     * @private
     * @param {string} message - Текст сообщения
     * @param {string} type - Тип статуса
     * @param {number} duration - Длительность отображения
     * @returns {Promise<boolean>} true если отображено успешно
     */
    async _displayStatusInternal(message, type, duration) {
        return this._executeWithTimingAsync('displayStatus', async () => {
            if (!this.statusElement) {
                this._logError('Элемент статуса не установлен');
                return false;
            }

            // Проверяем, что элемент все еще в DOM
            if (!document.body.contains(this.statusElement)) {
                this._logError('Элемент статуса не находится в DOM');
                return false;
            }

            // Очищаем предыдущий таймер
            this._clearHideTimeout();

            // Устанавливаем текст и класс (используем CSS классы из styles/options.css)
            this.statusElement.textContent = message;
            this.statusElement.className = `status-message ${type} visible`;

            // Верификация отображения
            const isVisible = this.statusElement.classList.contains('visible');
            const hasCorrectClass = this.statusElement.classList.contains('status-message') && 
                                   this.statusElement.classList.contains(type);
            const hasCorrectText = this.statusElement.textContent === message;

            if (!isVisible || !hasCorrectClass || !hasCorrectText) {
                this._logError('Верификация отображения не удалась', {
                    isVisible,
                    hasCorrectClass,
                    hasCorrectText
                });
                return false;
            }

            this.lastDisplayTimestamp = Date.now();

            this.updateState({
                currentType: type,
                currentMessage: message,
                isVisible: true
            });

            this._log('Статус отображен и верифицирован', {
                message: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
                type,
                duration: `${duration}мс`
            });

            // Добавляем в историю
            this._addToHistory(type, message, duration);

            // Планируем скрытие если указана длительность
            if (duration > 0) {
                this._scheduleHide(duration);
            }

            return true;
        });
    }

    /**
     * Показывает статусное сообщение.
     * 
     * @param {string} message - Текст сообщения
     * @param {string} [type='info'] - Тип статуса (из STATUS_TYPES)
     * @param {number} [duration] - Длительность отображения в мс (0 = бесконечно)
     * @throws {TypeError} Если message не является строкой
     * @returns {boolean} true если сообщение отображено
     */
    showStatus(message, type = StatusManager.STATUS_TYPES.INFO, duration) {
        if (typeof message !== 'string' || message.trim() === '') {
            throw new TypeError('message должен быть непустой строкой');
        }

        if (!Object.values(StatusManager.STATUS_TYPES).includes(type)) {
            this._log(`Неверный тип "${type}", используется INFO`);
            type = StatusManager.STATUS_TYPES.INFO;
        }

        if (!this.statusElement) {
            this._logError('Элемент статуса не установлен');
            return false;
        }

        const displayDuration = duration !== undefined ? duration : this.defaultDuration;

        // Если включена очередь и статус уже отображается, добавляем в очередь
        if (this.enableQueue && this.state.isVisible) {
            return this._addToQueue(message, type, displayDuration);
        }

        try {
            return this._displayStatusInternal(message, type, displayDuration);
        } catch (error) {
            this._logError('Ошибка отображения статуса', error);
            return false;
        }
    }

    /**
     * Планирует скрытие статуса через указанное время.
     * 
     * @private
     * @param {number} duration - Длительность в мс
     * @returns {void}
     */
    _scheduleHide(duration) {
        this.hideTimeout = setTimeout(() => {
            this.hideStatus();
        }, duration);
        
        this._log(`Скрытие статуса запланировано через ${duration}мс`);
    }

    /**
     * Очищает таймер скрытия.
     * 
     * @private
     * @returns {void}
     */
    _clearHideTimeout() {
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
            this.hideTimeout = null;
            this._log('Таймер скрытия очищен');
        }
    }

    /**
     * Скрывает статусное сообщение с верификацией.
     * 
     * @returns {boolean} true если сообщение скрыто
     */
    hideStatus() {
        if (!this.statusElement) {
            this._log('Нет элемента статуса для скрытия');
            return false;
        }

        const startTime = performance.now();

        try {
            this._clearHideTimeout();
            
            this.statusElement.textContent = '';
            this.statusElement.className = 'status-message hidden';

            // Верификация скрытия
            const isHidden = this.statusElement.classList.contains('hidden');
            const isCleared = this.statusElement.textContent === '';

            if (!isHidden || !isCleared) {
                this._logError('Верификация скрытия не удалась', {
                    isHidden,
                    isCleared
                });
                return false;
            }

            this.updateState({
                currentType: null,
                currentMessage: null,
                isVisible: false
            });

            const hideTime = Math.round(performance.now() - startTime);
            this.performanceMetrics.set('hideStatus_lastDuration', hideTime);
            
            this._log(`Статус скрыт и верифицирован (${hideTime}мс)`);
            
            return true;
        } catch (error) {
            const hideTime = Math.round(performance.now() - startTime);
            this._logError(`Ошибка скрытия статуса (${hideTime}мс)`, error);
            return false;
        }
    }

    /**
     * Показывает статус успеха.
     * 
     * @param {string} message - Текст сообщения
     * @param {number} [duration] - Длительность отображения в мс
     * @returns {boolean} true если сообщение отображено
     */
    showSuccess(message, duration) {
        return this.showStatus(message, StatusManager.STATUS_TYPES.SUCCESS, duration);
    }

    /**
     * Показывает статус ошибки.
     * 
     * @param {string} message - Текст сообщения
     * @param {number} [duration] - Длительность отображения в мс
     * @returns {boolean} true если сообщение отображено
     */
    showError(message, duration) {
        return this.showStatus(message, StatusManager.STATUS_TYPES.ERROR, duration);
    }

    /**
     * Получает историю статусов.
     * 
     * @param {Object} [options={}] - Опции фильтрации
     * @param {string} [options.type] - Фильтр по типу статуса
     * @param {number} [options.limit] - Ограничение количества записей
     * @returns {StatusHistoryEntry[]} Массив записей истории
     */
    getHistory(options = {}) {
        try {
            let result = [...this.history];

            // Фильтр по типу
            if (options.type && Object.values(StatusManager.STATUS_TYPES).includes(options.type)) {
                result = result.filter(entry => entry.type === options.type);
            }

            // Ограничение количества
            if (options.limit && typeof options.limit === 'number' && options.limit > 0) {
                result = result.slice(-options.limit);
            }

            return result;
        } catch (error) {
            this._logError('Ошибка получения истории', error);
            return [];
        }
    }

    /**
     * Очищает историю статусов.
     * 
     * @returns {number} Количество удаленных записей
     */
    clearHistory() {
        try {
            const count = this.history.length;
            this.history = [];
            this.updateState({ historyLength: 0 });
            
            this._log(`История очищена: ${count} записей`);
            return count;
        } catch (error) {
            this._logError('Ошибка очистки истории', error);
            return 0;
        }
    }

    /**
     * Очищает очередь сообщений.
     * 
     * @private
     * @returns {number} Количество удаленных сообщений
     */
    _clearQueue() {
        try {
            const count = this.queue.length;
            this.queue = [];
            this.updateState({ queueLength: 0 });
            
            this._log(`Очередь очищена: ${count} сообщений`);
            return count;
        } catch (error) {
            this._logError('Ошибка очистки очереди', error);
            return 0;
        }
    }

    /**
     * Получает статистику работы менеджера.
     * 
     * @returns {Object} Статистика
     */
    getStatistics() {
        try {
            const historyByType = {};
            Object.values(StatusManager.STATUS_TYPES).forEach(type => {
                historyByType[type] = this.history.filter(entry => entry.type === type).length;
            });

            return {
                totalHistoryEntries: this.history.length,
                historyByType,
                queueLength: this.queue.length,
                isVisible: this.state.isVisible,
                currentType: this.state.currentType,
                lastDisplayTimestamp: this.lastDisplayTimestamp,
                performanceMetrics: this.getPerformanceMetrics(),
                isProcessingQueue: this.isProcessingQueue
            };
        } catch (error) {
            this._logError('Ошибка получения статистики', error);
            return {};
        }
    }

    /**
     * Проверяет валидность состояния менеджера.
     * 
     * @returns {Object} Результат проверки
     */
    validateState() {
        const issues = [];

        try {
            if (this.statusElement && !(this.statusElement instanceof HTMLElement)) {
                issues.push('statusElement не является HTMLElement');
            }

            if (this.defaultDuration < 0) {
                issues.push('defaultDuration не может быть отрицательным');
            }

            if (this.history.length > this.maxHistorySize) {
                issues.push(`История превышает максимальный размер: ${this.history.length}/${this.maxHistorySize}`);
            }

            if (this.queue.length > this.maxQueueSize) {
                issues.push(`Очередь превышает максимальный размер: ${this.queue.length}/${this.maxQueueSize}`);
            }

            if (this.state.isVisible && !this.state.currentType) {
                issues.push('Статус видим, но тип не установлен');
            }

            if (this.state.isVisible && !this.state.currentMessage) {
                issues.push('Статус видим, но сообщение не установлено');
            }

            const isValid = issues.length === 0;

            return {
                isValid,
                issues,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            this._logError('Ошибка валидации состояния', error);
            return {
                isValid: false,
                issues: ['Ошибка при выполнении валидации'],
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Очищает ресурсы при уничтожении менеджера.
     * 
     * @returns {void}
     */
    destroy() {
        this._log('Очистка ресурсов StatusManager');
        
        try {
            // Останавливаем все таймеры
        this._clearHideTimeout();
            
            // Очищаем очередь
            this._clearQueue();
            
            // Останавливаем обработку очереди
            this.isProcessingQueue = false;
            
            // Скрываем текущий статус
        this.hideStatus();
            
            // Очищаем историю
            if (this.enableHistory) {
                this.clearHistory();
            }
            
            // Убираем ссылку на элемент
        this.statusElement = null;
            
            this._log('StatusManager уничтожен');
        } catch (error) {
            this._logError('Ошибка при уничтожении StatusManager', error);
        }
        
        super.destroy();
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = StatusManager;
    module.exports.default = StatusManager;
}

if (typeof window !== 'undefined') {
    window.StatusManager = StatusManager;
}
