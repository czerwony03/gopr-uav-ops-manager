const mockStorage = {
  ref: jest.fn(),
  child: jest.fn(),
  put: jest.fn(),
  getDownloadURL: jest.fn(),
  delete: jest.fn(),
};

const getStorage = jest.fn(() => mockStorage);
const ref = jest.fn();
const uploadBytes = jest.fn();
const getDownloadURL = jest.fn();
const deleteObject = jest.fn();

module.exports = {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
};