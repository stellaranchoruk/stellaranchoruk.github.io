console.log("stats.js loaded");

function updateAssetStats(assetCode, assetIssuer, selectors, offerEndpoint, symbol, usdReserves, buybackAbility) {
  // First, fetch the offer data to obtain the exchange rate.
  const offerUrl = offerEndpoint + "?ts=" + Date.now();
  fetch(offerUrl)
    .then(response => response.json())
    .then(offerData => {
      console.log(`Fetched ${assetCode} offer data:`, offerData);
      // Assume the offer JSON has a "price" field (as a string) which is the USD<>[Asset] rate.
      const price = parseFloat(offerData.price || "0");
      // Reverse the price to get [Asset] <> USD.
      const dynamicExchangeRate = price !== 0 ? 1 / price : 0;
      console.log(`Computed ${assetCode} exchange rate (reversed):`, dynamicExchangeRate);
      
      // Now fetch the asset stats.
      const assetUrl = `https://horizon.stellar.org/assets?asset_code=${assetCode}&asset_issuer=${assetIssuer}&cursor=&limit=10&order=asc` + "&ts=" + Date.now();
      return fetch(assetUrl)
        .then(response => response.json())
        .then(data => {
          console.log(`Fetched ${assetCode} asset stats:`, data);
          if (data && data._embedded && data._embedded.records && data._embedded.records.length > 0) {
            const record = data._embedded.records[0];
            
            // Extract numeric fields (defaulting to 0 if missing)
            const claimable = parseFloat(record.claimable_balances_amount || "0");
            const liquidity = parseFloat(record.liquidity_pools_amount || "0");
            const contracts = parseFloat(record.contracts_amount || "0");
            const archived = parseFloat(record.archived_contracts_amount || "0");
            const balances = record.balances || {};
            const authorized = parseFloat(balances.authorized || "0");
            const maintain = parseFloat(balances.authorized_to_maintain_liabilities || "0");
            const unauthorized = parseFloat(balances.unauthorized || "0");
            
            // Circulating supply is the sum of all these values.
            const circulating = claimable + liquidity + contracts + archived + authorized + maintain + unauthorized;
            
            // Compute USD +/- = USD Reserves - (circulating * dynamicExchangeRate)
            const usdPlusMinus = usdReserves - (circulating * dynamicExchangeRate);
            // Compute Collateralization Ratio = (USD Reserves / (circulating * dynamicExchangeRate)) * 100%
            const collateralRatio = (circulating * dynamicExchangeRate > 0) ? (usdReserves / (circulating * dynamicExchangeRate)) * 100 : 0;
            
            // Format values:
            const formattedExchangeRate = dynamicExchangeRate.toLocaleString(undefined, { minimumFractionDigits: 7, maximumFractionDigits: 7 });
            const formattedCirculating = symbol + circulating.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
            const formattedUSDReserves = "$" + usdReserves.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
            const formattedBuyback = symbol + buybackAbility.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
            const formattedUSDPlusMinus = "$" + usdPlusMinus.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
            const formattedCollateralRatio = collateralRatio.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + "%";
            
            // Update DOM elements using the provided selectors.
            document.querySelector(selectors.exchangeRateSelector).textContent = formattedExchangeRate;
            document.querySelector(selectors.circulatingSelector).textContent = formattedCirculating;
            document.querySelector(selectors.usdReservesSelector).textContent = formattedUSDReserves;
            document.querySelector(selectors.buybackSelector).textContent = formattedBuyback;
            document.querySelector(selectors.usdPlusMinusSelector).textContent = formattedUSDPlusMinus;
            document.querySelector(selectors.collateralRatioSelector).textContent = formattedCollateralRatio;
            
            console.log(`Updated ${assetCode} stats:`, {
              exchangeRate: formattedExchangeRate,
              circulating: formattedCirculating,
              usdReserves: formattedUSDReserves,
              buyback: formattedBuyback,
              usdPlusMinus: formattedUSDPlusMinus,
              collateralRatio: formattedCollateralRatio
            });
          } else {
            console.error(`No records found in the ${assetCode} asset stats response.`);
          }
        });
    })
    .catch(error => {
      console.error(`Error fetching ${assetCode} offer data:`, error);
    });
}

