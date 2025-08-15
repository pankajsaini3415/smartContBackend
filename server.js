// server.js
const express = require('express');
const bodyParser = require('body-parser');
const TronWeb = require('tronweb'); // keep as-is since it works on your machine
const cors = require('cors');

const app = express();
app.use(bodyParser.json());
app.use(cors());

const tronWeb = new TronWeb({
  fullHost: 'https://api.trongrid.io',
  headers: {
    'TRON-PRO-API-KEY': '3cce4886-7d8b-460c-b41e-b294ba6ebd93'
  }
});

const USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
const FEE_LIMIT = 1000000000;

// ----- Create TRC20 Transfer (USDT transfer(to, amount)) -----
app.post('/create-tx', async (req, res) => {
  try {
    const { from, to, amount } = req.body;
    if (!from || !to || !amount) return res.status(400).json({ error: 'Missing parameters' });

    const ownerAddressHex = tronWeb.address.toHex(from);
    const contractAddressHex = tronWeb.address.toHex(USDT_CONTRACT);
    const toAddressHex = tronWeb.address.toHex(to);
    const usdtAmount = tronWeb.toBigNumber(amount).toFixed();

    const parameters = [
      { type: 'address', value: toAddressHex },
      { type: 'uint256', value: usdtAmount }
    ];

    const options = {
      feeLimit: FEE_LIMIT,
      callValue: 0,
      // IMPORTANT: do NOT force permissionId unless you configured it on-chain
      // permissionId: 1
    };

    const tx = await tronWeb.transactionBuilder.triggerSmartContract(
      contractAddressHex,
      'transfer(address,uint256)',
      options,
      parameters,
      ownerAddressHex
    );

    if (!tx.transaction) return res.status(500).json({ error: 'Transaction creation failed.' });
    res.json(tx.transaction);
  } catch (err) {
    console.error('Create-tx error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ----- Create TRC20 Approve (approve(spender, amount)) -----
app.post('/create-approve', async (req, res) => {
  try {
    const { from, token, spender, amount } = req.body;
    if (!from || !token || !spender || !amount) {
      return res.status(400).json({ error: 'Missing parameters' });
    }

    // Convert all addresses to TRON hex format (41 prefix)
    const ownerAddressHex = tronWeb.address.toHex(from);   // 41xxxx...
    const tokenAddressHex = tronWeb.address.toHex(token);  // 41xxxx...

    const approveAmount = tronWeb.toBigNumber(amount).toFixed();

    const parameters = [
      { type: 'address', value: tronWeb.address.toHex(spender) },
      { type: 'uint256', value: approveAmount }
    ];

    // NOTICE: ownerAddressHex is last argument, NOT only inside options
    const tx = await tronWeb.transactionBuilder.triggerSmartContract(
      tokenAddressHex,
      'approve(address,uint256)',
      { feeLimit: FEE_LIMIT, callValue: 0 },
      parameters,
      ownerAddressHex
    );

    if (!tx || !tx.transaction) {
      return res.status(500).json({ error: 'Approval transaction creation failed', details: tx });
    }

    res.json(tx.transaction);
  } catch (err) {
    console.error('Create-approve error:', err);
    res.status(500).json({ error: err.message });
  }
});



// ----- Broadcast Signed Tx -----
app.post('/broadcast', async (req, res) => {
  try {
    const { signedTx } = req.body;
    if (!signedTx) return res.status(400).json({ error: 'Missing signedTx' });

    // basic sanity check: signature must exist
    if (!signedTx.signature || !signedTx.signature.length) {
      return res.status(400).json({ error: 'Missing signature array on signedTx' });
    }

    const result = await tronWeb.trx.sendRawTransaction(signedTx);
    res.json(result);
  } catch (err) {
    console.error('Broadcast error:', err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = 3001;
app.listen(PORT, () => console.log(`🚀 Backend on ${PORT}`));



