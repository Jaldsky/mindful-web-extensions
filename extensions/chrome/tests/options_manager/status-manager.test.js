/**
 * @jest-environment jsdom
 */

/**
 * Тесты для StatusManager
 */

const StatusManager = require('../../src/options_manager/StatusManager.js');

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
            expect(statusManager.statusElement).toBe(statusElement);
            expect(statusManager.defaultDuration).toBe(1000);
            expect(statusManager.enableHistory).toBe(true);
            expect(statusManager.enableQueue).toBe(false);
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

            expect(customManager.enableHistory).toBe(false);
            expect(customManager.enableQueue).toBe(true);
            expect(customManager.maxHistorySize).toBe(25);
            expect(customManager.maxQueueSize).toBe(5);

            customManager.destroy();
        });

        test('должен работать без statusElement', () => {
            const manager = new StatusManager({ enableLogging: false });

            expect(manager.statusElement).toBeNull();
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

            expect(statusManager.hideTimeout).not.toBeNull();
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

            expect(statusManager.hideTimeout).toBeNull();
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
            expect(manager.queue.length).toBeGreaterThan(0);

            manager.destroy();
        });

        test('не должен использовать очередь если enableQueue выключен', async () => {
            await statusManager.showSuccess('Message 1');
            await statusManager.showSuccess('Message 2');

            expect(statusManager.queue).toHaveLength(0);
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

            expect(manager.queue.length).toBeLessThanOrEqual(2);

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
            statusManager.queue = 'not-an-array'; // намеренно ломаем

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

            expect(statusManager.statusElement).toBe(newElement);

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

            expect(statusManager.history).toEqual([]);
            expect(statusManager.queue).toEqual([]);
            expect(statusManager.hideTimeout).toBeNull();
            expect(statusManager.statusElement).toBeNull();
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

            expect(manager.isProcessingQueue).toBe(false);
        });
    });
});
