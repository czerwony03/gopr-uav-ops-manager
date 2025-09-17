const Sentry = {
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  setUser: jest.fn(),
  setTag: jest.fn(),
  setContext: jest.fn(),
  addBreadcrumb: jest.fn(),
  withScope: jest.fn((callback) => callback({
    setTag: jest.fn(),
    setContext: jest.fn(),
    setUser: jest.fn(),
  })),
};

module.exports = Sentry;