class IndexedDBManager {
    constructor() {
        this.dbName = 'BreathAppDB';
        this.version = 1;
        this.db = null;
        this.stores = {
            sessions: 'sessions',
            reminders: 'reminders',
            settings: 'settings',
            progress: 'progress'
        };
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => {
                console.error('[IndexedDB] Error opening database');
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('[IndexedDB] Database opened successfully');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                console.log('[IndexedDB] Upgrading database...');

                if (!db.objectStoreNames.contains(this.stores.sessions)) {
                    const sessionsStore = db.createObjectStore(this.stores.sessions, {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    sessionsStore.createIndex('date', 'date', { unique: false });
                    sessionsStore.createIndex('duration', 'duration', { unique: false });
                    sessionsStore.createIndex('accuracy', 'accuracy', { unique: false });
                }

                if (!db.objectStoreNames.contains(this.stores.reminders)) {
                    const remindersStore = db.createObjectStore(this.stores.reminders, {
                        keyPath: 'id'
                    });
                    remindersStore.createIndex('time', 'time', { unique: false });
                    remindersStore.createIndex('active', 'active', { unique: false });
                }

                if (!db.objectStoreNames.contains(this.stores.settings)) {
                    db.createObjectStore(this.stores.settings, {
                        keyPath: 'key'
                    });
                }

                if (!db.objectStoreNames.contains(this.stores.progress)) {
                    const progressStore = db.createObjectStore(this.stores.progress, {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    progressStore.createIndex('type', 'type', { unique: false });
                    progressStore.createIndex('period', 'period', { unique: false });
                    progressStore.createIndex('date', 'date', { unique: false });
                }
            };
        });
    }

    async add(storeName, data) {
        return this.executeTransaction(storeName, 'readwrite', (store) => {
            return store.add(data);
        });
    }

    async put(storeName, data) {
        return this.executeTransaction(storeName, 'readwrite', (store) => {
            return store.put(data);
        });
    }

    async get(storeName, key) {
        return this.executeTransaction(storeName, 'readonly', (store) => {
            return store.get(key);
        });
    }

    async getAll(storeName, query = null, count = null) {
        return this.executeTransaction(storeName, 'readonly', (store) => {
            if (query) {
                const index = store.index(Object.keys(query)[0]);
                return index.getAll(Object.values(query)[0], count);
            }
            return store.getAll(null, count);
        });
    }

    async delete(storeName, key) {
        return this.executeTransaction(storeName, 'readwrite', (store) => {
            return store.delete(key);
        });
    }

    async clear(storeName) {
        return this.executeTransaction(storeName, 'readwrite', (store) => {
            return store.clear();
        });
    }

    async count(storeName, query = null) {
        return this.executeTransaction(storeName, 'readonly', (store) => {
            if (query) {
                const index = store.index(Object.keys(query)[0]);
                return index.count(Object.values(query)[0]);
            }
            return store.count();
        });
    }

    async executeTransaction(storeName, mode, operation) {
        if (!this.db) {
            await this.init();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], mode);
            const store = transaction.objectStore(storeName);
            
            transaction.onerror = () => {
                console.error('[IndexedDB] Transaction failed:', transaction.error);
                reject(transaction.error);
            };

            const request = operation(store);
            
            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                console.error('[IndexedDB] Request failed:', request.error);
                reject(request.error);
            };
        });
    }

    async migrateFromLocalStorage() {
        try {
            console.log('[IndexedDB] Migrating from localStorage...');

            const reminders = JSON.parse(localStorage.getItem('breathapp-reminders') || '[]');
            if (reminders.length > 0) {
                for (const reminder of reminders) {
                    await this.put(this.stores.reminders, reminder);
                }
                console.log(`[IndexedDB] Migrated ${reminders.length} reminders`);
            }

            const sessions = JSON.parse(localStorage.getItem('breathapp-sessions') || '[]');
            if (sessions.length > 0) {
                for (const session of sessions) {
                    await this.add(this.stores.sessions, session);
                }
                console.log(`[IndexedDB] Migrated ${sessions.length} sessions`);
            }

            const audioSettings = JSON.parse(localStorage.getItem('breathapp-audio') || '{}');
            if (Object.keys(audioSettings).length > 0) {
                await this.put(this.stores.settings, {
                    key: 'audio',
                    value: audioSettings
                });
                console.log('[IndexedDB] Migrated audio settings');
            }

            const progressData = JSON.parse(localStorage.getItem('breathapp-progress') || '{}');
            if (Object.keys(progressData).length > 0) {
                await this.put(this.stores.settings, {
                    key: 'progress',
                    value: progressData
                });
                console.log('[IndexedDB] Migrated progress data');
            }

            localStorage.setItem('breathapp-migration-completed', 'true');
            console.log('[IndexedDB] Migration completed successfully');

        } catch (error) {
            console.error('[IndexedDB] Migration failed:', error);
            throw error;
        }
    }

    async getSessionsByDateRange(startDate, endDate) {
        return this.executeTransaction(this.stores.sessions, 'readonly', (store) => {
            const index = store.index('date');
            const range = IDBKeyRange.bound(startDate, endDate);
            return index.getAll(range);
        });
    }

    async getSessionsStats(period = 'all') {
        const now = new Date();
        let startDate;

        switch (period) {
            case 'today':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case 'week':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            default:
                startDate = new Date(0);
        }

        const sessions = await this.getSessionsByDateRange(startDate.getTime(), now.getTime());
        
        return {
            total: sessions.length,
            totalDuration: sessions.reduce((sum, s) => sum + s.duration, 0),
            averageAccuracy: sessions.reduce((sum, s) => sum + (s.accuracy || 0), 0) / sessions.length || 0,
            streak: this.calculateStreak(sessions),
            sessions: sessions
        };
    }

    calculateStreak(sessions) {
        if (sessions.length === 0) return 0;

        const sessionDates = [...new Set(sessions.map(s => 
            new Date(s.date).toDateString()
        ))].sort((a, b) => new Date(b) - new Date(a));

        let streak = 0;
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();

        if (sessionDates[0] === today || sessionDates[0] === yesterday) {
            let currentDate = sessionDates[0] === today ? today : yesterday;
            
            for (let i = 0; i < sessionDates.length; i++) {
                if (sessionDates[i] === currentDate) {
                    streak++;
                    const prevDate = new Date(currentDate);
                    prevDate.setDate(prevDate.getDate() - 1);
                    currentDate = prevDate.toDateString();
                } else {
                    break;
                }
            }
        }

        return streak;
    }

    async cleanup() {
        const maxSessions = 1000;
        const sessions = await this.getAll(this.stores.sessions);
        
        if (sessions.length > maxSessions) {
            const sortedSessions = sessions.sort((a, b) => a.date - b.date);
            const toDelete = sortedSessions.slice(0, sessions.length - maxSessions);
            
            for (const session of toDelete) {
                await this.delete(this.stores.sessions, session.id);
            }
            
            console.log(`[IndexedDB] Cleaned up ${toDelete.length} old sessions`);
        }
    }

    async export() {
        const data = {};
        
        for (const storeName of Object.values(this.stores)) {
            data[storeName] = await this.getAll(storeName);
        }
        
        return {
            version: this.version,
            exportDate: new Date().toISOString(),
            data
        };
    }

    async import(exportData) {
        if (!exportData.data) {
            throw new Error('Invalid export data format');
        }

        for (const [storeName, items] of Object.entries(exportData.data)) {
            if (this.stores[storeName]) {
                await this.clear(storeName);
                for (const item of items) {
                    await this.put(storeName, item);
                }
            }
        }

        console.log('[IndexedDB] Data imported successfully');
    }
}

const dbManager = new IndexedDBManager();

if (localStorage.getItem('breathapp-migration-completed') !== 'true') {
    dbManager.init().then(() => {
        dbManager.migrateFromLocalStorage().catch(console.error);
    });
} else {
    dbManager.init().catch(console.error);
}

export default dbManager;