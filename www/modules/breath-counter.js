// Module compteur de respirations - BreathApp
// Intégration discrète dans l'interface existante

class BreathCounter {
    constructor() {
        this.currentCount = 0;
        this.targetRpm = 6; // 6 respirations par minute (cohérence cardiaque)
        this.breathCycleTime = 10000; // 10 secondes par cycle (5s inspiration + 5s expiration)
        this.sessionStartTime = null;
        this.isActive = false;
        this.validationThreshold = 0.8; // 80% de précision requise
    }

    // Initialiser le compteur pour une nouvelle session
    startSession() {
        this.currentCount = 0;
        this.sessionStartTime = Date.now();
        this.isActive = true;
        this.updateDisplay();
        console.log('Compteur de respirations démarré');
    }

    // Arrêter le compteur
    stopSession() {
        this.isActive = false;
        const sessionData = this.getSessionData();
        console.log('Session terminée:', sessionData);
        return sessionData;
    }

    // Incrémenter le compteur (appelé à chaque début de cycle)
    incrementBreath() {
        if (this.isActive) {
            this.currentCount++;
            this.updateDisplay();
            this.validateRhythm();
        }
    }

    // Obtenir les données de la session
    getSessionData() {
        const sessionDuration = this.sessionStartTime ? 
            (Date.now() - this.sessionStartTime) / 1000 : 0;
        const expectedBreaths = Math.floor(sessionDuration / (this.breathCycleTime / 1000));
        const accuracy = expectedBreaths > 0 ? (this.currentCount / expectedBreaths) : 0;

        return {
            totalBreaths: this.currentCount,
            sessionDuration: Math.round(sessionDuration),
            expectedBreaths,
            accuracy: Math.round(accuracy * 100),
            averageRpm: sessionDuration > 0 ? Math.round((this.currentCount * 60) / sessionDuration) : 0,
            isValidSession: accuracy >= this.validationThreshold
        };
    }

    // Valider le rythme respiratoire
    validateRhythm() {
        if (!this.sessionStartTime) return;

        const elapsedTime = (Date.now() - this.sessionStartTime) / 1000;
        const expectedBreaths = Math.floor(elapsedTime / (this.breathCycleTime / 1000));
        const currentRpm = (this.currentCount * 60) / elapsedTime;

        // Feedback visuel si le rythme n'est pas optimal
        if (Math.abs(currentRpm - this.targetRpm) > 1) {
            this.showRhythmFeedback(currentRpm > this.targetRpm ? 'slower' : 'faster');
        }
    }

    // Afficher le feedback sur le rythme
    showRhythmFeedback(type) {
        const instruction = document.getElementById('instruction');
        if (!instruction) return;

        const originalColor = instruction.style.color;
        const feedbackColor = type === 'slower' ? '#FF6B6B' : '#4ECDC4';
        
        // Animation subtile de feedback
        instruction.style.transition = 'color 0.3s ease';
        instruction.style.color = feedbackColor;
        
        setTimeout(() => {
            instruction.style.color = originalColor;
        }, 500);
    }

    // Mettre à jour l'affichage du compteur
    updateDisplay() {
        const counterElement = document.getElementById('breath-counter');
        if (counterElement) {
            counterElement.textContent = this.currentCount;
            
            // Animation subtile lors de l'incrémentation
            counterElement.style.transform = 'scale(1.1)';
            setTimeout(() => {
                counterElement.style.transform = 'scale(1)';
            }, 200);
        }
    }

    // Réinitialiser le compteur
    reset() {
        this.currentCount = 0;
        this.sessionStartTime = null;
        this.isActive = false;
        this.updateDisplay();
    }

    // Obtenir le nombre actuel de respirations
    getCurrentCount() {
        return this.currentCount;
    }

    // Vérifier si une session est active
    isSessionActive() {
        return this.isActive;
    }

    // Obtenir le RPM cible
    getTargetRpm() {
        return this.targetRpm;
    }

    // Calculer le RPM actuel
    getCurrentRpm() {
        if (!this.sessionStartTime || this.currentCount === 0) return 0;
        const elapsedMinutes = (Date.now() - this.sessionStartTime) / 60000;
        return Math.round(this.currentCount / elapsedMinutes);
    }
}

// Instance globale du compteur
const breathCounter = new BreathCounter();

// Export pour utilisation dans d'autres modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BreathCounter, breathCounter };
}