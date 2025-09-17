const GoogleSignin = {
  configure: jest.fn(),
  hasPlayServices: jest.fn().mockResolvedValue(true),
  signIn: jest.fn(),
  signOut: jest.fn(),
  revokeAccess: jest.fn(),
  isSignedIn: jest.fn(),
  getCurrentUser: jest.fn(),
};

const GoogleSigninButton = 'GoogleSigninButton';

module.exports = {
  GoogleSignin,
  GoogleSigninButton,
};