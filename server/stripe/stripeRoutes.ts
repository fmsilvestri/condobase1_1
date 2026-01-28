import { Router, Request, Response } from 'express';
import { getUncachableStripeClient, getStripePublishableKey } from './stripeClient';
import { createStorage } from '../supabase-storage';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { optionalJWT, requireAuth } from '../auth-middleware';
import { condominiumContextMiddleware, requireCondominium } from '../condominium-context';

const router = Router();
const storage = createStorage();

router.use(optionalJWT);
router.use(condominiumContextMiddleware);

router.get('/publishable-key', async (_req: Request, res: Response) => {
  try {
    const publishableKey = await getStripePublishableKey();
    res.json({ publishableKey });
  } catch (error: any) {
    console.error('Error getting Stripe publishable key:', error);
    res.status(500).json({ error: 'Failed to get Stripe configuration' });
  }
});

router.get('/products', async (_req: Request, res: Response) => {
  try {
    const result = await db.execute(
      sql`SELECT * FROM stripe.products WHERE active = true ORDER BY name`
    );
    res.json({ data: result.rows });
  } catch (error: any) {
    console.error('Error listing products:', error);
    res.status(500).json({ error: 'Failed to list products' });
  }
});

router.get('/prices', async (_req: Request, res: Response) => {
  try {
    const result = await db.execute(
      sql`SELECT * FROM stripe.prices WHERE active = true ORDER BY unit_amount`
    );
    res.json({ data: result.rows });
  } catch (error: any) {
    console.error('Error listing prices:', error);
    res.status(500).json({ error: 'Failed to list prices' });
  }
});

router.get('/products-with-prices', async (_req: Request, res: Response) => {
  try {
    const result = await db.execute(
      sql`
        SELECT 
          p.id as product_id,
          p.name as product_name,
          p.description as product_description,
          p.active as product_active,
          p.metadata as product_metadata,
          pr.id as price_id,
          pr.unit_amount,
          pr.currency,
          pr.recurring,
          pr.active as price_active
        FROM stripe.products p
        LEFT JOIN stripe.prices pr ON pr.product = p.id AND pr.active = true
        WHERE p.active = true
        ORDER BY p.name, pr.unit_amount
      `
    );

    const productsMap = new Map();
    for (const row of result.rows as any[]) {
      if (!productsMap.has(row.product_id)) {
        productsMap.set(row.product_id, {
          id: row.product_id,
          name: row.product_name,
          description: row.product_description,
          active: row.product_active,
          metadata: row.product_metadata,
          prices: []
        });
      }
      if (row.price_id) {
        productsMap.get(row.product_id).prices.push({
          id: row.price_id,
          unit_amount: row.unit_amount,
          currency: row.currency,
          recurring: row.recurring,
          active: row.price_active,
        });
      }
    }

    res.json({ data: Array.from(productsMap.values()) });
  } catch (error: any) {
    console.error('Error listing products with prices:', error);
    res.status(500).json({ error: 'Failed to list products' });
  }
});

router.post('/checkout', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.condominiumContext?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { priceId, feeDescription, condominiumId } = req.body;
    if (!priceId) {
      return res.status(400).json({ error: 'Price ID is required' });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const stripe = await getUncachableStripeClient();

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId: user.id },
      });
      customerId = customer.id;

      await storage.updateUser(userId, { stripeCustomerId: customerId });
    }

    const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;
    
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'payment',
      success_url: `${baseUrl}/pagamentos?status=success`,
      cancel_url: `${baseUrl}/pagamentos?status=cancelled`,
      metadata: {
        userId,
        condominiumId: condominiumId || '',
        feeDescription: feeDescription || 'Taxa de condomínio',
      },
    });

    res.json({ url: session.url });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

router.post('/checkout-cobranca', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.condominiumContext?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { cobrancaId } = req.body;
    if (!cobrancaId) {
      return res.status(400).json({ error: 'Cobrança ID is required' });
    }

    const cobranca = await storage.getCobrancaById(cobrancaId);
    if (!cobranca) {
      return res.status(404).json({ error: 'Cobrança not found' });
    }

    if (cobranca.status === 'pago') {
      return res.status(400).json({ error: 'Esta cobrança já foi paga' });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const stripe = await getUncachableStripeClient();

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId: user.id },
      });
      customerId = customer.id;

      await storage.updateUser(userId, { stripeCustomerId: customerId });
    }

    const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;
    const amountInCents = Math.round(cobranca.valor * 100);
    
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'brl',
          product_data: {
            name: cobranca.descricao,
            description: cobranca.competencia ? `Competência: ${cobranca.competencia}` : undefined,
          },
          unit_amount: amountInCents,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${baseUrl}/pagamentos?status=success&cobranca=${cobrancaId}`,
      cancel_url: `${baseUrl}/pagamentos?status=cancelled`,
      metadata: {
        userId,
        cobrancaId: cobranca.id,
        condominiumId: cobranca.condominiumId,
        tipo: 'cobranca_condominio',
      },
    });

    await storage.updateCobranca(cobrancaId, {
      stripeCheckoutSessionId: session.id,
    });

    res.json({ url: session.url });
  } catch (error: any) {
    console.error('Error creating cobranca checkout session:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

router.post('/customer-portal', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.condominiumContext?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = await storage.getUser(userId);
    if (!user?.stripeCustomerId) {
      return res.status(400).json({ error: 'No Stripe customer found' });
    }

    const stripe = await getUncachableStripeClient();
    const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${baseUrl}/pagamentos`,
    });

    res.json({ url: session.url });
  } catch (error: any) {
    console.error('Error creating portal session:', error);
    res.status(500).json({ error: 'Failed to create customer portal session' });
  }
});

router.get('/payment-history', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.condominiumContext?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = await storage.getUser(userId);
    if (!user?.stripeCustomerId) {
      return res.json({ data: [] });
    }

    const result = await db.execute(
      sql`SELECT * FROM stripe.payment_intents 
          WHERE customer = ${user.stripeCustomerId} 
          ORDER BY created DESC 
          LIMIT 50`
    );

    res.json({ data: result.rows });
  } catch (error: any) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
});

export default router;
