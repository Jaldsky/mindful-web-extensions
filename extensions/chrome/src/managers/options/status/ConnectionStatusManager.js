/**
 * Управляет проверкой и отображением статуса подключения в OptionsManager.
 *
 * @class ConnectionStatusManager
 */
class ConnectionStatusManager {
    /**
     * @param {import('../OptionsManager.js')} optionsManager
     */
    constructor(optionsManager) {
        this.options = optionsManager;
    }

    async testConnection() {
        const options = this.options;
        const button = options.domManager.elements.testConnection;
        const statusElement = options.domManager.elements.connectionStatus;
        const indicator = document.getElementById('statusIndicator');

        try {
            if (button) {
                button.disabled = true;
            }

            if (statusElement) {
                statusElement.textContent = options.localeManager.t('options.connection.checking') || 'Checking...';
            }

            if (indicator) {
                indicator.className = 'status-dot status-checking';
            }

            const minDelay = new Promise((resolve) => setTimeout(resolve, 500));
            const connectionCheck = options.serviceWorkerManager.checkConnection();

            const [connectionResult] = await Promise.all([connectionCheck, minDelay]);
            const isOnline = connectionResult.success;

            let message;
            let messageType;
            if (isOnline) {
                await this._saveConnectionStatusToStorage(isOnline);
                options._lastConnectionStatus = isOnline;
                message = options.localeManager.t('options.connection.success') || 'Connection successful';
                messageType = 'success';
            } else if (connectionResult.tooFrequent) {
                message = options.localeManager.t('options.connection.tooFrequent') || 'Request too frequent';
                messageType = 'warning';
            } else {
                await this._saveConnectionStatusToStorage(isOnline);
                options._lastConnectionStatus = isOnline;
                message = options.localeManager.t('options.connection.failed') || 'Connection failed';
                messageType = 'error';
            }

            this._showConnectionStatusMessage(message, messageType);
            options.statusManager.showStatus(message, messageType);

            return isOnline;
        } catch (error) {
            options._logError({ key: 'logs.options.testConnection.error' }, error);
            await this._saveConnectionStatusToStorage(false);
            options._lastConnectionStatus = false;
            const errorMessage = options.localeManager.t('options.connection.error') || 'Connection error';
            this._showConnectionStatusMessage(errorMessage, 'error');
            options.statusManager.showStatus(errorMessage, 'error');
            return false;
        }
    }

    updateConnectionStatus(isOnline) {
        const options = this.options;
        const element = options.domManager.elements.connectionStatus;
        const indicator = document.getElementById('statusIndicator');
        const button = options.domManager.elements.testConnection;

        if (!element) {
            return;
        }

        try {
            const statusText = isOnline
                ? (options.localeManager.t('options.connection.online') || 'Online')
                : (options.localeManager.t('options.connection.offline') || 'Offline');

            element.textContent = statusText;

            if (indicator) {
                indicator.className = 'status-dot';
                indicator.classList.add(isOnline ? 'status-online' : 'status-offline');
            }

            if (button) {
                button.disabled = false;
                button.classList.remove('showing-message');
            }
        } catch (error) {
            options._logError({ key: 'logs.options.updateConnectionStatus.error' }, error);
        }
    }

    _showConnectionStatusMessage(message, type = 'info') {
        const options = this.options;
        const element = options.domManager.elements.connectionStatus;
        const indicator = document.getElementById('statusIndicator');
        const lastCheck = document.getElementById('connectionLastCheck');
        const button = options.domManager.elements.testConnection;

        if (!element) {
            return;
        }

        const statusClass = type === 'success'
            ? 'status-online'
            : type === 'error'
                ? 'status-offline'
                : type === 'warning'
                    ? 'status-warning'
                    : 'status-checking';

        element.textContent = message;

        if (indicator) {
            indicator.className = 'status-dot';
            indicator.classList.add(statusClass);
        }

        if (button) {
            button.disabled = true;
            button.classList.add('showing-message');
        }

        if (lastCheck && type === 'success') {
            options._lastCheckType = 'timestamp';
            const now = new Date();
            options._lastCheckTimestamp = now;
            const timeString = now.toLocaleTimeString();
            const lastCheckedLabel = options.localeManager.t('options.connection.lastChecked') || 'Last checked';
            lastCheck.textContent = `${lastCheckedLabel}: ${timeString}`;
        }

        this.clearTimer();

        options._connectionMessageTimer = setTimeout(() => {
            options._connectionMessageTimer = null;
            const lastStatus = options._lastConnectionStatus !== undefined ? options._lastConnectionStatus : false;
            this.updateConnectionStatus(lastStatus);
        }, 2000);
    }

