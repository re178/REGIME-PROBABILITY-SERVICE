const express = require('express');
const config = require('./config');
const { fetchCandles, submitEvidence } = require('./rts-client');
const { detectRegime } = require('./regime');
const { buildEvidence } = require('./evidence');

const app = express();
const { SYMBOL, SERVICE_NAME, POLL_INTERVAL_MS, PORT } = config;

let lastCandleTime = 0;
let eventCounter = 0;
let isProcessing = false;

async function pollRegime() {
  if (isProcessing) return;
  isProcessing = true;

  try {
    const m5 = await fetchCandles(SYMBOL, 'M5', 300);
    if (!m5 || m5.length === 0) { isProcessing = false; return; }

    const latest = m5[m5.length - 1];
    const currentTime = latest.time || latest.timestamp;
    if (currentTime === lastCandleTime) { isProcessing = false; return; }
    lastCandleTime = currentTime;

    const [m15, h1] = await Promise.all([
      fetchCandles(SYMBOL, 'M15', 200),
      fetchCandles(SYMBOL, 'H1', 100),
    ]);

    const start = performance.now();
    const result = detectRegime(m5, m15, h1);
    const processingTime = Math.round(performance.now() - start);

    const evidence = buildEvidence({
      serviceName: SERVICE_NAME,
      eventId: `${SERVICE_NAME}_${++eventCounter}_${Date.now()}`,
      symbol: SYMBOL,
      evidenceType: 'regime_detection',
      summary: result.summary,
      confidence: result.confidence,
      uncertainty: result.uncertainty,
      historicalReliability: 0.78,
      supportingData: {
        regime: result.regime,
        trendScore: result.trendScore,
        volatility: result.volatility,
        rangeScore: result.rangeScore,
      },
      conflictingData: {},
      applicableMarketRegime: result.regime,
      probabilityDistribution: result.probabilities,
      failureConditions: ['insufficient_data'],
      expectedValidityDuration: 300,
      processingTime,
    });

    await submitEvidence(evidence);
    console.log(`[${SERVICE_NAME}] ✅ New regime: ${result.regime} | Conf: ${(result.confidence*100).toFixed(0)}%`);

  } catch (error) {
    console.error(`[${SERVICE_NAME}] ❌ Error:`, error.message);
  } finally {
    isProcessing = false;
  }
}

setInterval(pollRegime, POLL_INTERVAL_MS);

app.get('/health', (req, res) => res.send('OK'));
app.get('/status', (req, res) => res.json({ service: SERVICE_NAME, symbol: SYMBOL }));

app.listen(PORT, () => {
  console.log(`[${SERVICE_NAME}] 🚀 Running on port ${PORT}, checking new M5 candles every ${POLL_INTERVAL_MS}ms`);
  setTimeout(pollRegime, 1000);
});
