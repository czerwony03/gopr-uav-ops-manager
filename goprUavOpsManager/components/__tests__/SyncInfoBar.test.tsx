import React from 'react';
import { render } from '@testing-library/react-native';
import SyncInfoBar from '../SyncInfoBar';

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('SyncInfoBar', () => {
  it('should render nothing when not visible', () => {
    const { toJSON } = render(<SyncInfoBar visible={false} />);
    expect(toJSON()).toBeNull();
  });

  it('should render sync bar when visible', () => {
    const { getByText } = render(<SyncInfoBar visible={true} />);
    expect(getByText('sync.syncingData')).toBeTruthy();
  });

  it('should display ActivityIndicator when visible', () => {
    const { UNSAFE_getByType } = render(<SyncInfoBar visible={true} />);
    const { ActivityIndicator } = require('react-native');
    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });
});
