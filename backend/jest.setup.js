// Usar secret de prueba para no depender del .env
process.env.JWT_SECRET = 'dev-secret-only-for-local-dev';
process.env.NODE_ENV = 'test';

// Silenciar winston durante los tests para evitar output innecesario
jest.mock('./src/config/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));
