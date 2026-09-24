// TON Connect: how a Daily Race winner hands over a wallet address. Loaded
// only when someone claims (the SDK is large); Telegram requires TON Connect
// for wallet connections in Mini Apps.
const MANIFEST_URL = 'https://plugrun.io/tonconnect-manifest.json';
// Where a wallet app sends the player back after approving.
const RETURN_URL = 'https://t.me/PlugRunBot/play';

let ui = null;
async function tonConnect() {
  if (ui) return ui;
  const { TonConnectUI, THEME } = await import('@tonconnect/ui');
  ui = new TonConnectUI({ manifestUrl: MANIFEST_URL });
  ui.uiOptions = { uiPreferences: { theme: THEME.DARK }, actionsConfiguration: { twaReturnUrl: RETURN_URL } };
  return ui;
}

const account = (a) => (a?.address ? { address: a.address, chain: a.chain } : null);

/**
 * Connect a TON wallet. Resolves { address (raw "0:…"), chain } once the
 * player approves, or null when they close the picker without choosing.
 */
export async function connectTonWallet() {
  const c = await tonConnect();
  await c.connectionRestored.catch(() => false);
  if (c.account) return account(c.account);
  return new Promise((resolve) => {
    let done = false;
    let offStatus = () => {};
    let offModal = () => {};
    const finish = (value) => { if (done) return; done = true; offStatus(); offModal(); resolve(value); };
    offStatus = c.onStatusChange((wallet) => { if (wallet?.account) finish(account(wallet.account)); }, () => finish(null));
    // Picking a wallet closes the picker too; only a plain close means "not now".
    offModal = c.onModalStateChange((state) => {
      if (state?.status === 'closed' && state.closeReason !== 'wallet-selected') finish(null);
    });
    c.openModal().catch(() => finish(null));
  });
}
