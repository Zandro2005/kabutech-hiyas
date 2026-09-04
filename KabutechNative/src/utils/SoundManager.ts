import { createAudioPlayer, AudioSource, setAudioModeAsync, preload } from 'expo-audio';
import { VolumeManager } from 'react-native-volume-manager';

// Preload sound sources for instant playback
const successSource: AudioSource = require('../../assets/sounds/success_fast.wav');
const errorSource: AudioSource = require('../../assets/sounds/engk.wav');
const ringSource: AudioSource = require('../../assets/sounds/ting.wav');
const alarmSource: AudioSource = require('../../assets/sounds/error.mp3');
const welcomeSource: AudioSource = require('../../assets/sounds/welcome.mp3');

type AudioPlayerInstance = ReturnType<typeof createAudioPlayer>;

/**
 * Sound effect player with debounce protection and deterministic rewind playback.
 * - Prevents doubled audio triggers within 200ms.
 * - Always rewinds to position 0 and starts playback synchronously.
 * - Volume set to 1.0.
 */
class SoundEffectPlayer {
  private player: AudioPlayerInstance | null = null;
  private source: AudioSource;
  private lastPlayedAt = 0;

  constructor(source: AudioSource) {
    this.source = source;
  }

  init() {
    try {
      if (!this.player) {
        this.player = createAudioPlayer(this.source, {
          keepAudioSessionActive: true,
          updateInterval: 500,
        });
        this.player.volume = 1.0;
      }
    } catch (e) {
      console.log('Error initializing sound player:', e);
    }
  }

  play() {
    const now = Date.now();
    // Guard against duplicate/doubled calls within 200ms
    if (now - this.lastPlayedAt < 200) {
      return;
    }
    this.lastPlayedAt = now;

    try {
      if (!this.player) {
        this.init();
      }
      if (!this.player) return;

      this.player.volume = 1.0;
      // Seek to beginning and play immediately without microtask delay
      this.player.seekTo(0).catch(() => {});
      this.player.play();
    } catch (e) {
      console.log('Audio playback error:', e);
    }
  }
}

class SoundManagerClass {
  private successPlayer = new SoundEffectPlayer(successSource);
  private errorPlayer = new SoundEffectPlayer(errorSource);
  private ringPlayer = new SoundEffectPlayer(ringSource);
  private alarmPlayer: AudioPlayerInstance | null = null;
  private welcomePlayer: AudioPlayerInstance | null = null;
  private lastWelcomeAt = 0;

  async init() {
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        interruptionMode: 'duckOthers',
        shouldPlayInBackground: true,
      });

      // Warm up raw audio into memory buffer
      preload(successSource).catch(() => {});
      preload(errorSource).catch(() => {});
      preload(ringSource).catch(() => {});
      preload(welcomeSource).catch(() => {});

      this.successPlayer.init();
      this.errorPlayer.init();
      this.ringPlayer.init();

      if (!this.alarmPlayer) {
        this.alarmPlayer = createAudioPlayer(alarmSource, { keepAudioSessionActive: true });
        this.alarmPlayer.loop = true;
      }
      if (!this.welcomePlayer) {
        this.welcomePlayer = createAudioPlayer(welcomeSource, { keepAudioSessionActive: true });
        this.welcomePlayer.volume = 1.0;
      }
    } catch (e) {
      console.log('Audio init error:', e);
    }
  }

  playSuccess() {
    this.successPlayer.play();
  }

  playError() {
    this.errorPlayer.play();
  }

  playRing() {
    this.ringPlayer.play();
  }

  playWelcome() {
    const now = Date.now();
    if (now - this.lastWelcomeAt < 1000) return;
    this.lastWelcomeAt = now;

    try {
      if (!this.welcomePlayer) {
        this.welcomePlayer = createAudioPlayer(welcomeSource, { keepAudioSessionActive: true });
      }
      if (this.welcomePlayer) {
        this.welcomePlayer.volume = 1.0;
        this.welcomePlayer.seekTo(0).catch(() => {});
        this.welcomePlayer.play();
      }
    } catch (e) {
      console.log('Welcome audio play error:', e);
    }
  }

  playAlarm() {
    try {
      if (!this.alarmPlayer) {
        this.alarmPlayer = createAudioPlayer(alarmSource, { keepAudioSessionActive: true });
        this.alarmPlayer.loop = true;
      }
      if (this.alarmPlayer) {
        VolumeManager.setVolume(1, { showUI: false }).catch(() => {});
        this.alarmPlayer.volume = 1.0;
        this.alarmPlayer.seekTo(0).catch(() => {});
        this.alarmPlayer.play();
      }
    } catch (e) {
      console.log('Alarm play error:', e);
    }
  }

  stopAlarm() {
    try {
      if (this.alarmPlayer) {
        this.alarmPlayer.pause();
        this.alarmPlayer.seekTo(0).catch(() => {});
      }
    } catch (e) {}
  }
}

export const SoundManager = new SoundManagerClass();
