module.exports = {
  extends: '@react-native',
  parserOptions: {
    requireConfigFile: false,
    babelOptions: {
      presets: ['module:@react-native/babel-preset'],
    },
  },
  rules: {
    'react/react-in-jsx-scope': 'off',
  },
  ignorePatterns: ['node_modules/', 'ios/', 'android/', 'dist/', '.expo/', 'web-build/'],
};
