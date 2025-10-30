/**
 * @jest-environment jsdom
 */

/**
 * Тесты для StatusRenderer
 */

const StatusRenderer = require('../../../../src/managers/options/status/Renderer.js');

describe('StatusRenderer', () => {
    let el;
    let renderer;

    beforeEach(() => {
        el = document.createElement('div');
        document.body.appendChild(el);
        renderer = new StatusRenderer();
    });

    afterEach(() => {
        if (el && el.parentNode) el.parentNode.removeChild(el);
        renderer = null;
    });

    test('setElement: валидирует и устанавливает HTMLElement', () => {
        renderer.setElement(el);
        expect(renderer.statusElement).toBe(el);
    });

    test('setElement: выбрасывает для не HTMLElement', () => {
        expect(() => renderer.setElement('nope')).toThrow(TypeError);
    });

    test('display: возвращает false без элемента', () => {
        const r = new StatusRenderer();
        expect(r.display('msg', 'success')).toBe(false);
    });

    test('display: отображает текст и классы', () => {
        renderer.setElement(el);
        const ok = renderer.display('Hello', 'success');
        expect(ok).toBe(true);
        expect(el.textContent).toBe('Hello');
        expect(el.className).toBe('status-message success visible');
        expect(el.classList.contains('visible')).toBe(true);
    });

    test('hide: скрывает и очищает текст', () => {
        renderer.setElement(el);
        renderer.display('Hi', 'info');
        const ok = renderer.hide();
        expect(ok).toBe(true);
        expect(el.classList.contains('hidden')).toBe(true);
        expect(el.textContent).toBe('');
    });

    test('hide: возвращает false без элемента', () => {
        const r = new StatusRenderer();
        expect(r.hide()).toBe(false);
    });

    test('scheduleHide/clearHideTimeout: управляет таймером', () => {
        jest.useFakeTimers();
        renderer.setElement(el);
        const hideFn = jest.fn();
        renderer.scheduleHide(500, hideFn);
        expect(renderer.hideTimeout).not.toBeNull();
        renderer.clearHideTimeout();
        expect(renderer.hideTimeout).toBeNull();
        // Запланированная функция не должна выполниться после очистки
        jest.advanceTimersByTime(500);
        expect(hideFn).not.toHaveBeenCalled();
        jest.useRealTimers();
    });

    test('validateElement: предупреждение если элемент не в DOM, но не падает', () => {
        const detached = document.createElement('div');
        const r = new StatusRenderer();
        r.setElement(detached);
        // Не должно бросать
        expect(() => r.validateElement()).not.toThrow();
    });
});
