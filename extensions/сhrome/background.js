// Mindful Web Chrome Extension
// Отслеживает события фокуса и потери вкладки без внедрения скриптов

class MindfulTracker {
    constructor() {
        this.backendUrl = 'http://localhost:8000/api/v1/events/send';
        this.userId = null;
        this.eventQueue = [];
        this.isOnline = true; // Будет обновлено в setupEventListeners
        this.retryAttempts = 3;
        this.retryDelay = 5000; // 5 секунд
        this.batchSize = 10;
        this.batchTimeout = 30000; // 30 секунд
        this.stats = {
            eventsTracked: 0,
            domainsVisited: new Set(),
            isTracking: true
        };
        
        // Отслеживание предыдущей активной вкладки
        this.previousActiveTab = null;
        this.inactiveTimeout = null;
        
        this.init();
    }

    async init() {
        console.log('Mindful Web extension initialized');
        
        try {
            // Получаем или создаем user ID
            await this.getOrCreateUserId();
            
            // Загружаем настройки
            await this.loadSettings();
            
            // Настраиваем слушатели событий
            this.setupEventListeners();
            
            // Настраиваем обработчики сообщений
            this.setupMessageHandlers();
            
            // Запускаем периодическую отправку событий
            this.startBatchProcessor();
            
        // Восстанавливаем очередь событий при перезапуске
        await this.restoreEventQueue();
        
        // Инициализируем предыдущую активную вкладку
        await this.initializePreviousTab();
            
            console.log('Mindful Web extension fully initialized');
        } catch (error) {
            console.error('Error during initialization:', error);
        }
    }

