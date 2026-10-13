import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { validateServerEnv } from '../src/config/env';
import { createApp } from '../src/app';

describe('Phase 1 — Foundation: Environment Validation & Health Check', () => {
  const validEnv: NodeJS.ProcessEnv = {
    NODE_ENV: 'test',
    PORT: '5000',
    MONGODB_URI: 'mongodb://127.0.0.1:27017/fixme_test',
    CLIENT_URL: 'http://localhost:5173',
    ADMIN_URL: 'http://localhost:5174',
    SESSION_SECRET: 'test-session-secret-minimum-16-chars-long',
    STORAGE_PROVIDER: 'local',
    PAYMENT_PROVIDER: 'razorpay_sandbox',
    PAYMENT_SECRET_KEY: 'sandbox_secret_key',
    PAYMENT_WEBHOOK_SECRET: 'sandbox_webhook_secret',
    EMAIL_PROVIDER_API_KEY: 'sandbox_email_key',
  };

  it('validates complete server environment configuration', () => {
    const parsed = validateServerEnv(validEnv);
    expect(parsed.PORT).toBe(5000);
    expect(parsed.CLIENT_URL).toBe('http://localhost:5173');
    expect(parsed.ADMIN_URL).toBe('http://localhost:5174');
  });

  it('fails startup clearly when required environment variables are missing', () => {
    const incompleteEnv = { ...validEnv };
    delete incompleteEnv.MONGODB_URI;
    delete incompleteEnv.SESSION_SECRET;

    expect(() => validateServerEnv(incompleteEnv)).toThrow(
      /Invalid or missing environment variables/
    );
  });

  it('GET /api/v1/health returns structured health response with X-Request-Id header', async () => {
    const app = createApp();
    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.headers['x-request-id']).toBeDefined();
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      service: 'fixme-api',
      version: '1.0.0',
    });
    expect(res.body.requestId).toBe(res.headers['x-request-id']);
  });

  it('GET /api/v1/non-existent-route returns safe structured 404 error', async () => {
    const app = createApp();
    const res = await request(app).get('/api/v1/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.body.requestId).toBeDefined();
  });
});

