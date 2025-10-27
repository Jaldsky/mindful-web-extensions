/**
 * Тесты для ValidationManager
 */

const CONFIG = require('../../../config.js');
const ValidationManager = require('../../../src/managers/options/ValidationManager.js');

describe('ValidationManager', () => {
    let validationManager;

    beforeEach(() => {
        validationManager = new ValidationManager({ enableLogging: false });
    });

    afterEach(() => {
        if (validationManager) {
            validationManager.destroy();
        }
    });

    describe('Инициализация', () => {
        test('должен создаваться с настройками по умолчанию', () => {
            expect(validationManager).toBeInstanceOf(ValidationManager);
            expect(validationManager.strictProtocol).toBe(true);
            expect(validationManager.enableHistory).toBe(false);
            expect(validationManager.maxHistorySize).toBe(CONFIG.VALIDATION.MAX_HISTORY_SIZE);
            expect(validationManager.history).toEqual([]);
        });

        test('должен создаваться с пользовательскими настройками', () => {
            const customManager = new ValidationManager({
                enableLogging: true,
                strictProtocol: false,
                enableHistory: true,
                maxHistorySize: 50
            });

            expect(customManager.strictProtocol).toBe(false);
            expect(customManager.enableHistory).toBe(true);
            expect(customManager.maxHistorySize).toBe(50);

            customManager.destroy();
        });

        test('должен инициализировать статистику валидаций', () => {
            expect(validationManager.validationStats).toBeInstanceOf(Map);
            expect(validationManager.validationStats.get('totalValidations')).toBe(0);
            expect(validationManager.validationStats.get('successfulValidations')).toBe(0);
            expect(validationManager.validationStats.get('failedValidations')).toBe(0);
        });
    });

    describe('validateBackendUrl', () => {
        test('должен валидировать корректный HTTP URL', () => {
            const result = validationManager.validateBackendUrl('http://localhost:8000/api');

            expect(result.isValid).toBe(true);
            expect(result.error).toBeUndefined();
            expect(result.value).toBe('http://localhost:8000/api');
        });

        test('должен валидировать корректный HTTPS URL', () => {
            const result = validationManager.validateBackendUrl('https://example.com/api/v1/events');

            expect(result.isValid).toBe(true);
            expect(result.error).toBeUndefined();
            expect(result.value).toBe('https://example.com/api/v1/events');
        });

        test('должен отклонять пустую строку', () => {
            const result = validationManager.validateBackendUrl('');

            expect(result.isValid).toBe(false);
            expect(result.error).toBe(ValidationManager.VALIDATION_ERRORS.EMPTY_URL);
            expect(result.value).toBeUndefined();
        });

        test('должен отклонять null', () => {
            const result = validationManager.validateBackendUrl(null);

            expect(result.isValid).toBe(false);
            expect(result.error).toBe(ValidationManager.VALIDATION_ERRORS.EMPTY_URL);
        });

        test('должен отклонять невалидный URL', () => {
            const result = validationManager.validateBackendUrl('not-a-url');

            expect(result.isValid).toBe(false);
            expect(result.error).toBe(ValidationManager.VALIDATION_ERRORS.INVALID_URL);
        });

        test('должен отклонять URL без протокола', () => {
            const result = validationManager.validateBackendUrl('example.com');

            expect(result.isValid).toBe(false);
            expect(result.error).toBe(ValidationManager.VALIDATION_ERRORS.INVALID_URL);
        });

        test('должен отклонять URL с неправильным протоколом в strictMode', () => {
            const result = validationManager.validateBackendUrl('ftp://example.com/api');

            expect(result.isValid).toBe(false);
            expect(result.error).toBe(ValidationManager.VALIDATION_ERRORS.INVALID_PROTOCOL);
        });

        test('должен принимать URL с другими протоколами если strictMode отключен', () => {
            const manager = new ValidationManager({ strictProtocol: false });
            const result = manager.validateBackendUrl('ftp://example.com/api');

            expect(result.isValid).toBe(true);
            manager.destroy();
        });

        test('должен тримить пробелы в URL', () => {
            const result = validationManager.validateBackendUrl('  http://example.com/api  ');

            expect(result.isValid).toBe(true);
            expect(result.value).toBe('http://example.com/api');
        });

        test('должен обновлять статистику при валидации', () => {
            validationManager.validateBackendUrl('http://example.com');
            validationManager.validateBackendUrl('invalid');

            const stats = validationManager.getValidationStatistics();
            expect(stats.totalValidations).toBe(2);
            expect(stats.successfulValidations).toBe(1);
            expect(stats.failedValidations).toBe(1);
        });
    });

    describe('isValidUrl', () => {
        test('должен возвращать true для валидного URL', () => {
            expect(validationManager.isValidUrl('http://localhost:8000')).toBe(true);
        });

        test('должен возвращать false для невалидного URL', () => {
            expect(validationManager.isValidUrl('invalid')).toBe(false);
        });

        test('должен возвращать false для пустой строки', () => {
            expect(validationManager.isValidUrl('')).toBe(false);
        });
    });

    describe('История валидаций', () => {
        test('должен добавлять записи в историю если enableHistory включен', () => {
            const manager = new ValidationManager({ enableHistory: true });

            manager.validateBackendUrl('http://example.com');
            manager.validateBackendUrl('invalid');

            const history = manager.getHistory();
            expect(history).toHaveLength(2);
            expect(history[0]).toHaveProperty('url');
            expect(history[0]).toHaveProperty('isValid');
            expect(history[0]).toHaveProperty('timestamp');
            expect(history[0]).toHaveProperty('duration');

            manager.destroy();
        });

        test('не должен добавлять записи в историю если enableHistory выключен', () => {
            validationManager.validateBackendUrl('http://example.com');

            const history = validationManager.getHistory();
            expect(history).toHaveLength(0);
        });

        test('должен ограничивать размер истории', () => {
            const manager = new ValidationManager({ 
                enableHistory: true, 
                maxHistorySize: 3 
            });

            for (let i = 0; i < 5; i++) {
                manager.validateBackendUrl(`http://example${i}.com`);
            }

            const history = manager.getHistory();
            expect(history.length).toBeLessThanOrEqual(3);

            manager.destroy();
        });

        test('getHistory должен фильтровать по validOnly', () => {
            const manager = new ValidationManager({ enableHistory: true });

            manager.validateBackendUrl('http://example.com'); // valid
            manager.validateBackendUrl('invalid'); // invalid

            const validHistory = manager.getHistory({ validOnly: true });
            expect(validHistory).toHaveLength(1);
            expect(validHistory[0].isValid).toBe(true);

            manager.destroy();
        });

        test('getHistory должен фильтровать по invalidOnly', () => {
            const manager = new ValidationManager({ enableHistory: true });

            manager.validateBackendUrl('http://example.com'); // valid
            manager.validateBackendUrl('invalid'); // invalid

            const invalidHistory = manager.getHistory({ invalidOnly: true });
            expect(invalidHistory).toHaveLength(1);
            expect(invalidHistory[0].isValid).toBe(false);

            manager.destroy();
        });

        test('getHistory должен ограничивать количество записей', () => {
            const manager = new ValidationManager({ enableHistory: true });

            for (let i = 0; i < 5; i++) {
                manager.validateBackendUrl(`http://example${i}.com`);
            }

            const limitedHistory = manager.getHistory({ limit: 2 });
            expect(limitedHistory).toHaveLength(2);

            manager.destroy();
        });

        test('clearHistory должен очищать историю', () => {
            const manager = new ValidationManager({ enableHistory: true });

            manager.validateBackendUrl('http://example.com');
            manager.validateBackendUrl('http://example2.com');

            const count = manager.clearHistory();
            expect(count).toBe(2);
            expect(manager.getHistory()).toHaveLength(0);

            manager.destroy();
        });
    });

    describe('Статистика валидаций', () => {
        test('должен возвращать статистику валидаций', () => {
            validationManager.validateBackendUrl('http://example.com'); // success
            validationManager.validateBackendUrl(''); // empty error
            validationManager.validateBackendUrl('invalid'); // invalid error

            const stats = validationManager.getValidationStatistics();

            expect(stats.totalValidations).toBe(3);
            expect(stats.successfulValidations).toBe(1);
            expect(stats.failedValidations).toBe(2);
            expect(stats.emptyUrlErrors).toBe(1);
            expect(stats.invalidUrlErrors).toBe(1);
            expect(stats.successRate).toBe(33); // 1/3 * 100
            expect(stats.failureRate).toBe(67); // 2/3 * 100
        });

        test('должен рассчитывать successRate и failureRate корректно', () => {
            for (let i = 0; i < 7; i++) {
                validationManager.validateBackendUrl('http://example.com');
            }
            for (let i = 0; i < 3; i++) {
                validationManager.validateBackendUrl('invalid');
            }

            const stats = validationManager.getValidationStatistics();
            expect(stats.successRate).toBe(70); // 7/10
            expect(stats.failureRate).toBe(30); // 3/10
        });

        test('должен возвращать 0 для successRate/failureRate если нет валидаций', () => {
            const stats = validationManager.getValidationStatistics();
            expect(stats.successRate).toBe(0);
            expect(stats.failureRate).toBe(0);
        });
    });

    describe('Метрики производительности', () => {
        test('должен собирать метрики производительности', () => {
            validationManager.validateBackendUrl('http://example.com');

            const metrics = validationManager.getPerformanceMetrics();
            expect(metrics).toHaveProperty('validateBackendUrl_lastDuration');
            expect(typeof metrics.validateBackendUrl_lastDuration).toBe('number');
        });

        test('должен обновлять метрики при каждой валидации', () => {
            validationManager.validateBackendUrl('http://example.com');
            const metrics1 = validationManager.getPerformanceMetrics();

            validationManager.validateBackendUrl('http://example2.com');
            const metrics2 = validationManager.getPerformanceMetrics();

            expect(metrics2.validateBackendUrl_lastDuration).toBeDefined();
        });
    });

    describe('validateState', () => {
        test('должен возвращать валидное состояние для корректного менеджера', () => {
            const result = validationManager.validateState();

            expect(result.isValid).toBe(true);
            expect(result.issues).toEqual([]);
            expect(result.timestamp).toBeDefined();
        });

        test('должен возвращать ошибки для некорректного состояния', () => {
            validationManager.strictProtocol = 'not-a-boolean'; // намеренно ломаем

            const result = validationManager.validateState();

            expect(result.isValid).toBe(false);
            expect(result.issues.length).toBeGreaterThan(0);
        });
    });

    describe('destroy', () => {
        test('должен очищать все ресурсы', () => {
            const manager = new ValidationManager({ enableHistory: true });

            manager.validateBackendUrl('http://example.com');
            manager.destroy();

            expect(manager.history).toEqual([]);
            expect(manager.validationStats.size).toBe(0);
            expect(manager.performanceMetrics.size).toBe(0);
        });
    });
});
