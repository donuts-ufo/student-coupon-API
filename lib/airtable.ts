import Airtable from 'airtable'
import type { Company, Coupon, ApiKey, RedeemLog } from './validations'

// Airtable設定
const base = new Airtable({
  apiKey: process.env.AIRTABLE_TOKEN,
}).base(process.env.AIRTABLE_BASE_ID!)

// テーブル名定数
const TABLES = {
  COMPANIES: 'Companies',
  COUPONS: 'Coupons',
  API_KEYS: 'ApiKeys',
  REDEEM_LOGS: 'RedeemLogs',
} as const

// Airtableレコード変換ヘルパー
function mapRecord<T>(record: any): T & { id: string } {
  return {
    id: record.id,
    ...record.fields,
  }
}

// 企業関連
export const companies = {
  async create(data: Omit<Company, 'id'>): Promise<Company> {
    const records = await base(TABLES.COMPANIES).create([
      { fields: data }
    ])
    return mapRecord<Company>(records[0])
  },

  async findById(id: string): Promise<Company | null> {
    try {
      const record = await base(TABLES.COMPANIES).find(id)
      return mapRecord<Company>(record)
    } catch (error) {
      return null
    }
  },

  async findByEmail(email: string): Promise<Company | null> {
    const records = await base(TABLES.COMPANIES)
      .select({
        filterByFormula: `{email} = "${email}"`,
        maxRecords: 1,
      })
      .firstPage()
    
    return records.length > 0 ? mapRecord<Company>(records[0]) : null
  },

  async update(id: string, data: Partial<Company>): Promise<Company> {
    const records = await base(TABLES.COMPANIES).update([
      { id, fields: data }
    ])
    return mapRecord<Company>(records[0])
  },
}

// クーポン関連
export const coupons = {
  async findAll(filters?: {
    category?: string
    region?: string
    limit?: number
  }): Promise<Coupon[]> {
    let formula = 'TRUE()'
    
    if (filters?.category) {
      formula += ` AND {category} = "${filters.category}"`
    }
    if (filters?.region && filters.region !== '全国') {
      formula += ` AND ({region} = "${filters.region}" OR {region} = "全国")`
    }

    const records = await base(TABLES.COUPONS)
      .select({
        filterByFormula: formula,
        maxRecords: filters?.limit || 100,
        sort: [{ field: 'startDate', direction: 'desc' }],
      })
      .all()

    return records.map(record => mapRecord<Coupon>(record))
  },

  async findById(id: string): Promise<Coupon | null> {
    try {
      const record = await base(TABLES.COUPONS).find(id)
      return mapRecord<Coupon>(record)
    } catch (error) {
      return null
    }
  },

  async findByCompanyId(companyId: string): Promise<Coupon[]> {
    const records = await base(TABLES.COUPONS)
      .select({
        filterByFormula: `{companyId} = "${companyId}"`,
        sort: [{ field: 'startDate', direction: 'desc' }],
      })
      .all()

    return records.map(record => mapRecord<Coupon>(record))
  },

  async create(data: Omit<Coupon, 'id'>): Promise<Coupon> {
    const records = await base(TABLES.COUPONS).create([
      { fields: data }
    ])
    return mapRecord<Coupon>(records[0])
  },

  async update(id: string, data: Partial<Coupon>): Promise<Coupon> {
    const records = await base(TABLES.COUPONS).update([
      { id, fields: data }
    ])
    return mapRecord<Coupon>(records[0])
  },

  async delete(id: string): Promise<void> {
    await base(TABLES.COUPONS).destroy([id])
  },
}

// APIキー関連
export const apiKeys = {
  async findByKey(key: string): Promise<ApiKey | null> {
    const records = await base(TABLES.API_KEYS)
      .select({
        filterByFormula: `{key} = "${key}"`,
        maxRecords: 1,
      })
      .firstPage()
    
    return records.length > 0 ? mapRecord<ApiKey>(records[0]) : null
  },

  async findByCompanyId(companyId: string): Promise<ApiKey | null> {
    const records = await base(TABLES.API_KEYS)
      .select({
        filterByFormula: `{companyId} = "${companyId}"`,
        maxRecords: 1,
      })
      .firstPage()
    
    return records.length > 0 ? mapRecord<ApiKey>(records[0]) : null
  },

  async create(data: Omit<ApiKey, 'id'>): Promise<ApiKey> {
    const records = await base(TABLES.API_KEYS).create([
      { fields: data }
    ])
    return mapRecord<ApiKey>(records[0])
  },

  async update(id: string, data: Partial<ApiKey>): Promise<ApiKey> {
    const records = await base(TABLES.API_KEYS).update([
      { id, fields: data }
    ])
    return mapRecord<ApiKey>(records[0])
  },
}

// 利用ログ関連
export const redeemLogs = {
  async create(data: RedeemLog): Promise<RedeemLog> {
    const records = await base(TABLES.REDEEM_LOGS).create([
      { fields: data }
    ])
    return mapRecord<RedeemLog>(records[0])
  },

  async findByCouponId(couponId: string): Promise<RedeemLog[]> {
    const records = await base(TABLES.REDEEM_LOGS)
      .select({
        filterByFormula: `{couponId} = "${couponId}"`,
        sort: [{ field: 'timestamp', direction: 'desc' }],
      })
      .all()

    return records.map(record => mapRecord<RedeemLog>(record))
  },

  async countByCompanyId(companyId: string): Promise<{
    totalViews: number
    totalRedeems: number
    cvr: number
  }> {
    // 企業のクーポン一覧を取得
    const companyCoupons = await coupons.findByCompanyId(companyId)
    const couponIds = companyCoupons.map(c => c.id)

    if (couponIds.length === 0) {
      return { totalViews: 0, totalRedeems: 0, cvr: 0 }
    }

    // 各クーポンのログを集計
    let totalRedeems = 0
    for (const couponId of couponIds) {
      const logs = await this.findByCouponId(couponId)
      totalRedeems += logs.length
    }

    // ビュー数は実装上、リダイレクト数と同等として扱う
    const totalViews = totalRedeems
    const cvr = totalViews > 0 ? (totalRedeems / totalViews) * 100 : 0

    return {
      totalViews,
      totalRedeems,
      cvr: parseFloat(cvr.toFixed(2)),
    }
  },
}