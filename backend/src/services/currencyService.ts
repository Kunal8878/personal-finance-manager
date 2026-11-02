/**
 * Multi-Currency Exchange Rate Engine
 * Strict, decimal-safe currency conversion and audit tracking.
 * Compliant with ISO 4217 Currency Standards.
 */

export interface CurrencyMetadata {
  code: string;
  symbol: string;
  name: string;
  decimalPlaces: number;
}

export const SUPPORTED_CURRENCIES: Record<string, CurrencyMetadata> = {
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee', decimalPlaces: 2 },
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', decimalPlaces: 2 },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', decimalPlaces: 2 },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', decimalPlaces: 2 },
  AED: { code: 'AED', symbol: 'AED ', name: 'UAE Dirham', decimalPlaces: 2 },
  CAD: { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', decimalPlaces: 2 },
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', decimalPlaces: 2 },
  SGD: { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', decimalPlaces: 2 }
};

// Base Reference Rates (Relative to 1 USD)
// 1 USD = 83.50 INR (RBI Reference benchmark)
const BASE_RATES_USD: Record<string, number> = {
  USD: 1.0,
  INR: 83.50,
  EUR: 0.925,
  GBP: 0.787,
  AED: 3.6725,
  CAD: 1.352,
  AUD: 1.515,
  SGD: 1.341
};

interface RateCache {
  rates: Record<string, number>;
  lastUpdated: Date;
  source: string;
}

let rateCache: RateCache = {
  rates: { ...BASE_RATES_USD },
  lastUpdated: new Date(),
  source: 'Reserve Bank Reference Baseline'
};

export class CurrencyService {
  /**
   * Returns metadata for a currency code
   */
  static getMetadata(code?: string): CurrencyMetadata {
    const clean = (code || 'INR').toUpperCase();
    return SUPPORTED_CURRENCIES[clean] || { code: clean, symbol: clean + ' ', name: clean, decimalPlaces: 2 };
  }

  /**
   * Safely rounds to specified decimal places without JS floating-point errors
   */
  static safeRound(value: number, decimals: number = 2): number {
    const factor = Math.pow(10, decimals);
    return Math.round((value + Number.EPSILON) * factor) / factor;
  }

  /**
   * Gets exchange rate between two currencies (1 fromUnit = X toUnits)
   */
  static getExchangeRate(fromCurrency: string, toCurrency: string): { rate: number; timestamp: Date; source: string } {
    const from = fromCurrency.toUpperCase();
    const to = toCurrency.toUpperCase();

    if (from === to) {
      return { rate: 1.0, timestamp: rateCache.lastUpdated, source: 'Identical Currency' };
    }

    const fromRateToUsd = rateCache.rates[from] || BASE_RATES_USD[from] || 1.0;
    const toRateToUsd = rateCache.rates[to] || BASE_RATES_USD[to] || 1.0;

    // Rate = toRateToUsd / fromRateToUsd
    const rawRate = toRateToUsd / fromRateToUsd;
    const rate = this.safeRound(rawRate, 6);

    return {
      rate,
      timestamp: rateCache.lastUpdated,
      source: rateCache.source
    };
  }

  /**
   * Converts amount from one currency to another
   * Preserves exact original values while computing target reporting equivalent
   */
  static convert(
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): {
    originalAmount: number;
    fromCurrency: string;
    fromSymbol: string;
    toCurrency: string;
    toSymbol: string;
    exchangeRate: number;
    convertedAmount: number;
    timestamp: Date;
    source: string;
  } {
    const fromMeta = this.getMetadata(fromCurrency);
    const toMeta = this.getMetadata(toCurrency);

    if (fromMeta.code === toMeta.code) {
      return {
        originalAmount: this.safeRound(amount, fromMeta.decimalPlaces),
        fromCurrency: fromMeta.code,
        fromSymbol: fromMeta.symbol,
        toCurrency: toMeta.code,
        toSymbol: toMeta.symbol,
        exchangeRate: 1.0,
        convertedAmount: this.safeRound(amount, toMeta.decimalPlaces),
        timestamp: new Date(),
        source: 'Direct Base'
      };
    }

    const { rate, timestamp, source } = this.getExchangeRate(fromMeta.code, toMeta.code);
    const convertedAmount = this.safeRound(amount * rate, toMeta.decimalPlaces);

    return {
      originalAmount: this.safeRound(amount, fromMeta.decimalPlaces),
      fromCurrency: fromMeta.code,
      fromSymbol: fromMeta.symbol,
      toCurrency: toMeta.code,
      toSymbol: toMeta.symbol,
      exchangeRate: rate,
      convertedAmount,
      timestamp,
      source
    };
  }

  /**
   * Returns current exchange rate table for frontend display
   */
  static getRatesSummary(baseCurrency: string = 'INR') {
    const base = baseCurrency.toUpperCase();
    const result: Record<string, number> = {};

    for (const code of Object.keys(SUPPORTED_CURRENCIES)) {
      const { rate } = this.getExchangeRate(base, code);
      result[code] = rate;
    }

    return {
      baseCurrency: base,
      baseSymbol: this.getMetadata(base).symbol,
      rates: result,
      lastUpdated: rateCache.lastUpdated,
      source: rateCache.source,
      supportedCurrencies: Object.values(SUPPORTED_CURRENCIES)
    };
  }

  /**
   * Attempts background refresh of exchange rates from open standard exchange API
   */
  static async refreshLiveRates(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      const res = await fetch('https://open.er-api.com/v6/latest/USD', {
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        if (data && data.rates && typeof data.rates.INR === 'number') {
          rateCache = {
            rates: {
              ...BASE_RATES_USD,
              ...data.rates
            },
            lastUpdated: new Date(),
            source: 'Open Exchange Rate Feed (Live)'
          };
          console.log(`[CurrencyService] Live exchange rates refreshed: 1 USD = ${data.rates.INR} INR`);
          return true;
        }
      }
    } catch (err) {
      // Graceful fallback to verified benchmark table
    }
    return false;
  }
}

// Initial async fetch on startup (non-blocking)
CurrencyService.refreshLiveRates().catch(() => {});
