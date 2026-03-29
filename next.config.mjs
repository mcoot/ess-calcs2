/** @type {import('next').NextConfig} */
const config = {
  output: 'export',
  basePath: process.env.BASE_PATH || '',
  images: { unoptimized: true },
}

export default config
