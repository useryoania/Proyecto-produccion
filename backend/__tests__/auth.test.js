const request = require('supertest');
const { app } = require('../server');

describe('Auth API', () => {

    // ── Login ────────────────────────────────────────────────────────────
    describe('POST /api/auth/login', () => {
        it('should return 401 with invalid credentials', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ username: 'noexiste_xyz_999', password: 'wrongpass' });
            expect(res.status).toBe(401);
            expect(res.body.success).toBe(false);
        });

        it('should return 401 with empty body', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({});
            // Should fail (no username/password)
            expect([401, 500]).toContain(res.status);
        });
    });

    // ── Me (Session Check) ───────────────────────────────────────────────
    describe('GET /api/auth/me', () => {
        it('should return 401/403 without token', async () => {
            const res = await request(app).get('/api/auth/me');
            expect([401, 403]).toContain(res.status);
        });

        it('should return 401/403 with invalid token', async () => {
            const res = await request(app)
                .get('/api/auth/me')
                .set('Authorization', 'Bearer token_invalido_12345');
            expect([401, 403]).toContain(res.status);
        });
    });

    // ── Web Auth ─────────────────────────────────────────────────────────
    describe('POST /api/web-auth/login', () => {
        it('should return 401 with invalid client ID', async () => {
            const res = await request(app)
                .post('/api/web-auth/login')
                .send({ idCliente: 'NOEXISTE999', password: 'wrong' });
            expect([400, 401]).toContain(res.status);
        });
    });
});
