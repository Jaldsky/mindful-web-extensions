/**
 * Тесты для NotificationManager класса
 * Тестирует функциональность работы с уведомлениями
 */

const NotificationManager = require('../../../src/managers/app/NotificationManager.js');

describe('NotificationManager', () => {
    let notificationManager;

    beforeEach(() => {
        document.body.innerHTML = '';
        const existingStyles = document.getElementById('notification-styles');
        if (existingStyles) {
            existingStyles.remove();
        }
        
        notificationManager = new NotificationManager();
        jest.useFakeTimers();
    });

    afterEach(() => {
        notificationManager.destroy();
        jest.clearAllTimers();
        jest.useRealTimers();
    });

    describe('constructor', () => {
        test('should initialize with default options', () => {
            expect(notificationManager).toBeDefined();
            expect(notificationManager.state).toBeDefined();
            expect(notificationManager.CONSTANTS).toBeDefined();
            expect(notificationManager.notifications).toBeInstanceOf(Set);
            expect(notificationManager.timeouts).toBeInstanceOf(Map);
        });

        test('should have notification duration constant', () => {
            expect(notificationManager.CONSTANTS.NOTIFICATION_DURATION).toBe(3000);
        });

        test('should initialize with custom options', () => {
            const customManager = new NotificationManager({
                autoClear: false,
                maxNotifications: 5,
                position: 'bottom-left'
            });
            
            try {
                expect(customManager.autoClear).toBe(false);
                expect(customManager.maxNotifications).toBe(5);
                expect(customManager.position).toBe('bottom-left');
            } finally {
                customManager.destroy();
            }
        });

        test('should have static notification types', () => {
            expect(NotificationManager.NOTIFICATION_TYPES).toBeDefined();
            expect(NotificationManager.NOTIFICATION_TYPES.SUCCESS).toBe('success');
            expect(NotificationManager.NOTIFICATION_TYPES.ERROR).toBe('error');
            expect(NotificationManager.NOTIFICATION_TYPES.WARNING).toBe('warning');
            expect(NotificationManager.NOTIFICATION_TYPES.INFO).toBe('info');
        });
    });

    describe('showNotification', () => {
        test('should create and display success notification', () => {
            const message = 'Test success message';
            const type = NotificationManager.NOTIFICATION_TYPES.SUCCESS;

            const notification = notificationManager.showNotification(message, type);

            expect(notification).toBeDefined();
            expect(notification.textContent).toBe(message);
            expect(notification.className).toContain('notification-success');
            expect(notification.getAttribute('data-type')).toBe('success');
        });

        test('should create and display error notification', () => {
            const message = 'Test error message';
            const type = NotificationManager.NOTIFICATION_TYPES.ERROR;

            const notification = notificationManager.showNotification(message, type);

            expect(notification).toBeDefined();
            expect(notification.textContent).toBe(message);
            expect(notification.className).toContain('notification-error');
            expect(notification.getAttribute('data-type')).toBe('error');
        });

        test('should clear existing notifications when autoClear is true', () => {
            notificationManager.showNotification('First notification', 'success');
            expect(document.querySelectorAll('.notification')).toHaveLength(1);

            notificationManager.showNotification('Second notification', 'error');
            expect(document.querySelectorAll('.notification')).toHaveLength(1);
            expect(document.querySelector('.notification').textContent).toBe('Second notification');
        });

        test('should not clear existing notifications when autoClear is false', () => {
            const manager = new NotificationManager({ autoClear: false });
            
            try {
                manager.showNotification('First notification', 'success');
                manager.showNotification('Second notification', 'error');
                
                expect(document.querySelectorAll('.notification')).toHaveLength(2);
            } finally {
                manager.destroy();
            }
        });

        test('should limit notifications to maxNotifications', () => {
            const manager = new NotificationManager({ 
                autoClear: false, 
                maxNotifications: 2 
            });
            
            try {
                manager.showNotification('First', 'success');
                expect(manager.getActiveNotificationsCount()).toBe(1);
                
                manager.showNotification('Second', 'error');
                expect(manager.getActiveNotificationsCount()).toBe(2);

                manager.showNotification('Third', 'info');

                expect(manager.getActiveNotificationsCount()).toBe(2);

                const active = manager.getActiveNotifications();
                expect(active).toHaveLength(2);
            } finally {
                manager.destroy();
            }
        });

        test('should apply correct CSS classes for different types', () => {
            const successNotification = notificationManager.showNotification('Success', 'success');
            const errorNotification = notificationManager.showNotification('Error', 'error');
            const warningNotification = notificationManager.showNotification('Warning', 'warning');
            const infoNotification = notificationManager.showNotification('Info', 'info');
            
            expect(successNotification.className).toContain('notification-success');
            expect(errorNotification.className).toContain('notification-error');
            expect(warningNotification.className).toContain('notification-warning');
            expect(infoNotification.className).toContain('notification-info');
        });

        test('should handle custom duration', () => {
            notificationManager.showNotification('Test', 'success', { duration: 1000 });
            
            expect(document.querySelectorAll('.notification')).toHaveLength(1);

            jest.advanceTimersByTime(1000 + 300);
            
            expect(document.querySelectorAll('.notification')).toHaveLength(0);
        });

        test('should handle closable option', () => {
            const notification = notificationManager.showNotification('Test', 'success', { closable: true });
            
            expect(notification.onclick).toBeDefined();
        });

        test('should validate message parameter', () => {
            const result1 = notificationManager.showNotification(null, 'success');
            const result2 = notificationManager.showNotification(123, 'success');
            
            expect(result1).toBeNull();
            expect(result2).toBeNull();
        });

        test('should validate type parameter', () => {
            const notification = notificationManager.showNotification('Test', 'invalid-type');
            
            expect(notification).toBeDefined();
            expect(notification.getAttribute('data-type')).toBe('info');
        });

        test('should auto-remove notification after duration', () => {
            notificationManager.showNotification('Test message', 'success');
            
            expect(document.querySelectorAll('.notification')).toHaveLength(1);

            jest.advanceTimersByTime(notificationManager.CONSTANTS.NOTIFICATION_DURATION + 300);
            
            expect(document.querySelectorAll('.notification')).toHaveLength(0);
        });
    });

    describe('convenience methods', () => {
        test('should show success notification', () => {
            const notification = notificationManager.showSuccess('Success message');
            
            expect(notification).toBeDefined();
            expect(notification.getAttribute('data-type')).toBe('success');
            expect(notification.textContent).toBe('Success message');
        });

        test('should show error notification', () => {
            const notification = notificationManager.showError('Error message');
            
            expect(notification).toBeDefined();
            expect(notification.getAttribute('data-type')).toBe('error');
            expect(notification.textContent).toBe('Error message');
        });

        test('should show warning notification', () => {
            const notification = notificationManager.showWarning('Warning message');
            
            expect(notification).toBeDefined();
            expect(notification.getAttribute('data-type')).toBe('warning');
            expect(notification.textContent).toBe('Warning message');
        });

        test('should show info notification', () => {
            const notification = notificationManager.showInfo('Info message');
            
            expect(notification).toBeDefined();
            expect(notification.getAttribute('data-type')).toBe('info');
            expect(notification.textContent).toBe('Info message');
        });
    });

    describe('clearNotifications', () => {
        test('should remove all notifications from DOM', () => {
            notificationManager.showNotification('First', 'success');
            notificationManager.showNotification('Second', 'error');
            
            expect(document.querySelectorAll('.notification')).toHaveLength(1); // autoClear is true

            const count = notificationManager.clearNotifications();
            
            expect(count).toBe(1);
            expect(document.querySelectorAll('.notification')).toHaveLength(0);
            expect(notificationManager.getActiveNotificationsCount()).toBe(0);
        });

        test('should clear timeouts when clearing notifications', () => {
            notificationManager.showNotification('Test', 'success');
            
            const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
            notificationManager.clearNotifications();
            
            expect(clearTimeoutSpy).toHaveBeenCalled();
            clearTimeoutSpy.mockRestore();
        });

        test('should handle empty notifications gracefully', () => {
            const count = notificationManager.clearNotifications();
            expect(count).toBe(0);
        });
    });

    describe('removeNotification', () => {
        test('should remove specific notification with animation', () => {
            const notification = notificationManager.showNotification('Test message', 'success');
            
            expect(notificationManager.getActiveNotificationsCount()).toBe(1);
            
            const result = notificationManager.removeNotification(notification);
            
            expect(result).toBe(true);
            expect(notification.classList.contains('show')).toBe(false);

            expect(notificationManager.getActiveNotificationsCount()).toBe(0);

            expect(document.querySelectorAll('.notification')).toHaveLength(1);

            jest.advanceTimersByTime(300);

            expect(document.querySelectorAll('.notification')).toHaveLength(0);
        });

        test('should clear timeout when removing notification', () => {
            const notification = notificationManager.showNotification('Test', 'success');
            
            const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
            notificationManager.removeNotification(notification);
            
            expect(clearTimeoutSpy).toHaveBeenCalled();
            clearTimeoutSpy.mockRestore();
        });

        test('should return false for invalid notification', () => {
            const result1 = notificationManager.removeNotification(null);
            const result2 = notificationManager.removeNotification(undefined);
            const result3 = notificationManager.removeNotification(document.createElement('div'));
            
            expect(result1).toBe(false);
            expect(result2).toBe(false);
            expect(result3).toBe(false);
        });

        test('should handle notification without parentNode', () => {
            const notification = document.createElement('div');

            const result = notificationManager.removeNotification(notification);
            expect(result).toBe(false);
        });
    });

    describe('notification management methods', () => {
        test('should get active notifications count', () => {
            expect(notificationManager.getActiveNotificationsCount()).toBe(0);
            
            notificationManager.showNotification('Test', 'success');
            expect(notificationManager.getActiveNotificationsCount()).toBe(1);
        });

        test('should check if has active notifications', () => {
            expect(notificationManager.hasActiveNotifications()).toBe(false);
            
            notificationManager.showNotification('Test', 'success');
            expect(notificationManager.hasActiveNotifications()).toBe(true);
        });

        test('should get active notifications array', () => {
            notificationManager.showNotification('First', 'success');
            const notification2 = notificationManager.showNotification('Second', 'error');
            
            const activeNotifications = notificationManager.getActiveNotifications();
            expect(activeNotifications).toHaveLength(1); // autoClear is true
            expect(activeNotifications).toContain(notification2);
        });

        test('should get notifications by type', () => {
            const manager = new NotificationManager({ autoClear: false });
            
            try {
                manager.showNotification('Success 1', 'success');
                manager.showNotification('Error 1', 'error');
                manager.showNotification('Success 2', 'success');
                
                const successNotifications = manager.getNotificationsByType('success');
                const errorNotifications = manager.getNotificationsByType('error');
                
                expect(successNotifications).toHaveLength(2);
                expect(errorNotifications).toHaveLength(1);
            } finally {
                manager.destroy();
            }
        });
    });

    describe('settings management', () => {
        test('should update settings', () => {
            notificationManager.updateSettings({
                autoClear: false,
                maxNotifications: 5,
                position: 'bottom-left'
            });
            
            expect(notificationManager.autoClear).toBe(false);
            expect(notificationManager.maxNotifications).toBe(5);
            expect(notificationManager.position).toBe('bottom-left');
        });

        test('should validate settings on update', () => {
            const originalAutoClear = notificationManager.autoClear;
            const originalMaxNotifications = notificationManager.maxNotifications;
            const originalPosition = notificationManager.position;
            
            notificationManager.updateSettings({
                autoClear: 'invalid',
                maxNotifications: -1,
                position: 123
            });

            expect(notificationManager.autoClear).toBe(originalAutoClear);
            expect(notificationManager.maxNotifications).toBe(originalMaxNotifications);
            expect(notificationManager.position).toBe(originalPosition);
        });

        test('should throw error for invalid settings parameter', () => {
            expect(() => notificationManager.updateSettings(null)).toThrow(TypeError);
            expect(() => notificationManager.updateSettings('invalid')).toThrow(TypeError);
        });
    });

    describe('inheritance from BaseManager', () => {
        test('should have BaseManager methods', () => {
            expect(typeof notificationManager.updateState).toBe('function');
            expect(typeof notificationManager.getState).toBe('function');
        });

        test('should have CONSTANTS property', () => {
            expect(notificationManager.CONSTANTS).toBeDefined();
            expect(notificationManager.CONSTANTS.NOTIFICATION_DURATION).toBeDefined();
        });

        test('should have initial state', () => {
            const state = notificationManager.getState();
            expect(state).toHaveProperty('isOnline');
            expect(state).toHaveProperty('isTracking');
            expect(state).toHaveProperty('lastUpdate');
        });

        test('should update state correctly', () => {
            const newState = { isOnline: true };
            notificationManager.updateState(newState);
            
            const state = notificationManager.getState();
            expect(state.isOnline).toBe(true);
        });
    });

    describe('multiple notifications handling', () => {
        test('should handle rapid successive notifications with autoClear', () => {

            notificationManager.showNotification('First', 'success');
            notificationManager.showNotification('Second', 'error');
            notificationManager.showNotification('Third', 'success');

            expect(document.querySelectorAll('.notification')).toHaveLength(1);
            expect(document.querySelector('.notification').textContent).toBe('Third');
        });

        test('should handle multiple notifications without autoClear', () => {
            const manager = new NotificationManager({ autoClear: false });
            
            try {
                manager.showNotification('First', 'success');
                manager.showNotification('Second', 'error');
                manager.showNotification('Third', 'info');
                
                expect(document.querySelectorAll('.notification')).toHaveLength(3);
            } finally {
                manager.destroy();
            }
        });
    });

    describe('destroy method', () => {
        test('should clean up all resources', () => {
            notificationManager.showNotification('Test', 'success');
            
            expect(notificationManager.getActiveNotificationsCount()).toBe(1);
            
            notificationManager.destroy();
            
            expect(notificationManager.getActiveNotificationsCount()).toBe(0);
            expect(notificationManager.notifications.size).toBe(0);
            expect(notificationManager.timeouts.size).toBe(0);
        });

        test('should clear all timeouts on destroy', () => {
            notificationManager.showNotification('Test', 'success');
            
            const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
            notificationManager.destroy();
            
            expect(clearTimeoutSpy).toHaveBeenCalled();
            clearTimeoutSpy.mockRestore();
        });
    });

    describe('error handling', () => {
        test('should handle invalid notification type gracefully', () => {
            const notification = notificationManager.showNotification('Test', 'invalid-type');
            
            expect(notification).toBeDefined();
            expect(notification.getAttribute('data-type')).toBe('info');
        });

        test('should handle empty message', () => {
            const notification = notificationManager.showNotification('', 'success');

            expect(notification).toBeNull();
        });

        test('should handle null/undefined parameters', () => {
            const result1 = notificationManager.showNotification(null, 'success');
            const result2 = notificationManager.showNotification('Test', null);
            
            expect(result1).toBeNull();
            expect(result2).toBeDefined();
        });

        test('should handle errors in notification creation', () => {
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

            const originalBody = document.body;
            Object.defineProperty(document, 'body', {
                get: () => null,
                configurable: true
            });

            const result = notificationManager.showNotification('Test', 'success');
            
            expect(result).toBeNull();
            expect(consoleErrorSpy).toHaveBeenCalled();

            Object.defineProperty(document, 'body', {
                get: () => originalBody,
                configurable: true
            });
            
            consoleErrorSpy.mockRestore();
        });
    });

    describe('Performance Metrics', () => {
        test('should have performanceMetrics Map', () => {
            expect(notificationManager.performanceMetrics).toBeInstanceOf(Map);
        });

        test('getPerformanceMetrics should return object', () => {
            const metrics = notificationManager.getPerformanceMetrics();
            
            expect(typeof metrics).toBe('object');
        });

        test('should clear performance metrics on destroy', () => {
            notificationManager.performanceMetrics.set('test', 100);
            
            notificationManager.destroy();
            
            expect(notificationManager.performanceMetrics.size).toBe(0);
        });
    });

    describe('Notification Statistics', () => {
        test('should have notificationStats Map', () => {
            expect(notificationManager.notificationStats).toBeInstanceOf(Map);
        });

        test('getNotificationStatistics should return statistics object', () => {
            const stats = notificationManager.getNotificationStatistics();
            
            expect(stats).toHaveProperty('total');
            expect(stats).toHaveProperty('success');
            expect(stats).toHaveProperty('error');
            expect(stats).toHaveProperty('warning');
            expect(stats).toHaveProperty('info');
            expect(stats).toHaveProperty('currentActive');
        });

        test('should update statistics when showing notifications', () => {
            notificationManager.showSuccess('Success message');
            notificationManager.showError('Error message');
            notificationManager.showWarning('Warning message');
            
            const stats = notificationManager.getNotificationStatistics();
            
            expect(stats.total).toBe(3);
            expect(stats.success).toBe(1);
            expect(stats.error).toBe(1);
            expect(stats.warning).toBe(1);
        });

        test('should track currently active notifications', () => {
            // Создаем менеджер без autoClear чтобы уведомления накапливались
            const managerWithoutAutoClear = new NotificationManager({ autoClear: false });
            
            managerWithoutAutoClear.showSuccess('Message 1');
            managerWithoutAutoClear.showSuccess('Message 2');
            
            const stats = managerWithoutAutoClear.getNotificationStatistics();
            
            expect(stats.currentActive).toBe(2);
            
            managerWithoutAutoClear.destroy();
        });

        test('should clear notification stats on destroy', () => {
            notificationManager.showSuccess('Test');
            
            notificationManager.destroy();
            
            expect(notificationManager.notificationStats.size).toBe(0);
        });
    });
});
