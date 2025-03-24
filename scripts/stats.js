// Circulating GBPC Supply

document.addEventListener("DOMContentLoaded", function() {
  // Use the confirmed production Horizon endpoint for GBPC
  const gbpcEndpoint = "https://horizon.stellar.org/assets?asset_code=GBPC&asset_issuer=GDXF6SYWIQOKOZ7BACXHBFBLQZEIH25KOTTLWQK35GO3JKRNIFHHGBPC&cursor=&limit=10&order=asc";
  
  // Append a cache-busting parameter to ensure fresh data
  const endpointWithTimestamp = gbpcEndpoint + "&ts=" + Date.now();
  
  fetch(endpointWithTimestamp)
    .then(response => response.json())
    .then(data => {
      console.log("Fetched GBPC data:", data);
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
        console.log("Computed totalSupply:", totalSupply);
        
        // Format the number with a pound symbol and no decimals
        const formattedTotal = "£" + totalSupply.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
        
        // Update the "Circulating GBPC" count in the GBPC Stats section
        const countElem = document.querySelector("#gbpc-stats .table > div:first-child .count");
        if (countElem) {
          countElem.textContent = formattedTotal;
          console.log("Updated GBPC Count to:", formattedTotal);
        } else {
          console.error("Could not find the GBPC count element.");
        }
      } else {
        console.error("No records found in the GBPC Horizon API response.");
      }
    })
    .catch(error => {
      console.error("Error fetching GBPC data:", error);
    });
});
