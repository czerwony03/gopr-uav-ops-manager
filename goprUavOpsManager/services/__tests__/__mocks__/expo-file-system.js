const documentDirectory = 'file:///mock/document/';
const cacheDirectory = 'file:///mock/cache/';

const writeAsStringAsync = jest.fn();
const readAsStringAsync = jest.fn();
const deleteAsync = jest.fn();
const moveAsync = jest.fn();
const copyAsync = jest.fn();
const makeDirectoryAsync = jest.fn();
const getInfoAsync = jest.fn();
const downloadAsync = jest.fn();

module.exports = {
  documentDirectory,
  cacheDirectory,
  writeAsStringAsync,
  readAsStringAsync,
  deleteAsync,
  moveAsync,
  copyAsync,
  makeDirectoryAsync,
  getInfoAsync,
  downloadAsync,
};