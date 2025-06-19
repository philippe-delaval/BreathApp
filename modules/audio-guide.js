// Module de guidage audio - BreathApp
// Amélioration du guidage respiratoire avec options sonores

class AudioGuide {
    constructor() {
        this.isEnabled = this.loadAudioPreference();
        this.volume = 0.3;
        this.audioContext = null;
        this.sounds = {
            breatheIn: null,
            breatheOut: null,
            sessionComplete: null,
            tick: null
        };
        this.rhythmOptions = {
            standard: { inhale: 5000, exhale: 5000 }, // 5s / 5s
            slow: { inhale: 6000, exhale: 6000 },     // 6s / 6s 
            fast: { inhale: 4000, exhale: 4000 }      // 4s / 4s
        };
        this.currentRhythm = 'standard';
        this.initializeAudio();
    }

    // Initialiser le contexte audio
    async initializeAudio() {
        try {
            // Vérifier le support audio
            if (typeof AudioContext !== 'undefined') {
                this.audioContext = new AudioContext();
            } else if (typeof webkitAudioContext !== 'undefined') {
                this.audioContext = new webkitAudioContext();
            }

            if (this.audioContext) {
                // Générer les sons programmatiquement pour éviter les fichiers externes
                this.generateSounds();
                console.log('Audio guide initialisé');
            }
        } catch (error) {
            console.error('Erreur lors de l\'initialisation audio:', error);
        }
    }

    // Générer les sons avec Web Audio API
    generateSounds() {
        if (!this.audioContext) return;

        // Son pour l'inspiration (fréquence montante)
        this.sounds.breatheIn = this.createTone(220, 0.8, 'breatheIn');
        
        // Son pour l'expiration (fréquence descendante)
        this.sounds.breatheOut = this.createTone(110, 0.8, 'breatheOut');
        
        // Son de fin de session
        this.sounds.sessionComplete = this.createTone(440, 1.5, 'complete');
        
        // Tick discret
        this.sounds.tick = this.createTone(800, 0.1, 'tick');
    }

    // Créer un ton avec Web Audio API
    createTone(frequency, duration, type) {
        return {
            frequency,
            duration,
            type,
            play: () => this.playTone(frequency, duration, type)
        };
    }

    // Jouer un ton
    playTone(frequency, duration, type) {
        if (!this.audioContext || !this.isEnabled) return;

        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            // Configuration selon le type de son
            switch (type) {
                case 'breatheIn':
                    oscillator.type = 'sine';
                    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
                    oscillator.frequency.exponentialRampToValueAtTime(
                        frequency * 1.5, 
                        this.audioContext.currentTime + duration
                    );
                    break;
                    
                case 'breatheOut':
                    oscillator.type = 'sine';
                    oscillator.frequency.setValueAtTime(frequency * 1.5, this.audioContext.currentTime);
                    oscillator.frequency.exponentialRampToValueAtTime(
                        frequency, 
                        this.audioContext.currentTime + duration
                    );
                    break;
                    
                case 'complete':
                    oscillator.type = 'triangle';
                    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
                    break;
                    
                case 'tick':
                    oscillator.type = 'square';
                    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
                    break;
            }
            
            // Envelope pour éviter les clics
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(this.volume, this.audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + duration);
            
        } catch (error) {
            console.error('Erreur lors de la lecture du son:', error);
        }
    }

    // Jouer le son d'inspiration
    playBreatheIn() {
        if (this.sounds.breatheIn) {
            this.sounds.breatheIn.play();
        }
    }

    // Jouer le son d'expiration
    playBreatheOut() {
        if (this.sounds.breatheOut) {
            this.sounds.breatheOut.play();
        }
    }

    // Jouer le son de fin de session
    playSessionComplete() {
        if (this.sounds.sessionComplete) {
            this.sounds.sessionComplete.play();
        }
    }

    // Jouer un tick discret
    playTick() {
        if (this.sounds.tick) {
            this.sounds.tick.play();
        }
    }

    // Activer/désactiver l'audio
    toggleAudio() {
        this.isEnabled = !this.isEnabled;
        this.saveAudioPreference();
        return this.isEnabled;
    }

    // Définir le volume
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        this.saveAudioPreference();
    }

    // Obtenir le volume actuel
    getVolume() {
        return this.volume;
    }

    // Vérifier si l'audio est activé
    isAudioEnabled() {
        return this.isEnabled;
    }

    // Changer le rythme respiratoire
    setRhythm(rhythmName) {
        if (this.rhythmOptions[rhythmName]) {
            this.currentRhythm = rhythmName;
            this.saveAudioPreference();
            return this.rhythmOptions[rhythmName];
        }
        return null;
    }

    // Obtenir le rythme actuel
    getCurrentRhythm() {
        return {
            name: this.currentRhythm,
            timing: this.rhythmOptions[this.currentRhythm]
        };
    }

    // Obtenir tous les rythmes disponibles
    getAvailableRhythms() {
        return Object.keys(this.rhythmOptions).map(name => ({
            name,
            label: this.getRhythmLabel(name),
            timing: this.rhythmOptions[name]
        }));
    }

    // Obtenir le libellé d'un rythme
    getRhythmLabel(rhythmName) {
        const labels = {
            standard: 'Standard (5s/5s)',
            slow: 'Lent (6s/6s)',
            fast: 'Rapide (4s/4s)'
        };
        return labels[rhythmName] || rhythmName;
    }

    // Sauvegarder les préférences audio
    saveAudioPreference() {
        try {
            const preferences = {
                enabled: this.isEnabled,
                volume: this.volume,
                rhythm: this.currentRhythm
            };
            localStorage.setItem('breathapp-audio', JSON.stringify(preferences));
        } catch (error) {
            console.error('Erreur lors de la sauvegarde des préférences audio:', error);
        }
    }

    // Charger les préférences audio
    loadAudioPreference() {
        try {
            const saved = localStorage.getItem('breathapp-audio');
            if (saved) {
                const preferences = JSON.parse(saved);
                this.volume = preferences.volume || 0.3;
                this.currentRhythm = preferences.rhythm || 'standard';
                return preferences.enabled !== false; // true par défaut
            }
        } catch (error) {
            console.error('Erreur lors du chargement des préférences audio:', error);
        }
        return true; // Audio activé par défaut
    }

    // Tester les sons
    testSounds() {
        console.log('Test des sons audio...');
        setTimeout(() => this.playBreatheIn(), 0);
        setTimeout(() => this.playBreatheOut(), 1000);
        setTimeout(() => this.playTick(), 2000);
        setTimeout(() => this.playSessionComplete(), 2500);
    }

    // Réactiver le contexte audio (nécessaire sur certains navigateurs)
    async resumeAudioContext() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            try {
                await this.audioContext.resume();
                console.log('Contexte audio réactivé');
            } catch (error) {
                console.error('Erreur lors de la réactivation audio:', error);
            }
        }
    }

    // Nettoyer les ressources audio
    cleanup() {
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
    }
}

// Instance globale du guide audio
const audioGuide = new AudioGuide();

// Export pour utilisation dans d'autres modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AudioGuide, audioGuide };
}