const mockApp = {
  name: 'mock-app',
  options: {},
};

const initializeApp = jest.fn(() => mockApp);
const getApp = jest.fn(() => mockApp);

module.exports = {
  initializeApp,
  getApp,
};