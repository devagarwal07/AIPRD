import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import prdRoutes from './routes/prd.js';
import snapshotRoutes from './routes/snapshot.js';
import integrationRoutes from './routes/integration.js';
import syncRoutes from './routes/sync.js';
dotenv.config();
const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));
// Server-side redaction middleware: sanitize known sensitive patterns in string fields
function serverRedact(val) {
    return val
        .replace(/([A-Z0-9._%+-]+)@([A-Z0-9.-]+\.[A-Z]{2,})/gi, '[REDACTED_EMAIL]')
        .replace(/https?:\/\/[\w.-]+(?:\/[\w\-./?%&=]*)?/gi, '[REDACTED_URL]')
        .replace(/[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}/gi, '[REDACTED_ID]')
        .replace(/\b\d{16,}\b/g, '[REDACTED_NUMBER]')
        .replace(/(?:(?:\+\d{1,3}[\s-]?)?(?:\(\d{2,4}\)[\s-]?|\d{2,4}[\s-])?)\d{3,4}[\s-]?\d{3,4}(?:[\s-]?\d{3,4})?/g, '[REDACTED_PHONE]')
        .replace(/\b[a-zA-Z0-9_-]{32,}\b/g, '[REDACTED_TOKEN]')
        .replace(/\b([A-Za-z0-9_.-]{2,40})\/([A-Za-z0-9_.-]{2,80})\b/g, (m, owner, repo) => {
        const stop = ['the', 'app', 'test', 'prod', 'dev'];
        if (stop.includes(owner.toLowerCase()))
            return m;
        if ((owner.length + repo.length) < 6)
            return m;
        return '[REDACTED_REPO]';
    })
        .replace(/\/(?:[A-Za-z0-9._-]+\/)+[A-Za-z0-9._-]+/g, '[REDACTED_PATH]')
        .replace(/(?:[A-Za-z]:\\|\\\\)[^\s"'`]+/g, '[REDACTED_PATH]');
}
function redactRecursive(obj, depth = 0) {
    if (depth > 6 || obj == null)
        return;
    if (typeof obj === 'string')
        return serverRedact(obj);
    if (Array.isArray(obj)) {
        for (let i = 0; i < obj.length; i++) {
            const v = obj[i];
            const nv = redactRecursive(v, depth + 1);
            if (nv !== undefined)
                obj[i] = nv;
        }
        return;
    }
    if (typeof obj === 'object') {
        for (const k of Object.keys(obj)) {
            const v = obj[k];
            const nv = redactRecursive(v, depth + 1);
            if (nv !== undefined)
                obj[k] = nv;
        }
    }
}
app.use((req, _res, next) => {
    try {
        if (req.body)
            redactRecursive(req.body);
    }
    catch { /* ignore */ }
    next();
});
const PORT = process.env.PORT || 4000;
app.get('/health', (_req, res) => {
    res.json({ ok: true, ts: Date.now() });
});
app.use('/api/prds', prdRoutes);
app.use('/api/snapshots', snapshotRoutes);
app.use('/api/integrations', integrationRoutes);
// Simple in-memory rate limiting (per IP + route key). For production, replace with Redis or distributed store.
const rateWindows = {};
function rateLimit(max, windowMs) {
    return (req, res, next) => {
        const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
        const key = `${ip}:${req.baseUrl}${req.path}`;
        const now = Date.now();
        let bucket = rateWindows[key];
        if (!bucket || bucket.reset < now) {
            bucket = { count: 0, reset: now + windowMs };
            rateWindows[key] = bucket;
        }
        bucket.count += 1;
        const remaining = Math.max(0, max - bucket.count);
        res.setHeader('X-RateLimit-Limit', String(max));
        res.setHeader('X-RateLimit-Remaining', String(remaining < 0 ? 0 : remaining));
        res.setHeader('X-RateLimit-Reset', String(Math.floor(bucket.reset / 1000)));
        if (bucket.count > max) {
            return res.status(429).json({ error: 'rate_limited', retryAfterMs: bucket.reset - now });
        }
        next();
    };
}
// Apply stricter limits to sync endpoints (issue creation)
app.use('/api/sync', rateLimit(20, 60_000));
app.use('/api/sync', syncRoutes);
async function start() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('Missing MONGODB_URI');
        process.exit(1);
    }
    try {
        await mongoose.connect(uri, { dbName: uri.split('/').pop() });
        console.log('Mongo connected');
    }
    catch (err) {
        console.error('Mongo connect failed', err);
        process.exit(1);
    }
    app.listen(PORT, () => {
        console.log(`Server listening on :${PORT}`);
    });
}
start().catch((e) => console.error(e));
