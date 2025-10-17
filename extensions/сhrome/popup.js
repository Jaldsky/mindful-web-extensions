// Popup script for Mindful Web extension

class PopupManager {
    constructor() {
        this.init();
    }

    async init() {
        await this.loadStatus();
        this.setupEventListeners();
        
        // Обновляем статус каждые 2 секунды
        setInterval(() => {
            this.loadStatus();
        }, 2000);
    }

    setupEventListeners() {
        document.getElementById('openSettings').addEventListener('click', () => {
            chrome.runtime.openOptionsPage();
        });

        document.getElementById('testConnection').addEventListener('click', () => {
            this.testConnection();
        });

        document.getElementById('reloadExtension').addEventListener('click', () => {
            this.reloadExtension();
        });

        document.getElementById('runDiagnostics').addEventListener('click', () => {
            this.runDiagnostics();
        });
    }

    async loadStatus() {
        try {
            // Сначала проверяем связь с помощью ping
            const pingResponse = await this.pingServiceWorker();
            
            if (pingResponse) {
                // Получаем статус из background script
                const response = await chrome.runtime.sendMessage({ action: 'getStatus' });
                
                if (response) {
                    this.updateConnectionStatus(response.isOnline);
                    this.updateTrackingStatus(response.isTracking);
                    this.updateStats(response.stats);
                } else {
                    this.updateConnectionStatus(false);
                    this.updateTrackingStatus(false);
                }
            } else {
                // Service worker не отвечает
                this.updateConnectionStatus(false);
                this.updateTrackingStatus(false);
            }
        } catch (error) {
            console.error('Error loading status:', error);
            this.updateConnectionStatus(false);
            this.updateTrackingStatus(false);
        }
    }

    async pingServiceWorker() {
        try {
            const response = await chrome.runtime.sendMessage({ action: 'ping' });
            return response && response.success;
        } catch (error) {
            console.error('Ping failed:', error);
            return false;
        }
    }

    updateConnectionStatus(isOnline) {
        const statusElement = document.getElementById('connectionStatus');
        if (isOnline) {
            statusElement.textContent = 'Online';
            statusElement.className = 'status-value online';
        } else {
            statusElement.textContent = 'Offline';
            statusElement.className = 'status-value offline';
        }
    }

    updateTrackingStatus(isTracking) {
        const statusElement = document.getElementById('trackingStatus');
        if (isTracking) {
            statusElement.textContent = 'Active';
            statusElement.className = 'status-value active';
        } else {
            statusElement.textContent = 'Inactive';
            statusElement.className = 'status-value inactive';
        }
    }

    updateStats(stats) {
        if (stats) {
            document.getElementById('eventsCount').textContent = stats.eventsTracked || 0;
            document.getElementById('domainsCount').textContent = stats.domainsVisited || 0;
            document.getElementById('queueSize').textContent = stats.queueSize || 0;
        }
    }

    async testConnection() {
        const button = document.getElementById('testConnection');
        const originalText = button.textContent;
        
        button.textContent = 'Testing...';
        button.disabled = true;
        
        try {
            console.log('Starting connection test...');
            
            // Сначала проверяем связь с service worker
            const pingResponse = await this.pingServiceWorker();
            
            if (!pingResponse) {
                this.showNotification('Service worker not responding. Please reload the extension.', 'error');
                return;
            }
            
            // Теперь тестируем подключение к бэкенду
            const response = await chrome.runtime.sendMessage({ action: 'testConnection' });
            console.log('Connection test response:', response);
            
            if (response && response.success) {
                this.showNotification('Connection successful!', 'success');
            } else if (response) {
                this.showNotification('Backend connection failed: ' + response.error, 'error');
            } else {
                this.showNotification('No response from service worker', 'error');
            }
        } catch (error) {
            console.error('Connection test error:', error);
            
            if (error.message.includes('Receiving end does not exist')) {
                this.showNotification('Extension not active. Please reload the extension.', 'error');
            } else {
                this.showNotification('Connection test failed: ' + error.message, 'error');
            }
        } finally {
            button.textContent = originalText;
            button.disabled = false;
        }
    }

