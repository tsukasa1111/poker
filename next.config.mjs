/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // 環境変数の設定を修正
  env: {
    // クライアント側では PASSWORD_PEPPER は使用しない
    // サーバーサイドでのみ process.env.PASSWORD_PEPPER を使用
  },
  // APIルートのタイムアウトを延長
  api: {
    responseLimit: false,
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
}

export default nextConfig
