// Mock browser environment for tests that use browser APIs
if (typeof window === 'undefined') {
  global.window = {};
}

if (typeof document === 'undefined') {
  global.document = {
    createElement: jest.fn().mockImplementation(() => ({
      style: {},
      addEventListener: jest.fn(),
      appendChild: jest.fn(),
      textContent: '',
    })),
    addEventListener: jest.fn(),
    body: {
      appendChild: jest.fn(),
    },
  };
}

// Setup requestAnimationFrame and cancelAnimationFrame
if (typeof window.requestAnimationFrame === 'undefined') {
  window.requestAnimationFrame = jest.fn(callback => setTimeout(callback, 0));
  window.cancelAnimationFrame = jest.fn(id => clearTimeout(id));
}

// Silence console logs during tests
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

// Add expected globals
global.setTimeout = jest.fn(() => 1);
global.clearTimeout = jest.fn();
global.setInterval = jest.fn(() => 1);
global.clearInterval = jest.fn(); 