    async getOrCreateUserId() {
        try {
            const result = await chrome.storage.local.get(['mindful_user_id']);
            if (result.mindful_user_id) {
                this.userId = result.mindful_user_id;
            } else {
                // Генерируем UUID v4
                this.userId = this.generateUUID();
                await chrome.storage.local.set({ mindful_user_id: this.userId });
            }
            console.log('User ID:', this.userId);
        } catch (error) {
            console.error('Error getting/creating user ID:', error);
        }
    }

    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    setupEventListeners() {
        // Отслеживание изменений вкладок
        chrome.tabs.onActivated.addListener((activeInfo) => {
            this.handleTabActivated(activeInfo);
        });

        // Отслеживание обновлений вкладок
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            if (changeInfo.status === 'complete' && tab.active) {
                this.handleTabUpdated(tab);
            }
        });

        // Отслеживание закрытия вкладок
        chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
            this.handleTabRemoved(tabId, removeInfo);
        });

        // Отслеживание изменений окна
        chrome.windows.onFocusChanged.addListener((windowId) => {
            this.handleWindowFocusChanged(windowId);
        });

        // Отслеживание онлайн/офлайн статуса
        // В Service Worker нет window объекта, используем navigator.onLine
        this.isOnline = navigator.onLine;
        
        // Проверяем статус подключения при инициализации
        if (this.isOnline) {
            this.processEventQueue();
        }
        
        // Периодическая проверка статуса подключения (каждые 30 секунд)
        setInterval(() => {
            const wasOnline = this.isOnline;
            this.isOnline = navigator.onLine;
            
            // Если статус изменился с офлайн на онлайн, обрабатываем очередь
            if (!wasOnline && this.isOnline) {
                console.log('Connection restored, processing event queue');
                this.processEventQueue();
            }
        }, 30000);
    }

    async handleTabActivated(activeInfo) {
        try {
            const tab = await chrome.tabs.get(activeInfo.tabId);
            if (tab && tab.url) {
                const domain = this.extractDomain(tab.url);
                if (domain) {
                    // Отправляем inactive для предыдущей вкладки, если она была
                    if (this.previousActiveTab && this.previousActiveTab.id !== tab.id) {
                        const previousDomain = this.extractDomain(this.previousActiveTab.url);
                        if (previousDomain) {
                            this.addEvent('inactive', previousDomain);
                        }
                    }
                    
                    // Отправляем active для новой вкладки
                    this.addEvent('active', domain);
                    
                    // Сохраняем текущую вкладку как предыдущую
                    this.previousActiveTab = tab;
                }
            }
        } catch (error) {
            console.error('Error handling tab activation:', error);
        }
    }

    async handleTabUpdated(tab) {
        if (tab && tab.url) {
            const domain = this.extractDomain(tab.url);
            if (domain) {
                // Отправляем inactive для предыдущей вкладки, если она была
                if (this.previousActiveTab && this.previousActiveTab.id !== tab.id) {
                    const previousDomain = this.extractDomain(this.previousActiveTab.url);
                    if (previousDomain) {
                        this.addEvent('inactive', previousDomain);
                    }
                }
                
                // Отправляем active для обновленной вкладки
                this.addEvent('active', domain);
                
                // Обновляем предыдущую вкладку
                this.previousActiveTab = tab;
            }
        }
    }

    async handleTabRemoved(tabId, removeInfo) {
        // Если закрывается активная вкладка, отправляем событие inactive
        if (removeInfo.windowClosing) {
            try {
                const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
                if (tabs.length > 0) {
                    const activeTab = tabs[0];
                    const domain = this.extractDomain(activeTab.url);
                    if (domain) {
                        this.addEvent('inactive', domain);
                    }
                }
            } catch (error) {
                console.error('Error handling tab removal:', error);
            }
        }
    }

    async handleWindowFocusChanged(windowId) {
        if (windowId === chrome.windows.WINDOW_ID_NONE) {
            // Все окна потеряли фокус - отправляем inactive для предыдущей вкладки
            if (this.previousActiveTab && this.previousActiveTab.url) {
                const domain = this.extractDomain(this.previousActiveTab.url);
                if (domain) {
                    this.addEvent('inactive', domain);
                }
            }
        } else {
            // Окно получило фокус
            try {
                const tabs = await chrome.tabs.query({ active: true, windowId: windowId });
                if (tabs.length > 0) {
                    const tab = tabs[0];
                    if (tab.url) {
                        const domain = this.extractDomain(tab.url);
                        if (domain) {
                            // Отправляем active для новой активной вкладки
                            this.addEvent('active', domain);
                            
                            // Обновляем предыдущую вкладку
                            this.previousActiveTab = tab;
                        }
                    }
                }
            } catch (error) {
                console.error('Error handling window focus change:', error);
            }
        }
    }

    extractDomain(url) {
        try {
            const urlObj = new URL(url);
            let domain = urlObj.hostname;
            
            // Убираем www. префикс
            if (domain.startsWith('www.')) {
                domain = domain.substring(4);
            }
            
            // Проверяем, что это валидный домен
            if (domain && domain.includes('.') && !domain.startsWith('chrome-extension://')) {
                return domain;
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    addEvent(eventType, domain) {
        const event = {
            event: eventType,
            domain: domain,
            timestamp: new Date().toISOString()
        };

        this.eventQueue.push(event);
        this.stats.eventsTracked++;
        this.stats.domainsVisited.add(domain);
        console.log('Event added:', event);

        // Если очередь достигла размера батча, отправляем сразу
        if (this.eventQueue.length >= this.batchSize) {
            this.processEventQueue();
        }
    }

    startBatchProcessor() {
        // Отправляем события каждые 30 секунд, если есть накопленные
        setInterval(() => {
            if (this.eventQueue.length > 0) {
                this.processEventQueue();
            }
        }, this.batchTimeout);
    }

    async processEventQueue() {
        if (this.eventQueue.length === 0 || !this.isOnline) {
            return;
        }

        const eventsToSend = this.eventQueue.splice(0, this.batchSize);
        console.log('Processing events:', eventsToSend);

        try {
            await this.sendEvents(eventsToSend);
            console.log('Events sent successfully');
        } catch (error) {
            console.error('Error sending events:', error);
            // Возвращаем события в очередь для повторной попытки
            this.eventQueue.unshift(...eventsToSend);
            
            // Планируем повторную попытку
            setTimeout(() => {
                this.processEventQueue();
            }, this.retryDelay);
        }
    }

    async sendEvents(events) {
        const payload = {
            data: events
        };

        console.log('Sending events to:', this.backendUrl);
        console.log('Payload:', payload);

        const response = await fetch(this.backendUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-User-ID': this.userId
            },
            body: JSON.stringify(payload)
        });

        console.log('Send events response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Send events error response:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const responseData = await response.json();
        console.log('Send events success:', responseData);
        return responseData;
    }

    async restoreEventQueue() {
        try {
            const result = await chrome.storage.local.get(['mindful_event_queue']);
            if (result.mindful_event_queue) {
                this.eventQueue = result.mindful_event_queue;
                console.log('Restored event queue:', this.eventQueue.length, 'events');
            }
        } catch (error) {
            console.error('Error restoring event queue:', error);
        }
    }

    async saveEventQueue() {
        try {
            await chrome.storage.local.set({ mindful_event_queue: this.eventQueue });
        } catch (error) {
            console.error('Error saving event queue:', error);
        }
    }

    async initializePreviousTab() {
        try {
            // Получаем текущую активную вкладку при инициализации
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tabs.length > 0) {
                this.previousActiveTab = tabs[0];
                console.log('Previous tab initialized:', this.previousActiveTab.url);
            }
        } catch (error) {
            console.error('Error initializing previous tab:', error);
        }
    }

    async loadSettings() {
        try {
            const result = await chrome.storage.local.get(['mindful_backend_url']);
            if (result.mindful_backend_url) {
                this.backendUrl = result.mindful_backend_url;
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    setupMessageHandlers() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            console.log('Received message:', request);
            
            try {
                switch (request.action) {
                    case 'getStatus':
                        sendResponse({
                            isOnline: this.isOnline,
                            isTracking: this.stats.isTracking,
                            stats: {
                                eventsTracked: this.stats.eventsTracked,
                                domainsVisited: this.stats.domainsVisited.size,
                                queueSize: this.eventQueue.length
                            }
                        });
                        break;
                        
                    case 'testConnection':
                        this.testConnection().then(result => {
                            sendResponse(result);
                        }).catch(error => {
                            console.error('Test connection error:', error);
                            sendResponse({ success: false, error: error.message });
                        });
                        return true; // Асинхронный ответ
                        
                    case 'updateBackendUrl':
                        this.backendUrl = request.url;
                        console.log('Backend URL updated to:', this.backendUrl);
                        sendResponse({ success: true });
                        break;
                        
                    case 'ping':
                        console.log('Ping received');
                        sendResponse({ success: true, message: 'pong' });
                        break;
                        
                    default:
                        console.warn('Unknown action:', request.action);
                        sendResponse({ success: false, error: 'Unknown action' });
                }
            } catch (error) {
                console.error('Error handling message:', error);
                sendResponse({ success: false, error: error.message });
            }
        });
    }

    async testConnection() {
        try {
            console.log('Testing connection to:', this.backendUrl);
            console.log('User ID:', this.userId);
            
            const testEvent = {
                event: 'active',
                domain: 'test.com',
                timestamp: new Date().toISOString()
            };

            console.log('Sending test event:', testEvent);

            const response = await fetch(this.backendUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-ID': this.userId
                },
                body: JSON.stringify({ data: [testEvent] })
            });

            console.log('Response status:', response.status);
            console.log('Response headers:', Object.fromEntries(response.headers.entries()));

            if (response.ok) {
                const responseText = await response.text();
                console.log('Response body:', responseText);
                return { success: true };
            } else {
                const errorText = await response.text();
                console.error('Error response:', errorText);
                return { 
                    success: false, 
                    error: `HTTP ${response.status}: ${errorText || response.statusText}` 
                };
            }
        } catch (error) {
            console.error('Connection test error:', error);
            return { 
                success: false, 
                error: `${error.name}: ${error.message}` 
            };
        }
    }
}

// Инициализация трекера
console.log('Creating MindfulTracker instance...');
const mindfulTracker = new MindfulTracker();
console.log('MindfulTracker instance created:', mindfulTracker);

// Обработчик установки/обновления расширения
chrome.runtime.onInstalled.addListener((details) => {
    console.log('Extension installed/updated:', details);
    if (details.reason === 'install') {
        console.log('First time installation');
    } else if (details.reason === 'update') {
        console.log('Extension updated');
    }
});

// Обработчик запуска расширения
chrome.runtime.onStartup.addListener(() => {
    console.log('Extension started');
});

// Сохраняем очередь событий при выключении расширения
chrome.runtime.onSuspend.addListener(() => {
    console.log('Extension suspending, saving event queue');
    mindfulTracker.saveEventQueue();
});
