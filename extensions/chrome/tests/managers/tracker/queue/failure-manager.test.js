/**
 * Тесты для FailureManager
 */

const FailureManager = require('../../../../src/managers/tracker/queue/FailureManager.js');

describe('FailureManager', () => {
    let failureManager;
    let mockTrackingController;

    beforeEach(() => {
        mockTrackingController = {
            disableTracking: jest.fn().mockResolvedValue({ success: true, isTracking: false })
        };
    });

    afterEach(() => {
        if (failureManager) {
            failureManager.destroy();
        }
        jest.clearAllMocks();
    });

    describe('constructor', () => {
        test('должен создавать экземпляр с зависимостями', () => {
            failureManager = new FailureManager(
                { trackingController: mockTrackingController },
                { enableLogging: false }
            );

            expect(failureManager).toBeInstanceOf(FailureManager);
            expect(failureManager.trackingController).toBe(mockTrackingController);
            expect(failureManager.consecutiveFailures).toBe(0);
            expect(failureManager.failureThresholdReached).toBe(false);
        });

        test('должен работать без trackingController', () => {
            failureManager = new FailureManager(
                { trackingController: null },
                { enableLogging: false }
            );

            expect(failureManager.trackingController).toBeNull();
        });

        test('должен использовать DEFAULT_MAX_FAILURES_BEFORE_DISABLE по умолчанию', () => {
            failureManager = new FailureManager(
                { trackingController: mockTrackingController },
                { enableLogging: false }
            );

            expect(failureManager.maxFailuresBeforeDisable).toBe(FailureManager.DEFAULT_MAX_FAILURES_BEFORE_DISABLE);
        });

        test('должен использовать переданный maxFailuresBeforeDisable', () => {
            failureManager = new FailureManager(
                { trackingController: mockTrackingController },
                { maxFailuresBeforeDisable: 10, enableLogging: false }
            );

            expect(failureManager.maxFailuresBeforeDisable).toBe(10);
        });

        test('должен работать без dependencies', () => {
            failureManager = new FailureManager(null, { enableLogging: false });

            expect(failureManager.trackingController).toBeNull();
        });
    });

    describe('resetFailureCounters', () => {
        test('должен сбрасывать счетчики', () => {
            failureManager = new FailureManager(
                { trackingController: mockTrackingController },
                { enableLogging: false }
            );
            failureManager.consecutiveFailures = 5;
            failureManager.failureThresholdReached = true;

            failureManager.resetFailureCounters();

            expect(failureManager.consecutiveFailures).toBe(0);
            expect(failureManager.failureThresholdReached).toBe(false);
        });

        test('не должен делать ничего если счетчики уже сброшены', () => {
            failureManager = new FailureManager(
                { trackingController: mockTrackingController },
                { enableLogging: false }
            );
            const logSpy = jest.spyOn(failureManager, '_log');

            failureManager.resetFailureCounters();

            expect(logSpy).not.toHaveBeenCalled();
        });

        test('должен сбрасывать только consecutiveFailures если threshold не достигнут', () => {
            failureManager = new FailureManager(
                { trackingController: mockTrackingController },
                { enableLogging: false }
            );
            failureManager.consecutiveFailures = 3;
            failureManager.failureThresholdReached = false;

            failureManager.resetFailureCounters();

            expect(failureManager.consecutiveFailures).toBe(0);
            expect(failureManager.failureThresholdReached).toBe(false);
        });
    });

    describe('registerSendFailure', () => {
        beforeEach(() => {
            failureManager = new FailureManager(
                { trackingController: mockTrackingController },
                { maxFailuresBeforeDisable: 3, enableLogging: false }
            );
        });

        test('должен увеличивать счетчик неудач', async () => {
            const result = await failureManager.registerSendFailure();

            expect(failureManager.consecutiveFailures).toBe(1);
            expect(result).toBe(false);
        });

        test('должен отключать трекер при достижении порога', async () => {
            await failureManager.registerSendFailure();
            await failureManager.registerSendFailure();
            const result = await failureManager.registerSendFailure();

            expect(result).toBe(true);
            expect(failureManager.failureThresholdReached).toBe(true);
            expect(mockTrackingController.disableTracking).toHaveBeenCalled();
        });

        test('не должен отключать повторно если порог уже достигнут', async () => {
            await failureManager.registerSendFailure();
            await failureManager.registerSendFailure();
            await failureManager.registerSendFailure();
            mockTrackingController.disableTracking.mockClear();

            const result = await failureManager.registerSendFailure();

            expect(result).toBe(false);
            expect(mockTrackingController.disableTracking).not.toHaveBeenCalled();
        });

        test('должен обрабатывать контекст ошибки', async () => {
            const context = {
                error: 'Network error',
                status: 500,
                method: 'POST',
                code: 'NETWORK_ERROR',
                name: 'Error',
                url: 'https://api.example.com',
                errorText: 'Connection failed',
                reason: 'networkError'
            };

            await failureManager.registerSendFailure(context);

            expect(failureManager.consecutiveFailures).toBe(1);
        });
    });

    describe('_disableTrackingDueToFailures', () => {
        beforeEach(() => {
            failureManager = new FailureManager(
                { trackingController: mockTrackingController },
                { enableLogging: false }
            );
        });

        test('должен отключать трекер', async () => {
            failureManager.failureThresholdReached = true;

            await failureManager._disableTrackingDueToFailures();

            expect(mockTrackingController.disableTracking).toHaveBeenCalled();
            expect(failureManager.disableInProgress).toBe(false);
        });

        test('не должен отключать если trackingController отсутствует', async () => {
            failureManager.trackingController = null;
            failureManager.failureThresholdReached = true;

            await failureManager._disableTrackingDueToFailures();

            expect(mockTrackingController.disableTracking).not.toHaveBeenCalled();
        });

        test('не должен отключать если disableInProgress', async () => {
            failureManager.disableInProgress = true;
            failureManager.failureThresholdReached = true;

            await failureManager._disableTrackingDueToFailures();

            expect(mockTrackingController.disableTracking).not.toHaveBeenCalled();
        });

        test('должен вызывать saveQueueFn если она предоставлена', async () => {
            const saveQueueFn = jest.fn().mockResolvedValue();
            failureManager.failureThresholdReached = true;

            await failureManager._disableTrackingDueToFailures({ saveQueueFn });

            expect(saveQueueFn).toHaveBeenCalled();
        });

        test('должен обрабатывать ошибки при сохранении очереди', async () => {
            const saveQueueFn = jest.fn().mockRejectedValue(new Error('Save error'));
            failureManager.failureThresholdReached = true;

            await failureManager._disableTrackingDueToFailures({ saveQueueFn });

            expect(saveQueueFn).toHaveBeenCalled();
        });

        test('должен обрабатывать ошибки при отключении трекера', async () => {
            mockTrackingController.disableTracking.mockRejectedValue(new Error('Disable error'));
            failureManager.failureThresholdReached = true;

            await failureManager._disableTrackingDueToFailures();

            expect(failureManager.disableInProgress).toBe(false);
        });
    });

    describe('isThresholdReached', () => {
        test('должен возвращать false по умолчанию', () => {
            failureManager = new FailureManager(
                { trackingController: mockTrackingController },
                { enableLogging: false }
            );

            expect(failureManager.isThresholdReached()).toBe(false);
        });

        test('должен возвращать true когда порог достигнут', () => {
            failureManager = new FailureManager(
                { trackingController: mockTrackingController },
                { enableLogging: false }
            );
            failureManager.failureThresholdReached = true;

            expect(failureManager.isThresholdReached()).toBe(true);
        });
    });

    describe('getConsecutiveFailures', () => {
        test('должен возвращать количество неудач', () => {
            failureManager = new FailureManager(
                { trackingController: mockTrackingController },
                { enableLogging: false }
            );
            failureManager.consecutiveFailures = 5;

            expect(failureManager.getConsecutiveFailures()).toBe(5);
        });
    });

    describe('destroy', () => {
        test('должен очищать ресурсы', () => {
            failureManager = new FailureManager(
                { trackingController: mockTrackingController },
                { enableLogging: false }
            );
            failureManager.consecutiveFailures = 5;
            failureManager.failureThresholdReached = true;

            failureManager.destroy();

            expect(failureManager.trackingController).toBeNull();
            expect(failureManager.consecutiveFailures).toBe(0);
            expect(failureManager.failureThresholdReached).toBe(false);
        });
    });
});
