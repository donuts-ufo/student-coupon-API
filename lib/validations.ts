import { z } from 'zod'

// Airtableスキーマ対応のZodバリデーション

export const CompanySchema = z.object({
  id: z.string(),
  name: z.string().min(1, '企業名は必須です'),
  logoUrl: z.string().url().optional(),
  industry: z.string().min(1, '業界は必須です'),
  stripeCustomerId: z.string().optional(),
})

export const CouponSchema = z.object({
  id: z.string(),
  companyId: z.string(),
  title: z.string().min(1, 'タイトルは必須です'),
  description: z.string().min(1, '説明は必須です'),
  category: z.enum(['食べ物', 'ファッション', 'エンタメ', 'IT・ソフトウェア', 'その他']),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  region: z.enum(['東京', '大阪', '名古屋', '福岡', '全国']),
  codeType: z.enum(['STATIC', 'DYNAMIC', 'REDIRECT']),
  codePayload: z.string().min(1, 'コード内容は必須です'),
})

export const ApiKeySchema = z.object({
  id: z.string(),
  companyId: z.string(),
  tier: z.enum(['FREE', 'BASIC', 'PRO']),
  key: z.string(),
  monthlyQuota: z.number().int().positive(),
})

export const RedeemLogSchema = z.object({
  couponId: z.string(),
  studentAppId: z.string(),
  timestamp: z.string().datetime(),
  metaJson: z.string().optional(),
})

// API リクエスト用スキーマ
export const CouponQuerySchema = z.object({
  category: z.string().optional(),
  region: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

export const RedeemRequestSchema = z.object({
  couponId: z.string().min(1, 'クーポンIDは必須です'),
  studentAppId: z.string().min(1, '学生アプリIDは必須です'),
})

export const CompanyRegistrationSchema = z.object({
  name: z.string().min(1, '企業名は必須です'),
  email: z.string().email('有効なメールアドレスを入力してください'),
  industry: z.string().min(1, '業界は必須です'),
})

export const MagicLinkRequestSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
})

// 型エクスポート
export type Company = z.infer<typeof CompanySchema>
export type Coupon = z.infer<typeof CouponSchema>
export type ApiKey = z.infer<typeof ApiKeySchema>
export type RedeemLog = z.infer<typeof RedeemLogSchema>
export type CouponQuery = z.infer<typeof CouponQuerySchema>
export type RedeemRequest = z.infer<typeof RedeemRequestSchema>
export type CompanyRegistration = z.infer<typeof CompanyRegistrationSchema>
export type MagicLinkRequest = z.infer<typeof MagicLinkRequestSchema>