    reloadExtension() {
        try {
            chrome.runtime.reload();
            this.showNotification('Extension reloaded!', 'success');
        } catch (error) {
            console.error('Error reloading extension:', error);
            this.showNotification('Failed to reload extension', 'error');
        }
    }

    async runDiagnostics() {
        const button = document.getElementById('runDiagnostics');
        const originalText = button.textContent;
        
        button.textContent = 'Running...';
        button.disabled = true;
        
        try {
            console.log('Running diagnostics...');
            
            // Проверяем доступность Chrome APIs
            if (typeof chrome === 'undefined') {
                this.showNotification('❌ Chrome APIs not available. This popup is not running in extension context.', 'error');
                return;
            }
            
            if (!chrome.runtime) {
                this.showNotification('❌ chrome.runtime not available. Extension may not be properly loaded.', 'error');
                return;
            }
            
            console.log('Chrome APIs available, testing service worker...');
            
            // Тест 1: Ping service worker с детальной диагностикой
            let pingResult = false;
            let pingError = null;
            try {
                console.log('Sending ping message...');
                const pingResponse = await chrome.runtime.sendMessage({ action: 'ping' });
                console.log('Ping response received:', pingResponse);
                pingResult = pingResponse && pingResponse.success;
            } catch (error) {
                console.error('Ping failed with error:', error);
                pingError = error.message;
            }
            
            // Тест 2: Получение статуса
            let statusResult = false;
            let statusError = null;
            if (pingResult) {
                try {
                    console.log('Testing status API...');
                    const response = await chrome.runtime.sendMessage({ action: 'getStatus' });
                    console.log('Status response:', response);
                    statusResult = !!response;
                } catch (error) {
                    console.error('Status test failed:', error);
                    statusError = error.message;
                }
            }
            
            // Тест 3: Проверка бэкенда
            let backendResult = false;
            let backendError = null;
            if (pingResult) {
                try {
                    console.log('Testing backend connection...');
                    const response = await chrome.runtime.sendMessage({ action: 'testConnection' });
                    console.log('Backend response:', response);
                    backendResult = response && response.success;
                    if (!backendResult && response) {
                        backendError = response.error;
                    }
                } catch (error) {
                    console.error('Backend test failed:', error);
                    backendError = error.message;
                }
            }
            
            // Детальные результаты диагностики
            const results = [];
            results.push(`🔍 Service Worker: ${pingResult ? '✅ OK' : `❌ FAILED${pingError ? ' (' + pingError + ')' : ''}`}`);
            results.push(`📊 Status API: ${statusResult ? '✅ OK' : `❌ FAILED${statusError ? ' (' + statusError + ')' : ''}`}`);
            results.push(`🌐 Backend API: ${backendResult ? '✅ OK' : `❌ FAILED${backendError ? ' (' + backendError + ')' : ''}`}`);
            
            const allGood = pingResult && statusResult && backendResult;
            const message = results.join('\n');
            
            if (allGood) {
                this.showNotification('All diagnostics passed! ✅', 'success');
            } else {
                this.showNotification(`Diagnostics completed:\n${message}`, 'error');
            }
            
            console.log('Diagnostics completed:', { pingResult, statusResult, backendResult, pingError, statusError, backendError });
            
        } catch (error) {
            console.error('Diagnostics error:', error);
            this.showNotification('Diagnostics failed: ' + error.message, 'error');
        } finally {
            button.textContent = originalText;
            button.disabled = false;
        }
    }

    showNotification(message, type) {
        // Создаем временное уведомление
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 10px;
            left: 10px;
            right: 10px;
            padding: 10px;
            border-radius: 4px;
            font-size: 12px;
            text-align: center;
            z-index: 1000;
            ${type === 'success' ? 
                'background-color: #d4edda; color: #155724; border: 1px solid #c3e6cb;' : 
                'background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb;'
            }
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Удаляем уведомление через 3 секунды
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    new PopupManager();
});
