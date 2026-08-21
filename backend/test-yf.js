const yahooFinance = require('yahoo-finance2').default;

async function run() {
  try {
    const symbol = 'TCS.NS';
    // const quote = await yahooFinance.quote(symbol);
    const financials = await yahooFinance.quoteSummary(symbol, { modules: ['financialData', 'incomeStatementHistory', 'balanceSheetHistory', 'cashflowStatementHistory'] });
    console.log(JSON.stringify(financials, null, 2));
  } catch (e) {
    console.error(e);
  }
}
run();
