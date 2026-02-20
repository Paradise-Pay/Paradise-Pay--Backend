const path = require('path')
const fs = require('fs')

process.chdir(__dirname)

// Load environment variables
const localEnv = path.join(__dirname, '.env')
const homeEnv = path.join('/home', process.env.USER || 'u284087133', 'paradisepay.env')

if (fs.existsSync(localEnv)) {
  require('dotenv').config({ path: localEnv })
} else if (fs.existsSync(homeEnv)) {
  require('dotenv').config({ path: homeEnv })
}

// Start the Express app
require('./dist/index.js')
