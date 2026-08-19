# GudTek

GudTek is a beginner-friendly Node.js/Vite web app for connecting crypto wallets and viewing recent public transactions.

## Features

- Connect EVM wallets such as MetaMask and Rabby.
- Connect Solana/Jupiter-compatible wallets through the browser Solana provider.
- View up to 10 recent public transactions or signatures.
- Uses Tailwind CSS for a clean responsive interface.
- Read-only wallet access: the app never asks for seed phrases or private keys.

## Getting started

```bash
npm install
npm run dev
```

Open the local URL from Vite in a browser with MetaMask, Rabby, Phantom, Backpack, or another compatible wallet installed.

## Production notes

- EVM transaction history uses the public Etherscan account endpoint. For production reliability, add your own API key and proxy requests through a backend.
- Solana transaction history uses `getSignaturesForAddress` from the public Solana mainnet RPC endpoint. For production reliability, use a dedicated RPC provider.
