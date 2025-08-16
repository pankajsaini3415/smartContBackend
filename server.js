// server.js
const express = require('express');
const bodyParser = require('body-parser');
const TronWeb = require('tronweb');
const cors = require('cors');

const app = express();
app.use(bodyParser.json());
app.use(cors());

const tronWeb = new TronWeb({
  fullHost: 'https://api.trongrid.io',
  headers: { 'TRON-PRO-API-KEY': '3cce4886-7d8b-460c-b41e-b294ba6ebd93' }
});

const FEE_LIMIT = 1_000_000_000;

// --- small helper: fetch correct active permission id (fallback to 0) ---
async function getActivePermissionId(base58) {
  try {
    const acc = await tronWeb.trx.getAccount(base58);
    if (acc?.active_permission?.length) {
      // usually first active permission; TRON default often id=2
      return acc.active_permission[0].id;
    }
  } catch (e) {
    console.error('getActivePermissionId error:', e.message);
  }
  return 0; // fallback Owner (not ideal for approve, but safe fallback)
}

// --- create-approve ---
app.post('/create-approve', async (req, res) => {
  try {
    const { from, token, spender, amount } = req.body;
    if (!from || !token || !spender || !amount) {
      return res.status(400).json({ error: 'Missing parameters' });
    }

    const ownerHex   = from;
    const tokenHex   = token;
    const spenderHex = spender;
    const approveAmt = 10 * 1e6;

    // pick correct permission id from chain
    const permissionId = await getActivePermissionId(from);

    const parameters = [
      { type: 'address', value: spenderHex },
      { type: 'uint256', value: approveAmt }
    ];
   const functionSelector = "approve(address,uint256)";
    const txResp = await tronWeb.transactionBuilder.triggerSmartContract(
      tokenHex,
      functionSelector,
      { feeLimit: 150_000_000 },
      parameters,
      ownerHex        // <-- owner_address as 5th param
    );

    console.log('triggerSmartContract response:', JSON.stringify(txResp, null, 2));

    if (!txResp || !txResp.transaction) {
      return res.status(500).json({
        error: 'Approval transaction creation failed.',
        details: txResp || null
      });
    }

    // Also stamp permission_id into raw_data (some wallets ignore options)
    txResp.transaction.raw_data.permission_id = permissionId;

    return res.json(txResp.transaction);
  } catch (err) {
    console.error('Create-approve error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// --- broadcast (accepts either full signed tx or {signature} only) ---
app.post('/broadcast', async (req, res) => {
  try {
    let { signedTx } = req.body;
    if (!signedTx) {
      return res.status(400).json({ error: 'Missing signedTx' });
    }

    // some wallets return { signature: '0x...' } only — handle merge here if needed
    if (!signedTx.signature && signedTx.signatureHex && signedTx.raw_data_hex) {
      signedTx.signature = [signedTx.signatureHex.replace(/^0x/, '')];
    }
    if (Array.isArray(signedTx.signature) && signedTx.signature[0]?.startsWith('0x')) {
      signedTx.signature = [signedTx.signature[0].replace(/^0x/, '')];
    }

    const result = await tronWeb.trx.sendRawTransaction(signedTx);
    return res.json(result);
  } catch (err) {
    console.error('Broadcast error:', err);
    return res.status(500).json({ error: err.message });
  }
});

app.listen(3001, () => console.log('Backend on :3001'));

