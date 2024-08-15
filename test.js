import { run } from './dist/index.js'

run().catch(error => {
  console.error('Error occurred:', error)
  process.exit(1)
})