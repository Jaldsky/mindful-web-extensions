/**
 * @jest-environment jsdom
 */

const MessageManager = require('../../src/base/MessageManager.js');
const CONFIG = require('../../src/config/config.js');

describe('MessageManager', () => {
    let messageManager;

    beforeEach(() => {
        messageManager = new MessageManager({
            getTranslateFn: () => (key) => key
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('constructor', () => {
        test('создает экземпляр с опциями', () => {
            expect(messageManager.getTranslateFn).toBeDefined();
        });

        test('создает экземпляр без опций', () => {
            const manager = new MessageManager();
            expect(manager.getTranslateFn).toBeUndefined();
        });
    });

    describe('_getSystemMessages', () => {
        test('возвращает пустой массив если messageTypes не объект', () => {
            expect(messageManager._getSystemMessages(null)).toEqual([]);
            expect(messageManager._getSystemMessages('string')).toEqual([]);
            expect(messageManager._getSystemMessages(123)).toEqual([]);
        });

        test('возвращает системные сообщения из CONFIG если они определены', () => {
            const originalSystemMessages = CONFIG.MESSAGE_TYPES.SYSTEM_MESSAGES;
            CONFIG.MESSAGE_TYPES.SYSTEM_MESSAGES = ['PING', 'GET_STATUS'];
            
            const messageTypes = {
                PING: 'ping',
                GET_STATUS: 'getStatus',
                OTHER: 'other'
            };
            
            const result = messageManager._getSystemMessages(messageTypes);
            
            expect(result).toContain('ping');
            expect(result).toContain('getStatus');
            
            // Восстанавливаем оригинальное значение
            CONFIG.MESSAGE_TYPES.SYSTEM_MESSAGES = originalSystemMessages;
        });

        test('возвращает дефолтные системные сообщения если CONFIG.SYSTEM_MESSAGES не определен', () => {
            const originalSystemMessages = CONFIG.MESSAGE_TYPES.SYSTEM_MESSAGES;
            CONFIG.MESSAGE_TYPES.SYSTEM_MESSAGES = undefined;
            
            const messageTypes = {
                PING: 'ping',
                GET_STATUS: 'getStatus',
                GET_TRACKING_STATUS: 'getTrackingStatus',
                GET_TODAY_STATS: 'getTodayStats',
                GET_DETAILED_STATS: 'getDetailedStats',
                SET_TRACKING_ENABLED: 'setTrackingEnabled',
                CHECK_CONNECTION: 'checkConnection',
                UPDATE_BACKEND_URL: 'updateBackendUrl',
                UPDATE_DOMAIN_EXCEPTIONS: 'updateDomainExceptions'
            };
            
            const result = messageManager._getSystemMessages(messageTypes);
            
            expect(result).toContain('ping');
            expect(result).toContain('getStatus');
            
            // Восстанавливаем оригинальное значение
            CONFIG.MESSAGE_TYPES.SYSTEM_MESSAGES = originalSystemMessages;
        });

        test('фильтрует undefined значения', () => {
            const messageTypes = {
                PING: 'ping',
                GET_STATUS: undefined,
                OTHER: 'other'
            };
            
            const result = messageManager._getSystemMessages(messageTypes);
            
            expect(result).not.toContain(undefined);
        });
    });

    describe('_isSystemMessage', () => {
        test('возвращает false если messageType не строка', () => {
            const messageTypes = { PING: 'ping' };
            
            expect(messageManager._isSystemMessage(null, messageTypes)).toBe(false);
            expect(messageManager._isSystemMessage(undefined, messageTypes)).toBe(false);
            expect(messageManager._isSystemMessage(123, messageTypes)).toBe(false);
            expect(messageManager._isSystemMessage({}, messageTypes)).toBe(false);
        });

        test('возвращает true если сообщение системное', () => {
            const messageTypes = { PING: 'ping', GET_STATUS: 'getStatus' };
            
            expect(messageManager._isSystemMessage('ping', messageTypes)).toBe(true);
        });

        test('возвращает false если сообщение не системное', () => {
            const messageTypes = { PING: 'ping' };
            
            expect(messageManager._isSystemMessage('other', messageTypes)).toBe(false);
        });
    });

    describe('_shouldBlockMessage', () => {
        test('не блокирует системные сообщения', () => {
            const messageTypes = { PING: 'ping' };
            
            const result = messageManager._shouldBlockMessage(
                'ping',
                messageTypes,
                () => false,
                () => false
            );
            
            expect(result.shouldBlock).toBe(false);
        });

        test('блокирует сообщения если отслеживание отключено', () => {
            const messageTypes = { OTHER: 'other' };
            
            const result = messageManager._shouldBlockMessage(
                'other',
                messageTypes,
                () => false,
                () => true
            );
            
            expect(result.shouldBlock).toBe(true);
            expect(result.reasonKey).toBe('logs.baseManager.trackingDisabled');
        });

        test('блокирует сообщения если нет подключения', () => {
            const messageTypes = { OTHER: 'other' };
            
            const result = messageManager._shouldBlockMessage(
                'other',
                messageTypes,
                () => true,
                () => false
            );
            
            expect(result.shouldBlock).toBe(true);
            expect(result.reasonKey).toBe('logs.baseManager.noConnection');
        });

        test('использует translateFn если доступен', () => {
            const translateFn = jest.fn((key) => `Translated: ${key}`);
            const manager = new MessageManager({ getTranslateFn: () => translateFn });
            const messageTypes = { OTHER: 'other' };
            
            const result = manager._shouldBlockMessage(
                'other',
                messageTypes,
                () => false,
                () => true
            );
            
            expect(translateFn).toHaveBeenCalledWith('logs.baseManager.trackingDisabled');
            expect(result.reason).toContain('Translated:');
        });

        test('использует fallback если translateFn недоступен', () => {
            const manager = new MessageManager();
            const messageTypes = { OTHER: 'other' };
            
            const result = manager._shouldBlockMessage(
                'other',
                messageTypes,
                () => false,
                () => true
            );
            
            expect(result.reason).toBe('Tracking is disabled');
        });

        test('использует state.isTracking если getTrackingStatus не функция', () => {
            const messageTypes = { OTHER: 'other' };
            const state = { isTracking: false };
            
            const result = messageManager._shouldBlockMessage(
                'other',
                messageTypes,
                null,
                () => true,
                state
            );
            
            expect(result.shouldBlock).toBe(true);
        });

        test('использует state.isOnline если getOnlineStatus не функция', () => {
            const messageTypes = { OTHER: 'other' };
            const state = { isTracking: true, isOnline: false };
            
            const result = messageManager._shouldBlockMessage(
                'other',
                messageTypes,
                () => true,
                null,
                state
            );
            
            expect(result.shouldBlock).toBe(true);
        });

        test('использует дефолтные значения если state не определен', () => {
            const messageTypes = { OTHER: 'other' };
            
            const result = messageManager._shouldBlockMessage(
                'other',
                messageTypes,
                null,
                null,
                {}
            );
            
            // isTracking по умолчанию true, isOnline по умолчанию true
            expect(result.shouldBlock).toBe(false);
        });
    });

    describe('_isBlockingError', () => {
        test('возвращает false если error отсутствует', () => {
            expect(messageManager._isBlockingError(null)).toBe(false);
            expect(messageManager._isBlockingError(undefined)).toBe(false);
        });

        test('возвращает false если error.message отсутствует', () => {
            expect(messageManager._isBlockingError({})).toBe(false);
        });

        test('возвращает true если сообщение содержит паттерн блокировки', () => {
            const error = new Error('Tracking is disabled');
            
            expect(messageManager._isBlockingError(error)).toBe(true);
        });

        test('возвращает false если сообщение не содержит паттерн блокировки', () => {
            const error = new Error('Some other error');
            
            expect(messageManager._isBlockingError(error)).toBe(false);
        });
    });
});
