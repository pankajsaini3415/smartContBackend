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


// 🟢 Create TRC20 Approve Transaction
app.post('/create-approve', async (req, res) => {
    try {
        const { from, token, spender, amount } = req.body;
        
        if (!from || !token || !spender || !amount) {
            return res.status(400).json({ error: "Missing parameters" });
        }

        const ownerAddressHex = tronWeb.address.toHex(from);
        const tokenAddressHex = tronWeb.address.toHex(token);
        const spenderAddressHex = tronWeb.address.toHex(spender);
        const approveAmount = tronWeb.toBigNumber(amount).toFixed();

        const parameters = [
            { type: 'address', value: spenderAddressHex },
            { type: 'uint256', value: approveAmount }
        ];

        // Remove permission_id from options - let the wallet handle it
        const options = {
            feeLimit: FEE_LIMIT,
            callValue: 0
        };

        const tx = await tronWeb.transactionBuilder.triggerSmartContract(
            tokenAddressHex,
            "approve(address,uint256)",
            options,
            parameters,
            ownerAddressHex
        );
            
        if (!tx.transaction) {
            return res.status(500).json({ error: 'Approval transaction creation failed.' });
        }
        
        // Remove any permission_id from the transaction before sending to frontend
        if (tx.transaction.raw_data && tx.transaction.raw_data.contract) {
            tx.transaction.raw_data.contract.forEach(contract => {
                if (contract.Permission_id !== undefined) {
                    delete contract.Permission_id;
                }
            });
        }
        
        res.json(tx.transaction);
    } catch (err) {
        console.error("Create-approve error:", err);
        res.status(500).json({ error: err.message });
    }
});

// 🟢 Broadcast Signed Transaction
app.post('/broadcast', async (req, res) => {
    try {
        const { signedTx } = req.body;
        if (!signedTx) {
            return res.status(400).json({ error: "Missing signedTx" });
        }

        const result = await tronWeb.trx.sendRawTransaction(signedTx);
        res.json(result);
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






