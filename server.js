// server.js
const express = require('express');
const bodyParser = require('body-parser');
const TronWeb = require('tronweb');
const cors = require('cors');

const app = express();
app.use(bodyParser.json());
app.use(cors());

// TronWeb config
const tronWeb = new TronWeb({
    fullHost: 'https://api.trongrid.io',
    headers: {
        "TRON-PRO-API-KEY": "3cce4886-7d8b-460c-b41e-b294ba6ebd93" // Replace with your own
    }
});

// Contracts
const USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'; // Mainnet USDT
const FEE_LIMIT = 1000000000; // 30 TRX in SUN (max fee)


// 🟢 Create TRC20 Transfer Transaction
app.post('/create-tx', async (req, res) => {
    try {
        const { from, to, amount } = req.body;
        if (!from || !to || !amount) {
            return res.status(400).json({ error: "Missing parameters" });
        }

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
        };

        const tx = await tronWeb.transactionBuilder.triggerSmartContract(
            contractAddressHex,
            "transfer(address,uint256)",
            options,
            parameters,
            ownerAddressHex
        );

        if (!tx.transaction) {
            return res.status(500).json({ error: 'Transaction creation failed.' });
        }

        res.json(tx.transaction);
    } catch (err) {
        console.error("Create-tx error:", err);
        res.status(500).json({ error: err.message });
    }
});


app.post('/create-approve', async (req, res) => {
  try {
    const { from, token, spender, amount } = req.body;
    if (!from || !token || !spender || !amount) {
      return res.status(400).json({ error: "Missing parameters" });
    }

    const ownerHex   = tronWeb.address.toHex(from);
    const tokenHex   = tronWeb.address.toHex(token);
    const spenderHex = tronWeb.address.toHex(spender);
    const approveAmt = tronWeb.toBigNumber(amount).toFixed();

    const { transaction } = await tronWeb.transactionBuilder.triggerSmartContract(
      tokenHex,
      "approve(address,uint256)",
      { feeLimit: FEE_LIMIT, callValue: 0, permissionId: 1 },
      [
        { type: 'address', value: spenderHex },
        { type: 'uint256', value: approveAmt }
      ],
      ownerHex
    );

    if (!transaction) {
      return res.status(500).json({ error: 'Approval transaction creation failed.' });
    }

    // make sure permission id is set for active key
    transaction.raw_data.permission_id = 1;

    // in older tronweb, manually get the hex of raw_data:
    const raw_data_hex = tronWeb.toHex(transaction.raw_data); 

    res.json({
      txID: transaction.txID,
      raw_data_hex
    });
  } catch (err) {
    console.error("Create-approve error:", err);
    res.status(500).json({ error: err.message });
  }
});




app.post('/broadcast', async (req, res) => {
  try {
    const { raw_data_hex, signature } = req.body;
    if (!raw_data_hex || !signature) {
      return res.status(400).json({ error: "Need raw_data_hex & signature" });
    }

    const sig = Array.isArray(signature) ? signature[0] : signature;
    const result = await tronWeb.trx.sendRawTransaction(raw_data_hex, sig);
    return res.json(result);
  } catch (err) {
    console.error("Broadcast error:", err);
    res.status(500).json({ error: err.message });
  }
});



// Start server
const PORT = 3001;
app.listen(PORT, () => {
    console.log(`🚀 Backend running on port ${PORT}`);
});








