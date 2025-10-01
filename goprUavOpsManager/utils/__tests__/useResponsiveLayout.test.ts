import { useResponsiveLayout } from '../useResponsiveLayout';
import * as ReactNative from 'react-native';

// Mock useWindowDimensions
jest.mock('react-native', () => ({
  useWindowDimensions: jest.fn(),
}));

describe('useResponsiveLayout', () => {
  const mockUseWindowDimensions = ReactNative.useWindowDimensions as jest.MockedFunction<typeof ReactNative.useWindowDimensions>;

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Helper function to test the hook
  function testHook(width: number, height: number) {
    mockUseWindowDimensions.mockReturnValue({ width, height, scale: 1, fontScale: 1 });
    return useResponsiveLayout();
  }

  it('should detect mobile layout for width < 768', () => {
    const result = testHook(375, 667);
    
    expect(result.isMobile).toBe(true);
    expect(result.isTablet).toBe(false);
    expect(result.isDesktop).toBe(false);
    expect(result.navigationGridColumns).toBe(2);
  });

  it('should detect tablet layout for width between 768 and 900', () => {
    const result = testHook(800, 600);
    
    expect(result.isMobile).toBe(false);
    expect(result.isTablet).toBe(true);
    expect(result.isDesktop).toBe(false);
    expect(result.navigationGridColumns).toBe(2);
  });

  it('should detect desktop layout for width >= 900', () => {
    const result = testHook(1024, 768);
    
    expect(result.isMobile).toBe(false);
    expect(result.isTablet).toBe(false);
    expect(result.isDesktop).toBe(true);
    expect(result.navigationGridColumns).toBe(3);
  });

  it('should detect large desktop layout for width >= 1200', () => {
    const result = testHook(1440, 900);
    
    expect(result.isDesktop).toBe(true);
    expect(result.isLargeDesktop).toBe(true);
    expect(result.navigationGridColumns).toBe(4);
  });

  it('should calculate correct content width for desktop', () => {
    const result = testHook(1600, 900);
    
    // Content width should be constrained to maxContentWidth (1200)
    expect(result.contentWidth).toBe(1200);
    // Container padding should be (1600 - 1200) / 2 = 200
    expect(result.containerPadding).toBe(200);
  });

  it('should have larger font sizes on desktop', () => {
    const mobileResult = testHook(375, 667);
    const desktopResult = testHook(1024, 768);
    
    expect(desktopResult.fontSize.title).toBeGreaterThan(mobileResult.fontSize.title);
    expect(desktopResult.fontSize.body).toBeGreaterThan(mobileResult.fontSize.body);
  });

  it('should have more grid columns on desktop', () => {
    const mobileResult = testHook(375, 667);
    const desktopResult = testHook(1024, 768);
    
    expect(desktopResult.imageGridColumns).toBeGreaterThan(mobileResult.imageGridColumns);
    expect(desktopResult.equipmentGridColumns).toBeGreaterThan(mobileResult.equipmentGridColumns);
  });

  it('should provide correct breakpoint values', () => {
    const result = testHook(1024, 768);
    
    expect(result.breakpoints.mobile).toBe(0);
    expect(result.breakpoints.tablet).toBe(768);
    expect(result.breakpoints.desktop).toBe(900);
    expect(result.breakpoints.largeDesktop).toBe(1200);
    expect(result.maxContentWidth).toBe(1200);
  });
});
