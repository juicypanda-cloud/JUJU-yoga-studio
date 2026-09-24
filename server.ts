// Must be the first import: ES module imports are hoisted and evaluated before
// any other code in this file, so loading dotenv as a side-effect here (instead
// of calling dotenv.config() further down) ensures process.env is populated
// before qpayCreateInvoice.ts -> api/qpay/_lib.ts reads QPAY_* into top-level
// consts at their own module-load time. Doing it later left those permanently
// undefined for the local dev/self-hosted server (Vercel is unaffected, since
// it injects env vars before any code runs at all).
import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { handleCreateInvoiceRequest } from './lib/server/qpayCreateInvoice.ts';
import { processQPayWebhook } from './lib/server/qpayWebhookCore.ts';
import { handlePaymentCheckRequest } from './api/qpay/payment/check.ts';
import { handlePaymentDetailRequest } from './api/qpay/payment/[paymentId].ts';
import { getServerAuth, getServerFirestore } from './lib/server/firebaseAdmin.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.post('/api/qpay/invoice', async (req, res) => {
    try {
      const { status, payload } = await handleCreateInvoiceRequest((req.body ?? {}) as Record<string, unknown>);
      return res.status(status).json(payload);
    } catch (error) {
      return res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post('/api/qpay/payment/check', async (req, res) => {
    try {
      const authHeader = typeof req.headers?.authorization === 'string' ? req.headers.authorization : undefined;
      const { status, payload } = await handlePaymentCheckRequest((req.body ?? {}) as Record<string, unknown>, authHeader);
      return res.status(status).json(payload);
    } catch (error) {
      return res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get('/api/qpay/payment/:paymentId', async (req, res) => {
    try {
      const { paymentId } = req.params;
      const authHeader = typeof req.headers?.authorization === 'string' ? req.headers.authorization : undefined;
      const idTokenQuery = typeof req.query?.idToken === 'string' ? req.query.idToken : undefined;

      const { status, payload } = await handlePaymentDetailRequest(paymentId, authHeader, idTokenQuery);
      return res.status(status).json(payload);
    } catch (error) {
      return res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post('/api/qpay/webhook', async (req, res) => {
    try {
      const { status, json } = await processQPayWebhook(req.body);
      return res.status(status).json(json);
    } catch (error) {
      return res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post('/api/admin/set-role', async (req, res) => {
    try {
      const { idToken, targetUserId, newRole } = req.body ?? {};
      if (!idToken || !targetUserId || !newRole) {
        return res.status(400).json({ error: 'idToken, targetUserId, and newRole are required' });
      }
      const auth = getServerAuth();
      const decoded = await auth.verifyIdToken(String(idToken));
      const db = getServerFirestore();
      const callerSnap = await db.collection('users').doc(decoded.uid).get();
      if (String(callerSnap.data()?.role || '') !== 'admin') {
        return res.status(403).json({ error: 'Forbidden: Only admins can manage roles' });
      }
      if (!['admin', 'teacher', 'client', 'user'].includes(String(newRole))) {
        return res.status(400).json({ error: 'Invalid role' });
      }
      await db.collection('users').doc(String(targetUserId)).update({ role: newRole });
      return res.json({ ok: true, userId: targetUserId, role: newRole });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to update user role' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

