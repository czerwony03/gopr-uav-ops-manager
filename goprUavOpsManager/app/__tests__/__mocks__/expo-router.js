const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  navigate: jest.fn(),
  back: jest.fn(),
  canGoBack: jest.fn().mockReturnValue(false),
};

const useRouter = jest.fn(() => mockRouter);
const usePathname = jest.fn(() => '/');
const useLocalSearchParams = jest.fn(() => ({}));

const Stack = {
  Screen: ({ children }) => children,
};

const Tabs = {
  Screen: ({ children }) => children,
};

module.exports = {
  useRouter,
  usePathname,
  useLocalSearchParams,
  Stack,
  Tabs,
  mockRouter,
};