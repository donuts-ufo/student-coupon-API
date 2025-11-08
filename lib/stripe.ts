import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

// プラン定義
export const PRICING_PLANS = {
  FREE: {
    name: 'Free',
    monthlyQuota: 100,
    priceId: null,
  },
  BASIC: {
    name: 'Basic',
    monthlyQuota: 1000,
    priceId: process.env.STRIPE_BASIC_PRICE_ID,
  },
  PRO: {
    name: 'Pro',
    monthlyQuota: 10000,
    priceId: process.env.STRIPE_PRO_PRICE_ID,
  },
} as const

// Stripe Customer作成
export async function createStripeCustomer(
  email: string,
  name: string,
  companyId: string
): Promise<Stripe.Customer> {
  return await stripe.customers.create({
    email,
    name,
    metadata: {
      companyId,
    },
  })
}

// サブスクリプション作成
export async function createSubscription(
  customerId: string,
  priceId: string
): Promise<Stripe.Subscription> {
  return await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    payment_behavior: 'default_incomplete',
    expand: ['latest_invoice.payment_intent'],
  })
}

// 使用量報告（従量課金用）
export async function reportUsage(
  subscriptionItemId: string,
  quantity: number,
  timestamp?: number
): Promise<Stripe.UsageRecord> {
  return await stripe.subscriptionItems.createUsageRecord(
    subscriptionItemId,
    {
      quantity,
      timestamp: timestamp || Math.floor(Date.now() / 1000),
      action: 'increment',
    }
  )
}

// ポータルセッション作成
export async function createPortalSession(
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  return await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  })
}

// Webhook署名検証
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(payload, signature, secret)
}