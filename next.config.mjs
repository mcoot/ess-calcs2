/** @type {import('next').NextConfig} */
const config = {
  output: 'export',
  basePath: process.env.BASE_PATH || '',
  images: { unoptimized: true },
}

config.env = { NEXT_PUBLIC_BASE_PATH: config.basePath }

export default config
