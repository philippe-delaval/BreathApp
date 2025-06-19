class WebRTCBreathDetector {
    constructor() {
        this.mediaStream = null;
        this.audioContext = null;
        this.analyser = null;
        this.microphone = null;
        this.dataArray = null;
        this.isDetecting = false;
        this.breathingData = [];
        this.callbacks = {};
        this.calibrationData = {
            baseline: 0,
            threshold: 0.1,
            sensitivity: 1.0
        };
        this.detectionSettings = {
            sampleRate: 44100,
            bufferSize: 4096,
            smoothingTimeConstant: 0.8,
            fftSize: 2048,
            minDecibels: -90,
            maxDecibels: -10
        };
    }

    async init() {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('getUserMedia not supported');
            }

            this.mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: false,
                    sampleRate: this.detectionSettings.sampleRate
                }
            });

            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.microphone = this.audioContext.createMediaStreamSource(this.mediaStream);

            this.analyser.fftSize = this.detectionSettings.fftSize;
            this.analyser.smoothingTimeConstant = this.detectionSettings.smoothingTimeConstant;
            this.analyser.minDecibels = this.detectionSettings.minDecibels;
            this.analyser.maxDecibels = this.detectionSettings.maxDecibels;

            this.microphone.connect(this.analyser);
            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

            console.log('[WebRTC] Breath detector initialized successfully');
            return true;
        } catch (error) {
            console.error('[WebRTC] Failed to initialize breath detector:', error);
            throw error;
        }
    }

    startDetection() {
        if (!this.analyser) {
            throw new Error('Detector not initialized');
        }

        this.isDetecting = true;
        this.breathingData = [];
        this.detectBreathing();
        console.log('[WebRTC] Breath detection started');
    }

    stopDetection() {
        this.isDetecting = false;
        console.log('[WebRTC] Breath detection stopped');
    }

    detectBreathing() {
        if (!this.isDetecting) return;

        this.analyser.getByteFrequencyData(this.dataArray);
        
        const breathSignal = this.processAudioData(this.dataArray);
        const timestamp = Date.now();
        
        this.breathingData.push({
            timestamp,
            signal: breathSignal,
            phase: this.determineBreathPhase(breathSignal)
        });

        const detectionResult = this.analyzeBreathPattern();
        if (detectionResult) {
            this.triggerCallback('breathDetected', detectionResult);
        }

        if (this.breathingData.length > 1000) {
            this.breathingData = this.breathingData.slice(-500);
        }

        requestAnimationFrame(() => this.detectBreathing());
    }

    processAudioData(dataArray) {
        let sum = 0;
        let peak = 0;
        
        for (let i = 0; i < dataArray.length; i++) {
            const value = dataArray[i];
            sum += value;
            if (value > peak) peak = value;
        }

        const average = sum / dataArray.length;
        const normalizedPeak = peak / 255;
        const normalizedAverage = average / 255;

        const breathSignal = this.applyFiltering({
            average: normalizedAverage,
            peak: normalizedPeak,
            energy: Math.sqrt(sum / dataArray.length) / 255
        });

        return breathSignal;
    }

    applyFiltering(rawSignal) {
        const lowPassFiltered = this.lowPassFilter(rawSignal.average);
        const highPassFiltered = this.highPassFilter(lowPassFiltered);
        const smoothed = this.smoothSignal(highPassFiltered);
        
        return {
            raw: rawSignal.average,
            filtered: smoothed,
            peak: rawSignal.peak,
            energy: rawSignal.energy
        };
    }

    lowPassFilter(signal) {
        this.lowPassPrev = this.lowPassPrev || signal;
        const alpha = 0.1;
        this.lowPassPrev = alpha * signal + (1 - alpha) * this.lowPassPrev;
        return this.lowPassPrev;
    }

    highPassFilter(signal) {
        this.highPassPrev = this.highPassPrev || 0;
        this.highPassInput = this.highPassInput || signal;
        
        const alpha = 0.95;
        const output = alpha * (this.highPassPrev + signal - this.highPassInput);
        
        this.highPassPrev = output;
        this.highPassInput = signal;
        
        return output;
    }

    smoothSignal(signal) {
        this.smoothHistory = this.smoothHistory || [];
        this.smoothHistory.push(signal);
        
        if (this.smoothHistory.length > 5) {
            this.smoothHistory.shift();
        }
        
        return this.smoothHistory.reduce((sum, val) => sum + val, 0) / this.smoothHistory.length;
    }

    determineBreathPhase(signal) {
        this.phaseHistory = this.phaseHistory || [];
        this.phaseHistory.push(signal.filtered);
        
        if (this.phaseHistory.length < 3) return 'unknown';
        
        if (this.phaseHistory.length > 10) {
            this.phaseHistory.shift();
        }

        const trend = this.calculateTrend(this.phaseHistory);
        const threshold = this.calibrationData.threshold * this.calibrationData.sensitivity;

        if (trend > threshold) {
            return 'inhale';
        } else if (trend < -threshold) {
            return 'exhale';
        } else {
            return 'pause';
        }
    }

    calculateTrend(data) {
        if (data.length < 2) return 0;
        
        const recent = data.slice(-3);
        const older = data.slice(0, -3);
        
        const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
        const olderAvg = older.length > 0 
            ? older.reduce((sum, val) => sum + val, 0) / older.length 
            : recentAvg;
        
        return recentAvg - olderAvg;
    }

    analyzeBreathPattern() {
        if (this.breathingData.length < 10) return null;

        const recentData = this.breathingData.slice(-20);
        const phases = recentData.map(d => d.phase);
        
        const transitions = this.findPhaseTransitions(phases);
        if (transitions.length === 0) return null;

        const lastTransition = transitions[transitions.length - 1];
        const breathCycle = this.identifyBreathCycle(transitions);
        
        if (breathCycle) {
            return {
                type: 'cycle_complete',
                cycle: breathCycle,
                timestamp: Date.now(),
                quality: this.assessBreathQuality(breathCycle),
                rate: this.calculateBreathRate(transitions)
            };
        }

        if (this.isSignificantTransition(lastTransition)) {
            return {
                type: 'phase_change',
                from: lastTransition.from,
                to: lastTransition.to,
                timestamp: lastTransition.timestamp,
                confidence: this.calculateConfidence(recentData)
            };
        }

        return null;
    }

    findPhaseTransitions(phases) {
        const transitions = [];
        let currentPhase = phases[0];
        
        for (let i = 1; i < phases.length; i++) {
            if (phases[i] !== currentPhase && phases[i] !== 'unknown') {
                transitions.push({
                    from: currentPhase,
                    to: phases[i],
                    timestamp: Date.now() - (phases.length - i) * 100,
                    index: i
                });
                currentPhase = phases[i];
            }
        }
        
        return transitions;
    }

    identifyBreathCycle(transitions) {
        if (transitions.length < 2) return null;

        const recentTransitions = transitions.slice(-4);
        
        const inhaleStart = recentTransitions.find(t => 
            t.from !== 'inhale' && t.to === 'inhale'
        );
        const exhaleStart = recentTransitions.find(t => 
            t.from === 'inhale' && t.to === 'exhale'
        );
        
        if (inhaleStart && exhaleStart && exhaleStart.timestamp > inhaleStart.timestamp) {
            const cycleDuration = exhaleStart.timestamp - inhaleStart.timestamp;
            const inhaleDuration = exhaleStart.timestamp - inhaleStart.timestamp;
            
            return {
                startTime: inhaleStart.timestamp,
                inhaleDuration,
                cycleDuration,
                complete: true
            };
        }
        
        return null;
    }

    isSignificantTransition(transition) {
        if (!transition) return false;
        
        const significantTransitions = [
            ['pause', 'inhale'],
            ['inhale', 'exhale'],
            ['exhale', 'pause']
        ];
        
        return significantTransitions.some(([from, to]) => 
            transition.from === from && transition.to === to
        );
    }

    calculateConfidence(data) {
        if (data.length === 0) return 0;
        
        const signals = data.map(d => d.signal.filtered);
        const variance = this.calculateVariance(signals);
        const snr = this.calculateSNR(signals);
        
        const confidenceScore = Math.min(1, (snr / 10) * (1 - variance));
        return Math.max(0, confidenceScore);
    }

    calculateVariance(data) {
        const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
        const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
        return Math.sqrt(variance);
    }

    calculateSNR(data) {
        const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
        const noise = this.calculateVariance(data);
        return noise > 0 ? Math.abs(mean) / noise : 0;
    }

    assessBreathQuality(cycle) {
        const targetDuration = 10000;
        const durationScore = 1 - Math.abs(cycle.cycleDuration - targetDuration) / targetDuration;
        
        const inhaleExhaleRatio = cycle.inhaleDuration / (cycle.cycleDuration - cycle.inhaleDuration);
        const ratioScore = 1 - Math.abs(inhaleExhaleRatio - 1) / 1;
        
        return Math.max(0, Math.min(1, (durationScore + ratioScore) / 2));
    }

    calculateBreathRate(transitions) {
        if (transitions.length < 2) return 0;
        
        const inhaleTransitions = transitions.filter(t => t.to === 'inhale');
        if (inhaleTransitions.length < 2) return 0;
        
        const intervals = [];
        for (let i = 1; i < inhaleTransitions.length; i++) {
            intervals.push(inhaleTransitions[i].timestamp - inhaleTransitions[i-1].timestamp);
        }
        
        const averageInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
        return 60000 / averageInterval;
    }

    async calibrate(duration = 30000) {
        console.log('[WebRTC] Starting calibration...');
        
        if (!this.isDetecting) {
            this.startDetection();
        }
        
        const calibrationData = [];
        const startTime = Date.now();
        
        return new Promise((resolve) => {
            const collectData = () => {
                if (Date.now() - startTime > duration) {
                    this.processCalibrationData(calibrationData);
                    console.log('[WebRTC] Calibration completed');
                    resolve(this.calibrationData);
                    return;
                }
                
                if (this.breathingData.length > 0) {
                    const latest = this.breathingData[this.breathingData.length - 1];
                    calibrationData.push(latest.signal.filtered);
                }
                
                setTimeout(collectData, 100);
            };
            
            collectData();
        });
    }

    processCalibrationData(data) {
        if (data.length === 0) return;
        
        const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
        const variance = this.calculateVariance(data);
        
        this.calibrationData.baseline = mean;
        this.calibrationData.threshold = Math.max(0.05, variance * 2);
        
        const signalStrength = Math.abs(mean);
        this.calibrationData.sensitivity = signalStrength > 0.1 ? 1.0 : 1.5;
        
        console.log('[WebRTC] Calibration results:', this.calibrationData);
    }

    on(event, callback) {
        if (!this.callbacks[event]) {
            this.callbacks[event] = [];
        }
        this.callbacks[event].push(callback);
    }

    off(event, callback) {
        if (this.callbacks[event]) {
            this.callbacks[event] = this.callbacks[event].filter(cb => cb !== callback);
        }
    }

    triggerCallback(event, data) {
        if (this.callbacks[event]) {
            this.callbacks[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('[WebRTC] Callback error:', error);
                }
            });
        }
    }

    getDetectionStats() {
        return {
            isDetecting: this.isDetecting,
            dataPoints: this.breathingData.length,
            calibration: this.calibrationData,
            audioContext: this.audioContext ? {
                state: this.audioContext.state,
                sampleRate: this.audioContext.sampleRate
            } : null
        };
    }

    adjustSensitivity(sensitivity) {
        this.calibrationData.sensitivity = Math.max(0.1, Math.min(3.0, sensitivity));
        console.log('[WebRTC] Sensitivity adjusted to:', this.calibrationData.sensitivity);
    }

    dispose() {
        this.stopDetection();
        
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }
        
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        
        this.analyser = null;
        this.microphone = null;
        this.dataArray = null;
        this.breathingData = [];
        this.callbacks = {};
        
        console.log('[WebRTC] Breath detector disposed');
    }
}

export default WebRTCBreathDetector;