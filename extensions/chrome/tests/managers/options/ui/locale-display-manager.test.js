/**
 * @jest-environment jsdom
 */

const LocaleDisplayManager = require('../../../../src/managers/options/ui/LocaleDisplayManager.js');
const { createBaseOptionsManager } = require('../options-test-helpers.js');

describe('LocaleDisplayManager', () => {
    let manager;
    let localeDisplayManager;

    beforeEach(() => {
        manager = createBaseOptionsManager();
        localeDisplayManager = new LocaleDisplayManager(manager);
        
        document.body.innerHTML = `
            <div id="currentLanguage"></div>
            <span class="language-icon"></span>
            <button id="languageToggle"></button>
            <div class="diagnostics-status-label"></div>
            <div id="diagnosticsStatusValue" class="running"></div>
        `;
        
        manager.localeManager = {
            toggleLocale: jest.fn().mockResolvedValue(),
            getCurrentLocale: jest.fn(() => 'en'),
            localizeDOM: jest.fn(),
            t: jest.fn((key) => {
                const translations = {
                    'options.diagnostics.status': 'Status:',
                    'options.diagnostics.status.running': 'Running',
                    'options.diagnostics.status.success': 'Success',
                    'options.diagnostics.status.failed': 'Failed'
                };
                return translations[key] || key;
            })
        };
        
        manager.uiManager = {
            updateThemeDisplay: jest.fn(),
            domainExceptionsManager: {
                renderDomainExceptions: jest.fn()
            }
        };
        
        manager.diagnosticsWorkflowManager = {
            updateStatus: jest.fn()
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('constructor', () => {
        test('создает экземпляр с manager', () => {
            expect(localeDisplayManager.manager).toBe(manager);
        });
    });

    describe('toggleLanguage', () => {
        test('переключает язык через localeManager', async () => {
            await localeDisplayManager.toggleLanguage();
            
            expect(manager.localeManager.toggleLocale).toHaveBeenCalled();
        });

        test('обрабатывает ошибки при переключении языка', async () => {
            manager.localeManager.toggleLocale.mockRejectedValue(new Error('Test error'));
            
            await localeDisplayManager.toggleLanguage();
            
            expect(manager._logError).toHaveBeenCalled();
        });
    });

    describe('updateLanguageDisplay', () => {
        test('обновляет отображение языка для en', () => {
            manager.localeManager.getCurrentLocale.mockReturnValue('en');
            
            localeDisplayManager.updateLanguageDisplay();
            
            const languageCode = document.getElementById('currentLanguage');
            expect(languageCode.textContent).toBe('EN');
            
            const icon = document.querySelector('.language-icon');
            expect(icon.textContent).toBe('🇺🇸');
            
            const toggle = document.getElementById('languageToggle');
            expect(toggle.getAttribute('title')).toContain('🇷🇺');
        });

        test('обновляет отображение языка для ru', () => {
            manager.localeManager.getCurrentLocale.mockReturnValue('ru');
            
            localeDisplayManager.updateLanguageDisplay();
            
            const languageCode = document.getElementById('currentLanguage');
            expect(languageCode.textContent).toBe('RU');
            
            const icon = document.querySelector('.language-icon');
            expect(icon.textContent).toBe('🇷🇺');
            
            const toggle = document.getElementById('languageToggle');
            expect(toggle.getAttribute('title')).toContain('🇺🇸');
        });

        test('работает без languageCodeElement', () => {
            document.getElementById('currentLanguage').remove();
            
            expect(() => localeDisplayManager.updateLanguageDisplay()).not.toThrow();
        });

        test('работает без languageIconElement', () => {
            document.querySelector('.language-icon').remove();
            
            expect(() => localeDisplayManager.updateLanguageDisplay()).not.toThrow();
        });

        test('работает без languageToggleBtn', () => {
            document.getElementById('languageToggle').remove();
            
            expect(() => localeDisplayManager.updateLanguageDisplay()).not.toThrow();
        });
    });

    describe('onLocaleChange', () => {
        test('вызывает localizeDOM', () => {
            localeDisplayManager.onLocaleChange();
            
            expect(manager.localeManager.localizeDOM).toHaveBeenCalled();
        });

        test('обновляет отображение языка', () => {
            const updateSpy = jest.spyOn(localeDisplayManager, 'updateLanguageDisplay');
            
            localeDisplayManager.onLocaleChange();
            
            expect(updateSpy).toHaveBeenCalled();
        });

        test('обновляет отображение темы', () => {
            localeDisplayManager.onLocaleChange();
            
            expect(manager.uiManager.updateThemeDisplay).toHaveBeenCalled();
        });

        test('перерисовывает список исключений доменов', () => {
            localeDisplayManager.onLocaleChange();
            
            expect(manager.uiManager.domainExceptionsManager.renderDomainExceptions).toHaveBeenCalled();
        });

        test('обновляет label диагностики', () => {
            localeDisplayManager.onLocaleChange();
            
            const label = document.querySelector('.diagnostics-status-label');
            expect(label.textContent).toBe('Status:');
        });

        test('не обновляет label если перевод не найден', () => {
            manager.localeManager.t.mockReturnValue('options.diagnostics.status');
            
            localeDisplayManager.onLocaleChange();
            
            const label = document.querySelector('.diagnostics-status-label');
            expect(label.textContent).toBe('Status:');
        });

        test('обновляет статус диагностики для running', () => {
            const statusValue = document.getElementById('diagnosticsStatusValue');
            statusValue.className = 'running';
            
            localeDisplayManager.onLocaleChange();
            
            expect(manager.diagnosticsWorkflowManager.updateStatus).toHaveBeenCalledWith('running');
        });

        test('обновляет статус диагностики для success', () => {
            const statusValue = document.getElementById('diagnosticsStatusValue');
            statusValue.className = 'success';
            
            localeDisplayManager.onLocaleChange();
            
            expect(manager.diagnosticsWorkflowManager.updateStatus).toHaveBeenCalledWith('success');
        });

        test('обновляет статус диагностики для error', () => {
            const statusValue = document.getElementById('diagnosticsStatusValue');
            statusValue.className = 'error';
            
            localeDisplayManager.onLocaleChange();
            
            expect(manager.diagnosticsWorkflowManager.updateStatus).toHaveBeenCalledWith('failed');
        });

        test('обновляет статус диагностики для notRun', () => {
            const statusValue = document.getElementById('diagnosticsStatusValue');
            statusValue.className = '';
            
            localeDisplayManager.onLocaleChange();
            
            expect(manager.diagnosticsWorkflowManager.updateStatus).toHaveBeenCalledWith('notRun');
        });

        test('работает без diagnosticsStatusValue', () => {
            document.getElementById('diagnosticsStatusValue').remove();
            
            expect(() => localeDisplayManager.onLocaleChange()).not.toThrow();
        });

        test('работает без diagnostics-status-label', () => {
            document.querySelector('.diagnostics-status-label').remove();
            
            expect(() => localeDisplayManager.onLocaleChange()).not.toThrow();
        });

        test('обрабатывает ошибки при изменении локали', () => {
            manager.localeManager.localizeDOM.mockImplementation(() => {
                throw new Error('Test error');
            });
            
            localeDisplayManager.onLocaleChange();
            
            expect(manager._logError).toHaveBeenCalled();
        });
    });
});
