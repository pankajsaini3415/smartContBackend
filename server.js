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
    headers: {
        "TRON-PRO-API-KEY": "3cce4886-7d8b-460c-b41e-b294ba6ebd93"
    }
});

const USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'; // Mainnet USDT

// 1. Create raw transaction
app.post('/create-tx', async (req, res) => {
    try {
        const { from, to, amount } = req.body;

        // Convert TRX address to hex
        const ownerAddressHex = tronWeb.address.toHex(from);
        const contractAddressHex = tronWeb.address.toHex(USDT_CONTRACT);
        const toAddressHex = tronWeb.address.toHex(to);

        // Convert amount to SUN (6 decimals for USDT on Tron)
        const usdtAmount = tronWeb.toBigNumber(amount).times(1_000_000).toFixed();

        // Trigger the contract
        const { transaction, result } = await tronWeb.transactionBuilder.triggerSmartContract(
            contractAddressHex,
            "transfer(address,uint256)",
            {
                feeLimit: 1_000_000
            },
            [
                { type: 'address', value: toAddressHex },
                { type: 'uint256', value: usdtAmount }
            ],
            ownerAddressHex
        );

        if (!transaction) {
            return res.status(500).json({ error: 'Transaction creation failed.' });
        }

        res.json(transaction);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});


// 2. Broadcast signed transaction
app.post('/broadcast', async (req, res) => {
    try {
        const { signedTx } = req.body;
        const result = await tronWeb.trx.sendRawTransaction(signedTx);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(3001, () => {
    console.log("Backend running on port 3001");
});
