class DeveloperToolsManager {
    constructor(manager) {
        this.manager = manager;
    }

    toggle() {
        const manager = this.manager;

        try {
            const content = document.getElementById('developerToolsContent');
            const icon = document.getElementById('developerToolsIcon');
            const button = document.getElementById('toggleDeveloperTools');

            if (!content || !icon || !button) {
                manager._logError('Не найдены элементы developer tools');
                return;
            }

            const isVisible = content.style.display !== 'none';

            if (isVisible) {
                content.classList.add('hiding');
                icon.classList.remove('expanded');
                button.classList.remove('active');

                setTimeout(() => {
                    content.style.display = 'none';
                    content.classList.remove('hiding');
                }, 500);

                localStorage.setItem('mindful_developer_tools_expanded', 'false');
            } else {
                content.style.display = 'flex';
                icon.classList.add('expanded');
                button.classList.add('active');
                localStorage.setItem('mindful_developer_tools_expanded', 'true');
            }

            manager._log('Developer tools переключены', { isVisible: !isVisible });
        } catch (error) {
            manager._logError('Ошибка переключения developer tools', error);
        }
    }

    restoreState() {
        const manager = this.manager;

        try {
            const content = document.getElementById('developerToolsContent');
            const icon = document.getElementById('developerToolsIcon');
            const button = document.getElementById('toggleDeveloperTools');

            if (!content || !icon || !button) {
                return;
            }

            const isExpanded = localStorage.getItem('mindful_developer_tools_expanded') === 'true';

            if (isExpanded) {
                content.style.display = 'flex';
                icon.classList.add('expanded');
                button.classList.add('active');
            } else {
                content.style.display = 'none';
                icon.classList.remove('expanded');
                button.classList.remove('active');
            }

            manager._log('Developer tools состояние восстановлено', { isExpanded });
        } catch (error) {
            manager._logError('Ошибка восстановления состояния developer tools', error);
        }
    }

    openPanel(tab = 'logs') {
        const manager = this.manager;

        try {
            const panel = document.getElementById('devToolsPanel');
            if (!panel) {
                manager._logError('Панель разработчика не найдена');
                return;
            }

            panel.style.display = 'block';
            panel.classList.remove('closing');

            this.switchTab(tab);

            if (tab === 'logs') {
                manager.logsManager.loadLogs();
                manager.logsManager.startAutoRefresh();
            }

            setTimeout(() => {
                panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 100);

            manager._log(`Панель разработчика открыта, вкладка: ${tab}`);
        } catch (error) {
            manager._logError('Ошибка открытия панели разработчика', error);
        }
    }

    closePanel() {
        const manager = this.manager;

        try {
            const panel = document.getElementById('devToolsPanel');
            if (!panel) {
                manager._logError('Панель разработчика не найдена');
                return;
            }

            manager.logsManager.stopAutoRefresh();

            panel.classList.add('closing');

            setTimeout(() => {
                panel.style.display = 'none';
                panel.classList.remove('closing');
            }, 300);

            manager._log('Панель разработчика закрыта');
        } catch (error) {
            manager._logError('Ошибка закрытия панели разработчика', error);
        }
    }

    switchTab(tabName) {
        const manager = this.manager;

        try {
            const tabs = document.querySelectorAll('.dev-tab');
            const contents = document.querySelectorAll('.tab-content');

            tabs.forEach(tab => tab.classList.remove('active'));
            contents.forEach(content => content.classList.remove('active'));

            const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
            const activeContent = document.getElementById(`${tabName}TabContent`);

            if (activeTab && activeContent) {
                activeTab.classList.add('active');
                activeContent.classList.add('active');

                if (tabName === 'logs') {
                    manager.logsManager.loadLogs();
                    manager.logsManager.startAutoRefresh();
                } else {
                    manager.logsManager.stopAutoRefresh();
                }

                manager._log(`Переключено на вкладку: ${tabName}`);
            } else {
                manager._logError(`Вкладка ${tabName} не найдена`);
            }
        } catch (error) {
            manager._logError('Ошибка переключения вкладок', error);
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DeveloperToolsManager;
    module.exports.default = DeveloperToolsManager;
}

if (typeof window !== 'undefined') {
    window.DeveloperToolsManager = DeveloperToolsManager;
}
