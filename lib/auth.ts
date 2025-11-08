import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { companies } from './airtable'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: 'magic-link',
      name: 'Magic Link',
      credentials: {
        email: { label: 'Email', type: 'email' },
        token: { label: 'Token', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.token) {
          return null
        }

        try {
          // TODO: トークンの検証（KVから取得）
          // const storedEmail = await cache.getMagicToken(credentials.token)
          // if (!storedEmail || storedEmail !== credentials.email) {
          //   return null
          // }

          // 企業情報取得
          const company = await companies.findByEmail(credentials.email)
          if (!company) {
            return null
          }

          return {
            id: company.id,
            email: company.email,
            name: company.name,
            image: company.logoUrl || null,
          }
        } catch (error) {
          console.error('Magic link auth error:', error)
          return null
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.companyId = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (token.companyId) {
        session.user.companyId = token.companyId as string
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  secret: process.env.NEXTAUTH_SECRET,
}

// 型拡張
declare module 'next-auth' {
  interface Session {
    user: {
      companyId: string
      email: string
      name: string
      image?: string
    }
  }

  interface User {
    companyId: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    companyId: string
  }
}