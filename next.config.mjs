const basePath = process.env.BASE_PATH || ''

/** @type {import('next').NextConfig} */
const config = {
  output: 'export',
  basePath,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  images: { unoptimized: true },
}

export default config
