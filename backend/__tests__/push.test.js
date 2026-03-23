const request = require('supertest');
const { app } = require('../server');

describe('Push Notifications API', () => {

    // ── VAPID Key (public, no auth) ──────────────────────────────────────
    describe('GET /api/push/vapid-key', () => {
        it('should return the VAPID public key', async () => {
            const res = await request(app).get('/api/push/vapid-key');
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('publicKey');
            expect(typeof res.body.publicKey).toBe('string');
            expect(res.body.publicKey.length).toBeGreaterThan(10);
        });
    });

    // ── Subscribe (requires auth) ────────────────────────────────────────
    describe('POST /api/push/subscribe', () => {
        it('should return 401/403 without token', async () => {
            const res = await request(app)
                .post('/api/push/subscribe')
                .send({ subscription: { endpoint: 'https://test.com' } });
            expect([401, 403]).toContain(res.status);
        });
    });

    // ── Unsubscribe (requires auth) ──────────────────────────────────────
    describe('DELETE /api/push/unsubscribe', () => {
        it('should return 401/403 without token', async () => {
            const res = await request(app)
                .delete('/api/push/unsubscribe')
                .send({ endpoint: 'https://test.com' });
            expect([401, 403]).toContain(res.status);
        });
    });
});
