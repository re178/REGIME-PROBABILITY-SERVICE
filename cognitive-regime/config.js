require('dotenv').config();
module.exports = {
  RTS_API_URL: process.env.RTS_API_URL || 'https://your-rts-server.com/api/public',
  API_KEY: process.env.RTS_API_KEY,
  API_SECRET: process.env.RTS_API_SECRET,
  SYMBOL: process.env.SYMBOL || 'EURUSD',
  POLL_INTERVAL_MS: parseInt(process.env.POLL_INTERVAL_MS) || 10000,
  SERVICE_NAME: process.env.SERVICE_NAME || 'regime',
  PORT: process.env.PORT || 3002,
};
