// aquam25-locker.js
// ES module for embedding AQUAm25 locking widget as a modal/dialog on any page.

// Usage:
// 1. Include this script as a module: <script type="module" src="https://mirrasets.com/scripts/aquam25-locker.js"></script>
// 2. Add a button (or any element) with id or class you want, e.g. <button id="lockBtn">Lock AQUAm25</button>
// 3. In your page script, call:
//    import { initAquaLocker } from 'https://mirrasets.com/scripts/aquam25-locker.js';
//    initAquaLocker({ triggerSelector: '#lockBtn' });

const StellarSdk = window.StellarSdk;

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
      *, *::before, *::after { box-sizing: border-box; }
      .aqua-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
      }
      .aqua-container {
        position: relative;
        overflow: visible;
        width: 90%;
        max-width: 480px;
        background: #fff;
        padding: 15px;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        font-family: Arial, sans-serif;
      }
      .aqua-close {
        position: absolute;
        top: 10px;
        right: 10px;
        cursor: pointer;
        font-size: 1.2em;
        z-index: 1001;
      }
      .aqua-container input,
      .aqua-container textarea {
        width: 100%;
        margin: 8px 0;
        padding: 10px;
        font-size: 1em;
        border: 1px solid #ccc;
        border-radius: 4px;
      }
      .aqua-container button {
        width: 100%;
        margin: 8px 0;
        padding: 10px;
        font-size: 1em;
        background: #007bff;
        color: #fff;
        border: none;
        cursor: pointer;
        border-radius: 4px;
        text-align: center;
      }
      .aqua-container button:disabled {
        background: #888;
        cursor: not-allowed;
      }
      .aqua-container textarea {
        resize: vertical;
        font-family: monospace;
      }
      .aqua-container p,
      .aqua-container label,
      .aqua-container span {
        width: 100%;
        margin: 8px 0;
      }
      .aqua-pct-buttons {
        display: flex;
        gap: 8px;
        margin-top: 4px;
      }
      .aqua-pct-buttons button {
        flex: 1;
        background: #e9ecef;
        color: #000;
        border: none;
      }
      .aqua-pct-buttons button:hover {
        background: #dee2e6;
      }
      .aqua-info {
        font-weight: bold;
        white-space: pre-line;
        margin-bottom: 10px;
      }
      @media (min-width: 600px) {
        .aqua-container {
          margin: 20px auto;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Create modal DOM
  const modal = document.createElement('div');
  modal.className = 'aqua-modal';
  modal.innerHTML = `
    <div class="aqua-container">
      <span class="aqua-close">&times;</span>
      <h2>Lock ${assetCode} Tokens for 3 Years</h2>
      <label for="aqua-pubkey">Public Key:</label>
      <input id="aqua-pubkey" class="aqua-pubkey" type="text" placeholder="Enter your Stellar public key" />
      <p>AQUAm25 Balance: <span class="aqua-balance">-</span></p>
      <label for="aqua-amount">AQUAm25 Amount:</label>
      <input id="aqua-amount" class="aqua-amount" type="number" step="any" placeholder="Amount to lock" />
      <div class="aqua-pct-buttons">
        <button type="button" data-pct="25">25%</button>
        <button type="button" data-pct="50">50%</button>
        <button type="button" data-pct="75">75%</button>
        <button type="button" data-pct="100">100%</button>
      </div>
      <button class="aqua-copy" disabled>Copy XDR</button>
      <button class="aqua-sign" disabled>Sign with Stellar Lab</button>
      <button class="aqua-view" disabled>View XDR with Stellar Lab</button>
      <p class="aqua-info"></p>
      <textarea class="aqua-xdr" readonly rows="6" placeholder="Your transaction XDR will appear here..."></textarea>
    </div>
  `;
  document.body.appendChild(modal);

  // Element references
  const closeBtn = modal.querySelector('.aqua-close');
  const pubInput = modal.querySelector('#aqua-pubkey');
  const balEl = modal.querySelector('.aqua-balance');
  const amtInput = modal.querySelector('#aqua-amount');
  const pctBtns = modal.querySelectorAll('.aqua-pct-buttons button');
  const copyBtn = modal.querySelector('.aqua-copy');
  const signBtn = modal.querySelector('.aqua-sign');
  const viewBtn = modal.querySelector('.aqua-view');
  const infoEl = modal.querySelector('.aqua-info');
  const xdrEl = modal.querySelector('.aqua-xdr');

  let refreshInt, buildDebounce;

  // Stellar Lab URL prefixes (copied from original page)
  const labPrefix =
    'https://lab.stellar.org/transaction/sign?' +
    '$=network$id=mainnet&' +
    'label=Mainnet&' +
    'horizonUrl=https:////horizon.stellar.org&' +
    'rpcUrl=https:////mainnet.sorobanrpc.com&' +
    'passphrase=Public%20Global%20Stellar%20Network%20/;%20September%202015;&' +
    'transaction$sign$activeView=overview&importXdr=';
  const viewPrefix =
    'https://lab.stellar.org/xdr/view?' +
    '$=network$id=mainnet&' +
    'label=Mainnet&' +
    'horizonUrl=https:////horizon.stellar.org&' +
    'rpcUrl=https:////mainnet.sorobanrpc.com&' +
    'passphrase=Public%20Global%20Stellar%20Network%20/;%20September%202015;&transaction$sign$activeView=overview&importXdr=';

  // Open/close handlers
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

  // Balance fetching and periodic refresh
  pubInput.addEventListener('change', () => {
    clearInterval(refreshInt);
    fetchBalance();
    refreshInt = setInterval(fetchBalance, 10000);
    debounceBuild();
  });

  amtInput.addEventListener('input', debounceBuild);
  pctBtns.forEach(btn => btn.addEventListener('click', () => {
    const bal = parseFloat(balEl.textContent) || 0;
    const pct = parseInt(btn.dataset.pct, 10) / 100;
    amtInput.value = (bal * pct).toFixed(7).replace(/\.0+$/, '');
    debounceBuild();
  }));

  async function fetchBalance() {
    const pk = pubInput.value.trim();
    if (!pk) { balEl.textContent = '-'; return; }
    try {
      const account = await server.loadAccount(pk);
      const balObj = account.balances.find(b => b.asset_code === assetCode && b.asset_issuer === assetIssuer);
      balEl.textContent = balObj ? balObj.balance : '0';
    } catch (err) {
      console.error(err);
      balEl.textContent = 'Error';
    }
  }

  function debounceBuild() {
    copyBtn.disabled = true;
    signBtn.disabled = true;
    viewBtn.disabled = true;
    clearTimeout(buildDebounce);
    buildDebounce = setTimeout(buildXDR, 700);
  }

  async function buildXDR() {
    const pk = pubInput.value.trim();
    const amt = amtInput.value.trim();
    if (!pk || !amt) return;
    try {
      const sourceAcc = await server.loadAccount(pk);
      const start = new Date();
      const end = new Date(start);
      end.setUTCFullYear(end.getUTCFullYear() + 3);
      end.setUTCHours(23, 59, 59, 0);

      infoEl.textContent = `Lock start: ${start.toLocaleString()}\nLock end:   ${end.toLocaleString(undefined,{timeZone:'UTC'})}`;

      const endTs = Math.floor(end.getTime() / 1000).toString();
      const claimants = [
        new StellarSdk.Claimant(pk, StellarSdk.Claimant.predicateNot(StellarSdk.Claimant.predicateBeforeAbsoluteTime(endTs))),
        new StellarSdk.Claimant(trackerKey, StellarSdk.Claimant.predicateBeforeAbsoluteTime('0'))
      ];

      const tx = new StellarSdk.TransactionBuilder(sourceAcc, { fee: 20000, networkPassphrase })
        .addOperation(StellarSdk.Operation.createClaimableBalance({ asset: AQUA_ASSET, amount: amt, claimants }))
        .setTimeout(180)
        .build();

      const xdr = tx.toXDR();
      xdrEl.value = xdr;
      copyBtn.disabled = false;

      let encoded = encodeURIComponent(xdr)
        .replace(/%2F/g, '/')
        .replace(/%2B/g, '+')
        .replace(/%3D/g, '=');
      encoded = encoded.replace(/\//g, '//') + ';;';

      signBtn.disabled = false;
      viewBtn.disabled = false;
      signBtn.onclick = () => window.open(labPrefix + encoded);
      viewBtn.onclick = () => window.open(viewPrefix + encoded + '&xdr$blob=' + encoded);
    } catch (err) {
      console.error(err);
    }
  }

  // Copy to clipboard
  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(xdrEl.value).then(() => {
      copyBtn.textContent = 'Copied!';
      setTimeout(() => { copyBtn.textContent = 'Copy XDR'; }, 2000);
    }).catch(console.error);
  });

  // Hide modal initially
  modal.style.display = 'none';
}
