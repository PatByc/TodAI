export function playCompletionChime() {
  const AudioContextClass = window.AudioContext
    ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioContextClass) return

  try {
    const context = new AudioContextClass()
    const now = context.currentTime

    for (const tone of [
      { frequency: 784, delay: 0, volume: 0.045 },
      { frequency: 1175, delay: 0.055, volume: 0.028 },
    ]) {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      const start = now + tone.delay

      oscillator.type = "sine"
      oscillator.frequency.setValueAtTime(tone.frequency, start)
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(tone.volume, start + 0.012)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.48)
      oscillator.connect(gain).connect(context.destination)
      oscillator.start(start)
      oscillator.stop(start + 0.5)
    }

    window.setTimeout(() => void context.close(), 650)
  } catch {
    // Completing a task must still work when audio is unavailable or blocked.
  }
}
