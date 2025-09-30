import { useWindowDimensions } from 'react-native';

/**
 * Breakpoints for responsive design
 */
const BREAKPOINTS = {
  mobile: 0,
  tablet: 768,
  desktop: 900,
  largeDesktop: 1200,
} as const;

/**
 * Maximum content width for large screens
 */
const MAX_CONTENT_WIDTH = 1200;

/**
 * Hook for responsive layout management
 * Provides consistent breakpoint detection and layout values across the app
 */
export function useResponsiveLayout() {
  const { width, height } = useWindowDimensions();

  const isDesktop = width >= BREAKPOINTS.desktop;
  const isTablet = width >= BREAKPOINTS.tablet && width < BREAKPOINTS.desktop;
  const isMobile = width < BREAKPOINTS.tablet;
  const isLargeDesktop = width >= BREAKPOINTS.largeDesktop;

  // Calculate content width with max constraint
  const contentWidth = isDesktop ? Math.min(width, MAX_CONTENT_WIDTH) : width;
  
  // Calculate horizontal padding for centered content on large screens
  const containerPadding = isDesktop ? Math.max((width - MAX_CONTENT_WIDTH) / 2, 0) : 0;

  // Grid columns for different layouts
  const navigationGridColumns = isDesktop ? (isLargeDesktop ? 4 : 3) : 2;
  const imageGridColumns = isDesktop ? 3 : 2;
  const equipmentGridColumns = isDesktop ? 4 : 2;

  // Spacing values
  const spacing = {
    small: isDesktop ? 12 : 6,
    medium: isDesktop ? 20 : 12,
    large: isDesktop ? 32 : 20,
  };

  // Font sizes
  const fontSize = {
    small: isDesktop ? 14 : 12,
    body: isDesktop ? 18 : 16,
    title: isDesktop ? 28 : 24,
    subtitle: isDesktop ? 20 : 18,
  };

  // Modal/Form widths
  const modalWidth = isDesktop ? Math.min(800, width * 0.8) : width;
  const formWidth = isDesktop ? Math.min(700, width * 0.7) : width;

  return {
    width,
    height,
    isDesktop,
    isTablet,
    isMobile,
    isLargeDesktop,
    contentWidth,
    containerPadding,
    navigationGridColumns,
    imageGridColumns,
    equipmentGridColumns,
    spacing,
    fontSize,
    modalWidth,
    formWidth,
    breakpoints: BREAKPOINTS,
    maxContentWidth: MAX_CONTENT_WIDTH,
  };
}
