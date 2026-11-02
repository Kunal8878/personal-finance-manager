import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/index';
import { prisma } from '../src/config/db';

describe('Security & Data Isolation Tests', () => {
  let tokenUserA: string;
  let tokenUserB: string;
  let accountUserAId: string;

  beforeAll(async () => {
    // Clean up test database
    await prisma.transaction.deleteMany();
    await prisma.account.deleteMany();
    await prisma.user.deleteMany();

    // Register User A
    const resA = await request(app)
      .post('/api/auth/register')
      .send({ name: 'User A', email: 'usera@example.com', password: 'Password123!' });
    tokenUserA = resA.body.token;

    // Register User B
    const resB = await request(app)
      .post('/api/auth/register')
      .send({ name: 'User B', email: 'userb@example.com', password: 'Password123!' });
    tokenUserB = resB.body.token;

    // User A creates an account
    const accRes = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({ name: 'User A Private Vault', type: 'BANK', balance: 10000 });

    accountUserAId = accRes.body.account.id;
  });

  it('allows User A to access their own account', async () => {
    const res = await request(app)
      .get('/api/accounts')
      .set('Authorization', `Bearer ${tokenUserA}`);

    expect(res.status).toBe(200);
    expect(res.body.accounts).toHaveLength(1);
    expect(res.body.accounts[0].name).toBe('User A Private Vault');
  });

  it('prevents User B from viewing User A accounts', async () => {
    const res = await request(app)
      .get('/api/accounts')
      .set('Authorization', `Bearer ${tokenUserB}`);

    expect(res.status).toBe(200);
    expect(res.body.accounts).toHaveLength(0); // Strict isolation
  });

  it('prevents User B from deleting User A account', async () => {
    const res = await request(app)
      .delete(`/api/accounts/${accountUserAId}`)
      .set('Authorization', `Bearer ${tokenUserB}`);

    expect(res.status).toBe(404); // Returns 404 unauthorized resource
  });
});
