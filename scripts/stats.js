console.log("stats.js loaded");

function updateAssetStat(assetCode, assetIssuer, countSelector, symbol) {
  // Construct the Horizon endpoint URL for the given asset.
  const endpoint = `https://horizon.stellar.org/assets?asset_code=${assetCode}&asset_issuer=${assetIssuer}&cursor=&limit=10&order=asc`;
  // Append a timestamp parameter to avoid caching.
  const endpointWithTimestamp = endpoint + "&ts=" + Date.now();
  
  fetch(endpointWithTimestamp)
    .then(response => response.json())
    .then(data => {
      console.log(`Fetched ${assetCode} data:`, data);
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
        
        // Calculate total supply by summing all parts
        const totalSupply = claimable + liquidity + contracts + archived + authorized + maintain + unauthorized;
        console.log(`Computed ${assetCode} totalSupply:`, totalSupply);
        
        // Format the number with the specified symbol and no decimals
        const formattedTotal = symbol + totalSupply.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
        
        // Update the corresponding DOM element
        const countElem = document.querySelector(countSelector);
        if (countElem) {
          countElem.textContent = formattedTotal;
          console.log(`Updated ${assetCode} count to:`, formattedTotal);
        } else {
          console.error(`Could not find the element for ${assetCode} using selector: ${countSelector}`);
        }
      } else {
        console.error(`No records found in the ${assetCode} Horizon API response.`);
      }
    })
    .catch(error => {
      console.error(`Error fetching ${assetCode} data:`, error);
    });
}

document.addEventListener("DOMContentLoaded", function() {
  // Update GBPC Stats
  updateAssetStat(
    "GBPC",
    "GDXF6SYWIQOKOZ7BACXHBFBLQZEIH25KOTTLWQK35GO3JKRNIFHHGBPC",
    "#gbpc-stats .table > div:first-child .count",
    "£"
  );
  
  // Update EURC Stats with the provided issuer address.
  updateAssetStat(
    "EURC",
    "GAP2JFYUBSSY65FIFUN3NTUKP6MQQ52QETQEBDM25PFMQE2EEN2EEURC",
    "#eurc-stats .table > div:first-child .count",
    "€"
  );
  
  // Update KRWC Stats with the provided issuer address.
  updateAssetStat(
    "KRWC",
    "GA4JBPWVFUT2FETDSMSGBYDGH4FROYB5SYKLVQO7WGNZHCSB63OIKRWC",
    "#krwc-stats .table > div:first-child .count",
    "₩"
  );
  
});
