import { NextRequest } from 'next/server'
import { companies } from '@/lib/airtable'
import { MagicLinkRequestSchema } from '@/lib/validations'
import {
  createErrorResponse,
  createSuccessResponse,
  generateMagicToken,
  corsHeaders,
} from '@/lib/utils'

export const runtime = 'edge'

export async function POST(request: NextRequest) {
  try {
    // CORS対応
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: corsHeaders })
    }

    // リクエストボディ解析
    const body = await request.json()
    const { email } = MagicLinkRequestSchema.parse(body)

    // 企業存在確認
    const company = await companies.findByEmail(email)
    if (!company) {
      return createErrorResponse(
        'このメールアドレスは登録されていません',
        404,
        'COMPANY_NOT_FOUND'
      )
    }

    // Magic Link トークン生成
    const magicToken = generateMagicToken()
    
    // TODO: トークンをKVに一時保存（15分有効）
    // await cache.setMagicToken(magicToken, email, 15 * 60)
    
    // TODO: Magic Link メール送信処理
    // await sendMagicLinkEmail(email, magicToken)
    
    // 開発環境では直接URLを返す
    const magicLinkUrl = `${process.env.NEXTAUTH_URL}/auth/magic?token=${magicToken}&email=${encodeURIComponent(email)}`

    return createSuccessResponse({
      message: 'Magic Linkを送信しました。メールをご確認ください。',
      magicLinkUrl, // 本番環境では削除
      expiresIn: '15分',
    })

  } catch (error: any) {
    console.error('Magic link generation error:', error)
    
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