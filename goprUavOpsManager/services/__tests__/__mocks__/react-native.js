const mockComponent = (name) => {
  const MockComponent = (props) => {
    return props.children || name;
  };
  MockComponent.displayName = name;
  return MockComponent;
};

module.exports = {
  Platform: {
    OS: 'web',
    select: (obj) => obj.web || obj.default,
  },
  StyleSheet: {
    create: (styles) => styles,
    flatten: (styles) => styles,
  },
  View: mockComponent('View'),
  Text: mockComponent('Text'),
  TextInput: mockComponent('TextInput'),
  TouchableOpacity: mockComponent('TouchableOpacity'),
  ScrollView: mockComponent('ScrollView'),
  ActivityIndicator: mockComponent('ActivityIndicator'),
  KeyboardAvoidingView: mockComponent('KeyboardAvoidingView'),
  Alert: {
    alert: jest.fn(),
  },
  Dimensions: {
    get: jest.fn().mockReturnValue({ width: 375, height: 812 }),
  },
};