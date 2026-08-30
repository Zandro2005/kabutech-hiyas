import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Triggers a light impact feedback.
 * Best for: Dial ticks, sliders, bottom tab selection.
 */
export const hapticLight = () => {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }
};

/**
 * Triggers a medium impact feedback.
 * Best for: Physical switches, device toggles (fans, lights), theme toggles.
 */
export const hapticMedium = () => {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  }
};

/**
 * Triggers a heavy impact feedback.
 * Best for: Critical actions, heavy physical buttons.
 */
export const hapticHeavy = () => {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
  }
};

/**
 * Triggers a selection feedback.
 * Best for: Changing a value in a picker, minimal UI interactions.
 */
export const hapticSelection = () => {
  if (Platform.OS !== 'web') {
    Haptics.selectionAsync().catch(() => {});
  }
};

/**
 * Triggers a success notification feedback.
 * Best for: Successful form submission, task approval.
 */
export const hapticSuccess = () => {
  if (Platform.OS !== 'web') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }
};

/**
 * Triggers an error notification feedback.
 * Best for: Form errors, validation failures, destructive actions.
 */
export const hapticError = () => {
  if (Platform.OS !== 'web') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  }
};

/**
 * Triggers a warning notification feedback.
 * Best for: Warnings, task rejections.
 */
export const hapticWarning = () => {
  if (Platform.OS !== 'web') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  }
};
