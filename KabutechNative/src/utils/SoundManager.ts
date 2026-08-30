import { createAudioPlayer, AudioSource } from 'expo-audio';
import { VolumeManager } from 'react-native-volume-manager';

// Preload sound sources for instant playback
const successSource: AudioSource = require('../../assets/sounds/success_fast.wav');
const errorSource: AudioSource = require('../../assets/sounds/engk.wav');

class SoundManagerClass {
  private successPlayer: ReturnType<typeof createAudioPlayer> | null = null;
  private errorPlayer: ReturnType<typeof createAudioPlayer> | null = null;

  async init() {
    try {
      this.successPlayer = createAudioPlayer(successSource);
      this.errorPlayer = createAudioPlayer(errorSource);
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
}

export const SoundManager = new SoundManagerClass();
