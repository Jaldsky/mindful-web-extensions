/**
 * @jest-environment jsdom
 */

/**
 * Тесты для StatusManager
 */

const StatusManager = require('../../../src/managers/options/StatusManager.js');

describe('StatusManager', () => {
    let statusManager;
    let statusElement;

    beforeEach(() => {
        // Создаем DOM элемент для статуса
        statusElement = document.createElement('div');
        statusElement.id = 'status';
        document.body.appendChild(statusElement);

        statusManager = new StatusManager({
            enableLogging: false,
            statusElement: statusElement,
            defaultDuration: 1000
        });

        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.clearAllTimers();
        jest.useRealTimers();
        
        if (statusManager) {
            statusManager.destroy();
        }
        
        if (statusElement && statusElement.parentNode) {
            statusElement.parentNode.removeChild(statusElement);
        }
    });

    describe('Инициализация', () => {
        test('должен создаваться с настройками по умолчанию', () => {
            expect(statusManager).toBeInstanceOf(StatusManager);
            expect(statusManager.renderer.statusElement).toBe(statusElement);
            expect(statusManager.defaultDuration).toBe(1000);
            expect(statusManager.historyManager.enableHistory).toBe(true);
            expect(statusManager.queueManager.enableQueue).toBe(false);
        });

        test('должен создаваться с пользовательскими настройками', () => {
            const customManager = new StatusManager({
                enableLogging: false,
                statusElement: statusElement,
                enableHistory: false,
                enableQueue: true,
                maxHistorySize: 25,
                maxQueueSize: 5
            });

            expect(customManager.historyManager.enableHistory).toBe(false);
            expect(customManager.queueManager.enableQueue).toBe(true);
            expect(customManager.historyManager.maxHistorySize).toBe(25);
            expect(customManager.queueManager.maxQueueSize).toBe(5);

            customManager.destroy();
        });

        test('должен работать без statusElement', () => {
            const manager = new StatusManager({ enableLogging: false });

            expect(manager.renderer.statusElement).toBeNull();
            manager.destroy();
        });

        test('должен валидировать statusElement при создании', () => {
            expect(() => {
                new StatusManager({
                    statusElement: 'not-an-element'
                });
            }).toThrow('statusElement должен быть HTMLElement');
        });
    });

    describe('showSuccess', () => {
        test('должен отображать сообщение об успехе', async () => {
            const result = await statusManager.showSuccess('Operation successful');

            expect(result).toBe(true);
            expect(statusElement.textContent).toBe('Operation successful');
            expect(statusElement.className).toBe('status-message success visible');
            expect(statusElement.classList.contains('visible')).toBe(true);
        });

        test('должен использовать defaultDuration', async () => {
            await statusManager.showSuccess('Test message');

            expect(statusManager.renderer.hideTimeout).not.toBeNull();
        });
    });

    describe('showError', () => {
        test('должен отображать сообщение об ошибке', async () => {
            const result = await statusManager.showError('Error occurred');

            expect(result).toBe(true);
            expect(statusElement.textContent).toBe('Error occurred');
            expect(statusElement.className).toBe('status-message error visible');
            expect(statusElement.classList.contains('visible')).toBe(true);
        });
    });

    describe('showStatus', () => {
        test('должен отображать кастомный статус', async () => {
            const result = await statusManager.showStatus('Info message', StatusManager.STATUS_TYPES.INFO, 1000);

            expect(result).toBe(true);
            expect(statusElement.textContent).toBe('Info message');
            expect(statusElement.className).toBe('status-message info visible');
            expect(statusElement.classList.contains('visible')).toBe(true);
        });

        test('должен валидировать пустое сообщение', () => {
            expect(() => {
                statusManager.showStatus('', StatusManager.STATUS_TYPES.INFO);
            }).toThrow(TypeError);
        });

        test('должен использовать INFO для невалидного типа', async () => {
            const result = await statusManager.showStatus('Test message', 'invalid-type');

            expect(result).toBe(true);
            expect(statusElement.className).toBe('status-message info visible'); // должен использовать INFO по умолчанию
        });
    });

    describe('hideStatus', () => {
        test('должен скрывать статус', async () => {
            await statusManager.showSuccess('Test');
            const result = statusManager.hideStatus();

            expect(result).toBe(true);
            expect(statusElement.classList.contains('hidden')).toBe(true);
        });

        test('должен очищать hideTimeout', async () => {
            await statusManager.showSuccess('Test');
            statusManager.hideStatus();

            expect(statusManager.renderer.hideTimeout).toBeNull();
        });
    });

    describe('История статусов', () => {
        test('должен добавлять записи в историю если enableHistory включен', async () => {
            await statusManager.showSuccess('Message 1');
            await statusManager.showError('Message 2');

            const history = statusManager.getHistory();
            expect(history).toHaveLength(2);
            expect(history[0]).toHaveProperty('type');
            expect(history[0]).toHaveProperty('message');
            expect(history[0]).toHaveProperty('timestamp');
            expect(history[0]).toHaveProperty('duration');
        });

        test('не должен добавлять в историю если enableHistory выключен', async () => {
            const manager = new StatusManager({
                enableLogging: false,
                statusElement: statusElement,
                enableHistory: false
            });

            await manager.showSuccess('Test');

            const history = manager.getHistory();
            expect(history).toHaveLength(0);

            manager.destroy();
        });

        test('должен ограничивать размер истории', async () => {
            const manager = new StatusManager({
                enableLogging: false,
                statusElement: statusElement,
                maxHistorySize: 3
            });

            for (let i = 0; i < 5; i++) {
                await manager.showSuccess(`Message ${i}`);
            }

            const history = manager.getHistory();
            expect(history.length).toBeLessThanOrEqual(3);

            manager.destroy();
        });

        test('getHistory должен фильтровать по типу', async () => {
            await statusManager.showSuccess('Success 1');
            await statusManager.showError('Error 1');
            await statusManager.showSuccess('Success 2');

            const successHistory = statusManager.getHistory({ type: 'success' });
            expect(successHistory).toHaveLength(2);
            expect(successHistory.every(entry => entry.type === 'success')).toBe(true);
        });

        test('getHistory должен ограничивать количество записей', async () => {
            await statusManager.showSuccess('Message 1');
            await statusManager.showSuccess('Message 2');
            await statusManager.showSuccess('Message 3');

            const limitedHistory = statusManager.getHistory({ limit: 2 });
            expect(limitedHistory).toHaveLength(2);
        });

        test('clearHistory должен очищать историю', async () => {
            await statusManager.showSuccess('Message 1');
            await statusManager.showSuccess('Message 2');

            const count = statusManager.clearHistory();
            expect(count).toBe(2);
            expect(statusManager.getHistory()).toHaveLength(0);
        });
    });

    describe('Очередь сообщений', () => {
        test('должен добавлять сообщения в очередь если enableQueue включен', async () => {
            const manager = new StatusManager({
                enableLogging: false,
                statusElement: statusElement,
                enableQueue: true
            });

            // Первое сообщение отображается сразу
            await manager.showSuccess('Message 1');
            
            // Последующие добавляются в очередь
            const result2 = await manager.showSuccess('Message 2');
            const result3 = await manager.showSuccess('Message 3');

            // Второе и третье должны быть в очереди
            expect(manager.queueManager.size()).toBeGreaterThan(0);

            manager.destroy();
        });

        test('не должен использовать очередь если enableQueue выключен', async () => {
            await statusManager.showSuccess('Message 1');
            await statusManager.showSuccess('Message 2');

            expect(statusManager.queueManager.size()).toBe(0);
        });

        test('должен ограничивать размер очереди', async () => {
            const manager = new StatusManager({
                enableLogging: false,
                statusElement: statusElement,
                enableQueue: true,
                maxQueueSize: 2
            });

            await manager.showSuccess('Message 1');
            await manager.showSuccess('Message 2');
            await manager.showSuccess('Message 3');
            await manager.showSuccess('Message 4'); // Должно быть отклонено

            expect(manager.queueManager.size()).toBeLessThanOrEqual(2);

            manager.destroy();
        });
    });

    describe('Статистика', () => {
        test('должен возвращать статистику работы', async () => {
            await statusManager.showSuccess('Success 1');
            await statusManager.showError('Error 1');
            await statusManager.showStatus('Info 1', StatusManager.STATUS_TYPES.INFO);

            const stats = statusManager.getStatistics();

            expect(stats).toHaveProperty('totalHistoryEntries');
            expect(stats).toHaveProperty('historyByType');
            expect(stats).toHaveProperty('queueLength');
            expect(stats).toHaveProperty('performanceMetrics');
        });

        test('статистика должна отражать историю по типам', async () => {
            await statusManager.showSuccess('Success 1');
            await statusManager.showSuccess('Success 2');
            await statusManager.showError('Error 1');

            const stats = statusManager.getStatistics();

            expect(stats.historyByType.success).toBe(2);
            expect(stats.historyByType.error).toBe(1);
        });
    });

    describe('Метрики производительности', () => {
        test('должен собирать метрики производительности', async () => {
            await statusManager.showSuccess('Test message');

            const metrics = statusManager.getPerformanceMetrics();
            expect(metrics).toHaveProperty('displayStatus_lastDuration');
            expect(typeof metrics.displayStatus_lastDuration).toBe('number');
        });
    });

    describe('validateState', () => {
        test('должен возвращать валидное состояние для корректного менеджера', () => {
            const result = statusManager.validateState();

            expect(result.isValid).toBe(true);
            expect(result.issues).toEqual([]);
        });

        test('должен выявлять проблемы в состоянии', () => {
            statusManager.queueManager.items = 'not-an-array'; // намеренно ломаем

            const result = statusManager.validateState();

            expect(result.isValid).toBe(false);
            expect(result.issues.length).toBeGreaterThan(0);
        });
    });

    describe('setStatusElement', () => {
        test('должен устанавливать новый элемент статуса', () => {
            const newElement = document.createElement('div');
            document.body.appendChild(newElement);

            statusManager.setStatusElement(newElement);

            expect(statusManager.renderer.statusElement).toBe(newElement);

            newElement.parentNode.removeChild(newElement);
        });

        test('должен валидировать новый элемент', () => {
            expect(() => {
                statusManager.setStatusElement('not-an-element');
            }).toThrow(TypeError);
        });
    });

    describe('Граничные случаи', () => {
        test('должен отклонять пустые сообщения', () => {
            expect(() => {
                statusManager.showSuccess('');
            }).toThrow(TypeError);
            
            expect(() => {
                statusManager.showStatus('   ', StatusManager.STATUS_TYPES.INFO);
            }).toThrow(TypeError);
        });

        test('должен корректно обрабатывать очень длинные сообщения', async () => {
            const longMessage = 'a'.repeat(1000);
            const result = await statusManager.showSuccess(longMessage);

            expect(result).toBe(true);
            expect(statusElement.textContent).toBe(longMessage);
        });

        test('должен корректно работать если элемент удален из DOM', async () => {
            statusElement.parentNode.removeChild(statusElement);

            const result = await statusManager.showSuccess('Test');

            expect(result).toBe(false);
        });

        test('должен корректно работать без statusElement', async () => {
            const manager = new StatusManager({ enableLogging: false });

            const result = await manager.showSuccess('Test');

            expect(result).toBe(false);
            manager.destroy();
        });
    });

    describe('destroy', () => {
        test('должен очищать все ресурсы', async () => {
            await statusManager.showSuccess('Test');
            statusManager.destroy();

            expect(statusManager.historyManager.size()).toBe(0);
            expect(statusManager.queueManager.size()).toBe(0);
            expect(statusManager.renderer.hideTimeout).toBeNull();
            expect(statusManager.renderer.statusElement).toBeNull();
        });

        test('должен останавливать обработку очереди', async () => {
            const manager = new StatusManager({
                enableLogging: false,
                statusElement: statusElement,
                enableQueue: true
            });

            await manager.showSuccess('Message 1');
            await manager.showSuccess('Message 2');

            manager.destroy();

            expect(manager.queueManager.isProcessing).toBe(false);
        });
    });

    describe('showWarning', () => {
        test('должен отображать предупреждение', async () => {
            const result = await statusManager.showWarning('Warning message');

            expect(result).toBe(true);
            expect(statusElement.textContent).toBe('Warning message');
            expect(statusElement.className).toBe('status-message warning visible');
        });
    });

    describe('showInfo', () => {
        test('должен отображать информационное сообщение', async () => {
            const result = await statusManager.showInfo('Info message');

            expect(result).toBe(true);
            expect(statusElement.textContent).toBe('Info message');
            expect(statusElement.className).toBe('status-message info visible');
        });
    });

    describe('Обработка ошибок', () => {
        test('должен обрабатывать ошибки при отображении статуса', async () => {
            // Создаем элемент, который будет выбрасывать ошибку при установке textContent
            const brokenElement = document.createElement('div');
            Object.defineProperty(brokenElement, 'textContent', {
                get: function() {
                    return '';
                },
                set: function() {
                    throw new Error('Cannot set textContent');
                }
            });
            
            const manager = new StatusManager({
                enableLogging: false,
                statusElement: brokenElement
            });

            const result = await manager.showSuccess('Test');

            expect(result).toBe(false);
            manager.destroy();
        });

        test('должен обрабатывать ошибки при скрытии статуса', async () => {
            await statusManager.showSuccess('Test');
            
            // Создаем ситуацию, которая вызовет ошибку
            statusManager.renderer.statusElement = null;
            
            const result = statusManager.hideStatus();

            expect(result).toBe(false);
        });

        test('должен обрабатывать ошибки в getHistory', () => {
            // Ломаем историю
            statusManager.historyManager.history = null;

            const history = statusManager.getHistory();

            expect(history).toEqual([]);
        });

        test('должен обрабатывать ошибки в clearHistory', () => {
            statusManager.historyManager.history = null;

            const count = statusManager.clearHistory();

            expect(count).toBe(0);
        });

        test('должен обрабатывать ошибки в getStatistics', () => {
            statusManager.historyManager.history = null;

            const stats = statusManager.getStatistics();

            expect(stats).toEqual({});
        });

        test('должен обрабатывать ошибки в validateState', () => {
            // Создаем ситуацию, которая вызовет ошибку
            Object.defineProperty(statusManager.renderer, 'statusElement', {
                get: function() {
                    throw new Error('Cannot access statusElement');
                }
            });

            const result = statusManager.validateState();

            expect(result.isValid).toBe(false);
            expect(result.issues).toContain('Ошибка при выполнении валидации');
        });
    });

    describe('validateState - расширенные проверки', () => {
        test('должен выявлять некорректный statusElement', () => {
            statusManager.renderer.statusElement = 'not-an-element';

            const result = statusManager.validateState();

            expect(result.isValid).toBe(false);
            expect(result.issues.some(issue => issue.includes('statusElement'))).toBe(true);
        });

        test('должен выявлять отрицательный defaultDuration', () => {
            statusManager.defaultDuration = -100;

            const result = statusManager.validateState();

            expect(result.isValid).toBe(false);
            expect(result.issues.some(issue => issue.includes('defaultDuration'))).toBe(true);
        });

        test('должен выявлять превышение размера истории', () => {
            statusManager.historyManager.maxHistorySize = 2;
            
            // Принудительно добавляем больше элементов, чем максимальный размер
            statusManager.historyManager.history = new Array(5).fill({ type: 'success', message: 'test', timestamp: new Date().toISOString(), duration: 1000 });

            const result = statusManager.validateState();

            expect(result.isValid).toBe(false);
            expect(result.issues.some(issue => issue.includes('История превышает'))).toBe(true);
        });

        test('должен выявлять превышение размера очереди', async () => {
            const manager = new StatusManager({
                enableLogging: false,
                statusElement: statusElement,
                enableQueue: true,
                maxQueueSize: 2
            });

            manager.queueManager.items = new Array(5).fill({ message: 'test' });

            const result = manager.validateState();

            expect(result.isValid).toBe(false);
            expect(result.issues.some(issue => issue.includes('Очередь превышает'))).toBe(true);

            manager.destroy();
        });

        test('должен выявлять видимый статус без типа', async () => {
            await statusManager.showSuccess('Test');
            
            statusManager.state.currentType = null;

            const result = statusManager.validateState();

            expect(result.isValid).toBe(false);
            expect(result.issues.some(issue => issue.includes('тип не установлен'))).toBe(true);
        });

        test('должен выявлять видимый статус без сообщения', async () => {
            await statusManager.showSuccess('Test');
            
            statusManager.state.currentMessage = null;

            const result = statusManager.validateState();

            expect(result.isValid).toBe(false);
            expect(result.issues.some(issue => issue.includes('сообщение не установлено'))).toBe(true);
        });
    });

    describe('Очередь - обработка ошибок', () => {
        test('должен обрабатывать ошибки _addToQueue', async () => {
            const manager = new StatusManager({
                enableLogging: false,
                statusElement: statusElement,
                enableQueue: true
            });

            // Ломаем queue
            manager.queueManager.items = null;

            await manager.showSuccess('Message 1');
            await manager.showSuccess('Message 2');

            // Не должно выбрасывать ошибку
            manager.destroy();
        });

        test('должен обрабатывать ошибки _processQueue', async () => {
            const manager = new StatusManager({
                enableLogging: false,
                statusElement: statusElement,
                enableQueue: true
            });

            await manager.showSuccess('Message 1');
            
            // Ломаем queue перед обработкой
            manager.queueManager.items = null;

            // Пытаемся обработать очередь
            jest.advanceTimersByTime(100);

            // Не должно выбрасывать ошибку
            manager.destroy();
        });

        test('должен обрабатывать ошибки _clearQueue', () => {
            const manager = new StatusManager({
                enableLogging: false,
                statusElement: statusElement,
                enableQueue: true
            });

            manager.queueManager.items = null;

            const count = manager._clearQueue();
            expect(count).toBe(0);
            manager.destroy();
        });
    });

    describe('showStatus - расширенные сценарии', () => {
        test('должен использовать INFO для null типа', async () => {
            const result = await statusManager.showStatus('Test message', null);

            expect(result).toBe(true);
            expect(statusElement.className).toBe('status-message info visible');
        });

        test('должен использовать INFO для undefined типа', async () => {
            const result = await statusManager.showStatus('Test message', undefined);

            expect(result).toBe(true);
            expect(statusElement.className).toBe('status-message info visible');
        });

        test('должен обрабатывать пользовательскую длительность', async () => {
            await statusManager.showSuccess('Test', 5000);

            expect(statusManager.renderer.hideTimeout).not.toBeNull();
        });

        test('должен очищать предыдущий таймер при новом статусе', async () => {
            await statusManager.showSuccess('Message 1');
            const firstTimeout = statusManager.renderer.hideTimeout;
            
            await statusManager.showSuccess('Message 2');
            const secondTimeout = statusManager.renderer.hideTimeout;

            expect(secondTimeout).not.toBe(firstTimeout);
        });
    });

    describe('hideStatus - расширенные сценарии', () => {
        test('должен работать если статус уже скрыт', () => {
            const result = statusManager.hideStatus();

            expect(result).toBe(true);
        });

        test('должен обрабатывать множественные вызовы hideStatus', async () => {
            await statusManager.showSuccess('Test');
            
            statusManager.hideStatus();
            const result = statusManager.hideStatus();

            expect(result).toBe(true);
        });
    });

    describe('getHistory - расширенные сценарии', () => {
        test('должен игнорировать невалидный типфильтра', async () => {
            await statusManager.showSuccess('Test');

            const history = statusManager.getHistory({ type: 'invalid-type' });

            // Невалидный тип фильтра игнорируется, возвращается вся история
            expect(history.length).toBeGreaterThan(0);
        });

        test('должен игнорировать невалидный limit', async () => {
            await statusManager.showSuccess('Message 1');
            await statusManager.showSuccess('Message 2');

            const history1 = statusManager.getHistory({ limit: -1 });
            expect(history1).toHaveLength(2);

            const history2 = statusManager.getHistory({ limit: 'not-a-number' });
            expect(history2).toHaveLength(2);

            const history3 = statusManager.getHistory({ limit: 0 });
            expect(history3).toHaveLength(2);
        });
    });

    describe('setStatusElement - расширенные сценарии', () => {
        test('должен выбрасывать ошибку для null', () => {
            expect(() => {
                statusManager.setStatusElement(null);
            }).toThrow(TypeError);
        });

        test('должен обновлять элемент при смене', () => {
            const newElement = document.createElement('div');
            document.body.appendChild(newElement);

            statusManager.setStatusElement(newElement);

            expect(statusManager.renderer.statusElement).toBe(newElement);

            newElement.parentNode.removeChild(newElement);
        });
    });

    describe('Интеграция с очередью', () => {
        test('должен правильно обрабатывать последовательность сообщений', async () => {
            const manager = new StatusManager({
                enableLogging: false,
                statusElement: statusElement,
                enableQueue: true,
                defaultDuration: 100
            });

            await manager.showSuccess('Message 1');
            await manager.showSuccess('Message 2');
            await manager.showSuccess('Message 3');

            expect(manager.queueManager.size()).toBeGreaterThan(0);

            // Обрабатываем очередь
            jest.advanceTimersByTime(200);

            manager.destroy();
        });

        test('должен пропускать пустые элементы очереди', async () => {
            const manager = new StatusManager({
                enableLogging: false,
                statusElement: statusElement,
                enableQueue: true
            });

            await manager.showSuccess('Message 1');
            
            // Добавляем невалидный элемент в очередь
            manager.queueManager.items.push(null);
            manager.queueManager.items.push({ message: 'Valid message', type: 'success', duration: 0 });

            jest.advanceTimersByTime(100);

            manager.destroy();
        });
    });

    describe('Покрытие веток (Branch Coverage)', () => {
        test('_validateStatusElement - должен корректно обрабатывать отсутствие элемента', () => {
            const manager = new StatusManager({ enableLogging: false });
            
            // Вызываем _validateStatusElement без statusElement
            expect(() => manager._validateStatusElement()).not.toThrow();
        });

        test('_validateStatusElement - должен предупреждать если элемент не в DOM', () => {
            const detachedElement = document.createElement('div');
            
            const manager = new StatusManager({ 
                enableLogging: false,
                statusElement: detachedElement
            });
            
            expect(manager.renderer.statusElement).toBe(detachedElement);
        });

        test('_addToHistory - должен обрабатывать ошибки', () => {
            const manager = new StatusManager({ 
                enableLogging: false,
                enableHistory: true
            });
            
            // Ломаем history чтобы вызвать ошибку
            Object.defineProperty(manager.historyManager, 'history', {
                get() {
                    throw new Error('History error');
                }
            });
            
            // Не должно выбросить ошибку
            expect(() => manager._addToHistory('test', 'success', 1000)).not.toThrow();
        });

        test('_addToQueue - должен возвращать false если очередь отключена', () => {
            const manager = new StatusManager({ 
                enableLogging: false,
                enableQueue: false,
                statusElement: statusElement
            });
            
            const result = manager._addToQueue('Test message', 'success', 1000);
            
            expect(result).toBe(false);
            expect(manager.queueManager.size()).toBe(0);
            
            manager.destroy();
        });

        test('_addToQueue - должен отклонять сообщения при переполнении очереди', () => {
            const manager = new StatusManager({ 
                enableLogging: false,
                enableQueue: true,
                maxQueueSize: 2,
                statusElement: statusElement
            });
            
            // Заполняем очередь вручную чтобы избежать обработки
            manager.queueManager.items.push({ message: 'Message 1', type: 'success', duration: 1000 });
            manager.queueManager.items.push({ message: 'Message 2', type: 'success', duration: 1000 });
            
            const result3 = manager._addToQueue('Message 3', 'success', 1000);
            
            expect(result3).toBe(false);
            expect(manager.queueManager.items.length).toBe(2);
            
            manager.destroy();
        });

        test('_addToQueue - должен запускать обработку очереди', () => {
            const manager = new StatusManager({ 
                enableLogging: false,
                enableQueue: true,
                statusElement: statusElement
            });
            
            jest.spyOn(manager, '_processQueue');
            
            manager._addToQueue('Test message', 'success', 1000);
            
            expect(manager._processQueue).toHaveBeenCalled();
            
            manager.destroy();
        });

        test('_addToQueue - не должен запускать обработку если статус уже видим', async () => {
            const manager = new StatusManager({ 
                enableLogging: false,
                enableQueue: true,
                statusElement: statusElement
            });
            
            // Показываем статус сначала
            manager.updateState({ isVisible: true });
            
            jest.spyOn(manager, '_processQueue');
            
            manager._addToQueue('Test message', 'success', 1000);
            
            expect(manager._processQueue).not.toHaveBeenCalled();
            
            manager.destroy();
        });

        test('_addToQueue - должен обрабатывать ошибки', () => {
            const manager = new StatusManager({ 
                enableLogging: false,
                enableQueue: true,
                statusElement: statusElement
            });
            
            // Ломаем queue чтобы вызвать ошибку
            Object.defineProperty(manager.queueManager, 'items', {
                get() {
                    throw new Error('Queue error');
                }
            });
            
            const result = manager._addToQueue('Test message', 'success', 1000);
            
            expect(result).toBe(false);
            
            manager.destroy();
        });

        test('_processQueue - должен выходить если очередь пуста', async () => {
            const manager = new StatusManager({ 
                enableLogging: false,
                enableQueue: true,
                statusElement: statusElement
            });
            
            await manager._processQueue();
            
            expect(manager.queueManager.isProcessing).toBe(false);
            
            manager.destroy();
        });

        test('_processQueue - должен выходить если уже обрабатывается', async () => {
            const manager = new StatusManager({ 
                enableLogging: false,
                enableQueue: true,
                statusElement: statusElement
            });
            
            manager.queueManager.isProcessing = true;
            
            await manager._processQueue();
            
            // Должен выйти без обработки
            expect(manager.queueManager.isProcessing).toBe(true);
            
            manager.destroy();
        });

        test('_processQueue - должен обрабатывать неудачные отображения', async () => {
            const manager = new StatusManager({ 
                enableLogging: false,
                enableQueue: true,
                statusElement: statusElement
            });
            
            // Мокируем _displayStatusInternal чтобы вернуть false
            jest.spyOn(manager, '_displayStatusInternal').mockResolvedValue(false);
            
            manager._addToQueue('Test message', 'success', 0);
            
            await manager._processQueue();
            
            expect(manager._displayStatusInternal).toHaveBeenCalled();
            
            manager.destroy();
        });

        test('_processQueue - должен обрабатывать ошибки в цикле', async () => {
            const manager = new StatusManager({ 
                enableLogging: false,
                enableQueue: true,
                statusElement: statusElement
            });
            
            // Добавляем сообщение в очередь вручную
            manager.queueManager.items.push({ message: 'Test message', type: 'success', duration: 0 });
            
            // Мокируем _displayStatusInternal чтобы выбросить ошибку
            jest.spyOn(manager, '_displayStatusInternal').mockRejectedValue(new Error('Display error'));
            
            await manager._processQueue();
            
            expect(manager.queueManager.isProcessing).toBe(false);
            
            manager.destroy();
        });

        test('_displayStatusInternal - должен возвращать false без statusElement', async () => {
            const manager = new StatusManager({ 
                enableLogging: false
            });
            
            const result = await manager._displayStatusInternal('Test', 'success', 1000);
            
            expect(result).toBe(false);
            
            manager.destroy();
        });

        test('showStatus - различные комбинации параметров', async () => {
            const manager = new StatusManager({ 
                enableLogging: false,
                statusElement: statusElement,
                enableHistory: true
            });
            
            // Без duration (использует default)
            await manager.showStatus('Test 1', 'success');
            
            // С duration = 0 (не скрывается автоматически)
            await manager.showStatus('Test 2', 'info', 0);
            
            // С большой duration
            await manager.showStatus('Test 3', 'error', 5000);
            
            expect(manager.historyManager.size()).toBeGreaterThan(0);
            
            manager.destroy();
        });

        test('clearHistory - с пустой историей', () => {
            const manager = new StatusManager({ 
                enableLogging: false,
                enableHistory: true
            });
            
            const count = manager.clearHistory();
            
            expect(count).toBe(0);
            
            manager.destroy();
        });

        test('queue - когда очередь отключена должна быть пустой', () => {
            const manager = new StatusManager({ 
                enableLogging: false,
                enableQueue: false
            });
            
            // Проверяем что очередь существует и пустая
            expect(manager.queueManager).toBeDefined();
            expect(Array.isArray(manager.queueManager.items)).toBe(true);
            expect(manager.queueManager.size()).toBe(0);
            expect(manager.queueManager.enableQueue).toBe(false);
            
            manager.destroy();
        });

        test('destroy - должен корректно очищать таймеры', () => {
            const manager = new StatusManager({ 
                enableLogging: false,
                statusElement: statusElement
            });
            
            // Устанавливаем таймер
            manager.renderer.hideTimeout = setTimeout(() => {}, 10000);
            
            manager.destroy();
            
            expect(manager.renderer.hideTimeout).toBeNull();
        });

        test('hideStatus - должен скрывать статус', () => {
            const manager = new StatusManager({ 
                enableLogging: false,
                statusElement: statusElement
            });
            
            // Показываем статус сначала
            manager.showStatus('Test', 'success', 0);
            
            const hidden = manager.hideStatus();
            
            expect(hidden).toBe(true);
            expect(manager.state.isVisible).toBe(false);
            
            manager.destroy();
        });
    });
});
