/**
 * Менеджер для работы с инструментами разработчика.
 * Отвечает за переключение видимости, открытие/закрытие панели и переключение вкладок.
 * 
 * @class DeveloperToolsManager
 */
class DeveloperToolsManager {
    /**
     * Создает экземпляр DeveloperToolsManager.
     * 
     * @param {Object} manager - Экземпляр OptionsManager
     */
    constructor(manager) {
        this.manager = manager;
    }

    /**
     * Переключает видимость developer tools.
     * 
     * @returns {void}
     */
    toggle() {
        const manager = this.manager;

        try {
            const content = document.getElementById('developerToolsContent');
            const icon = document.getElementById('developerToolsIcon');
            const button = document.getElementById('toggleDeveloperTools');

            if (!content || !icon || !button) {
                manager._logError({ key: 'logs.developerTools.elementsNotFound' });
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

            manager._log({ key: 'logs.developerTools.toggled' }, { isVisible: !isVisible });
        } catch (error) {
            manager._logError({ key: 'logs.developerTools.toggleError' }, error);
        }
    }

    /**
     * Восстанавливает состояние developer tools из localStorage.
     * 
     * @returns {void}
     */
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

            manager._log({ key: 'logs.developerTools.stateRestored' }, { isExpanded });
        } catch (error) {
            manager._logError({ key: 'logs.developerTools.restoreError' }, error);
        }
    }

    /**
     * Открывает панель разработчика.
     * 
     * @param {string} [tab='logs'] - Имя вкладки для открытия
     * @returns {void}
     */
    openPanel(tab = 'logs') {
        const manager = this.manager;

        try {
            const panel = document.getElementById('devToolsPanel');
            if (!panel) {
                manager._logError({ key: 'logs.developerTools.panelNotFound' });
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
        } catch (error) {
            manager._logError({ key: 'logs.developerTools.openError' }, error);
        }
    }

    /**
     * Закрывает панель разработчика.
     * 
     * @returns {void}
     */
    closePanel() {
        const manager = this.manager;

        try {
            const panel = document.getElementById('devToolsPanel');
            if (!panel) {
                manager._logError({ key: 'logs.developerTools.panelNotFound' });
                return;
            }

            manager.logsManager.stopAutoRefresh();

            panel.classList.add('closing');

            setTimeout(() => {
                panel.style.display = 'none';
                panel.classList.remove('closing');
            }, 300);

            manager._log({ key: 'logs.developerTools.panelClosed' });
        } catch (error) {
            manager._logError({ key: 'logs.developerTools.closeError' }, error);
        }
    }

    /**
     * Переключает вкладку в панели разработчика.
     * 
     * @param {string} tabName - Имя вкладки для переключения
     * @returns {void}
     */
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
            } else {
                manager._logError({ key: 'logs.developerTools.tabNotFound', params: { tabName } });
            }
        } catch (error) {
            manager._logError({ key: 'logs.developerTools.switchTabError' }, error);
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
