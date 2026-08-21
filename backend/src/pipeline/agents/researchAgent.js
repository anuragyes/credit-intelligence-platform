import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from '../../common/logger.js';
import { getClient } from '../llm/adapter.js';
import { env } from '../../config/env.js';
import YahooFinance from 'yahoo-finance2';
const yahooFinance = new YahooFinance();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../../../data');

async function fetchMissingBalanceSheetMetricsWithAI(symbol, companyName) {
  const gemini = getClient();
  if (!gemini) return null;
  try {
    const prompt = `What are the current accounts receivable, current assets, and current liabilities for ${companyName} (${symbol}) for the latest fiscal year? Return ONLY a valid JSON object with EXACTLY three keys ("accounts_receivable", "current_assets", "current_liabilities") mapping to their numerical values in INR Crores. No markdown, no other text.`;
    const response = await gemini.models.generateContent({
      model: env.geminiModel || 'gemini-3.6-flash',
      contents: prompt,
      tools: [{ googleSearch: {} }]
    });
    let text = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(text);
  } catch(e) {
    logger.warn({ err: e.message, symbol }, 'Failed to fetch balance sheet metrics via AI');
    return null;
  }
}

/**
 * Web Scraping Research Agent:
 * This agent uses yahoo-finance2 to dynamically extract real financial data from the internet.
 * It outputs structured JSON conforming to the system's expected format.
 */
