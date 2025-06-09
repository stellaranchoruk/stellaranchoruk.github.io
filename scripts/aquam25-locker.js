// aquam25-locker.js
// ES module for embedding AQUAm25 locking widget as a modal/dialog on any page.

// Usage:
// 1. Include this script as a module: <script type="module" src="/path/aquam25-locker.js"></script>
// 2. Add a button (or any element) with id or class you want, e.g. <button id="lockBtn">Lock AQUAm25</button>
// 3. In your page script, call:
//    import { initAquaLocker } from '/path/aquam25-locker.js';
//    initAquaLocker({ triggerSelector: '#lockBtn' });

import StellarSdk from 'https://cdnjs.cloudflare.com/ajax/libs/stellar-sdk/8.2.3/stellar-sdk.min.js';

export function initAquaLocker({
  triggerSelector,
  horizonUrl = 'https://horizon.stellar.org',
  networkPassphrase = StellarSdk.Networks.PUBLIC,
  assetCode = 'AQUAm25',
  assetIssuer = 'GDXF6SYWIQOKOZ7BACXHBFBLQZEIH25KOTTLWQK35GO3JKRNIFHHGBPC',
  trackerKey = 'GDGEWZMIJ2K6AEYYV2L4FYN27YJP5OVZSWCJIM662D5OS7EL6T6WBGBP'
}) {
  const server = new StellarSdk.Server(horizonUrl);
  const AQUA_ASSET = new StellarSdk.Asset(assetCode, assetIssuer);

  // Inject CSS only once
  if (!document.getElementById('aqua-locker-css')) {
    const style = document.createElement('style');
    style.id = 'aqua-locker-css';
    style.textContent = `
      .aqua-modal { position: fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; justify-content:center; align-items:center; z-index:9999; }
      .aqua-container { width: 90%; max-width:480px; background:#fff; padding:20px; border-radius:8px; position: relative; }
      .aqua-close { position:absolute; top:10px; right:10px; cursor:pointer; font-size:1.2em; }
      .aqua-container input, .aqua-container button, .aqua-container textarea, .aqua-container p, .aqua-container label { width:100%; margin:8px 0; }
      .aqua-container button { padding:10px; background:#007bff; color:#fff; border:none; border-radius:4px; cursor:pointer; }
      .aqua-container button:disabled { background:#888; }
      .aqua-pct-buttons { display:flex; gap:8px; }
      .aqua-pct-buttons button { flex:1; background:#e9ecef; color:#000; }
    `;
    document.head.appendChild(style);
  }

  // Create modal DOM
  const modal = document.createElement('div');
  modal.className = 'aqua-modal';
  modal.innerHTML = `
    <div class="aqua-container">
      <span class="aqua-close">&times;</span>
      <h2>Lock ${assetCode} Tokens (3 Years)</h2>
      <label>Public Key:</label><input type="text" class="aqua-pubkey" placeholder="Your Stellar public key" />
      <p>Balance: <span class="aqua-balance">-</span></p>
      <label>Amount:</label><input type="number" step="any" class="aqua-amount" placeholder="Amount to lock" />
      <div class="aqua-pct-buttons">
        <button type="button" data-pct="25">25%</button>
        <button type="button" data-pct="50">50%</button>
        <button type="button" data-pct="75">75%</button>
        <button type="button" data-pct="100">100%</button>
      </div>
      <button class="aqua-copy" disabled>Copy XDR</button>
      <button class="aqua-sign" disabled>Sign with Stellar Lab</button>
      <button class="aqua-view" disabled>View XDR</button>
      <p class="aqua-info"></p>
      <textarea class="aqua-xdr" readonly rows="6" placeholder="Transaction XDR..."></textarea>
    </div>
  `;
  document.body.appendChild(modal);

  // Element references
  const closeBtn = modal.querySelector('.aqua-close');
  const pubInput = modal.querySelector('.aqua-pubkey');
  const balEl = modal.querySelector('.aqua-balance');
  const amtInput = modal.querySelector('.aqua-amount');
  const pctBtns = modal.querySelectorAll('.aqua-pct-buttons button');
  const copyBtn = modal.querySelector('.aqua-copy');
  const signBtn = modal.querySelector('.aqua-sign');
  const viewBtn = modal.querySelector('.aqua-view');
  const infoEl = modal.querySelector('.aqua-info');
  const xdrEl = modal.querySelector('.aqua-xdr');

  let refreshInt, buildDeb;
  const labPrefix = 'https://lab.stellar.org/transaction/sign?...';
  const viewPrefix = 'https://lab.stellar.org/xdr/view?...';

  function openModal() {
    modal.style.display = 'flex';
    pubInput.focus();
  }
  function closeModal() {
    modal.style.display = 'none';
    clearInterval(refreshInt);
  }

  document.querySelector(triggerSelector).addEventListener('click', openModal);
  closeBtn.addEventListener('click', closeModal);

  pubInput.addEventListener('change', () => {
    clearInterval(refreshInt);
    fetchBal();
    refreshInt = setInterval(fetchBal, 10000);
    debounceBuild();
  });
  amtInput.addEventListener('input', debounceBuild);
  pctBtns.forEach(btn => btn.addEventListener('click', () => {
    const bal= parseFloat(balEl.textContent)||0, pct= +btn.dataset.pct;
    amtInput.value=(bal*pct/100).toFixed(7).replace(/\.0+$/, '');
    debounceBuild();
  }));

  async function fetchBal() {
    const pk = pubInput.value.trim(); if(!pk){ balEl.textContent='-'; return; }
    try{
      const acct = await server.loadAccount(pk);
      const b = acct.balances.find(b=>b.asset_code===assetCode&&b.asset_issuer===assetIssuer);
      balEl.textContent = b?b.balance:'0';
    }catch(e){ balEl.textContent='Error'; }
  }

  function debounceBuild() {
    copyBtn.disabled=true; signBtn.disabled=true; viewBtn.disabled=true;
    clearTimeout(buildDeb);
    buildDeb = setTimeout(buildXDR, 700);
  }

  async function buildXDR() {
    const pk=pubInput.value.trim(), amt=amtInput.value;
    if(!pk||!amt) return;
    try{
      const src=await server.loadAccount(pk);
      const now=new Date(), end=new Date(now);
      end.setUTCFullYear(end.getUTCFullYear()+3);
      end.setUTCHours(23,59,59,0);
      infoEl.textContent = `Start: ${now}\nEnd: ${end.toUTCString()}`;
      const ts = Math.floor(end.getTime()/1000).toString();
      const claimants=[
        new StellarSdk.Claimant(pk, StellarSdk.Claimant.predicateNot(StellarSdk.Claimant.predicateBeforeAbsoluteTime(ts))),
        new StellarSdk.Claimant(trackerKey, StellarSdk.Claimant.predicateBeforeAbsoluteTime('0'))
      ];
      const tx=new StellarSdk.TransactionBuilder(src,{fee:20000,networkPassphrase})
        .addOperation(StellarSdk.Operation.createClaimableBalance({asset:AQUA_ASSET,amount:amt,claimants}))
        .setTimeout(180).build();
      const xdr=tx.toXDR(); xdrEl.value=xdr;
      copyBtn.disabled=false;
      let enc=encodeURIComponent(xdr).replace(/%2F/g,'/').replace(/%2B/g,'+').replace(/%3D/g,'=').replace(/\//g,'//')+';;';
      signBtn.disabled=false; viewBtn.disabled=false;
      signBtn.onclick=()=>window.open(labPrefix+enc);
      viewBtn.onclick=()=>window.open(viewPrefix+enc+'&xdr$blob='+enc);
    }catch(e){ console.error(e); }
  }

  copyBtn.addEventListener('click',()=>{
    navigator.clipboard.writeText(xdrEl.value).then(()=>{
      copyBtn.textContent='Copied!';
      setTimeout(()=>copyBtn.textContent='Copy XDR',2000);
    });
  });

  // Initially hidden
  modal.style.display = 'none';
}