    async _saveConnectionStatusToStorage(isOnline) {
        const options = this.options;
        try {
            options._lastConnectionStatus = isOnline;
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                await new Promise((resolve, reject) => {
                    chrome.storage.local.set({ mindful_connection_status: isOnline }, () => {
                        if (chrome.runtime.lastError) {
                            reject(new Error(chrome.runtime.lastError.message));
                        } else {
                            resolve();
                        }
                    });
                });
            }
        } catch (error) {
            options._logError({ key: 'logs.options.saveConnectionStatusError' }, error);
        }
    }

    async _loadConnectionStatusFromStorage() {
        const options = this.options;
        try {
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                return await new Promise((resolve, reject) => {
                    chrome.storage.local.get(['mindful_connection_status'], (result) => {
                        if (chrome.runtime.lastError) {
                            reject(new Error(chrome.runtime.lastError.message));
                        } else {
                            resolve(result.mindful_connection_status !== undefined ? result.mindful_connection_status : null);
                        }
                    });
                });
            }
        } catch (error) {
            options._logError({ key: 'logs.options.loadConnectionStatusError' }, error);
        }
        return null;
    }

    updateConnectionLastCheckLocale() {
        const options = this.options;
        const lastCheck = document.getElementById('connectionLastCheck');
        if (!lastCheck) {
            return;
        }

        if (options._lastCheckType === 'cached') {
            const cachedLabel = options.localeManager.t('options.connection.cachedStatus') || 'Cached status';
            lastCheck.textContent = cachedLabel;
        } else if (options._lastCheckType === 'error') {
            const errorLabel = options.localeManager.t('options.connection.checkError') || 'Error checking status';
            lastCheck.textContent = errorLabel;
        } else if (options._lastCheckType === 'timestamp' && options._lastCheckTimestamp) {
            const timeString = options._lastCheckTimestamp.toLocaleTimeString();
            const lastCheckedLabel = options.localeManager.t('options.connection.lastChecked') || 'Last checked';
            lastCheck.textContent = `${lastCheckedLabel}: ${timeString}`;
        }
    }

    async loadConnectionStatus() {
        const options = this.options;
        const indicator = document.getElementById('statusIndicator');
        const statusElement = options.domManager.elements.connectionStatus;
        const lastCheck = document.getElementById('connectionLastCheck');

        if (indicator) {
            indicator.className = 'status-dot status-checking';
        }

        if (statusElement) {
            statusElement.textContent = options.localeManager.t('options.connection.checking') || 'Checking...';
        }

        try {
            const connectionResult = await options.serviceWorkerManager.checkConnection();

            if (connectionResult.tooFrequent) {
                const lastStatus = await this._loadConnectionStatusFromStorage();
                if (lastStatus !== null) {
                    this.updateConnectionStatus(lastStatus);
                    options._lastConnectionStatus = lastStatus;
                } else {
                    this.updateConnectionStatus(false);
                    options._lastConnectionStatus = false;
                }

                if (lastCheck) {
                    options._lastCheckType = 'cached';
                    const cachedLabel = options.localeManager.t('options.connection.cachedStatus') || 'Cached status';
                    lastCheck.textContent = cachedLabel;
                }
            } else {
                const isOnline = connectionResult.success;
                this.updateConnectionStatus(isOnline);
                options._lastConnectionStatus = isOnline;
                await this._saveConnectionStatusToStorage(isOnline);

                if (lastCheck && isOnline) {
                    options._lastCheckType = 'timestamp';
                    const now = new Date();
                    options._lastCheckTimestamp = now;
                    const timeString = now.toLocaleTimeString();
                    const lastCheckedLabel = options.localeManager.t('options.connection.lastChecked') || 'Last checked';
                    lastCheck.textContent = `${lastCheckedLabel}: ${timeString}`;
                }
            }
        } catch (error) {
            options._logError({ key: 'logs.options.loadConnectionStatusError' }, error);
            this.updateConnectionStatus(false);
            options._lastConnectionStatus = false;

            if (lastCheck) {
                options._lastCheckType = 'error';
                const errorLabel = options.localeManager.t('options.connection.checkError') || 'Error checking status';
                lastCheck.textContent = errorLabel;
            }
        }
    }

    clearTimer() {
        const options = this.options;
        if (options._connectionMessageTimer) {
            clearTimeout(options._connectionMessageTimer);
            options._connectionMessageTimer = null;
        }
    }
}

module.exports = ConnectionStatusManager;
module.exports.default = ConnectionStatusManager;
