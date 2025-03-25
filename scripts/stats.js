console.log("stats.js loaded");

function updateAssetStats(assetCode, assetIssuer, selectors, offerEndpoint, symbol, accountID) {
  // Fetch offer data for dynamic exchange rate.
  const offerUrl = offerEndpoint + "?ts=" + Date.now();
  fetch(offerUrl)
    .then(response => response.json())
    .then(offerData => {
      console.log(`Fetched ${assetCode} offer data:`, offerData);
      const price = parseFloat(offerData.price || "0");
      // Reverse the price to get the [Asset]<>USD rate.
      const dynamicExchangeRate = price !== 0 ? 1 / price : 0;
      console.log(`Computed ${assetCode} exchange rate (reversed):`, dynamicExchangeRate);
      
      // Fetch asset stats for circulating supply.
      const assetUrl = `https://horizon.stellar.org/assets?asset_code=${assetCode}&asset_issuer=${assetIssuer}&cursor=&limit=10&order=asc` + "&ts=" + Date.now();
      return fetch(assetUrl)
        .then(response => response.json())
        .then(data => {
          console.log(`Fetched ${assetCode} asset stats:`, data);
          if (data && data._embedded && data._embedded.records && data._embedded.records.length > 0) {
            const record = data._embedded.records[0];
            const claimable = parseFloat(record.claimable_balances_amount || "0");
            const liquidity = parseFloat(record.liquidity_pools_amount || "0");
            const contracts = parseFloat(record.contracts_amount || "0");
            const archived = parseFloat(record.archived_contracts_amount || "0");
            const balances = record.balances || {};
            const authorized = parseFloat(balances.authorized || "0");
            const maintain = parseFloat(balances.authorized_to_maintain_liabilities || "0");
            const unauthorized = parseFloat(balances.unauthorized || "0");
            const circulating = claimable + liquidity + contracts + archived + authorized + maintain + unauthorized;
            
            // Fetch account info to get USD reserves (USDC balance).
            const accountUrl = "https://horizon.stellar.org/accounts/" + accountID + "?ts=" + Date.now();
            return fetch(accountUrl)
              .then(response => response.json())
              .then(accountData => {
                console.log(`Fetched ${assetCode} account data:`, accountData);
                let usdReserves = 0;
                if (accountData && accountData.balances && Array.isArray(accountData.balances)) {
                  for (const bal of accountData.balances) {
                    if (
                      bal.asset_code === "USDC" &&
                      bal.asset_issuer === "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN"
                    ) {
                      usdReserves = parseFloat(bal.balance);
                      break;
                    }
                  }
                }
                
                // Calculate Buyback Ability = USD Reserves ÷ dynamicExchangeRate.
                const dynamicBuyback = dynamicExchangeRate > 0 ? usdReserves / dynamicExchangeRate : 0;
                // Calculate Net USD Reserves = USD Reserves - (circulating × dynamicExchangeRate).
                const netUSDReserves = usdReserves - (circulating * dynamicExchangeRate);
                // Calculate Collateralization Ratio = (USD Reserves ÷ (circulating × dynamicExchangeRate)) × 100%.
                const collateralRatio = (circulating * dynamicExchangeRate > 0)
                  ? (usdReserves / (circulating * dynamicExchangeRate)) * 100
                  : 0;
                
                // Format values.
                const formattedExchangeRate = dynamicExchangeRate.toLocaleString(undefined, {
                  minimumFractionDigits: 7,
                  maximumFractionDigits: 7
                });
                const formattedCirculating = symbol + circulating.toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                });
                const formattedUSDReserves = "$" + usdReserves.toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                });
                const formattedBuyback = symbol + dynamicBuyback.toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                });
                const formattedNetUSDReserves = "$" + netUSDReserves.toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                });
                const formattedCollateralRatio = collateralRatio.toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                }) + "%";
                
                // Update DOM elements.
                document.querySelector(selectors.exchangeRateSelector).textContent = formattedExchangeRate;
                document.querySelector(selectors.circulatingSelector).textContent = formattedCirculating;
                document.querySelector(selectors.usdReservesSelector).textContent = formattedUSDReserves;
                document.querySelector(selectors.buybackSelector).textContent = formattedBuyback;
                
                const netUSDElem = document.querySelector(selectors.usdPlusMinusSelector);
                netUSDElem.textContent = formattedNetUSDReserves;
                if (netUSDReserves > 0) {
                  netUSDElem.style.color = "#2E7D32"; // dark green
                } else if (netUSDReserves < 0) {
                  netUSDElem.style.color = "#C62828"; // dark red
                } else {
                  netUSDElem.style.color = "";
                }
                
                const collateralElem = document.querySelector(selectors.collateralRatioSelector);
                collateralElem.textContent = formattedCollateralRatio;
                if (collateralRatio > 100) {
                  collateralElem.style.color = "#2E7D32"; // dark green
                } else {
                  collateralElem.style.color = "#C62828"; // dark red
                }
                
                console.log(`Updated ${assetCode} stats:`, {
                  exchangeRate: formattedExchangeRate,
                  circulating: formattedCirculating,
                  usdReserves: formattedUSDReserves,
                  buyback: formattedBuyback,
                  netUSDReserves: formattedNetUSDReserves,
                  collateralRatio: formattedCollateralRatio
                });
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
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = today.getFullYear();
  const hours = String(today.getHours()).padStart(2, '0');
  const minutes = String(today.getMinutes()).padStart(2, '0');
  const formattedDateTime = `${day}/${month}/${year} ${hours}:${minutes}`;
  
  const lastUpdatedElem = document.querySelector("#last-updated .description");
  if (lastUpdatedElem) {
    lastUpdatedElem.textContent = formattedDateTime;
    console.log("Updated Last Updated date/time to:", formattedDateTime);
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
    "GDXF6SYWIQOKOZ7BACXHBFBLQZEIH25KOTTLWQK35GO3JKRNIFHHGBPC"  // GBPC account ID
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
    "GAP2JFYUBSSY65FIFUN3NTUKP6MQQ52QETQEBDM25PFMQE2EEN2EEURC"  // EURC account ID
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
    "GA4JBPWVFUT2FETDSMSGBYDGH4FROYB5SYKLVQO7WGNZHCSB63OIKRWC"  // KRWC account ID
  );
  
  // Update USDC Stats
  updateAssetStats(
    "USDC",
    "GCBYVQH3RZ4JDVFMNWETE3J6U3AW6NNGTIWNVJHNQIIEGQR4K7PLUSDC",
    {
      exchangeRateSelector: "#usdc-stats .table > div:nth-child(1) .count",
      circulatingSelector: "#usdc-stats .table > div:nth-child(2) .count",
      usdReservesSelector: "#usdc-stats .table > div:nth-child(3) .count",
      buybackSelector: "#usdc-stats .table > div:nth-child(4) .count",
      usdPlusMinusSelector: "#usdc-stats .table > div:nth-child(5) .count",
      collateralRatioSelector: "#usdc-stats .table > div:nth-child(6) .count"
    },
    "https://horizon.stellar.org/offers/1688920720", // USDC offer endpoint
    "$",
    "GCBYVQH3RZ4JDVFMNWETE3J6U3AW6NNGTIWNVJHNQIIEGQR4K7PLUSDC"  // USDC account ID
  );
  
  // Update the Last Updated date.
  updateLastUpdatedDate();
});
