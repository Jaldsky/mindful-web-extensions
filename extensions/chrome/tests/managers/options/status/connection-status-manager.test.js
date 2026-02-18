/**
 * @jest-environment jsdom
 */

const ConnectionStatusManager = require('../../../../src/managers/options/status/ConnectionStatusManager.js');

describe('ConnectionStatusManager', () => {
    let optionsManager;
    let connectionStatusManager;

    beforeEach(() => {
        document.body.innerHTML = `
            <div id="connectionStatus"></div>
            <div id="statusIndicator"></div>
            <button id="testConnection"></button>
            <div id="connectionLastCheck"></div>
        `;

        optionsManager = {
            domManager: {
                elements: {
                    connectionStatus: document.getElementById('connectionStatus'),
                    testConnection: document.getElementById('testConnection')
                }
            },
            localeManager: {
                t: jest.fn((key) => {
                    const map = {
                        'options.connection.checking': 'Checking...',
                        'options.connection.success': 'Connection successful',
                        'options.connection.failed': 'Connection failed',
                        'options.connection.tooFrequent': 'Request too frequent',
                        'options.connection.error': 'Connection error',
                        'options.connection.online': 'Online',
                        'options.connection.offline': 'Offline',
                        'options.connection.cachedStatus': 'Cached status',
                        'options.connection.checkError': 'Error checking status',
                        'options.connection.lastChecked': 'Last checked'
                    };
                    return map[key] || key;
                })
            },
            serviceWorkerManager: {
                checkConnection: jest.fn()
            },
            statusManager: {
                showStatus: jest.fn()
            },
            _logError: jest.fn(),
            _lastConnectionStatus: false,
            _connectionMessageTimer: null,
            _lastCheckType: null,
            _lastCheckTimestamp: null
        };

        connectionStatusManager = new ConnectionStatusManager(optionsManager);
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
        jest.clearAllMocks();
        document.body.innerHTML = '';
        delete global.chrome;
    });

    test('updateConnectionStatus обновляет UI в online', () => {
        connectionStatusManager.updateConnectionStatus(true);

        expect(optionsManager.domManager.elements.connectionStatus.textContent).toBe('Online');
        expect(document.getElementById('statusIndicator').classList.contains('status-online')).toBe(true);
        expect(optionsManager.domManager.elements.testConnection.disabled).toBe(false);
    });

    test('_showConnectionStatusMessage показывает временное сообщение и восстанавливает статус', () => {
        const spy = jest.spyOn(connectionStatusManager, 'updateConnectionStatus');
        optionsManager._lastConnectionStatus = true;

        connectionStatusManager._showConnectionStatusMessage('Temporary', 'warning');

        expect(optionsManager.domManager.elements.connectionStatus.textContent).toBe('Temporary');
        expect(optionsManager.domManager.elements.testConnection.disabled).toBe(true);

        jest.advanceTimersByTime(2000);
        expect(spy).toHaveBeenCalledWith(true);
    });

    test('testConnection успешный кейс показывает success и сохраняет статус', async () => {
        optionsManager.serviceWorkerManager.checkConnection.mockResolvedValue({ success: true });
        const saveSpy = jest.spyOn(connectionStatusManager, '_saveConnectionStatusToStorage').mockResolvedValue();

        const resultPromise = connectionStatusManager.testConnection();
        jest.advanceTimersByTime(500);
        const result = await resultPromise;

        expect(result).toBe(true);
        expect(saveSpy).toHaveBeenCalledWith(true);
        expect(optionsManager.statusManager.showStatus).toHaveBeenCalledWith('Connection successful', 'success');
    });

    test('loadConnectionStatus при tooFrequent использует кешированный статус', async () => {
        optionsManager.serviceWorkerManager.checkConnection.mockResolvedValue({ success: false, tooFrequent: true });
        jest.spyOn(connectionStatusManager, '_loadConnectionStatusFromStorage').mockResolvedValue(true);
        const updateSpy = jest.spyOn(connectionStatusManager, 'updateConnectionStatus');

        await connectionStatusManager.loadConnectionStatus();

        expect(updateSpy).toHaveBeenCalledWith(true);
        expect(document.getElementById('connectionLastCheck').textContent).toBe('Cached status');
    });

    test('_saveConnectionStatusToStorage и _loadConnectionStatusFromStorage работают с chrome.storage.local', async () => {
        const storageState = {};
        global.chrome = {
            runtime: { lastError: null },
            storage: {
                local: {
                    set: (obj, cb) => {
                        Object.assign(storageState, obj);
                        cb();
                    },
                    get: (_keys, cb) => {
                        cb({ mindful_connection_status: storageState.mindful_connection_status });
                    }
                }
            }
        };

        await connectionStatusManager._saveConnectionStatusToStorage(true);
        const loaded = await connectionStatusManager._loadConnectionStatusFromStorage();

        expect(loaded).toBe(true);
    });
});
