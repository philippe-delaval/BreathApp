// Module de gestion des rappels - BreathApp
// Respecte l'architecture existante et les patterns du projet

class ReminderManager {
    constructor() {
        this.storageKey = 'breathapp-reminders';
        this.defaultReminders = [
            { id: 1, time: '08:00', active: true, label: 'Séance matinale' },
            { id: 2, time: '13:00', active: true, label: 'Séance midi' },
            { id: 3, time: '18:00', active: true, label: 'Séance soir' }
        ];
        this.reminders = this.loadReminders();
        this.isCapacitorAvailable = this.checkCapacitorAvailability();
    }

    // Vérifier si Capacitor est disponible
    checkCapacitorAvailability() {
        return typeof window !== 'undefined' && 
               window.Capacitor && 
               window.Capacitor.Plugins && 
               window.Capacitor.Plugins.LocalNotifications;
    }

    // Charger les rappels depuis localStorage
    loadReminders() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            return saved ? JSON.parse(saved) : this.defaultReminders;
        } catch (error) {
            console.error('Erreur lors du chargement des rappels:', error);
            return this.defaultReminders;
        }
    }

    // Sauvegarder les rappels dans localStorage
    saveReminders() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.reminders));
            this.scheduleNotifications();
        } catch (error) {
            console.error('Erreur lors de la sauvegarde des rappels:', error);
        }
    }

    // Obtenir tous les rappels
    getReminders() {
        return this.reminders;
    }

    // Obtenir les rappels actifs
    getActiveReminders() {
        return this.reminders.filter(reminder => reminder.active);
    }

    // Mettre à jour un rappel
    updateReminder(id, updates) {
        const reminderIndex = this.reminders.findIndex(r => r.id === id);
        if (reminderIndex !== -1) {
            this.reminders[reminderIndex] = { ...this.reminders[reminderIndex], ...updates };
            this.saveReminders();
            return true;
        }
        return false;
    }

    // Activer/désactiver un rappel
    toggleReminder(id) {
        const reminder = this.reminders.find(r => r.id === id);
        if (reminder) {
            reminder.active = !reminder.active;
            this.saveReminders();
            return reminder.active;
        }
        return false;
    }

    // Programmer les notifications
    async scheduleNotifications() {
        if (!this.isCapacitorAvailable) {
            console.log('Capacitor non disponible, utilisation du fallback web');
            this.setupWebNotifications();
            return;
        }

        try {
            const { LocalNotifications } = window.Capacitor.Plugins;
            
            // Supprimer les notifications existantes
            await LocalNotifications.cancel({ notifications: [{ id: '1' }, { id: '2' }, { id: '3' }] });

            // Programmer les nouvelles notifications
            const notifications = this.getActiveReminders().map(reminder => ({
                id: reminder.id,
                title: 'BreathApp - Cohérence Cardiaque',
                body: `${reminder.label} - Il est temps de respirer !`,
                schedule: this.createSchedule(reminder.time),
                sound: 'default',
                attachments: [],
                actionTypeId: 'BREATHING_REMINDER',
                extra: {
                    reminderType: 'breathing',
                    sessionDuration: 300
                }
            }));

            await LocalNotifications.schedule({ notifications });
            console.log('Notifications programmées:', notifications.length);
        } catch (error) {
            console.error('Erreur lors de la programmation des notifications:', error);
            this.setupWebNotifications();
        }
    }

    // Créer un planning de répétition quotidienne
    createSchedule(time) {
        const [hours, minutes] = time.split(':').map(Number);
        const now = new Date();
        const scheduledTime = new Date();
        scheduledTime.setHours(hours, minutes, 0, 0);

        // Si l'heure est déjà passée aujourd'hui, programmer pour demain
        if (scheduledTime <= now) {
            scheduledTime.setDate(scheduledTime.getDate() + 1);
        }

        return {
            at: scheduledTime,
            repeats: true,
            every: 'day'
        };
    }

    // Fallback pour les notifications web
    setupWebNotifications() {
        if ('Notification' in window) {
            if (Notification.permission === 'default') {
                Notification.requestPermission();
            }
            
            this.getActiveReminders().forEach(reminder => {
                this.scheduleWebNotification(reminder);
            });
        }
    }

    // Programmer une notification web
    scheduleWebNotification(reminder) {
        const [hours, minutes] = reminder.time.split(':').map(Number);
        const now = new Date();
        const scheduledTime = new Date();
        scheduledTime.setHours(hours, minutes, 0, 0);

        if (scheduledTime <= now) {
            scheduledTime.setDate(scheduledTime.getDate() + 1);
        }

        const timeUntilNotification = scheduledTime.getTime() - now.getTime();

        setTimeout(() => {
            if (Notification.permission === 'granted') {
                new Notification('BreathApp - Cohérence Cardiaque', {
                    body: `${reminder.label} - Il est temps de respirer !`,
                    icon: './src/img/favicon.png',
                    tag: `breathing-reminder-${reminder.id}`
                });
            }
            
            // Reprogrammer pour le lendemain
            setTimeout(() => this.scheduleWebNotification(reminder), 24 * 60 * 60 * 1000);
        }, timeUntilNotification);
    }

    // Demander les permissions pour les notifications
    async requestPermissions() {
        if (this.isCapacitorAvailable) {
            try {
                const { LocalNotifications } = window.Capacitor.Plugins;
                const result = await LocalNotifications.requestPermissions();
                return result.display === 'granted';
            } catch (error) {
                console.error('Erreur lors de la demande de permissions:', error);
                return false;
            }
        } else if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        }
        return false;
    }

    // Initialiser le système de rappels
    async initialize() {
        const hasPermission = await this.requestPermissions();
        if (hasPermission) {
            await this.scheduleNotifications();
            console.log('Système de rappels initialisé');
        } else {
            console.log('Permissions de notification refusées');
        }
    }
}

// Instance globale du gestionnaire de rappels
const reminderManager = new ReminderManager();

// Export pour utilisation dans d'autres modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ReminderManager, reminderManager };
}