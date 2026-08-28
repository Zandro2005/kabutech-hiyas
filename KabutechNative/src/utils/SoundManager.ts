// import { Audio } from 'expo-av';

export const playSuccessSound = async () => {
  // Sound temporarily disabled for testing in Expo Go
  // Uncomment the import above and the code below before building the APK!
  
  /*
  try {
    const { sound } = await Audio.Sound.createAsync(
      require('../../assets/success.wav')
    );
    await sound.playAsync();
    
    // Cleanup the sound object after it finishes playing
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync();
      }
    });
  } catch (error) {
    console.log('Error playing sound:', error);
  }
  */
};
