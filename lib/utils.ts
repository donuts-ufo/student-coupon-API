import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import crypto from 'crypto'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// APIキー生成
export function generateApiKey(): string {
  return 'sk_' + crypto.randomBytes(32).toString('hex')
}

// Magic Link トークン生成
export function generateMagicToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

// エラーレスポンス生成
export function createErrorResponse(
  message: string,
  statusCode: number = 400,
  code?: string
) {
  return Response.json(
    {
      error: {
        message,
        code: code || 'BAD_REQUEST',
        timestamp: new Date().toISOString(),
      },
    },
    { status: statusCode }
  )
}

// 成功レスポンス生成
export function createSuccessResponse(
  data: any,
  statusCode: number = 200
) {
  return Response.json(
    {
      data,
      timestamp: new Date().toISOString(),
    },
    { status: statusCode }
  )
}

// 日付バリデーション
export function isValidDateRange(startDate: string, endDate: string): boolean {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const now = new Date()

  return start < end && end > now
}

// レート制限チェック
export function isRateLimited(usage: number, quota: number): boolean {
  return usage >= quota
}

// ヘッダーからAPIキー取得
export function extractApiKey(request: Request): string | null {
  return request.headers.get('x-api-key')
}

// CORS設定
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
}

// IPアドレス取得
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const real = request.headers.get('x-real-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  return real || 'unknown'
}