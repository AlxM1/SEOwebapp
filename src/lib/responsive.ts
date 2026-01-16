import { useWindowDimensions, Platform } from 'react-native';

// Detect if we're on web platform
export const isWeb = Platform.OS === 'web';

// Custom hook for responsive design
export function useResponsive() {
  const { width, height } = useWindowDimensions();

  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;

  const isPortrait = height > width;
  const isLandscape = width > height;

  return {
    width,
    height,
    isMobile,
    isTablet,
    isDesktop,
    isPortrait,
    isLandscape,
    screenType: isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop',
  };
}

// Responsive padding values
export function getResponsivePadding(responsive: ReturnType<typeof useResponsive>) {
  if (responsive.isMobile) return 16;
  if (responsive.isTablet) return 24;
  return 32;
}

// Responsive max width for content
export function getMaxWidth(responsive: ReturnType<typeof useResponsive>) {
  if (responsive.isMobile) return '100%';
  if (responsive.isTablet) return '100%';
  return '1200px';
}

// Responsive font sizes
export function getResponsiveFontSize(baseSize: number, responsive: ReturnType<typeof useResponsive>) {
  if (responsive.isMobile) return baseSize;
  if (responsive.isTablet) return baseSize * 1.1;
  return baseSize * 1.2;
}
