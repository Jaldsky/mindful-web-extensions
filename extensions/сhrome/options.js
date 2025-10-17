// Options page script for Mindful Web extension

class OptionsManager {
    constructor() {
        this.defaultBackendUrl = 'http://localhost:8000/api/v1/events/send';
        this.init();
    }

    async init() {
        // Загружаем сохраненные настройки
        await this.loadSettings();
        
        // Настраиваем обработчики событий
        this.setupEventListeners();
    }

    setupEventListeners() {
        const form = document.getElementById('settingsForm');
        const resetBtn = document.getElementById('resetBtn');

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveSettings();
        });

        resetBtn.addEventListener('click', () => {
            this.resetToDefault();
        });
    }

    async loadSettings() {
        try {
            const result = await chrome.storage.local.get(['mindful_backend_url']);
            const backendUrl = result.mindful_backend_url || this.defaultBackendUrl;
            
            document.getElementById('backendUrl').value = backendUrl;
        } catch (error) {
            console.error('Error loading settings:', error);
            this.showStatus('Error loading settings', 'error');
        }
    }

    async saveSettings() {
        const backendUrl = document.getElementById('backendUrl').value.trim();
        
        if (!this.isValidUrl(backendUrl)) {
            this.showStatus('Please enter a valid URL', 'error');
            return;
        }

        try {
            await chrome.storage.local.set({ mindful_backend_url: backendUrl });
            this.showStatus('Settings saved successfully!', 'success');
            
            // Обновляем URL в background script
            chrome.runtime.sendMessage({
                action: 'updateBackendUrl',
                url: backendUrl
            });
        } catch (error) {
            console.error('Error saving settings:', error);
            this.showStatus('Error saving settings', 'error');
        }
    }

    async resetToDefault() {
        try {
            await chrome.storage.local.set({ mindful_backend_url: this.defaultBackendUrl });
            document.getElementById('backendUrl').value = this.defaultBackendUrl;
            this.showStatus('Settings reset to default', 'success');
            
            // Обновляем URL в background script
            chrome.runtime.sendMessage({
                action: 'updateBackendUrl',
                url: this.defaultBackendUrl
            });
        } catch (error) {
            console.error('Error resetting settings:', error);
            this.showStatus('Error resetting settings', 'error');
        }
    }

    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    showStatus(message, type) {
        const status = document.getElementById('status');
        status.textContent = message;
        status.className = `status ${type}`;
        status.style.display = 'block';
        
        // Скрываем статус через 3 секунды
        setTimeout(() => {
            status.style.display = 'none';
        }, 3000);
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    new OptionsManager();
});
