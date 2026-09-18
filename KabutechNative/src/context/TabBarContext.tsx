import React, { createContext, useContext, useState, useRef, useCallback, ReactNode } from 'react';
import { NativeSyntheticEvent, NativeScrollEvent } from 'react-native';

interface TabBarContextType {
  isTabBarVisible: boolean;
  setIsTabBarVisible: (visible: boolean) => void;
  showTabBar: () => void;
  hideTabBar: () => void;
}

const TabBarContext = createContext<TabBarContextType | undefined>(undefined);

export function TabBarProvider({ children }: { children: ReactNode }) {
  const [isTabBarVisible, setIsTabBarVisible] = useState(true);

  const showTabBar = useCallback(() => {
    setIsTabBarVisible(true);
  }, []);

  const hideTabBar = useCallback(() => {
    setIsTabBarVisible(false);
  }, []);

  return (
    <TabBarContext.Provider
      value={{
        isTabBarVisible,
        setIsTabBarVisible,
        showTabBar,
        hideTabBar,
      }}
    >
      {children}
    </TabBarContext.Provider>
  );
}

export function useTabBar() {
  const context = useContext(TabBarContext);
  if (!context) {
    throw new Error('useTabBar must be used within a TabBarProvider');
  }
  return context;
}

export interface UseTabBarScrollOptions {
  minScrollThreshold?: number;
  deltaThreshold?: number;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
}

export function useTabBarScroll(options?: UseTabBarScrollOptions) {
  const { isTabBarVisible, setIsTabBarVisible, showTabBar, hideTabBar } = useTabBar();
  const prevScrollY = useRef(0);
  const accumulatedDelta = useRef(0);
  const isTabBarVisibleRef = useRef(isTabBarVisible);
  isTabBarVisibleRef.current = isTabBarVisible;

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (options?.onScroll) {
        options.onScroll(event);
      }

      const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
      const currentY = contentOffset.y;
      const minThreshold = options?.minScrollThreshold ?? 2;
      const deltaThreshold = options?.deltaThreshold ?? 1.5;

      // Always show when resting at or pulling down beyond the top of the page (within 2px)
      if (currentY <= 2) {
        accumulatedDelta.current = 0;
        prevScrollY.current = Math.max(0, currentY);
        if (!isTabBarVisibleRef.current) {
          setIsTabBarVisible(true);
        }
        return;
      }

      const diff = currentY - prevScrollY.current;
      const maxScrollY = (contentSize?.height ?? 0) - (layoutMeasurement?.height ?? 0);
      const isNearBottomBounce = maxScrollY > 0 && currentY >= maxScrollY - 10;

      // Directional Accumulation: guarantees slow or micro-scrolls trigger reliably
      if (diff > 0) {
        // Scrolling down
        if (accumulatedDelta.current < 0) {
          accumulatedDelta.current = 0;
        }
        accumulatedDelta.current += diff;

        if (accumulatedDelta.current >= deltaThreshold && currentY > minThreshold) {
          if (isTabBarVisibleRef.current) {
            setIsTabBarVisible(false);
          }
        }
      } else if (diff < 0) {
        // Scrolling up
        if (accumulatedDelta.current > 0) {
          accumulatedDelta.current = 0;
        }
        accumulatedDelta.current += diff;

        if (accumulatedDelta.current <= -deltaThreshold && !isNearBottomBounce) {
          if (!isTabBarVisibleRef.current) {
            setIsTabBarVisible(true);
          }
        }
      }

      prevScrollY.current = currentY;
    },
    [setIsTabBarVisible, options?.minScrollThreshold, options?.deltaThreshold, options?.onScroll]
  );

  return {
    onScroll,
    isTabBarVisible,
    showTabBar,
    hideTabBar,
  };
}
