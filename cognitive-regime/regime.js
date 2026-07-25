/**
 * REGIME & PROBABILITY ANALYZER
 * Classifies: strong_trend, weak_trend, ranging, volatile, quiet.
 * Outputs a full probability distribution.
 */
function detectRegime(m5Candles, m15Candles, h1Candles) {
  // 1. Trend strength (ADX-like using directional movement)
  const trendScore = calculateTrendScore(m5Candles);
  
  // 2. Volatility (normalized ATR)
  const volatility = calculateVolatility(m5Candles);
  
  // 3. Range-bound score (how much price stays inside a channel)
  const rangeScore = calculateRangeScore(m15Candles);
  
  // 4. Classify
  let regime = 'neutral';
  let confidence = 0.5;
  let probabilities = { trending: 0.25, ranging: 0.25, volatile: 0.25, quiet: 0.25 };

  if (trendScore > 0.65 && volatility > 0.004) {
    regime = 'strong_trend';
    confidence = 0.85;
    probabilities = { trending: 0.80, ranging: 0.10, volatile: 0.08, quiet: 0.02 };
  } else if (trendScore > 0.45 && volatility > 0.003) {
    regime = 'weak_trend';
    confidence = 0.65;
    probabilities = { trending: 0.60, ranging: 0.20, volatile: 0.15, quiet: 0.05 };
  } else if (rangeScore > 0.7 && volatility < 0.004) {
    regime = 'ranging';
    confidence = 0.75;
    probabilities = { trending: 0.10, ranging: 0.75, volatile: 0.10, quiet: 0.05 };
  } else if (volatility > 0.012) {
    regime = 'volatile';
    confidence = 0.70;
    probabilities = { trending: 0.20, ranging: 0.15, volatile: 0.60, quiet: 0.05 };
  } else if (volatility < 0.002) {
    regime = 'quiet';
    confidence = 0.60;
    probabilities = { trending: 0.10, ranging: 0.20, volatile: 0.05, quiet: 0.65 };
  }

  return {
    regime,
    confidence,
    uncertainty: 1 - confidence,
    trendScore,
    volatility,
    rangeScore,
    probabilities,
    summary: `Regime: ${regime} (conf: ${(confidence*100).toFixed(0)}%)`,
  };
}

function calculateTrendScore(candles) {
  if (!candles || candles.length < 30) return 0.5;
  const closes = candles.map(c => c.close);
  const sma20 = closes.slice(-20).reduce((a,b) => a+b, 0) / 20;
  const sma50 = closes.slice(-50).reduce((a,b) => a+b, 0) / 50;
  return Math.min(1, Math.abs(sma20 / (sma50 || 0.0001) - 1) * 25);
}

function calculateVolatility(candles) {
  if (!candles || candles.length < 20) return 0.005;
  const ranges = candles.slice(-20).map(c => c.high - c.low);
  const atr = ranges.reduce((a,b) => a+b, 0) / ranges.length;
  const avgPrice = candles.slice(-20).reduce((a,b) => a + b.close, 0) / 20;
  return atr / (avgPrice || 0.0001);
}

function calculateRangeScore(candles) {
  if (!candles || candles.length < 30) return 0.5;
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  const range = Math.max(...highs) - Math.min(...lows);
  const avgBody = candles.slice(-30).reduce((s, c) => s + Math.abs(c.close - c.open), 0) / 30;
  return Math.min(1, range / (avgBody * 8 + 0.0001));
}

module.exports = { detectRegime };
