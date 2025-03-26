console.log("stats.js loaded");

function updateAssetStats(assetCode, assetIssuer, selectors, offerEndpoint, symbol, accountID, reserveAsset = { asset_code: "USDC", asset_issuer: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN" }) {
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
            
            // Fetch account info to get reserve balance.
            const accountUrl = "https://horizon.stellar.org/accounts/" + accountID + "?ts=" + Date.now();
            return fetch(accountUrl)
              .then(response => response.json())
              .then(accountData => {
                console.log(`Fetched ${assetCode} account data:`, accountData);
                let reserves = 0;
                if (accountData && accountData.balances && Array.isArray(accountData.balances)) {
                  for (const bal of accountData.balances) {
                    if (
                      bal.asset_code === reserveAsset.asset_code &&
                      bal.asset_issuer === reserveAsset.asset_issuer
                    ) {
                      reserves = parseFloat(bal.balance);
                      break;
                    }
                  }
                }
                
                // Calculate Buyback Ability = Reserves ÷ dynamicExchangeRate.
                const dynamicBuyback = dynamicExchangeRate > 0 ? reserves / dynamicExchangeRate : 0;
                // Calculate Net Reserves = Reserves - (circulating × dynamicExchangeRate).
                const netReserves = reserves - (circulating * dynamicExchangeRate);
                // Calculate Collateralization Ratio = (Reserves ÷ (circulating × dynamicExchangeRate)) × 100%.
                const collateralRatio = (circulating * dynamicExchangeRate > 0)
                  ? (reserves / (circulating * dynamicExchangeRate)) * 100
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
                
                // Use different prefixes for reserves based on asset.
                let formattedReserves;
                if (assetCode === "AQUAm25") {
                  formattedReserves = "AQUA " + reserves.toLocaleString(undefined, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                  });
                } else {
                  formattedReserves = "$" + reserves.toLocaleString(undefined, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                  });
                }
                
                // Buyback ability is always prefixed with the passed symbol.
                const formattedBuyback = symbol + dynamicBuyback.toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                });
                
                let formattedNetReserves;
                if (assetCode === "AQUAm25") {
                  formattedNetReserves = "AQUA " + netReserves.toLocaleString(undefined, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                  });
                } else {
                  formattedNetReserves = "$" + netReserves.toLocaleString(undefined, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                  });
                }
                
                const formattedCollateralRatio = collateralRatio.toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                }) + "%";
                
                // Update DOM elements.
                document.querySelector(selectors.exchangeRateSelector).textContent = formattedExchangeRate;
                document.querySelector(selectors.circulatingSelector).textContent = formattedCirculating;
                document.querySelector(selectors.usdReservesSelector).textContent = formattedReserves;
                document.querySelector(selectors.buybackSelector).textContent = formattedBuyback;
                
                const netElem = document.querySelector(selectors.usdPlusMinusSelector);
                netElem.textContent = formattedNetReserves;
                if (netReserves > 0) {
                  netElem.style.color = "#2E7D32"; // dark green
                } else if (netReserves < 0) {
                  netElem.style.color = "#C62828"; // dark red
                } else {
                  netElem.style.color = "";
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
                  reserves: formattedReserves,
                  buyback: formattedBuyback,
                  netReserves: formattedNetReserves,
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

function updateLiquidAquaUSDValue() {
  const orderBookUrl = "https://horizon.stellar.org/order_book?selling_asset_type=credit_alphanum4&selling_asset_code=AQUA&selling_asset_issuer=GBNZILSTVQZ4R7IKQDGHYGY2QXL5QOFJYQMXPKWRRM5PAV7Y4M67AQUA&buying_asset_type=credit_alphanum4&buying_asset_code=USDC&buying_asset_issuer=GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
  fetch(orderBookUrl)
    .then(response => response.json())
    .then(data => {
      if (data && data.bids && data.asks && data.bids.length > 0 && data.asks.length > 0) {
        // Get the price from the first bid and first ask:
        const bidPrice = parseFloat(data.bids[0].price);
        const askPrice = parseFloat(data.asks[0].price);
        // Calculate the midpoint price:
        const currentPrice = (bidPrice + askPrice) / 2;
        console.log("Current AQUA price (midpoint):", currentPrice);
        
        // Retrieve the AQUA Liquid Reserve value.
        const liquidReserveElem = document.querySelector("#aqua-stats .table > div:nth-child(1) .count");
        if (liquidReserveElem) {
          // Remove the "♒︎" symbol, commas, and spaces.
          let liquidReserveText = liquidReserveElem.textContent.replace(/♒︎|\s|,/g, "");
          const liquidReserve = parseFloat(liquidReserveText);
          if (isNaN(liquidReserve)) {
            console.error("Liquid Reserve value is not a number:", liquidReserveText);
            return;
          }
          // Multiply the reserve by the current price.
          const liquidAquaUsdValue = liquidReserve * currentPrice;
          // Format as USD currency (no decimals).
          const formattedUSDValue = "$" + liquidAquaUsdValue.toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
          });
          
          // Update the "Liquid AQUA USD Value" element.
          const liquidAquaValueElem = document.querySelector("#aqua-stats .table > div:nth-child(2) .count");
          if (liquidAquaValueElem) {
            liquidAquaValueElem.textContent = formattedUSDValue;
            console.log("Updated Liquid AQUA USD Value:", formattedUSDValue);
          } else {
            console.error("Liquid AQUA USD Value element not found");
          }
        } else {
          console.error("Liquid Reserve element not found");
        }
      } else {
        console.error("Order book data incomplete", data);
      }
    })
    .catch(error => {
      console.error("Error fetching order book data:", error);
    });
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
    "GDXF6SYWIQOKOZ7BACXHBFBLQZEIH25KOTTLWQK35GO3JKRNIFHHGBPC"
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
    "GAP2JFYUBSSY65FIFUN3NTUKP6MQQ52QETQEBDM25PFMQE2EEN2EEURC"
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
    "GA4JBPWVFUT2FETDSMSGBYDGH4FROYB5SYKLVQO7WGNZHCSB63OIKRWC"
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
    "GCBYVQH3RZ4JDVFMNWETE3J6U3AW6NNGTIWNVJHNQIIEGQR4K7PLUSDC"
  );
  
  // Update AQUAm25 Stats
  updateAssetStats(
    "AQUAm25",
    "GDXF6SYWIQOKOZ7BACXHBFBLQZEIH25KOTTLWQK35GO3JKRNIFHHGBPC",
    {
      exchangeRateSelector: "#aquam25-stats .table > div:nth-child(1) .count",
      circulatingSelector: "#aquam25-stats .table > div:nth-child(2) .count",
      usdReservesSelector: "#aquam25-stats .table > div:nth-child(3) .count",
      buybackSelector: "#aquam25-stats .table > div:nth-child(4) .count",
      usdPlusMinusSelector: "#aquam25-stats .table > div:nth-child(5) .count",
      collateralRatioSelector: "#aquam25-stats .table > div:nth-child(6) .count"
    },
    "https://horizon.stellar.org/offers/1700570904", // AQUAm25 offer endpoint
    "♒︎ ",
    "GDXF6SYWIQOKOZ7BACXHBFBLQZEIH25KOTTLWQK35GO3JKRNIFHHGBPC",
    { asset_code: "AQUA", asset_issuer: "GBNZILSTVQZ4R7IKQDGHYGY2QXL5QOFJYQMXPKWRRM5PAV7Y4M67AQUA" }
  );
  
  // Update the Last Updated date.
  updateLastUpdatedDate();
  
  // Update Liquid AQUA USD Value in AQUA Stats Section.
  updateLiquidAquaUSDValue();
});
