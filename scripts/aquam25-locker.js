// aquam25-locker.js
// ES module for embedding AQUAm25 locking widget as a modal/dialog on any page.

// Usage:
// 1. Include this script as a module:
//    <script type="module" src="https://mirrasets.com/scripts/aquam25-locker.js"></script>
// 2. Add a trigger button, e.g. <button id="lockBtn">Lock AQUAm25</button>
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
  trackerKey = 'GDGEWZMIJ2K6AEYYV2L4FYN27YJP5OVZSWCJIM662D5OS7EL6T6WBGBP',
  walletConnectProjectId = 'f658ce3a7c8a185214974f71539fea39',
  walletConnectChain = 'stellar:pubnet'
}) {
  if (!StellarSdk) throw new Error('StellarSdk not found on window. Include Stellar SDK before this script.');

  const server = new StellarSdk.Server(horizonUrl);
  const AQUA_ASSET = new StellarSdk.Asset(assetCode, assetIssuer);

  // Inject CSS once
  if (!document.getElementById('aqua-locker-css')) {
    const style = document.createElement('style');
    style.id = 'aqua-locker-css';
    style.textContent = `
      *, *::before, *::after { box-sizing: border-box; }
      .aqua-modal {
        position: fixed;
        top: 0; left: 0;
        width: 100%; height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex; justify-content: center; align-items: center;
        z-index: 9999;
        padding: 10px;
      }
      .aqua-container {
        position: relative;
        width: 90%; max-width: 480px;
        max-height: 90vh;
        overflow-y: auto;
        background: #fff;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        font-family: Arial, sans-serif;
      }
      .aqua-close {
        position: absolute;
        top: 8px; right: 8px;
        background: none;
        border: none;
        font-size: 1.4em;
        line-height: 1;
        color: #333;
        cursor: pointer;
      }
      .aqua-container button:not(.aqua-close) {
        width: 100%; margin: 8px 0; padding: 10px;
        font-size: 1em; background: #007bff; color: #fff;
        border: none; border-radius: 4px; cursor: pointer;
      }
      .aqua-container button:not(.aqua-close):disabled {
        background: #888; cursor: not-allowed;
      }
      .aqua-container input,
      .aqua-container textarea {
        width: 100%; margin: 8px 0; padding: 10px;
        font-size: 1em; border: 1px solid #ccc; border-radius: 4px;
      }
      .aqua-container textarea { resize: vertical; font-family: monospace; }
      .aqua-container p, .aqua-container label, .aqua-container span {
        width: 100%; margin: 8px 0;
      }
      .aqua-pct-buttons {
        display: flex; gap: 8px; margin-top: 4px;
      }
      .aqua-pct-buttons button {
        flex: 1; background: #e9ecef; color: #000; border: none;
      }
      .aqua-pct-buttons button:hover { background: #dee2e6; }
      .aqua-info { font-weight: bold; white-space: pre-line; margin-bottom: 10px; }
      @media (min-width: 600px) { .aqua-container { margin: 20px auto; } }
    `;
    document.head.appendChild(style);
  }

  // Create modal HTML
  const modal = document.createElement('div');
  modal.className = 'aqua-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.innerHTML = `
    <div class="aqua-container">
      <button class="aqua-close" aria-label="Close modal">&times;</button>
      <h2>Lock ${assetCode} Tokens for 3 Years</h2>
      <label for="aqua-pubkey">Public Key:</label>
      <input id="aqua-pubkey" type="text" placeholder="Enter your Stellar public key" />
      <p>AQUAm25 Balance: <span class="aqua-balance">-</span></p>
      <label for="aqua-amount">AQUAm25 Amount:</label>
      <input id="aqua-amount" type="number" step="any" placeholder="Amount to lock" />
      <div class="aqua-pct-buttons">
        <button type="button" data-pct="25">25%</button>
        <button type="button" data-pct="50">50%</button>
        <button type="button" data-pct="75">75%</button>
        <button type="button" data-pct="100">100%</button>
      </div>
      <button class="aqua-freighter-connect" disabled>Connect Freighter</button>
      <button class="aqua-freighter-sign" disabled>Sign & Submit with Freighter</button>
      <button class=\"aqua-copy\" disabled>Copy XDR<\/button>
      <button class=\"aqua-sign\" disabled>Sign with Stellar Lab<\/button>
      <button class=\"aqua-view\" disabled>View XDR with Stellar Lab<\/button>
      <button class=\"aqua-wc-connect\" disabled>Connect Wallet (QR)</button>
      <button class=\"aqua-wc-sign\" disabled>Sign & Submit via WalletConnect</button>
      <p class="aqua-info"></p>
      <textarea class="aqua-xdr" readonly rows="6" placeholder="Your transaction XDR will appear here..."></textarea>
    </div>
  `;
  document.body.appendChild(modal);

  // Element refs
  const closeBtn = modal.querySelector('.aqua-close');
  const pubKeyIn = modal.querySelector('#aqua-pubkey');
  const balanceEl = modal.querySelector('.aqua-balance');
  const amtIn = modal.querySelector('#aqua-amount');
  const pctBtns = modal.querySelectorAll('.aqua-pct-buttons button');
  const freighterConnectBtn = modal.querySelector('.aqua-freighter-connect');
  const freighterSignBtn = modal.querySelector('.aqua-freighter-sign');
  const wcConnectBtn = modal.querySelector('.aqua-wc-connect');
  const wcSignBtn = modal.querySelector('.aqua-wc-sign');
  const copyBtn = modal.querySelector('.aqua-copy');
  const signBtn = modal.querySelector('.aqua-sign');
  const viewBtn = modal.querySelector('.aqua-view');
  const infoEl = modal.querySelector('.aqua-info');
  const xdrEl = modal.querySelector('.aqua-xdr');

  let refreshInterval; let buildTimeout;

  // WalletConnect state
  let wc = {
    signClient: null,
    modal: null,
    session: null,
    topic: null,
    address: ''
  };

  // Stellar Lab URL prefixes
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

  // ========= Freighter detection (no await here) =========
  let freighterCheckTimer = null;
  let hasFreighter = false;

  function getFreighter() { return window.freighterApi; }
  function freighterHasConnect(api) {
    return !!(api && (typeof api.requestAccess === 'function' || typeof api.getAddress === 'function'));
  }
  function detectFreighterOnce() {
    const api = getFreighter();
    if (freighterHasConnect(api)) {
      hasFreighter = true;
      freighterConnectBtn.disabled = false;
      if (xdrEl.value.trim()) freighterSignBtn.disabled = false;
      if (freighterCheckTimer) { clearInterval(freighterCheckTimer); freighterCheckTimer = null; }
      return true;
    }
    return false;
  }
  function waitForFreighter(maxMs = 6000, intervalMs = 250) {
    if (detectFreighterOnce()) return;
    const start = Date.now();
    freighterCheckTimer = setInterval(() => {
      if (detectFreighterOnce() || Date.now() - start > maxMs) {
        if (!hasFreighter) {
          freighterConnectBtn.textContent = 'Freighter not found';
          freighterConnectBtn.disabled = true;
        }
        clearInterval(freighterCheckTimer);
        freighterCheckTimer = null;
      }
    }, intervalMs);
  }
  // attempt early, and again on focus (extension may unlock late)
  waitForFreighter();
  window.addEventListener('focus', detectFreighterOnce);

  // Open/close handlers
  function setWcButtonsState() {
    if (wcConnectBtn) wcConnectBtn.disabled = false; // will be refined when libs load
    if (wcSignBtn) wcSignBtn.disabled = !wc.address;
  }
  function openModal() { modal.style.display = 'flex'; pubKeyIn.focus(); detectFreighterOnce(); }
  function closeModal() { modal.style.display = 'none'; clearInterval(refreshInterval); }
  document.querySelector(triggerSelector).addEventListener('click', openModal);
  setWcButtonsState();
  closeBtn.addEventListener('click', closeModal);

  // Helpers
  function injectScriptOnce(id, src) {
    if (document.getElementById(id)) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.id = id; s.src = src; s.onload = () => resolve(); s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  function injectCssOnce(id, href) {
    if (document.getElementById(id)) return;
    const l = document.createElement('link');
    l.id = id; l.rel = 'stylesheet'; l.href = href; document.head.appendChild(l);
  }
  function isValidPubKey(k) {
    try { return StellarSdk.StrKey.isValidEd25519PublicKey(k); } catch { return false; }
  }
  function sanitizeAmount(aStr) {
    const n = Number(aStr);
    if (!isFinite(n) || n <= 0) return null;
    return n.toFixed(7).replace(/\.0+$/, '');
  }
  async function getFreighterAddressSafe(freighter) {
    try {
      if (freighter && typeof freighter.getAddress === 'function') {
        const res = await freighter.getAddress();
        const addr = res?.address || '';
        if (addr) return addr;
      }
      if (freighter && typeof freighter.requestAccess === 'function') {
        const res = await freighter.requestAccess();
        return res?.address || '';
      }
    } catch (_) {}
    return '';
  }

  async function ensureWalletConnectLibs() {
    // Prefer pinned jsDelivr builds for reliability
    const cssHref = 'https://cdn.jsdelivr.net/npm/@walletconnect/modal@2.6.2/dist/styles.css';
    const signSrc = 'https://cdn.jsdelivr.net/npm/@walletconnect/sign-client@2.13.3/dist/index.umd.js';
    const modalSrc = 'https://cdn.jsdelivr.net/npm/@walletconnect/modal@2.6.2/dist/index.umd.js';

    if (!(window.WalletConnectSign && window.WalletConnectModal)) {
      injectCssOnce('wc-modal-css', cssHref);
      // Load sign-client first, then modal
      await injectScriptOnce('wc-sign', signSrc);
      await injectScriptOnce('wc-modal', modalSrc);
    }

    // Normalize globals across different UMD flavors
    const SignNS = window.WalletConnectSign || window.WalletConnect || {};
    const ModalNS = window.WalletConnectModal || {};
    const SignClientCtor = (SignNS.default && SignNS.default.SignClient) || SignNS.SignClient;
    const ModalCtor = ModalNS.default || ModalNS; // some UMDs export ctor as default

    const ok = !!(SignClientCtor && ModalCtor);
    if (!ok) console.error('WalletConnect UMDs present but constructors missing', { SignNS, ModalNS });
    return ok;
  }(freighter) {
    try {
      if (freighter && typeof freighter.getAddress === 'function') {
        const res = await freighter.getAddress();
        const addr = res?.address || '';
        if (addr) return addr; // if not allowed/connected, fall through to requestAccess
      }
      if (freighter && typeof freighter.requestAccess === 'function') {
        const res = await freighter.requestAccess();
        return res?.address || '';
      }
    } catch (_) {}
    return '';
  }

  // Balance fetch on pubkey change & every 10s
  pubKeyIn.addEventListener('change', () => {
    clearInterval(refreshInterval);
    fetchBalance();
    refreshInterval = setInterval(fetchBalance, 10000);
    scheduleBuild();
  });

  // Input & percent buttons
  amtIn.addEventListener('input', scheduleBuild);
  pctBtns.forEach(btn => btn.addEventListener('click', () => {
    const bal = parseFloat(balanceEl.textContent) || 0;
    const v = (bal * (parseInt(btn.dataset.pct, 10) / 100));
    amtIn.value = sanitizeAmount(v);
    scheduleBuild();
  }));

  async function fetchBalance() {
    const pk = pubKeyIn.value.trim();
    if (!pk) { balanceEl.textContent = '-'; return; }
    if (!isValidPubKey(pk)) { balanceEl.textContent = 'Invalid key'; return; }
    try {
      const acct = await server.loadAccount(pk);
      const obj = acct.balances.find(
        b => b.asset_code === assetCode && b.asset_issuer === assetIssuer
      );
      balanceEl.textContent = obj ? obj.balance : '0';
    } catch (e) {
      console.error(e);
      balanceEl.textContent = 'Error';
    }
  }

  function scheduleBuild() {
    copyBtn.disabled = true;
    signBtn.disabled = true;
    viewBtn.disabled = true;
    if (hasFreighter) freighterSignBtn.disabled = true;
    clearTimeout(buildTimeout);
    buildTimeout = setTimeout(buildXDR, 700);
  }

  async function buildXDR() {
    const pk = pubKeyIn.value.trim();
    const amt = sanitizeAmount(amtIn.value.trim());
    if (!isValidPubKey(pk) || !amt) {
      infoEl.textContent = 'Enter a valid public key and a positive amount.';
      return;
    }
    try {
      const src = await server.loadAccount(pk);
      const now = new Date();
      const end = new Date(now);
      end.setUTCFullYear(end.getUTCFullYear() + 3);
      end.setUTCHours(23, 59, 59, 0);

      infoEl.textContent =
        `Lock start: ${now.toLocaleString()}
` +
        `Lock end:   ${end.toLocaleString(undefined, { timeZone: 'UTC' })}`;

      const endTs = Math.floor(end.getTime() / 1000).toString();
      const claimants = [
        new StellarSdk.Claimant(
          pk,
          StellarSdk.Claimant.predicateNot(
            StellarSdk.Claimant.predicateBeforeAbsoluteTime(endTs)
          )
        ),
        new StellarSdk.Claimant(
          trackerKey,
          StellarSdk.Claimant.predicateBeforeAbsoluteTime('0')
        )
      ];

      const tx = new StellarSdk.TransactionBuilder(src, { fee: 20000, networkPassphrase })
        .addOperation(
          StellarSdk.Operation.createClaimableBalance({
            asset: AQUA_ASSET,
            amount: amt,
            claimants
          })
        )
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

      if (hasFreighter) freighterSignBtn.disabled = false;
    } catch (e) {
      console.error(e);
      infoEl.textContent = 'Failed to build transaction. Check inputs and balance.';
    }
  }

  // Freighter actions
  freighterConnectBtn.addEventListener('click', async () => {
    try {
      const freighter = getFreighter();
      infoEl.textContent = 'Requesting access from Freighter…';
      const pubkey = await getFreighterAddressSafe(freighter);
      if (!pubkey) throw new Error('Access denied or no address');
      pubKeyIn.value = pubkey;
      infoEl.textContent = `Freighter connected.
Public key: ${pubkey}`;
      clearInterval(refreshInterval);
      await fetchBalance();
      refreshInterval = setInterval(fetchBalance, 10000);
      scheduleBuild();
    } catch (e) {
      console.error(e);
      infoEl.textContent = 'Freighter connect failed or was denied.';
    }
  });

  freighterSignBtn.addEventListener('click', async () => {
    try {
      const freighter = getFreighter();
      const pkInput = pubKeyIn.value.trim();
      if (!isValidPubKey(pkInput)) { infoEl.textContent = 'Invalid public key.'; return; }

      infoEl.textContent = 'Preparing transaction for Freighter…';

      const freighterPk = await getFreighterAddressSafe(freighter);
      if (!freighterPk) { infoEl.textContent = 'No Freighter address available.'; return; }
      if (freighterPk !== pkInput) {
        infoEl.textContent = `Freighter account (${freighterPk.slice(0,6)}…${freighterPk.slice(-6)}) does not match the Public Key input. Update the input or switch account in Freighter.`;
        return;
      }

      const unsignedXdr = xdrEl.value.trim();
      if (!unsignedXdr) { infoEl.textContent = 'No XDR to sign. Enter amount and build first.'; return; }

      const signedRes = await freighter.signTransaction(unsignedXdr, { networkPassphrase, address: freighterPk });
      if (signedRes?.error) throw new Error(signedRes.error.message || 'sign failed');
      const signedXdr = signedRes.signedTxXdr;

      infoEl.textContent = 'Submitting to Horizon…';
      const tx = StellarSdk.TransactionBuilder.fromXDR(signedXdr, networkPassphrase);
      const res = await server.submitTransaction(tx);

      const txHash = res.hash;
      infoEl.innerHTML =
        `Submitted ✅
Hash: ${txHash}
` +
        `View: https://stellar.expert/explorer/public/tx/${txHash}`;
    } catch (e) {
      console.error(e);
      const msg = (e && e.message) ? e.message : 'Sign/submit failed.';
      infoEl.textContent = `Error: ${msg}`;
    }
  });

  // WalletConnect actions
  wcConnectBtn.addEventListener('click', async () => {
    try {
      infoEl.textContent = 'Loading WalletConnect…';
      const ok = await ensureWalletConnectLibs();
      if (!ok) { infoEl.textContent = 'WalletConnect libraries failed to load.'; return; }

      const SignNS = window.WalletConnectSign || window.WalletConnect || {};
      const ModalNS = window.WalletConnectModal || {};
      const SignClient = (SignNS.default && SignNS.default.SignClient) || SignNS.SignClient;
      const WalletConnectModal = ModalNS.default || ModalNS;

      if (!wc.signClient) {
        wc.signClient = await SignClient.init({ projectId: walletConnectProjectId });
        wc.modal = new WalletConnectModal({ projectId: walletConnectProjectId, themeMode: 'light' });

        wc.signClient.on('session_delete', () => {
          wc.session = null; wc.topic = null; wc.address = '';
          setWcButtonsState();
        });
      }

      const requiredNamespaces = {
        stellar: {
          chains: [walletConnectChain],
          methods: ['stellar_getAddress', 'stellar_signXDR'],
          events: []
        }
      };

      const { uri, approval } = await wc.signClient.connect({ requiredNamespaces });
      if (uri) await wc.modal.openModal({ uri });

      wc.session = await approval();
      wc.modal.closeModal();
      wc.topic = wc.session.topic;

      try {
        const res = await wc.signClient.request({
          topic: wc.topic,
          chainId: walletConnectChain,
          request: { method: 'stellar_getAddress', params: {} }
        });
        wc.address = (res && (res.address || res)) || '';
      } catch (_) {
        const acc = wc.session.namespaces?.stellar?.accounts?.[0];
        wc.address = acc ? acc.split(':').pop() : '';
      }

      if (!wc.address) throw new Error('No address from wallet');

      // Push into modal input to trigger existing flows
      pubKeyIn.value = wc.address;
      pubKeyIn.dispatchEvent(new Event('change', { bubbles: true }));
      infoEl.textContent = `WalletConnect connected.
Public key: ${wc.address}`;
      setWcButtonsState();
    } catch (e) {
      console.error(e);
      infoEl.textContent = 'WalletConnect connect was cancelled or failed.';
    }
  });

  wcSignBtn.addEventListener('click', async () => {
    try {
      if (!wc.session || !wc.topic || !wc.address) {
        infoEl.textContent = 'Connect a wallet via QR first.'; return;
      }
      const unsignedXdr = xdrEl.value.trim();
      if (!unsignedXdr) { infoEl.textContent = 'No XDR to sign. Enter amount and build first.'; return; }

      infoEl.textContent = 'Preparing transaction for WalletConnect…';

      const result = await wc.signClient.request({
        topic: wc.topic,
        chainId: walletConnectChain,
        request: {
          method: 'stellar_signXDR',
          params: { xdr: unsignedXdr, address: wc.address, networkPassphrase }
        }
      });

      const signedXdr = result?.signedXDR || result?.signedTxXdr || result;
      if (!signedXdr || typeof signedXdr !== 'string') throw new Error('Wallet returned no signed XDR');

      infoEl.textContent = 'Submitting to Horizon…';
      const tx = StellarSdk.TransactionBuilder.fromXDR(signedXdr, networkPassphrase);
      const res = await server.submitTransaction(tx);

      const txHash = res.hash;
      infoEl.innerHTML =
        `Submitted ✅
Hash: ${txHash}
` +
        `View: https://stellar.expert/explorer/public/tx/${txHash}`;
    } catch (e) {
      console.error(e);
      infoEl.textContent = `WalletConnect sign/submit failed: ${e?.message || e}`;
    }
  });
      if (signedRes?.error) throw new Error(signedRes.error.message || 'sign failed');
      const signedXdr = signedRes.signedTxXdr;

      infoEl.textContent = 'Submitting to Horizon…';
      const tx = StellarSdk.TransactionBuilder.fromXDR(signedXdr, networkPassphrase);
      const res = await server.submitTransaction(tx);

      const txHash = res.hash;
      infoEl.innerHTML =
        `Submitted ✅
Hash: ${txHash}
` +
        `View: https://stellar.expert/explorer/public/tx/${txHash}`;
    } catch (e) {
      console.error(e);
      const msg = (e && e.message) ? e.message : 'Sign/submit failed.';
      infoEl.textContent = `Error: ${msg}`;
    }
  });

  // Copy XDR
  copyBtn.addEventListener('click', () => {
    navigator.clipboard
      .writeText(xdrEl.value)
      .then(() => {
        copyBtn.textContent = 'Copied!';
        setTimeout(() => (copyBtn.textContent = 'Copy XDR'), 2000);
      })
      .catch(console.error);
  });

  // Hide initially
  modal.style.display = 'none';
}
