/**
 * @jest-environment jsdom
 */

const mockLifecycleManagerInstance = { destroy: jest.fn(() => true) };
const mockInitializationManagerInstance = { init: jest.fn(), loadSettings: jest.fn() };
const mockUIManagerInstance = {};
const mockDiagnosticsWorkflowManagerInstance = {};
const mockDeveloperToolsManagerInstance = {};
const mockLogsManagerInstance = {};
const mockDiagnosticsDataManagerInstance = {};

const mockBaseManagerDestroy = jest.fn();
const mockBaseManagerConstructor = jest.fn();

jest.mock('../../../src/base/BaseManager.js', () => (
    class MockBaseManager {
        constructor(options = {}) {
            this.enableLogging = options.enableLogging;
            mockBaseManagerConstructor(options);
        }

        destroy() {
            mockBaseManagerDestroy();
        }
    }
));

const mockDomManagerInstance = { elements: {} };
const mockStorageManagerInstance = {};
const mockStatusManagerInstance = {};
const mockValidationManagerInstance = {};
const mockServiceWorkerManagerInstance = {};
const mockDiagnosticsManagerInstance = {};
const mockNotificationManagerInstance = {};
const mockLocaleManagerInstance = {};

jest.mock('../../../src/managers/options/DOMManager.js', () => jest.fn(() => mockDomManagerInstance));
jest.mock('../../../src/managers/options/StorageManager.js', () => jest.fn(() => mockStorageManagerInstance));
jest.mock('../../../src/managers/options/StatusManager.js', () => jest.fn(() => mockStatusManagerInstance));
jest.mock('../../../src/managers/options/ValidationManager.js', () => jest.fn(() => mockValidationManagerInstance));
jest.mock('../../../src/managers/app/ServiceWorkerManager.js', () => jest.fn(() => mockServiceWorkerManagerInstance));
jest.mock('../../../src/managers/app/DiagnosticsManager.js', () => jest.fn(() => mockDiagnosticsManagerInstance));
jest.mock('../../../src/managers/app/NotificationManager.js', () => jest.fn(() => mockNotificationManagerInstance));
jest.mock('../../../src/managers/locale/LocaleManager.js', () => jest.fn(() => mockLocaleManagerInstance));

jest.mock('../../../src/managers/options/InitializationManager.js', () => jest.fn(() => mockInitializationManagerInstance));
jest.mock('../../../src/managers/options/UIManager.js', () => jest.fn(() => mockUIManagerInstance));
jest.mock('../../../src/managers/options/DiagnosticsWorkflowManager.js', () => jest.fn(() => mockDiagnosticsWorkflowManagerInstance));
jest.mock('../../../src/managers/options/DeveloperToolsManager.js', () => jest.fn(() => mockDeveloperToolsManagerInstance));
jest.mock('../../../src/managers/options/LogsManager.js', () => jest.fn(() => mockLogsManagerInstance));
jest.mock('../../../src/managers/options/DiagnosticsDataManager.js', () => jest.fn(() => mockDiagnosticsDataManagerInstance));
jest.mock('../../../src/managers/options/LifecycleManager.js', () => jest.fn(() => mockLifecycleManagerInstance));

const InitializationManagerMock = require('../../../src/managers/options/InitializationManager.js');
const UIManagerMock = require('../../../src/managers/options/UIManager.js');
const DiagnosticsWorkflowManagerMock = require('../../../src/managers/options/DiagnosticsWorkflowManager.js');
const DeveloperToolsManagerMock = require('../../../src/managers/options/DeveloperToolsManager.js');
const LogsManagerMock = require('../../../src/managers/options/LogsManager.js');
const DiagnosticsDataManagerMock = require('../../../src/managers/options/DiagnosticsDataManager.js');
const LifecycleManagerMock = require('../../../src/managers/options/LifecycleManager.js');

const OptionsManager = require('../../../src/managers/options/OptionsManager.js');

describe('OptionsManager', () => {
    beforeEach(() => {
        mockInitializationManagerInstance.init.mockClear();
        mockLifecycleManagerInstance.destroy.mockClear();
        mockBaseManagerDestroy.mockClear();
        mockBaseManagerConstructor.mockClear();
        jest.clearAllMocks();
    });

    test('конструктор создаёт подменеджеры и запускает init', () => {
        const optionsManager = new OptionsManager({ enableLogging: false });

        expect(optionsManager).toBeInstanceOf(OptionsManager);
        expect(mockBaseManagerConstructor).toHaveBeenCalledWith(expect.objectContaining({ enableLogging: false }));
        expect(InitializationManagerMock).toHaveBeenCalledWith(optionsManager);
        expect(UIManagerMock).toHaveBeenCalledWith(optionsManager);
        expect(DiagnosticsWorkflowManagerMock).toHaveBeenCalledWith(optionsManager);
        expect(DeveloperToolsManagerMock).toHaveBeenCalledWith(optionsManager);
        expect(LogsManagerMock).toHaveBeenCalledWith(optionsManager);
        expect(DiagnosticsDataManagerMock).toHaveBeenCalledWith(optionsManager);
        expect(LifecycleManagerMock).toHaveBeenCalledWith(optionsManager);
        expect(mockInitializationManagerInstance.init).toHaveBeenCalled();
    });

    test('destroy вызывает LifecycleManager и super.destroy при успехе', () => {
        const optionsManager = new OptionsManager();

        optionsManager.destroy();

        expect(mockLifecycleManagerInstance.destroy).toHaveBeenCalled();
        expect(mockBaseManagerDestroy).toHaveBeenCalled();
    });

    test('destroy не вызывает super.destroy, если LifecycleManager возвращает false', () => {
        const optionsManager = new OptionsManager();
        mockLifecycleManagerInstance.destroy.mockReturnValueOnce(false);

        optionsManager.destroy();

        expect(mockBaseManagerDestroy).not.toHaveBeenCalled();
    });
});
