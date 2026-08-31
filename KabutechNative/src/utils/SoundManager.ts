import { createAudioPlayer, AudioSource, setAudioModeAsync } from 'expo-audio';
import { VolumeManager } from 'react-native-volume-manager';
// Preload sound sources for instant playback
const successSource: AudioSource = require('../../assets/sounds/success_fast.wav');
const errorSource: AudioSource = require('../../assets/sounds/engk.wav');
const ringSource: AudioSource = require('../../assets/sounds/ting.wav');
const alarmSource: AudioSource = require('../../assets/sounds/error.mp3');

class SoundManagerClass {
  private successPlayer: ReturnType<typeof createAudioPlayer> | null = null;
  private errorPlayer: ReturnType<typeof createAudioPlayer> | null = null;
  private ringPlayer: ReturnType<typeof createAudioPlayer> | null = null;
  private alarmPlayer: ReturnType<typeof createAudioPlayer> | null = null;

  async init() {
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        interruptionMode: 'mixWithOthers',
        shouldPlayInBackground: true
      });
      this.successPlayer = createAudioPlayer(successSource);
      this.errorPlayer = createAudioPlayer(errorSource);
      this.ringPlayer = createAudioPlayer(ringSource);
      this.alarmPlayer = createAudioPlayer(alarmSource);
      this.alarmPlayer.loop = true; // Nonstop loop
    } catch (e) {
      console.log('Audio init error:', e);
    }
  }

  playSuccess() {
    try {
      if (this.successPlayer) {
        VolumeManager.setVolume(1, { showUI: false }).catch(() => {});
        this.successPlayer.seekTo(0);
        this.successPlayer.play();
      }
    } catch (e) {
      console.log('Audio play error:', e);
    }
  }

  playError() {
    try {
      if (this.errorPlayer) {
        VolumeManager.setVolume(1, { showUI: false }).catch(() => {});
        this.errorPlayer.seekTo(0);
        this.errorPlayer.play();
      }
    } catch (e) {
      console.log('Audio play error:', e);
    }
  }

  playRing() {
    try {
      if (!this.ringPlayer) {
        this.ringPlayer = createAudioPlayer(ringSource);
      }
      if (this.ringPlayer) {
        VolumeManager.setVolume(1, { showUI: false }).catch(() => {});
        this.ringPlayer.seekTo(0);
        this.ringPlayer.play();
      }
    } catch (e) {}
  }

  playAlarm() {
    try {
      if (!this.alarmPlayer) {
        this.alarmPlayer = createAudioPlayer(alarmSource);
        this.alarmPlayer.loop = true;
      }
      if (this.alarmPlayer) {
        VolumeManager.setVolume(1, { showUI: false }).catch(() => {});
        this.alarmPlayer.seekTo(0);
        this.alarmPlayer.play();
      }
    } catch (e) {}
  }

  stopAlarm() {
    try {
      if (this.alarmPlayer) {
        this.alarmPlayer.pause();
        this.alarmPlayer.seekTo(0);
      }
    } catch (e) {}
  }
}

export const SoundManager = new SoundManagerClass();
