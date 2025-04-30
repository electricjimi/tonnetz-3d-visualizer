// Basic Web Audio API tone playback utility

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null; // Guard for server-side rendering

  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

// Store active oscillators to manage them (e.g., stop previous sounds)
const activeOscillators = new Map<string, { oscillator: OscillatorNode, gainNode: GainNode }>();

export function playTone(frequency: number, duration: number = 0.5, type: OscillatorType = 'sine'): void {
  const context = getAudioContext();
  if (!context) {
    console.warn("AudioContext not supported or available.");
    return;
  }

   // Resume context if it's suspended (required by browser policies)
  if (context.state === 'suspended') {
    context.resume();
  }

  // Simple key to identify the sound source (frequency)
  const oscillatorKey = frequency.toString();

  // Stop existing oscillator for the same frequency if it's playing
  if (activeOscillators.has(oscillatorKey)) {
    const existing = activeOscillators.get(oscillatorKey);
    try {
       // Fade out quickly before stopping
       existing?.gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.05);
       existing?.oscillator.stop(context.currentTime + 0.06);
    } catch (e) {
      // Oscillator might already be stopped
      // console.log("Error stopping previous oscillator:", e);
    }
    activeOscillators.delete(oscillatorKey);
  }


  const oscillator = context.createOscillator();
  const gainNode = context.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, context.currentTime); // value in hertz

  // Connect oscillator -> gain -> destination
  oscillator.connect(gainNode);
  gainNode.connect(context.destination);

  // Create a smooth attack and release envelope
  gainNode.gain.setValueAtTime(0, context.currentTime); // Start silent
  gainNode.gain.linearRampToValueAtTime(0.5, context.currentTime + 0.05); // Quick attack
  gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration); // Decay/Release

  oscillator.start(context.currentTime);

   // Store the new oscillator and gain node
   activeOscillators.set(oscillatorKey, { oscillator, gainNode });


  // Stop the oscillator after the duration + small buffer for fade out
  oscillator.stop(context.currentTime + duration + 0.1);

   // Clean up the map entry after the sound should have stopped
  oscillator.onended = () => {
    if (activeOscillators.get(oscillatorKey)?.oscillator === oscillator) {
       activeOscillators.delete(oscillatorKey);
    }
    // Attempt to disconnect nodes safely
    try {
        gainNode.disconnect();
        oscillator.disconnect();
    } catch(e) {
        // Ignore errors if nodes are already disconnected
    }
  };

}

// Optional: Function to stop all currently playing tones
export function stopAllTones(): void {
    const context = getAudioContext();
    if (!context) return;

    activeOscillators.forEach(({ oscillator, gainNode }, key) => {
        try {
            // Fade out quickly
            gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.05);
            oscillator.stop(context.currentTime + 0.06);
            gainNode.disconnect();
            oscillator.disconnect();
        } catch (e) {
           // Ignore errors
        }
        activeOscillators.delete(key);
    });
}
