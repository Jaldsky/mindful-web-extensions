/**
 * @jest-environment jsdom
 */

const DomainExceptionsManager = require('../../../../src/managers/options/ui/DomainExceptionsManager.js');
const { createBaseOptionsManager } = require('../options-test-helpers.js');

describe('DomainExceptionsManager', () => {
    let manager;
    let domainExceptionsManager;

    beforeEach(() => {
        manager = createBaseOptionsManager();
        domainExceptionsManager = new DomainExceptionsManager(manager);
        
        document.body.innerHTML = `
            <input id="domainExceptionInput" />
            <ul id="domainExceptionsList"></ul>
        `;
        
        manager.domManager.elements.domainExceptionInput = document.getElementById('domainExceptionInput');
        manager.domManager.elements.domainExceptionsList = document.getElementById('domainExceptionsList');
        
        manager.localeManager.t = jest.fn((key) => {
            const translations = {
                'options.form.domainExceptionsInvalid': 'Invalid domain',
                'options.form.domainExceptionsDuplicate': 'Domain already exists',
                'options.form.domainExceptionsRemove': 'Remove'
            };
            return translations[key] || key;
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('constructor', () => {
        test('инициализирует с пустым Set исключений', () => {
            expect(domainExceptionsManager.domainExceptions).toBeInstanceOf(Set);
            expect(domainExceptionsManager.domainExceptions.size).toBe(0);
        });
    });

    describe('setDomainExceptions', () => {
        test('устанавливает список исключений доменов', () => {
            const domains = ['example.com', 'test.com'];
            
            domainExceptionsManager.setDomainExceptions(domains);
            
            expect(domainExceptionsManager.domainExceptions.size).toBe(2);
            expect(domainExceptionsManager.domainExceptions.has('example.com')).toBe(true);
            expect(domainExceptionsManager.domainExceptions.has('test.com')).toBe(true);
            expect(manager.domainExceptions).toEqual(['example.com', 'test.com']);
        });

        test('нормализует домены', () => {
            domainExceptionsManager.setDomainExceptions(['WWW.EXAMPLE.COM', '  test.com  ']);
            
            expect(domainExceptionsManager.domainExceptions.has('example.com')).toBe(true);
            expect(domainExceptionsManager.domainExceptions.has('test.com')).toBe(true);
        });

        test('обновляет DOM после установки', () => {
            const domains = ['example.com'];
            const list = document.getElementById('domainExceptionsList');
            
            domainExceptionsManager.setDomainExceptions(domains);
            
            expect(list.children.length).toBe(1);
            expect(list.classList.contains('has-items')).toBe(true);
        });
    });

    describe('getDomainExceptions', () => {
        test('возвращает массив доменов', () => {
            domainExceptionsManager.domainExceptions.add('example.com');
            domainExceptionsManager.domainExceptions.add('test.com');
            
            const result = domainExceptionsManager.getDomainExceptions();
            
            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBe(2);
            expect(result).toContain('example.com');
            expect(result).toContain('test.com');
        });

        test('возвращает пустой массив если исключений нет', () => {
            const result = domainExceptionsManager.getDomainExceptions();
            
            expect(result).toEqual([]);
        });
    });

    describe('addDomainException', () => {
        test('добавляет домен из параметра', () => {
            const result = domainExceptionsManager.addDomainException('example.com');
            
            expect(result).toBe(true);
            expect(domainExceptionsManager.domainExceptions.has('example.com')).toBe(true);
            expect(manager.domainExceptions).toContain('example.com');
        });

        test('добавляет домен из input поля', () => {
            const input = document.getElementById('domainExceptionInput');
            input.value = 'test.com';
            
            const result = domainExceptionsManager.addDomainException();
            
            expect(result).toBe(true);
            expect(domainExceptionsManager.domainExceptions.has('test.com')).toBe(true);
            expect(input.value).toBe('');
        });

        test('нормализует домен перед добавлением', () => {
            domainExceptionsManager.addDomainException('WWW.EXAMPLE.COM');
            
            expect(domainExceptionsManager.domainExceptions.has('example.com')).toBe(true);
        });

        test('возвращает false для невалидного домена', () => {
            const result = domainExceptionsManager.addDomainException('invalid..domain');
            
            expect(result).toBe(false);
            expect(domainExceptionsManager.domainExceptions.size).toBe(0);
        });

        test('показывает ошибку для невалидного домена', () => {
            const input = document.getElementById('domainExceptionInput');
            input.setCustomValidity = jest.fn();
            input.reportValidity = jest.fn();
            
            domainExceptionsManager.addDomainException('invalid');
            
            expect(input.setCustomValidity).toHaveBeenCalled();
            expect(input.reportValidity).toHaveBeenCalled();
        });

        test('возвращает false для дубликата домена', () => {
            domainExceptionsManager.addDomainException('example.com');
            
            const result = domainExceptionsManager.addDomainException('example.com');
            
            expect(result).toBe(false);
            expect(domainExceptionsManager.domainExceptions.size).toBe(1);
        });

        test('показывает ошибку для дубликата', () => {
            domainExceptionsManager.addDomainException('example.com');
            const input = document.getElementById('domainExceptionInput');
            input.setCustomValidity = jest.fn();
            input.reportValidity = jest.fn();
            
            domainExceptionsManager.addDomainException('example.com');
            
            expect(input.setCustomValidity).toHaveBeenCalled();
            expect(input.reportValidity).toHaveBeenCalled();
        });

        test('очищает input после успешного добавления', () => {
            const input = document.getElementById('domainExceptionInput');
            input.value = 'example.com';
            input.setCustomValidity = jest.fn();
            input.focus = jest.fn();
            
            domainExceptionsManager.addDomainException();
            
            expect(input.value).toBe('');
            expect(input.setCustomValidity).toHaveBeenCalledWith('');
            expect(input.focus).toHaveBeenCalled();
        });

        test('логирует добавление домена', () => {
            domainExceptionsManager.addDomainException('example.com');
            
            expect(manager._log).toHaveBeenCalledWith(
                expect.objectContaining({ key: 'logs.ui.domainExceptions.domainAdded' }),
                expect.objectContaining({ domain: 'example.com' })
            );
        });

        test('работает без input элемента', () => {
            manager.domManager.elements.domainExceptionInput = null;
            
            const result = domainExceptionsManager.addDomainException('example.com');
            
            expect(result).toBe(true);
            expect(domainExceptionsManager.domainExceptions.has('example.com')).toBe(true);
        });
    });

    describe('removeDomainException', () => {
        test('удаляет домен из исключений', () => {
            domainExceptionsManager.domainExceptions.add('example.com');
            domainExceptionsManager.domainExceptions.add('test.com');
            
            domainExceptionsManager.removeDomainException('example.com');
            
            expect(domainExceptionsManager.domainExceptions.has('example.com')).toBe(false);
            expect(domainExceptionsManager.domainExceptions.has('test.com')).toBe(true);
            expect(manager.domainExceptions).not.toContain('example.com');
        });

        test('нормализует домен перед удалением', () => {
            domainExceptionsManager.domainExceptions.add('example.com');
            
            domainExceptionsManager.removeDomainException('WWW.EXAMPLE.COM');
            
            expect(domainExceptionsManager.domainExceptions.has('example.com')).toBe(false);
        });

        test('не удаляет если домен не существует', () => {
            domainExceptionsManager.domainExceptions.add('example.com');
            
            domainExceptionsManager.removeDomainException('nonexistent.com');
            
            expect(domainExceptionsManager.domainExceptions.size).toBe(1);
        });

        test('не удаляет если домен невалидный', () => {
            domainExceptionsManager.domainExceptions.add('example.com');
            
            domainExceptionsManager.removeDomainException('invalid..domain');
            
            expect(domainExceptionsManager.domainExceptions.size).toBe(1);
        });

        test('не удаляет если домен пустой', () => {
            domainExceptionsManager.domainExceptions.add('example.com');
            
            domainExceptionsManager.removeDomainException('');
            
            expect(domainExceptionsManager.domainExceptions.size).toBe(1);
        });

        test('обновляет DOM после удаления', () => {
            domainExceptionsManager.setDomainExceptions(['example.com', 'test.com']);
            const list = document.getElementById('domainExceptionsList');
            
            domainExceptionsManager.removeDomainException('example.com');
            
            expect(list.children.length).toBe(1);
        });

        test('логирует удаление домена', () => {
            domainExceptionsManager.domainExceptions.add('example.com');
            
            domainExceptionsManager.removeDomainException('example.com');
            
            expect(manager._log).toHaveBeenCalledWith(
                expect.objectContaining({ key: 'logs.ui.domainExceptions.domainRemoved' }),
                expect.objectContaining({ domain: 'example.com' })
            );
        });
    });

    describe('renderDomainExceptions', () => {
        test('отображает список доменов', () => {
            domainExceptionsManager.setDomainExceptions(['example.com', 'test.com']);
            const list = document.getElementById('domainExceptionsList');
            
            domainExceptionsManager.renderDomainExceptions();
            
            expect(list.children.length).toBe(2);
            expect(list.classList.contains('has-items')).toBe(true);
        });

        test('создает правильную структуру элементов', () => {
            domainExceptionsManager.setDomainExceptions(['example.com']);
            const list = document.getElementById('domainExceptionsList');
            
            domainExceptionsManager.renderDomainExceptions();
            
            const item = list.children[0];
            expect(item.className).toContain('domain-exception-item');
            expect(item.querySelector('span').textContent).toBe('example.com');
            expect(item.querySelector('button')).toBeDefined();
        });

        test('устанавливает правильные атрибуты кнопки удаления', () => {
            domainExceptionsManager.setDomainExceptions(['example.com']);
            const list = document.getElementById('domainExceptionsList');
            
            domainExceptionsManager.renderDomainExceptions();
            
            const button = list.querySelector('button');
            expect(button.getAttribute('data-domain')).toBe('example.com');
            expect(button.getAttribute('title')).toBe('Remove');
            expect(button.getAttribute('aria-label')).toContain('example.com');
        });

        test('очищает список если доменов нет', () => {
            domainExceptionsManager.setDomainExceptions(['example.com']);
            const list = document.getElementById('domainExceptionsList');
            
            domainExceptionsManager.setDomainExceptions([]);
            domainExceptionsManager.renderDomainExceptions();
            
            expect(list.children.length).toBe(0);
            expect(list.classList.contains('has-items')).toBe(false);
        });

        test('обрабатывает отсутствие элемента списка', () => {
            manager.domManager.elements.domainExceptionsList = null;
            
            domainExceptionsManager.renderDomainExceptions();
            
            expect(manager._log).toHaveBeenCalledWith(
                expect.objectContaining({ key: 'logs.ui.domainExceptions.domainExceptionsListNotFound' })
            );
        });

        test('обрабатывает ошибки при рендеринге', () => {
            const list = document.getElementById('domainExceptionsList');
            list.classList.add = jest.fn(() => { throw new Error('Test'); });
            
            domainExceptionsManager.setDomainExceptions(['example.com']);
            domainExceptionsManager.renderDomainExceptions();
            
            // Не должно падать
            expect(list.children.length).toBeGreaterThan(0);
        });
    });

    describe('_getLocaleText', () => {
        test('возвращает переведенный текст', () => {
            manager.localeManager.t.mockReturnValue('Translated text');
            
            const result = domainExceptionsManager._getLocaleText('test.key', 'Fallback');
            
            expect(result).toBe('Translated text');
        });

        test('возвращает fallback если перевод не найден', () => {
            manager.localeManager.t.mockReturnValue('test.key');
            
            const result = domainExceptionsManager._getLocaleText('test.key', 'Fallback');
            
            expect(result).toBe('Fallback');
        });

        test('обрабатывает ошибки локализации', () => {
            manager.localeManager.t.mockImplementation(() => { throw new Error('Test'); });
            
            const result = domainExceptionsManager._getLocaleText('test.key', 'Fallback');
            
            expect(result).toBe('Fallback');
            expect(manager._logError).toHaveBeenCalled();
        });
    });
});
