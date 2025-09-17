const requestForegroundPermissionsAsync = jest.fn();
const getCurrentPositionAsync = jest.fn();
const reverseGeocodeAsync = jest.fn();
const geocodeAsync = jest.fn();

module.exports = {
  requestForegroundPermissionsAsync,
  getCurrentPositionAsync,
  reverseGeocodeAsync,
  geocodeAsync,
};