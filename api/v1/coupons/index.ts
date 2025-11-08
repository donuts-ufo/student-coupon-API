import { NextRequest } from 'next/server'
import { coupons, apiKeys } from '@/lib/airtable'
import { cache, generateQueryHash } from '@/lib/kv'
import { CouponQuerySchema } from '@/lib/validations'
import {
  createErrorResponse,
  createSuccessResponse,
  extractApiKey,
  isRateLimited,
  corsHeaders,
} from '@/lib/utils'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
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

    // クエリパラメータ解析
    const url = new URL(request.url)
    const queryParams = {
      category: url.searchParams.get('category') || undefined,
      region: url.searchParams.get('region') || undefined,
      limit: url.searchParams.get('limit') || undefined,
    }

    const validatedQuery = CouponQuerySchema.parse(queryParams)
    
    // キャッシュキー生成
    const queryHash = generateQueryHash(validatedQuery)
    
    // キャッシュから取得試行
    let couponList = await cache.getCoupons(queryHash)
    
    if (!couponList) {
      // キャッシュミス時はAirtableから取得
      couponList = await coupons.findAll({
        category: validatedQuery.category,
        region: validatedQuery.region,
        limit: validatedQuery.limit,
      })
      
      // キャッシュに保存
      await cache.setCoupons(queryHash, couponList)
    }

    // 使用量カウントアップ
    await cache.incrementApiUsage(keyData.id)

    // 有効期限フィルタリング
    const now = new Date()
    const activeCoupons = couponList.filter(coupon => {
      const startDate = new Date(coupon.startDate)
      const endDate = new Date(coupon.endDate)
      return startDate <= now && now <= endDate
    })

    return createSuccessResponse({
      coupons: activeCoupons,
      total: activeCoupons.length,
      query: validatedQuery,
    })

  } catch (error: any) {
    console.error('Coupons API error:', error)
    
    if (error.name === 'ZodError') {
      return createErrorResponse(
        `バリデーションエラー: ${error.errors.map((e: any) => e.message).join(', ')}`,
        400,
        'VALIDATION_ERROR'
      )
    }

    return createErrorResponse(
      'サーバーエラーが発生しました',
      500,
      'INTERNAL_ERROR'
    )
  }
}