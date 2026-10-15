module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@firebase|firebase)'
  ],
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)'],
  moduleNameMapper: {
    '^react-native/setup-env$': '<rootDir>/__tests__/setup-env.mock.js',
    '\\.(wav|mp3|ogg|m4a|png|jpg|jpeg|gif|svg)$': '<rootDir>/__tests__/fileMock.js',
  }
};

