# student-coupon-API

# 学割クーポン・プラットフォーム

企業が学生向けクーポンを提供し、学生アプリが API 経由でクーポンを取得・引き換えできるプラットフォームです。

## 技術スタック

- **フロントエンド**: Next.js 14 (App Router), React Server Components, Tailwind CSS, shadcn/ui
- **バックエンド**: Next.js API Routes (Edge Functions)
- **データベース**: Airtable REST API
- **キャッシュ**: Vercel KV
- **課金**: Stripe (使用量ベース)
- **認証**: NextAuth.js (Magic Link)

## 主要機能

### 企業向け機能
- セルフ登録 & Magic Link認証
- クーポンの作成・編集・削除
- API使用量・KPI確認
- Stripe決済でのプラン管理

### 学生アプリ向け API
- クーポン一覧取得（カテゴリ・地域でフィルタ）
- 単一クーポン詳細取得
- クーポン引き換え機能

## 5分デプロイ手順（Vercel）

### 1. 前提条件
- Node.js 18+ がインストール済み
- Vercel アカウント
- Airtable アカウント
- Stripe アカウント

### 2. Airtable セットアップ
1. Airtable で新しい Base を作成
2. 以下のテーブルを作成：

**Companies テーブル**
```
id (Single line text, Primary field)
name (Single line text)
logoUrl (URL)
industry (Single line text)
stripeCustomerId (Single line text)
email (Email)
```

**Coupons テーブル**
```
id (Single line text, Primary field)
companyId (Single line text)
title (Single line text)
description (Long text)
category (Single line text)
startDate (Date & time)
endDate (Date & time)
region (Single line text)
codeType (Single select: URL, CODE, QR)
codePayload (Single line text)
```

**ApiKeys テーブル**
```
id (Single line text, Primary field)
companyId (Single line text)
tier (Single select: FREE, PRO, ENTERPRISE)
key (Single line text)
monthlyQuota (Number)
```

**RedeemLogs テーブル**
```
id (Single line text, Primary field)
couponId (Single line text)
studentAppId (Single line text)
timestamp (Date & time)
metaJson (Long text)
```

3. API トークンを生成してメモ

### 3. Stripe セットアップ
1. Stripe ダッシュボードで価格設定を作成
2. Webhook エンドポイントを設定：`your-domain.com/api/stripe/webhook`
3. 必要なイベントを選択：
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`

### 4. プロジェクトのデプロイ

```bash
# リポジトリをクローン
git clone <this-repository>
cd student-coupon-platform

# 依存関係をインストール
npm install

# Vercel CLI をインストール（未インストールの場合）
npm i -g vercel

# Vercel にデプロイ
vercel

# 環境変数を設定
vercel env add AIRTABLE_TOKEN
vercel env add AIRTABLE_BASE_ID
vercel env add STRIPE_SECRET_KEY
vercel env add STRIPE_WEBHOOK_SECRET
vercel env add NEXTAUTH_SECRET
vercel env add NEXTAUTH_URL
vercel env add KV_URL
vercel env add KV_REST_API_URL
vercel env add KV_REST_API_TOKEN
vercel env add KV_REST_API_READ_ONLY_TOKEN

# 再デプロイ
vercel --prod
```

### 5. 環境変数の設定値

```bash
AIRTABLE_TOKEN=your_airtable_personal_access_token
AIRTABLE_BASE_ID=your_airtable_base_id
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXTAUTH_SECRET=your_random_secret_string
NEXTAUTH_URL=https://your-domain.vercel.app
KV_URL=redis://...  # Vercel KV から取得
KV_REST_API_URL=https://...  # Vercel KV から取得
KV_REST_API_TOKEN=...  # Vercel KV から取得
KV_REST_API_READ_ONLY_TOKEN=...  # Vercel KV から取得
```

## API 使用例

### cURL サンプル

```bash
# クーポン一覧取得
curl -X GET "https://your-domain.com/api/v1/coupons?category=食事・飲料&region=関東&limit=10" \
  -H "x-api-key: your_api_key"

# 単一クーポン取得
curl -X GET "https://your-domain.com/api/v1/coupons/rec123abc" \
  -H "x-api-key: your_api_key"

# クーポン引き換え
curl -X POST "https://your-domain.com/api/v1/redeem" \
  -H "Content-Type: application/json" \
  -H "x-api-key: your_api_key" \
  -d '{
    "couponId": "rec123abc",
    "studentAppId": "student_app_12345"
  }'

# 企業登録
curl -X POST "https://your-domain.com/api/v1/companies" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "サンプル株式会社",
    "email": "contact@example.com",
    "industry": "IT・テクノロジー"
  }'
```

### React Hook 使用例

```tsx
import { useCoupons } from './lib/hooks/use-coupons'

function CouponList() {
  const { coupons, loading, error, redeem } = useCoupons({
    apiKey: 'your-api-key',
    category: '食事・飲料',
    region: '関東',
    limit: 10,
  })

  if (loading) return <div>読み込み中...</div>
  if (error) return <div>エラー: {error}</div>

  const handleRedeem = async (couponId: string) => {
    try {
      const result = await redeem(couponId, 'student-app-id')
      console.log('引き換え成功:', result)
      alert(`クーポンコード: ${result.coupon.codePayload}`)
    } catch (error) {
      alert('引き換えに失敗しました')
    }
  }

  return (
    <div className="grid gap-4">
      {coupons.map(coupon => (
        <div key={coupon.id} className="p-4 border rounded-lg">
          <h3 className="text-lg font-bold">{coupon.title}</h3>
          <p className="text-gray-600">{coupon.description}</p>
          <div className="mt-2 text-sm text-gray-500">
            <span className="mr-4">📍 {coupon.region}</span>
            <span>🏷️ {coupon.category}</span>
          </div>
          <button 
            onClick={() => handleRedeem(coupon.id)}
            className="mt-3 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            引き換え
          </button>
        </div>
      ))}
    </div>
  )
}
```

## 開発・テスト

```bash
# 開発サーバー起動
npm run dev

# テスト実行
npm test

# E2E テスト
npm run test:e2e

# Lint & Format
npm run lint
```

## API ドキュメント

デプロイ後、以下の URL で API ドキュメントを確認できます：
- https://your-domain.com/docs

## プラン・料金

| プラン | 月間 API 呼び出し数 | 料金 |
|--------|-------------------|------|
| Free | 1,000回 | 無料 |
| Pro | 10,000回 | $29/月 |
| Enterprise | 100,000回 | $99/月 |

## ライセンス

MIT License

## サポート

問い合わせ: support@student-coupon-platform.com
