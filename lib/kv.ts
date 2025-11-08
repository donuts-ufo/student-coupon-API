import { kv } from '@vercel/kv'
import type { Coupon } from './validations'

// KVキャッシュ管理
const CACHE_TTL = 300 // 5分

export const cache = {
  // クーポン一覧キャッシュ
  async getCoupons(queryHash: string): Promise<Coupon[] | null> {
    try {
      const cached = await kv.get(`coupons:${queryHash}`)
      return cached as Coupon[] | null
    } catch (error) {
      console.error('KV cache get error:', error)
      return null
    }
  },

  async setCoupons(queryHash: string, coupons: Coupon[]): Promise<void> {
    try {
      await kv.setex(`coupons:${queryHash}`, CACHE_TTL, coupons)
    } catch (error) {
      console.error('KV cache set error:', error)
    }
  },

  // 単一クーポンキャッシュ
  async getCoupon(id: string): Promise<Coupon | null> {
    try {
      const cached = await kv.get(`coupon:${id}`)
      return cached as Coupon | null
    } catch (error) {
      console.error('KV cache get error:', error)
      return null
    }
  },

  async setCoupon(id: string, coupon: Coupon): Promise<void> {
    try {
      await kv.setex(`coupon:${id}`, CACHE_TTL, coupon)
    } catch (error) {
      console.error('KV cache set error:', error)
    }
  },

  // API使用量キャッシュ（月次リセット）
  async getApiUsage(apiKeyId: string): Promise<number> {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
      const usage = await kv.get(`usage:${apiKeyId}:${currentMonth}`)
      return (usage as number) || 0
    } catch (error) {
      console.error('KV usage get error:', error)
      return 0
    }
  },

  async incrementApiUsage(apiKeyId: string): Promise<number> {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
      const key = `usage:${apiKeyId}:${currentMonth}`
      const newCount = await kv.incr(key)
      
      // 月末まで有効期限を設定
      const nextMonth = new Date()
      nextMonth.setMonth(nextMonth.getMonth() + 1, 1)
      nextMonth.setHours(0, 0, 0, 0)
      const ttl = Math.floor((nextMonth.getTime() - Date.now()) / 1000)
      
      await kv.expire(key, ttl)
      return newCount
    } catch (error) {
      console.error('KV usage increment error:', error)
      return 1
    }
  },

  // キャッシュ無効化
  async invalidateCouponsCache(): Promise<void> {
    try {
      // パターンマッチングでクーポンキャッシュを削除
      const pattern = 'coupons:*'
      const keys = await kv.keys(pattern)
      if (keys.length > 0) {
        await kv.del(...keys)
      }
    } catch (error) {
      console.error('KV cache invalidation error:', error)
    }
  },

  async invalidateCouponCache(id: string): Promise<void> {
    try {
      await kv.del(`coupon:${id}`)
    } catch (error) {
      console.error('KV cache invalidation error:', error)
    }
  },
}

// クエリハッシュ生成ユーティリティ
export function generateQueryHash(params: Record<string, any>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((result, key) => {
      if (params[key] !== undefined) {
        result[key] = params[key]
      }
      return result
    }, {} as Record<string, any>)
  
  return Buffer.from(JSON.stringify(sortedParams)).toString('base64')
}