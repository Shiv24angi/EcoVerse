import '@testing-library/jest-dom';

// Mock environment variables for tests
process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.FIREBASE_API_KEY = 'test-key';
process.env.FIREBASE_PROJECT_ID = 'test-project';
process.env.NEXTAUTH_SECRET = 'test-secret';
process.env.NEXTAUTH_URL = 'http://localhost:3000';
process.env.CLIMATIQ_API_KEY = 'test_climatiq';

// Suppress console during tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