function updateLastUpdatedDate() {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0'); // months are 0-indexed
  const year = today.getFullYear();
  const formattedDate = `${day}/${month}/${year}`;
  const lastUpdatedElem = document.querySelector("#last-updated .description");
  if (lastUpdatedElem) {
    lastUpdatedElem.textContent = formattedDate;
    console.log("Updated Last Updated date to:", formattedDate);
  } else {
    console.error("Could not find the Last Updated element.");
  }
}

document.addEventListener("DOMContentLoaded", function() {
  // Update GBPC Stats
  updateAssetStats(
    "GBPC",
    "GDXF6SYWIQOKOZ7BACXHBFBLQZEIH25KOTTLWQK35GO3JKRNIFHHGBPC",
    {
      exchangeRateSelector: "#gbpc-stats .table > div:nth-child(1) .count",
      circulatingSelector: "#gbpc-stats .table > div:nth-child(2) .count",
      usdReservesSelector: "#gbpc-stats .table > div:nth-child(3) .count",
      buybackSelector: "#gbpc-stats .table > div:nth-child(4) .count",
      usdPlusMinusSelector: "#gbpc-stats .table > div:nth-child(5) .count",
      collateralRatioSelector: "#gbpc-stats .table > div:nth-child(6) .count"
    },
    "https://horizon.stellar.org/offers/1679115430", // GBPC offer endpoint
    "£",
    78135,   // GBPC USD Reserves (placeholder)
    61981    // GBPC Buyback Ability (placeholder)
  );
  
  // Update EURC Stats
  updateAssetStats(
    "EURC",
    "GAP2JFYUBSSY65FIFUN3NTUKP6MQQ52QETQEBDM25PFMQE2EEN2EEURC",
    {
      exchangeRateSelector: "#eurc-stats .table > div:nth-child(1) .count",
      circulatingSelector: "#eurc-stats .table > div:nth-child(2) .count",
      usdReservesSelector: "#eurc-stats .table > div:nth-child(3) .count",
      buybackSelector: "#eurc-stats .table > div:nth-child(4) .count",
      usdPlusMinusSelector: "#eurc-stats .table > div:nth-child(5) .count",
      collateralRatioSelector: "#eurc-stats .table > div:nth-child(6) .count"
    },
    "https://horizon.stellar.org/offers/1679202929", // EURC offer endpoint
    "€",
    3243,    // EURC USD Reserves (placeholder)
    3032     // EURC Buyback Ability (placeholder)
  );
  
  // Update KRWC Stats
  updateAssetStats(
    "KRWC",
    "GA4JBPWVFUT2FETDSMSGBYDGH4FROYB5SYKLVQO7WGNZHCSB63OIKRWC",
    {
      exchangeRateSelector: "#krwc-stats .table > div:nth-child(1) .count",
      circulatingSelector: "#krwc-stats .table > div:nth-child(2) .count",
      usdReservesSelector: "#krwc-stats .table > div:nth-child(3) .count",
      buybackSelector: "#krwc-stats .table > div:nth-child(4) .count",
      usdPlusMinusSelector: "#krwc-stats .table > div:nth-child(5) .count",
      collateralRatioSelector: "#krwc-stats .table > div:nth-child(6) .count"
    },
    "https://horizon.stellar.org/offers/1679204939", // KRWC offer endpoint
    "₩",
    28095,    // KRWC USD Reserves (placeholder)
    38545038  // KRWC Buyback Ability (placeholder)
  );
  
  // Update the Last Updated date
  updateLastUpdatedDate();
});
