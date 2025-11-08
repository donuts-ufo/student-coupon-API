import { NextRequest } from 'next/server'
import { coupons, apiKeys, redeemLogs } from '@/lib/airtable'
import { cache } from '@/lib/kv'
import { RedeemRequestSchema } from '@/lib/validations'
import {
  createErrorResponse,
  createSuccessResponse,
  extractApiKey,
  isRateLimited,
  getClientIP,
  corsHeaders,
} from '@/lib/utils'

export const runtime = 'edge'

export async function POST(request: NextRequest) {
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

    // リクエストボディ解析
    const body = await request.json()
    const { couponId, studentAppId } = RedeemRequestSchema.parse(body)

    // クーポン存在確認
    const coupon = await coupons.findById(couponId)
    if (!coupon) {
      return createErrorResponse(
        'クーポンが見つかりません',
        404,
        'COUPON_NOT_FOUND'
      )
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

    // 重複利用チェック（簡易版）
    const existingLogs = await redeemLogs.findByCouponId(couponId)
    const alreadyRedeemed = existingLogs.some(log => 
      log.studentAppId === studentAppId
    )

    if (alreadyRedeemed) {
      return createErrorResponse(
        'このクーポンは既に利用済みです',
        400,
        'ALREADY_REDEEMED'
      )
    }

    // 利用ログ記録
    const clientIP = getClientIP(request)
    const logData = {
      couponId,
      studentAppId,
      timestamp: new Date().toISOString(),
      metaJson: JSON.stringify({
        ip: clientIP,
        userAgent: request.headers.get('user-agent'),
        apiKeyId: keyData.id,
      }),
    }

    await redeemLogs.create(logData)

    // 使用量カウントアップ
    await cache.incrementApiUsage(keyData.id)

    // レスポンス生成（クーポンタイプに応じて）
    let responseData: any = {
      couponId,
      studentAppId,
      redeemedAt: logData.timestamp,
      coupon: {
        title: coupon.title,
        description: coupon.description,
        category: coupon.category,
      },
    }

    switch (coupon.codeType) {
      case 'STATIC':
        responseData.code = coupon.codePayload
        responseData.type = 'static_code'
        break
      
      case 'DYNAMIC':
        // 動的コード生成（実装例：タイムスタンプベース）
        const dynamicCode = `${coupon.codePayload}-${Date.now().toString(36)}`
        responseData.code = dynamicCode
        responseData.type = 'dynamic_code'
        break
      
      case 'REDIRECT':
        responseData.redirectUrl = coupon.codePayload
        responseData.type = 'redirect'
        break
      
      default:
        return createErrorResponse(
          '不正なクーポンタイプです',
          400,
          'INVALID_COUPON_TYPE'
        )
    }

    return createSuccessResponse(responseData, 201)

  } catch (error: any) {
    console.error('Redeem API error:', error)
    
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