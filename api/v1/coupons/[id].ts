import { NextRequest } from 'next/server'
import { coupons, apiKeys } from '@/lib/airtable'
import { cache } from '@/lib/kv'
import {
  createErrorResponse,
  createSuccessResponse,
  extractApiKey,
  isRateLimited,
  corsHeaders,
} from '@/lib/utils'

export const runtime = 'edge'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // CORS対応
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: corsHeaders })
    }

    // APIキー認証
    const apiKey = extractApiKey(request)
    if (!apiKey) {
      return createErrorResponse('APIキーが必要です', 401, 'UNAUTHORIZED')
    }

    const keyData = await apiKeys.findByKey(apiKey)
    if (!keyData) {
      return createErrorResponse('無効なAPIキーです', 401, 'INVALID_API_KEY')
    }

    // レート制限チェック
    const currentUsage = await cache.getApiUsage(keyData.id)
    if (isRateLimited(currentUsage, keyData.monthlyQuota)) {
      return createErrorResponse(
        '月間クォータを超過しました',
        429,
        'QUOTA_EXCEEDED'
      )
    }

    const { id } = params

    // キャッシュから取得試行
    let coupon = await cache.getCoupon(id)
    
    if (!coupon) {
      // キャッシュミス時はAirtableから取得
      coupon = await coupons.findById(id)
      
      if (!coupon) {
        return createErrorResponse(
          'クーポンが見つかりません',
          404,
          'COUPON_NOT_FOUND'
        )
      }
      
      // キャッシュに保存
      await cache.setCoupon(id, coupon)
    }

    // 有効期限チェック
    const now = new Date()
    const startDate = new Date(coupon.startDate)
    const endDate = new Date(coupon.endDate)

    if (startDate > now || now > endDate) {
      return createErrorResponse(
        'このクーポンは現在利用できません',
        400,
        'COUPON_EXPIRED'
      )
    }

    // 使用量カウントアップ
    await cache.incrementApiUsage(keyData.id)

    return createSuccessResponse({
      coupon,
    })

  } catch (error: any) {
    console.error('Coupon detail API error:', error)
    
    return createErrorResponse(
      'サーバーエラーが発生しました',
      500,
      'INTERNAL_ERROR'
    )
  }
}