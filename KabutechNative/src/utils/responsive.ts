import { useWindowDimensions, PixelRatio } from 'react-native';

// Base guideline metrics (standard mobile phone baseline ~375x812)
const GUIDELINE_BASE_WIDTH = 375;
const GUIDELINE_BASE_HEIGHT = 812;

/**
 * Custom hook to get dynamic responsive metrics that automatically update on window resize / orientation change.
 */
export function useResponsive() {
  const { width, height } = useWindowDimensions();

  const isSmallDevice = width < 375;
  const isMediumDevice = width >= 375 && width < 414;
  const isLargeDevice = width >= 414;
  const isShortScreen = height < 700;

  // Responsive scale functions
  const scale = (size: number): number => (width / GUIDELINE_BASE_WIDTH) * size;
  const verticalScale = (size: number): number => (height / GUIDELINE_BASE_HEIGHT) * size;
  const moderateScale = (size: number, factor = 0.5): number => size + (scale(size) - size) * factor;

  // Percentage based sizing
  const wp = (percentage: number): number => (width * percentage) / 100;
  const hp = (percentage: number): number => (height * percentage) / 100;

  // Font scaling with safety bounds to prevent clipping on extreme accessibility font scales
  const fontScale = (size: number): number => {
    const scaleFactor = width / GUIDELINE_BASE_WIDTH;
    const newSize = size * Math.min(Math.max(scaleFactor, 0.85), 1.25);
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  };

  return {
    width,
    height,
    isSmallDevice,
    isMediumDevice,
    isLargeDevice,
    isShortScreen,
    scale,
    verticalScale,
    moderateScale,
    wp,
    hp,
    fontScale,
  };
}

/**
 * Static helper function to clamp a numeric value
 */
export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};
