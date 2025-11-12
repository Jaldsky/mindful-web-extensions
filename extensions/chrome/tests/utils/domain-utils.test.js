/**
 * @jest-environment jsdom
 */

const { normalizeDomain, normalizeDomainList } = require('../../src/utils/domainUtils.js');

describe('domainUtils', () => {
    describe('normalizeDomain', () => {
        test('нормализует простой домен', () => {
            expect(normalizeDomain('example.com')).toBe('example.com');
        });

        test('приводит к нижнему регистру', () => {
            expect(normalizeDomain('EXAMPLE.COM')).toBe('example.com');
        });

        test('удаляет пробелы', () => {
            expect(normalizeDomain('  example.com  ')).toBe('example.com');
        });

        test('удаляет протокол http://', () => {
            expect(normalizeDomain('http://example.com')).toBe('example.com');
        });

        test('удаляет протокол https://', () => {
            expect(normalizeDomain('https://example.com')).toBe('example.com');
        });

        test('удаляет www. префикс', () => {
            expect(normalizeDomain('www.example.com')).toBe('example.com');
        });

        test('удаляет путь из URL', () => {
            expect(normalizeDomain('example.com/path/to/page')).toBe('example.com');
        });

        test('удаляет query параметры', () => {
            expect(normalizeDomain('example.com?param=value')).toBe('example.com');
        });

        test('удаляет hash', () => {
            expect(normalizeDomain('example.com#section')).toBe('example.com');
        });

        test('удаляет порт', () => {
            expect(normalizeDomain('example.com:8080')).toBe('example.com');
        });

        test('удаляет credentials', () => {
            expect(normalizeDomain('user:pass@example.com')).toBe('example.com');
        });

        test('удаляет ведущие точки', () => {
            expect(normalizeDomain('...example.com')).toBe('example.com');
        });

        test('удаляет завершающие точки', () => {
            expect(normalizeDomain('example.com...')).toBe('example.com');
        });

        test('возвращает null для пустой строки', () => {
            expect(normalizeDomain('')).toBeNull();
        });

        test('возвращает null для строки только с пробелами', () => {
            expect(normalizeDomain('   ')).toBeNull();
        });

        test('возвращает null для не-строки', () => {
            expect(normalizeDomain(null)).toBeNull();
            expect(normalizeDomain(undefined)).toBeNull();
            expect(normalizeDomain(123)).toBeNull();
            expect(normalizeDomain({})).toBeNull();
            expect(normalizeDomain([])).toBeNull();
        });

        test('возвращает null для домена длиннее 253 символов', () => {
            const longDomain = `${'a'.repeat(250)}.com`;
            expect(normalizeDomain(longDomain)).toBeNull();
        });

        test('возвращает null для домена с недопустимыми символами', () => {
            expect(normalizeDomain('example@.com')).toBeNull();
            expect(normalizeDomain('example_com')).toBeNull();
            expect(normalizeDomain('example com')).toBeNull();
        });

        test('возвращает null для домена с двойными точками', () => {
            expect(normalizeDomain('example..com')).toBeNull();
        });

        test('возвращает null для домена без TLD', () => {
            expect(normalizeDomain('example')).toBeNull();
        });

        test('возвращает null для пустого label', () => {
            expect(normalizeDomain('.com')).toBeNull();
        });

        test('возвращает null для label длиннее 63 символов', () => {
            const longLabel = `${'a'.repeat(64)}.com`;
            expect(normalizeDomain(longLabel)).toBeNull();
        });

        test('возвращает null для label с недопустимыми символами', () => {
            expect(normalizeDomain('exam_ple.com')).toBeNull();
        });

        test('возвращает null для label начинающегося с дефиса', () => {
            expect(normalizeDomain('-example.com')).toBeNull();
        });

        test('возвращает null для label заканчивающегося дефисом', () => {
            expect(normalizeDomain('example-.com')).toBeNull();
        });

        test('принимает валидный домен с дефисом в середине', () => {
            expect(normalizeDomain('example-site.com')).toBe('example-site.com');
        });

        test('принимает домен с цифрами', () => {
            expect(normalizeDomain('example123.com')).toBe('example123.com');
        });

        test('принимает поддомен', () => {
            expect(normalizeDomain('sub.example.com')).toBe('sub.example.com');
        });

        test('обрабатывает сложный URL', () => {
            expect(normalizeDomain('https://www.user:pass@example.com:8080/path?query=value#hash')).toBe('example.com');
        });
    });

    describe('normalizeDomainList', () => {
        test('нормализует массив доменов', () => {
            const domains = ['EXAMPLE.COM', 'test.com', 'www.example.org'];
            const result = normalizeDomainList(domains);
            
            expect(result).toEqual(['example.com', 'test.com', 'example.org']);
        });

        test('удаляет дубликаты', () => {
            const domains = ['example.com', 'EXAMPLE.COM', 'example.com'];
            const result = normalizeDomainList(domains);
            
            expect(result).toEqual(['example.com']);
        });

        test('сохраняет порядок', () => {
            const domains = ['z.com', 'a.com', 'm.com'];
            const result = normalizeDomainList(domains);
            
            expect(result).toEqual(['z.com', 'a.com', 'm.com']);
        });

        test('фильтрует невалидные домены', () => {
            const domains = ['valid.com', 'invalid..com', 'another-valid.com', ''];
            const result = normalizeDomainList(domains);
            
            expect(result).toEqual(['valid.com', 'another-valid.com']);
        });

        test('возвращает пустой массив для не-массива', () => {
            expect(normalizeDomainList(null)).toEqual([]);
            expect(normalizeDomainList(undefined)).toEqual([]);
            expect(normalizeDomainList('string')).toEqual([]);
            expect(normalizeDomainList({})).toEqual([]);
        });

        test('возвращает пустой массив для пустого массива', () => {
            expect(normalizeDomainList([])).toEqual([]);
        });

        test('обрабатывает смешанные валидные и невалидные домены', () => {
            const domains = [
                'valid1.com',
                'invalid..com',
                'https://valid2.com',
                'www.valid3.com',
                null,
                undefined,
                '',
                '  ',
                'valid4.com'
            ];
            const result = normalizeDomainList(domains);
            
            expect(result).toEqual(['valid1.com', 'valid2.com', 'valid3.com', 'valid4.com']);
        });

        test('нормализует домены с протоколом', () => {
            const domains = ['http://example.com', 'https://test.com'];
            const result = normalizeDomainList(domains);
            
            expect(result).toEqual(['example.com', 'test.com']);
        });

        test('нормализует домены с www', () => {
            const domains = ['www.example.com', 'www.test.com'];
            const result = normalizeDomainList(domains);
            
            expect(result).toEqual(['example.com', 'test.com']);
        });
    });
});
