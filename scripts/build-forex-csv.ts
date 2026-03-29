import fs from 'node:fs'
import path from 'node:path'
import { cleanRbaCsv } from './rba-csv-cleaner'

const args = process.argv.slice(2)
if (args.length === 0) {
  console.error('Usage: npx tsx scripts/build-forex-csv.ts <input-files...>')
  process.exit(1)
}

const rawTexts = args.map((f) => fs.readFileSync(f, 'utf-8'))
const output = cleanRbaCsv(rawTexts)

const outPath = path.resolve(__dirname, '../public/rba-forex.csv')
fs.writeFileSync(outPath, output, 'utf-8')
console.log(`Wrote ${output.split('\n').filter((l) => l).length} rows to ${outPath}`)
