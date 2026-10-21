import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';

describe('Auth & API Endpoints Security', () => {
  const app = createApp();

  it('rejects registration with invalid weak password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test Operator',
        email: 'op@example.com',
        password: 'weak',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects unauthenticated requests to protected endpoints', async () => {
    const res = await request(app).get('/api/sales');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('rejects unauthenticated requests to admin overview', async () => {
    const res = await request(app).get('/api/analytics/overview');
    expect(res.status).toBe(401);
  });

  it('authenticates valid admin credentials seeded in database', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@bms.local',
        password: 'Admin@BMS2026',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('admin@bms.local');
    expect(res.body.data.user.role).toBe('ADMIN');
    expect(res.headers['set-cookie']).toBeDefined();
  }, 20000);

  it('rejects unauthenticated worker creation', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({
        name: 'Worker 1',
        email: 'worker1@bms.local',
        password: 'Password@2026',
        role: 'SALES_OPERATOR',
      });

    expect(res.status).toBe(401);
  });
});
