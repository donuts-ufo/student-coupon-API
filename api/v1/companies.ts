import { NextRequest } from 'next/server'
import { companies, apiKeys } from '@/lib/airtable'
import { CompanyRegistrationSchema } from '@/lib/validations'
import {
  createErrorResponse,
  createSuccessResponse,
  generateApiKey,
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
    const { name, email, industry } = CompanyRegistrationSchema.parse(body)

    // 既存企業チェック
    const existingCompany = await companies.findByEmail(email)
    if (existingCompany) {
      return createErrorResponse(
        'このメールアドレスは既に登録済みです',
        409,
        'EMAIL_ALREADY_EXISTS'
      )
    }

    // 企業情報作成
    const newCompany = await companies.create({
      name,
      email,
      industry,
      logoUrl: '',
      stripeCustomerId: '',
    })

    // 初期APIキー生成（FREEプラン）
    const apiKeyValue = generateApiKey()
    await apiKeys.create({
      companyId: newCompany.id,
      tier: 'FREE',
      key: apiKeyValue,
      monthlyQuota: 100, // FREEプランは月100リクエスト
    })

    // Magic Link トークン生成
    const magicToken = generateMagicToken()
    
    // TODO: Magic Link メール送信処理
    // await sendMagicLinkEmail(email, magicToken)
    
    // 開発環境では直接URLを返す
    const magicLinkUrl = `${process.env.NEXTAUTH_URL}/auth/magic?token=${magicToken}&email=${encodeURIComponent(email)}`

    return createSuccessResponse({
      company: {
        id: newCompany.id,
        name: newCompany.name,
        email: newCompany.email,
        industry: newCompany.industry,
      },
      apiKey: apiKeyValue,
      magicLinkUrl, // 本番環境では削除
      message: 'アカウントが作成されました。メールに送信されたMagic Linkからログインしてください。',
    }, 201)

  } catch (error: any) {
    console.error('Company registration error:', error)
    
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