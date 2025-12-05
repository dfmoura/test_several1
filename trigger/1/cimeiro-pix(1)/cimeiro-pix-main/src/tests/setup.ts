import 'reflect-metadata';
import { config } from '../config/environment';

// Mock environment for tests
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.JWT_SECRET = 'test-secret';

// Mock external services
jest.mock('../services/sankhya.service');
jest.mock('../services/mercos.service');
jest.mock('../services/notification.service');

// Increase timeout for integration tests
jest.setTimeout(30000);