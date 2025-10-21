/**
 * Entry point for the popup page
 * Initializes the AppManager when the DOM is ready
 */
import AppManager from './app_manager/AppManager.js';

document.addEventListener('DOMContentLoaded', () => {
    window.appManager = new AppManager();
});

window.addEventListener('beforeunload', () => {
    if (window.appManager) {
        window.appManager.destroy();
    }
});

