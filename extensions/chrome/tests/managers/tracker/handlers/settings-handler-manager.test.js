/**
 * Тесты для SettingsHandlerManager
 */

// Мокируем domainUtils перед импортом SettingsHandlerManager
jest.mock('../../../../src/utils/domainUtils.js', () => ({
    normalizeDomainList: jest.fn((domains) => {
        // По умолчанию возвращаем нормализованный список
        if (!Array.isArray(domains)) {
            return [];
        }
        return domains.filter(d => d).map(d => d.toLowerCase().trim());
    })
}));

const SettingsHandlerManager = require('../../../../src/managers/tracker/handlers/SettingsHandlerManager.js');
const BackendManager = require('../../../../src/managers/tracker/core/BackendManager.js');
const StorageManager = require('../../../../src/managers/tracker/core/StorageManager.js');
const EventQueueManager = require('../../../../src/managers/tracker/queue/EventQueueManager.js');
const StatisticsManager = require('../../../../src/managers/tracker/core/StatisticsManager.js');
const domainUtils = require('../../../../src/utils/domainUtils.js');

describe('SettingsHandlerManager', () => {
    let settingsHandlerManager;
    let backendManager;
    let storageManager;
    let eventQueueManager;
    let trackingController;

    beforeEach(() => {
        // Настраиваем chrome API
        if (!global.chrome) {
            global.chrome = {};
        }

        if (!global.chrome.storage) {
            global.chrome.storage = {
                local: {
                    get: jest.fn().mockResolvedValue({}),
                    set: jest.fn().mockResolvedValue()
                }
            };
        }

        // Создаем зависимости
        backendManager = new BackendManager({ userId: 'test-user', enableLogging: false });
        statisticsManager = new StatisticsManager({ enableLogging: false });
        storageManager = new StorageManager({ enableLogging: false });
        eventQueueManager = new EventQueueManager(
            { backendManager, statisticsManager, storageManager },
            { enableLogging: false }
        );
        trackingController = {
            setTrackingEnabled: jest.fn().mockResolvedValue({ success: true, isTracking: true })
        };

        settingsHandlerManager = new SettingsHandlerManager(
            {
                backendManager,
                storageManager,
                eventQueueManager,
                trackingController
            },
            { enableLogging: false }
        );
    });

    afterEach(() => {
        if (settingsHandlerManager) {
            try {
                settingsHandlerManager.destroy();
            } catch (error) {
                // Игнорируем ошибки при destroy
            }
        }
        jest.clearAllMocks();
    });

    describe('constructor', () => {
        test('должен создаваться успешно с валидными зависимостями', () => {
            expect(settingsHandlerManager).toBeInstanceOf(SettingsHandlerManager);
            expect(settingsHandlerManager.backendManager).toBe(backendManager);
            expect(settingsHandlerManager.storageManager).toBe(storageManager);
            expect(settingsHandlerManager.eventQueueManager).toBe(eventQueueManager);
            expect(settingsHandlerManager.trackingController).toBe(trackingController);
        });

        test('должен выбрасывать ошибку если зависимости отсутствуют', () => {
            expect(() => {
                new SettingsHandlerManager(null, { enableLogging: false });
            }).toThrow();
        });

        test('должен выбрасывать ошибку если backendManager отсутствует', () => {
            expect(() => {
                new SettingsHandlerManager({
                    storageManager,
                    eventQueueManager,
                    trackingController
                }, { enableLogging: false });
            }).toThrow();
        });

        test('должен выбрасывать ошибку если storageManager отсутствует', () => {
            expect(() => {
                new SettingsHandlerManager({
                    backendManager,
                    eventQueueManager,
                    trackingController
                }, { enableLogging: false });
            }).toThrow();
        });

        test('должен выбрасывать ошибку если eventQueueManager отсутствует', () => {
            expect(() => {
                new SettingsHandlerManager({
                    backendManager,
                    storageManager,
                    trackingController
                }, { enableLogging: false });
            }).toThrow();
        });

        test('должен выбрасывать ошибку если trackingController отсутствует', () => {
            expect(() => {
                new SettingsHandlerManager({
                    backendManager,
                    storageManager,
                    eventQueueManager
                }, { enableLogging: false });
            }).toThrow();
        });
    });

    describe('handleUpdateBackendUrl', () => {
        test('должен обновлять URL backend успешно', (done) => {
            const sendResponse = jest.fn((response) => {
                expect(response.success).toBe(true);
                expect(backendManager.backendUrl).toBe('https://new-api.example.com');
                done();
            });

            storageManager.saveBackendUrl = jest.fn().mockResolvedValue(true);

            settingsHandlerManager.handleUpdateBackendUrl(
                { url: 'https://new-api.example.com' },
                sendResponse
            );
        });

        test('должен использовать request.data.url если request.url отсутствует', (done) => {
            const sendResponse = jest.fn((response) => {
                expect(response.success).toBe(true);
                expect(backendManager.backendUrl).toBe('https://data-api.example.com');
                done();
            });

            storageManager.saveBackendUrl = jest.fn().mockResolvedValue(true);

            settingsHandlerManager.handleUpdateBackendUrl(
                { data: { url: 'https://data-api.example.com' } },
                sendResponse
            );
        });

        test('должен возвращать ошибку если URL не предоставлен', (done) => {
            const sendResponse = jest.fn((response) => {
                expect(response.success).toBe(false);
                expect(response.error).toBeDefined();
                done();
            });

            settingsHandlerManager.handleUpdateBackendUrl({}, sendResponse);
        });

        test('должен возвращать ошибку если сохранение не удалось', (done) => {
            const sendResponse = jest.fn((response) => {
                expect(response.success).toBe(false);
                expect(response.error).toBeDefined();
                done();
            });

            storageManager.saveBackendUrl = jest.fn().mockResolvedValue(false);

            settingsHandlerManager.handleUpdateBackendUrl(
                { url: 'https://new-api.example.com' },
                sendResponse
            );
        });

        test('должен обрабатывать ошибки при сохранении', (done) => {
            const sendResponse = jest.fn((response) => {
                expect(response.success).toBe(false);
                expect(response.error).toBe('Save error');
                done();
            });

            storageManager.saveBackendUrl = jest.fn().mockRejectedValue(new Error('Save error'));

            settingsHandlerManager.handleUpdateBackendUrl(
                { url: 'https://new-api.example.com' },
                sendResponse
            );
        });
    });

    describe('handleUpdateDomainExceptions', () => {
        test('должен обновлять исключения доменов успешно', (done) => {
            const sendResponse = jest.fn((response) => {
                expect(response.success).toBe(true);
                expect(response.count).toBe(2);
                done();
            });

            storageManager.saveDomainExceptions = jest.fn().mockResolvedValue(true);
            eventQueueManager.setDomainExceptions = jest.fn().mockResolvedValue({ removedFromQueue: 0 });

            settingsHandlerManager.handleUpdateDomainExceptions(
                { domains: ['example.com', 'test.com'] },
                sendResponse
            );
        });

        test('должен использовать request.data.domains если request.domains отсутствует', (done) => {
            const sendResponse = jest.fn((response) => {
                expect(response.success).toBe(true);
                expect(response.count).toBe(1);
                done();
            });

            storageManager.saveDomainExceptions = jest.fn().mockResolvedValue(true);
            eventQueueManager.setDomainExceptions = jest.fn().mockResolvedValue({ removedFromQueue: 0 });

            settingsHandlerManager.handleUpdateDomainExceptions(
                { data: { domains: ['example.com'] } },
                sendResponse
            );
        });

        test('должен обрабатывать пустой массив доменов', (done) => {
            const sendResponse = jest.fn((response) => {
                expect(response.success).toBe(true);
                expect(response.count).toBe(0);
                done();
            });

            storageManager.saveDomainExceptions = jest.fn().mockResolvedValue(true);
            eventQueueManager.setDomainExceptions = jest.fn().mockResolvedValue({ removedFromQueue: 0 });

            settingsHandlerManager.handleUpdateDomainExceptions(
                { domains: [] },
                sendResponse
            );
        });

        test('должен обрабатывать отсутствие доменов', (done) => {
            const sendResponse = jest.fn((response) => {
                expect(response.success).toBe(true);
                expect(response.count).toBe(0);
                done();
            });

            storageManager.saveDomainExceptions = jest.fn().mockResolvedValue(true);
            eventQueueManager.setDomainExceptions = jest.fn().mockResolvedValue({ removedFromQueue: 0 });

            settingsHandlerManager.handleUpdateDomainExceptions(
                {},
                sendResponse
            );
        });

        test('должен возвращать ошибку если сохранение не удалось', (done) => {
            const sendResponse = jest.fn((response) => {
                expect(response.success).toBe(false);
                expect(response.error).toBeDefined();
                done();
            });

            storageManager.saveDomainExceptions = jest.fn().mockResolvedValue(false);

            settingsHandlerManager.handleUpdateDomainExceptions(
                { domains: ['example.com'] },
                sendResponse
            );
        });

        test('должен обрабатывать ошибки при сохранении', (done) => {
            const sendResponse = jest.fn((response) => {
                expect(response.success).toBe(false);
                expect(response.error).toBe('Save error');
                done();
            });

            storageManager.saveDomainExceptions = jest.fn().mockRejectedValue(new Error('Save error'));

            settingsHandlerManager.handleUpdateDomainExceptions(
                { domains: ['example.com'] },
                sendResponse
            );
        });

        test('должен обрабатывать ошибки при установке исключений в очереди', (done) => {
            const sendResponse = jest.fn((response) => {
                expect(response.success).toBe(false);
                expect(response.error).toBe('Queue error');
                done();
            });

            storageManager.saveDomainExceptions = jest.fn().mockResolvedValue(true);
            eventQueueManager.setDomainExceptions = jest.fn().mockRejectedValue(new Error('Queue error'));

            settingsHandlerManager.handleUpdateDomainExceptions(
                { domains: ['example.com'] },
                sendResponse
            );
        });

        test('должен обрабатывать исключения в try-catch', () => {
            const sendResponse = jest.fn();
            const logErrorSpy = jest.spyOn(settingsHandlerManager, '_logError');

            // Мокируем normalizeDomainList чтобы выбросить ошибку, которая будет поймана в catch
            domainUtils.normalizeDomainList.mockImplementation(() => {
                throw new Error('Catch error');
            });

            settingsHandlerManager.handleUpdateDomainExceptions(
                { domains: ['example.com'] },
                sendResponse
            );

            // Проверяем, что sendResponse был вызван синхронно в catch блоке
            expect(sendResponse).toHaveBeenCalledWith({
                success: false,
                error: 'Catch error'
            });
            expect(logErrorSpy).toHaveBeenCalledWith(
                expect.objectContaining({ key: 'logs.settingsHandler.domainExceptionsRequestError' }),
                expect.any(Error)
            );

            logErrorSpy.mockRestore();
            // Восстанавливаем мок
            domainUtils.normalizeDomainList.mockImplementation((domains) => {
                if (!Array.isArray(domains)) {
                    return [];
                }
                return domains.filter(d => d).map(d => d.toLowerCase().trim());
            });
        });

        test('должен возвращать removedFromQueue из результата', (done) => {
            const sendResponse = jest.fn((response) => {
                expect(response.success).toBe(true);
                expect(response.removedFromQueue).toBe(5);
                done();
            });

            storageManager.saveDomainExceptions = jest.fn().mockResolvedValue(true);
            eventQueueManager.setDomainExceptions = jest.fn().mockResolvedValue({ removedFromQueue: 5 });

            settingsHandlerManager.handleUpdateDomainExceptions(
                { domains: ['example.com'] },
                sendResponse
            );
        });
    });

    describe('handleSetTrackingEnabled', () => {
        test('должен включать отслеживание успешно', (done) => {
            const sendResponse = jest.fn((response) => {
                expect(response.success).toBe(true);
                expect(response.isTracking).toBe(true);
                done();
            });

            trackingController.setTrackingEnabled = jest.fn().mockResolvedValue({ success: true, isTracking: true });

            settingsHandlerManager.handleSetTrackingEnabled(
                { enabled: true },
                sendResponse
            );
        });

        test('должен отключать отслеживание успешно', (done) => {
            const sendResponse = jest.fn((response) => {
                expect(response.success).toBe(true);
                expect(response.isTracking).toBe(false);
                done();
            });

            trackingController.setTrackingEnabled = jest.fn().mockResolvedValue({ success: true, isTracking: false });

            settingsHandlerManager.handleSetTrackingEnabled(
                { enabled: false },
                sendResponse
            );
        });

        test('должен использовать request.data.enabled если request.enabled отсутствует', (done) => {
            const sendResponse = jest.fn((response) => {
                expect(response.success).toBe(true);
                done();
            });

            trackingController.setTrackingEnabled = jest.fn().mockResolvedValue({ success: true, isTracking: true });

            settingsHandlerManager.handleSetTrackingEnabled(
                { data: { enabled: true } },
                sendResponse
            );
        });

        test('должен возвращать ошибку если enabled не предоставлен', (done) => {
            const sendResponse = jest.fn((response) => {
                expect(response.success).toBe(false);
                expect(response.error).toBeDefined();
                done();
            });

            settingsHandlerManager.handleSetTrackingEnabled({}, sendResponse);
        });

        test('должен возвращать ошибку если enabled не boolean', (done) => {
            const sendResponse = jest.fn((response) => {
                expect(response.success).toBe(false);
                expect(response.error).toBeDefined();
                done();
            });

            settingsHandlerManager.handleSetTrackingEnabled({ enabled: 'not boolean' }, sendResponse);
        });

        test('должен обрабатывать ошибки при изменении состояния', (done) => {
            const sendResponse = jest.fn((response) => {
                expect(response.success).toBe(false);
                expect(response.error).toBe('Tracking error');
                done();
            });

            trackingController.setTrackingEnabled = jest.fn().mockRejectedValue(new Error('Tracking error'));

            settingsHandlerManager.handleSetTrackingEnabled(
                { enabled: true },
                sendResponse
            );
        });

        test('должен обрабатывать исключения в try-catch', (done) => {
            const sendResponse = jest.fn((response) => {
                expect(response.success).toBe(false);
                expect(response.error).toBeDefined();
                done();
            });

            // Мокируем setTrackingEnabled чтобы выбросить ошибку синхронно
            trackingController.setTrackingEnabled = jest.fn(() => {
                throw new Error('Sync error');
            });

            settingsHandlerManager.handleSetTrackingEnabled(
                { enabled: true },
                sendResponse
            );
        });

        test('должен обрабатывать результат с success: false', (done) => {
            const sendResponse = jest.fn((response) => {
                expect(response.success).toBe(false);
                expect(response.isTracking).toBe(false);
                done();
            });

            trackingController.setTrackingEnabled = jest.fn().mockResolvedValue({ success: false, isTracking: false });

            settingsHandlerManager.handleSetTrackingEnabled(
                { enabled: true },
                sendResponse
            );
        });

        test('должен обрабатывать результат без success', (done) => {
            const sendResponse = jest.fn((response) => {
                expect(response.success).toBe(false);
                done();
            });

            trackingController.setTrackingEnabled = jest.fn().mockResolvedValue({ isTracking: true });

            settingsHandlerManager.handleSetTrackingEnabled(
                { enabled: true },
                sendResponse
            );
        });
    });

    describe('destroy', () => {
        test('должен очищать все зависимости', () => {
            settingsHandlerManager.destroy();

            expect(settingsHandlerManager.backendManager).toBeNull();
            expect(settingsHandlerManager.storageManager).toBeNull();
            expect(settingsHandlerManager.eventQueueManager).toBeNull();
            expect(settingsHandlerManager.trackingController).toBeNull();
        });
    });
});