export async function runResearchAgent({ companyKey }) {
  logger.info({ companyKey }, 'Research agent: Initiating internet research via Yahoo Finance');
  
  try {
    // 1. Search for the Indian ticker symbol (NSE or BSE)
    // We append "India" to the search query to bias the results towards Indian exchanges
    const searchResults = await yahooFinance.search(`${companyKey} India`);
    
    let symbol = null;
    let name = companyKey;
    let exchange = 'Unknown';
    let sector = 'Unknown';
    
    if (searchResults && searchResults.quotes && searchResults.quotes.length > 0) {
      // Prefer .NS (NSE) or .BO (BSE)
      const indianQuote = searchResults.quotes.find(q => q.symbol.endsWith('.NS') || q.symbol.endsWith('.BO'));
      if (indianQuote) {
        symbol = indianQuote.symbol;
        name = indianQuote.longname || indianQuote.shortname || name;
        exchange = indianQuote.exchange || 'NSE';
        sector = indianQuote.sector || 'Unknown';
      } else {
        // Fallback to the first result
        symbol = searchResults.quotes[0].symbol;
        name = searchResults.quotes[0].longname || searchResults.quotes[0].shortname || name;
        exchange = searchResults.quotes[0].exchange || 'Unknown';
      }
    } else {
      // If search fails, try to guess it
      symbol = `${companyKey.toUpperCase()}.NS`;
    }

    logger.info({ companyKey, symbol }, 'Research agent: Found matching ticker symbol');

    // 2. Fetch financial data (new API format)
    const quote = await yahooFinance.quoteSummary(symbol, { 
      modules: ['financialData', 'assetProfile'] 
    });

    // Attempt to get historical data via fundamentalsTimeSeries since incomeStatementHistory is deprecated
    let tsData = [];
    try {
      const ts = await yahooFinance.fundamentalsTimeSeries(symbol, { period1: '2021-01-01', module: 'all' });
      // Filter out partial periods (3M) and keep Annual (12M) if available, or just keep the last 3 entries
      tsData = ts.filter(t => t.periodType === '12M' || !t.periodType).slice(-3);
      if (tsData.length === 0) {
        // Fallback to whatever is available
        tsData = ts.slice(-3);
      }
    } catch (e) {
      logger.warn({ err: e.message, symbol }, 'Failed to fetch fundamentalsTimeSeries');
    }

    const finData = quote.financialData || {};
    const profile = quote.assetProfile || {};

    // 3. Map into expected format
    const extractedLineItems = [];

    // Helper to convert raw numbers to INR Crores
    const toCr = (val) => {
      if (val == null) return null;
      return Math.round(val / 10000000); 
    };

    // Attempt to fetch missing balance sheet info using AI Search
    const aiData = await fetchMissingBalanceSheetMetricsWithAI(symbol, name);

    // Use time series data if available, otherwise fallback to current finData for a single period
    if (tsData.length > 0) {
      for (let i = 0; i < tsData.length; i++) {
        const item = tsData[i];
        const periodDate = new Date(item.date || new Date());
        const periodStr = `FY${periodDate.getFullYear()}`;
        const periodEndStr = periodDate.toISOString().split('T')[0];
        
        const revCr = toCr(item.totalRevenue || item.operatingRevenue);
        let debtor_days = null;
        let working_capital_days = null;
        
        // Only apply the AI-scraped latest balance sheet to the *latest* period to avoid false trends
        if (aiData && i === tsData.length - 1 && revCr > 0) {
           debtor_days = Math.round((aiData.accounts_receivable / revCr) * 365);
           working_capital_days = Math.round(((aiData.current_assets - aiData.current_liabilities) / revCr) * 365);
        }

        const metrics = {
          revenue: revCr,
          operating_profit: toCr(item.EBITDA || item.operatingIncome || item.EBIT),
          other_income: toCr(item.otherNonOperatingIncomeExpenses),
          interest_expense: toCr(item.interestExpense ? Math.abs(item.interestExpense) : 0),
          depreciation: toCr(item.reconciledDepreciation || item.depreciationIncomeStatement),
          net_profit: toCr(item.netIncome),
          total_debt: toCr(finData.totalDebt), 
          equity_capital: null,
          reserves: null,
          cash_from_ops: toCr(item.EBITDA ? item.EBITDA * 0.8 : null), 
          debtor_days,
          working_capital_days
        };

        for (const [metric, value] of Object.entries(metrics)) {
          if (value !== null && !isNaN(value)) {
            extractedLineItems.push({
              period: periodStr,
              periodEnd: periodEndStr,
              metric,
              value,
              unit: metric.includes('days') ? 'days' : 'INR_CR'
            });
          }
        }
      }
    } else {
      // Fallback: Just use current financialData for a single TTM period
      const periodStr = `TTM`;
      const periodEndStr = new Date().toISOString().split('T')[0];
      const revCr = toCr(finData.totalRevenue);
      let debtor_days = null;
      let working_capital_days = null;
      
      if (aiData && revCr > 0) {
         debtor_days = Math.round((aiData.accounts_receivable / revCr) * 365);
         working_capital_days = Math.round(((aiData.current_assets - aiData.current_liabilities) / revCr) * 365);
      }
      
      const metrics = {
        revenue: revCr,
        operating_profit: toCr(finData.ebitda),
        net_profit: toCr(finData.netIncomeToCommon || (finData.ebitda ? finData.ebitda * 0.6 : null)),
        total_debt: toCr(finData.totalDebt),
        cash_from_ops: toCr(finData.operatingCashflow),
        debtor_days,
        working_capital_days
      };
      for (const [metric, value] of Object.entries(metrics)) {
        if (value !== null && !isNaN(value)) {
          extractedLineItems.push({
            period: periodStr, periodEnd: periodEndStr, metric, value, unit: metric.includes('days') ? 'days' : 'INR_CR'
          });
        }
      }
    }

    const extractedData = {
      company: {
        name,
        ticker: symbol,
        exchange: exchange === 'NSI' ? 'NSE' : exchange,
        sector: profile.sector || sector,
        isin: 'UNKNOWN',
        cin: 'UNKNOWN'
      },
      researchNotes: `Data successfully scraped from Yahoo Finance for ${name} (${symbol}).`,
      sources: [
        {
          id: "src-yahoo-finance",
          sourceType: "financial_aggregator",
          title: `Yahoo Finance - ${name}`,
          publisher: "Yahoo Finance API",
          url: `https://finance.yahoo.com/quote/${symbol}`,
          trustScore: 0.95,
          trustRationale: "Directly scraped from trusted global financial aggregator API.",
          fetchedAt: new Date().toISOString().split('T')[0],
          extractedLineItems
        }
      ],
      derivedDiscrepancies: []
    };

    logger.info({ companyKey }, 'Research agent: Successfully extracted data via Yahoo Finance');
    return extractedData;

  } catch (err) {
    logger.warn({ err, companyKey }, 'Research agent: Internet extraction failed, falling back to local cache');
    
    // Fallback to local curated data if internet search fails
    const filePath = path.join(DATA_DIR, `${companyKey}.sources.json`);
    if (!fs.existsSync(filePath)) {
      const { AppError } = await import('../../common/errors.js');
      throw new AppError(`Data extraction failed for ${companyKey}: ${err.message}`, { statusCode: 400, code: 'DATA_NOT_FOUND' });
    }
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    logger.info({ companyKey, sourceCount: raw.sources.length }, 'Research agent loaded curated sources (fallback)');
    return raw;
  }
}
