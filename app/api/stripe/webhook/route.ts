import { NextRequest } from 'next/server'
import { stripe, verifyWebhookSignature, PRICING_PLANS } from '@/lib/stripe'
import { companies, apiKeys } from '@/lib/airtable'
import { createErrorResponse, createSuccessResponse } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      return createErrorResponse('署名が見つかりません', 400)
    }

    // Webhook署名検証
    const event = verifyWebhookSignature(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )

    console.log('Stripe webhook event:', event.type)

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as any
        const customerId = subscription.customer as string

        // 顧客情報取得
        const customer = await stripe.customers.retrieve(customerId)
        if (customer.deleted) {
          throw new Error('顧客が削除されています')
        }

        const companyId = customer.metadata?.companyId
        if (!companyId) {
          console.error('Company ID not found in customer metadata')
          return createSuccessResponse({ received: true })
        }

        // プラン特定
        const priceId = subscription.items.data[0]?.price?.id
        let newTier: 'FREE' | 'BASIC' | 'PRO' = 'FREE'
        let newQuota = PRICING_PLANS.FREE.monthlyQuota

        if (priceId === PRICING_PLANS.BASIC.priceId) {
          newTier = 'BASIC'
          newQuota = PRICING_PLANS.BASIC.monthlyQuota
        } else if (priceId === PRICING_PLANS.PRO.priceId) {
          newTier = 'PRO'
          newQuota = PRICING_PLANS.PRO.monthlyQuota
        }

        // APIキー更新
        const existingApiKey = await apiKeys.findByCompanyId(companyId)
        if (existingApiKey) {
          await apiKeys.update(existingApiKey.id, {
            tier: newTier,
            monthlyQuota: newQuota,
          })
        }

        console.log(`Company ${companyId} plan updated to ${newTier}`)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any
        const customerId = subscription.customer as string

        // 顧客情報取得
        const customer = await stripe.customers.retrieve(customerId)
        if (customer.deleted) {
          throw new Error('顧客が削除されています')
        }

        const companyId = customer.metadata?.companyId
        if (!companyId) {
          console.error('Company ID not found in customer metadata')
          return createSuccessResponse({ received: true })
        }

        // FREEプランに戻す
        const existingApiKey = await apiKeys.findByCompanyId(companyId)
        if (existingApiKey) {
          await apiKeys.update(existingApiKey.id, {
            tier: 'FREE',
            monthlyQuota: PRICING_PLANS.FREE.monthlyQuota,
          })
        }

        console.log(`Company ${companyId} downgraded to FREE`)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as any
        console.log(`Payment succeeded for invoice ${invoice.id}`)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as any
        console.log(`Payment failed for invoice ${invoice.id}`)
        
        // TODO: 支払い失敗時の処理（メール通知など）
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return createSuccessResponse({ received: true })

  } catch (error: any) {
    console.error('Stripe webhook error:', error)
    
    if (error.type === 'StripeSignatureVerificationError') {
      return createErrorResponse('無効な署名です', 400)
    }

    return createErrorResponse('Webhookの処理に失敗しました', 500)
  }
}