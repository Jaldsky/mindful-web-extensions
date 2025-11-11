/**
 * Debug utilities for options page.
 * Functions for testing and debugging log storage.
 */

/**
 * Получает все логи из storage для отладки.
 * 
 * @async
 * @returns {Promise<Array>} Массив всех логов
 */
export async function debugGetAllLogs() {
    try {
        const result = await chrome.storage.local.get(['mindful_logs']);
        const logs = result.mindful_logs || [];
        // eslint-disable-next-line no-console
        console.log(`Total logs in storage: ${logs.length}`);
        return logs;
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error getting logs:', error);
        return [];
    }
}

/**
 * Очищает все логи из storage.
 * 
 * @async
 * @returns {Promise<boolean>} true если успешно
 */
export async function debugClearAllLogs() {
    try {
        await chrome.storage.local.set({ mindful_logs: [] });
        // eslint-disable-next-line no-console
        console.log('All logs cleared from storage');
        return true;
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error clearing logs:', error);
        return false;
    }
}

/**
 * Добавляет тестовый лог для проверки.
 * 
 * @async
 * @returns {Promise<boolean>} true если успешно
 */
export async function debugAddTestLog() {
    try {
        const result = await chrome.storage.local.get(['mindful_logs']);
        const logs = result.mindful_logs || [];
        
        logs.push({
            timestamp: new Date().toISOString(),
            level: 'INFO',
            className: 'TestDebug',
            message: 'Test log entry - if you see this, logging is working!',
            data: { test: true, timestamp: Date.now() }
        });
        
        await chrome.storage.local.set({ mindful_logs: logs });
        // eslint-disable-next-line no-console
        console.log('Test log added to storage');
        return true;
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error adding test log:', error);
        return false;
    }
}

/**
 * Добавляет много тестовых логов для проверки лимита 1000.
 * 
 * @async
 * @param {number} [count=1100] - Количество логов для создания
 * @returns {Promise<boolean>} true если успешно
 */
export async function debugFillLogs(count = 1100) {
    try {
        // eslint-disable-next-line no-console
        console.log(`Creating ${count} test logs...`);
        const result = await chrome.storage.local.get(['mindful_logs']);
        const logs = result.mindful_logs || [];
        
        const initialCount = logs.length;
        // eslint-disable-next-line no-console
        console.log(`Initial logs count: ${initialCount}`);
        
        for (let i = 0; i < count; i++) {
            logs.push({
                timestamp: new Date(Date.now() + i).toISOString(),
                level: i % 10 === 0 ? 'ERROR' : 'INFO',
                className: 'TestDebug',
                message: `Test log #${i + 1} of ${count}`,
                data: { index: i, timestamp: Date.now() + i }
            });
        }
        
        // eslint-disable-next-line no-console
        console.log(`Total logs before limit: ${logs.length}`);
        
        const maxLogs = 1000;
        if (logs.length > maxLogs) {
            const toRemove = logs.length - maxLogs;
            logs.splice(0, toRemove);
            // eslint-disable-next-line no-console
            console.log(`Removed ${toRemove} old logs to maintain limit of ${maxLogs}`);
        }
        
        await chrome.storage.local.set({ mindful_logs: logs });
        
        // eslint-disable-next-line no-console
        console.log(`Final logs count in storage: ${logs.length}`);
        // eslint-disable-next-line no-console
        console.log(`First log timestamp: ${logs[0].timestamp}`);
        // eslint-disable-next-line no-console
        console.log(`Last log timestamp: ${logs[logs.length - 1].timestamp}`);
        
        return true;
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error filling logs:', error);
        return false;
    }
}

/**
 * Добавляет тестовый лог от BackendManager для проверки фильтра SERVER.
 * 
 * @param {Object} optionsManagerInstance - Экземпляр OptionsManager для обновления логов
 * @returns {Promise<void>}
 */
export async function debugAddServerLog(optionsManagerInstance = null) {
    try {
        const result = await chrome.storage.local.get(['mindful_logs']);
        const logs = result.mindful_logs || [];
        
        const mockEvents = [
            { 
                event: 'active', 
                domain: 'instagram.com', 
                timestamp: new Date(Date.now() - 5000).toISOString() 
            },
            { 
                event: 'inactive', 
                domain: 'instagram.com', 
                timestamp: new Date(Date.now() - 3000).toISOString() 
            },
            { 
                event: 'active', 
                domain: 'youtube.com', 
                timestamp: new Date(Date.now() - 1000).toISOString() 
            }
        ];
        
        const serverLogs = [
            {
                timestamp: new Date(Date.now()).toISOString(),
                level: 'INFO',
                className: 'BackendManager',
                message: 'Отправка событий на backend',
                data: { 
                    method: 'POST',
                    url: 'http://localhost:3000/api/events',
                    eventsCount: mockEvents.length,
                    userId: 'test-user-123',
                    payload: { data: mockEvents }
                }
            },
            {
                timestamp: new Date(Date.now() + 100).toISOString(),
                level: 'INFO',
                className: 'BackendManager',
                message: 'Ответ от backend',
                data: { 
                    method: 'POST',
                    status: 204
                }
            },
            {
                timestamp: new Date(Date.now() + 200).toISOString(),
                level: 'INFO',
                className: 'BackendManager',
                message: 'События успешно отправлены',
                data: { 
                    eventsCount: 3
                }
            }
        ];
        
        logs.push(...serverLogs);
        
        await chrome.storage.local.set({ mindful_logs: logs });
        // eslint-disable-next-line no-console
        console.log('[Debug] Server logs added:', serverLogs.length);
        
        if (optionsManagerInstance && typeof optionsManagerInstance.loadLogs === 'function') {
            await optionsManagerInstance.loadLogs();
        }
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[Debug] Error adding server log:', error);
    }
}
