import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowDownLeft, ArrowUpRight, Coins, Copy, PlugZap, RefreshCw, ShieldCheck, Wallet } from 'lucide-react';
import './styles.css';

const ETHERSCAN_URL = 'https://api.etherscan.io/api';
const SOLANA_RPC_URL = 'https://api.mainnet-beta.solana.com';

function shortAddress(address) {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatDate(timestamp) {
  if (!timestamp) return 'Pending';
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

function normalizeEvmTransactions(wallet, result = []) {
  return result.slice(0, 10).map((tx) => {
    const incoming = tx.to?.toLowerCase() === wallet.toLowerCase();
    return {
      id: tx.hash,
      type: incoming ? 'Received' : 'Sent',
      network: 'Ethereum',
      from: shortAddress(tx.from),
      to: shortAddress(tx.to),
      amount: `${Number(tx.value) / 1e18} ETH`,
      date: formatDate(Number(tx.timeStamp) * 1000),
      link: `https://etherscan.io/tx/${tx.hash}`,
    };
  });
}

function normalizeSolanaTransactions(signatures = []) {
  return signatures.slice(0, 10).map((tx) => ({
    id: tx.signature,
    type: tx.err ? 'Failed' : 'Confirmed',
    network: 'Solana',
    from: 'Connected wallet',
    to: 'Solana program',
    amount: 'Open details',
    date: formatDate(tx.blockTime ? tx.blockTime * 1000 : null),
    link: `https://solscan.io/tx/${tx.signature}`,
  }));
}

async function getInjectedEvmProvider() {
  if (window.ethereum?.providers?.length) {
    return window.ethereum.providers.find((provider) => provider.isRabby) || window.ethereum.providers.find((provider) => provider.isMetaMask) || window.ethereum.providers[0];
  }
  return window.ethereum;
}

function App() {
  const [walletInfo, setWalletInfo] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [status, setStatus] = useState('Choose a wallet adapter to get started.');
  const [isLoading, setIsLoading] = useState(false);

  const connectorCards = useMemo(() => [
    {
      name: 'MetaMask',
      label: 'Browser EVM wallet',
      description: 'Connects Ethereum-compatible wallets that inject window.ethereum.',
      action: connectEvmWallet,
    },
    {
      name: 'Rabby',
      label: 'Advanced EVM wallet',
      description: 'Works through the same safe injected wallet adapter as MetaMask.',
      action: connectEvmWallet,
    },
    {
      name: 'Jupiter / Solana',
      label: 'Solana wallet adapter',
      description: 'Connect a Solana wallet, then review recent signatures in Solscan.',
      action: connectSolanaWallet,
    },
  ], []);

  async function loadEvmTransactions(address) {
    setStatus('Loading recent Ethereum transactions...');
    const url = `${ETHERSCAN_URL}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=10&sort=desc`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== '1') {
      setTransactions([]);
      setStatus(data.message === 'No transactions found' ? 'No recent Ethereum transactions found.' : 'Etherscan may require an API key in production. Try another wallet or add your own backend proxy.');
      return;
    }

    setTransactions(normalizeEvmTransactions(address, data.result));
    setStatus('Recent Ethereum transactions loaded.');
  }

  async function loadSolanaTransactions(publicKey) {
    setStatus('Loading recent Solana transactions...');
    const response = await fetch(SOLANA_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'gudtek-recent-transactions',
        method: 'getSignaturesForAddress',
        params: [publicKey, { limit: 10 }],
      }),
    });
    const data = await response.json();
    setTransactions(normalizeSolanaTransactions(data.result || []));
    setStatus(data.result?.length ? 'Recent Solana transactions loaded.' : 'No recent Solana transactions found.');
  }

  async function connectEvmWallet() {
    try {
      setIsLoading(true);
      const provider = await getInjectedEvmProvider();
      if (!provider) {
        setStatus('Install MetaMask or Rabby to connect an EVM wallet.');
        return;
      }
      const [address] = await provider.request({ method: 'eth_requestAccounts' });
      setWalletInfo({ adapter: provider.isRabby ? 'Rabby' : 'MetaMask / EVM', address, network: 'Ethereum' });
      await loadEvmTransactions(address);
    } catch (error) {
      setStatus(error.message || 'Could not connect EVM wallet.');
    } finally {
      setIsLoading(false);
    }
  }

  async function connectSolanaWallet() {
    try {
      setIsLoading(true);
      const provider = window.jupiter?.solana || window.solana;
      if (!provider) {
        setStatus('Install a Solana wallet such as Phantom, Backpack, or a Jupiter-compatible wallet.');
        return;
      }
      const response = await provider.connect();
      const publicKey = response.publicKey?.toString() || provider.publicKey?.toString();
      setWalletInfo({ adapter: 'Jupiter / Solana', address: publicKey, network: 'Solana' });
      await loadSolanaTransactions(publicKey);
    } catch (error) {
      setStatus(error.message || 'Could not connect Solana wallet.');
    } finally {
      setIsLoading(false);
    }
  }

  async function refreshTransactions() {
    if (!walletInfo) return;
    setIsLoading(true);
    try {
      if (walletInfo.network === 'Solana') await loadSolanaTransactions(walletInfo.address);
      else await loadEvmTransactions(walletInfo.address);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-8 lg:px-8">
        <nav className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl shadow-cyan-950/30 backdrop-blur md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-cyan-400 p-3 text-slate-950"><Wallet /></div>
            <div>
              <p className="text-sm uppercase tracking-[0.4em] text-cyan-200">GudTek</p>
              <h1 className="text-2xl font-bold">Beginner Crypto Wallet Transactions</h1>
            </div>
          </div>
          <button onClick={refreshTransactions} disabled={!walletInfo || isLoading} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-40">
            <RefreshCw className={isLoading ? 'animate-spin' : ''} size={18} /> Refresh
          </button>
        </nav>

        <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-sm text-cyan-100"><ShieldCheck size={16} /> Read-only transaction viewer</span>
            <h2 className="text-4xl font-black leading-tight md:text-6xl">Connect a wallet and understand recent activity.</h2>
            <p className="max-w-2xl text-lg leading-8 text-slate-300">GudTek keeps things simple: pick a wallet adapter, approve the connection in your wallet, and the app shows the latest public transactions. It never asks for seed phrases or private keys.</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-400/20 to-purple-500/20 p-6">
            <h3 className="mb-4 text-xl font-bold">Wallet status</h3>
            <div className="rounded-2xl bg-slate-900/80 p-5">
              <p className="text-sm text-slate-400">Connected adapter</p>
              <p className="mt-1 text-2xl font-bold">{walletInfo?.adapter || 'Not connected'}</p>
              <p className="mt-4 text-sm text-slate-400">Address</p>
              <p className="mt-1 break-all font-mono text-cyan-200">{walletInfo?.address || 'Choose a wallet below'}</p>
              <p className="mt-4 rounded-xl bg-slate-800 p-3 text-sm text-slate-300">{status}</p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {connectorCards.map((card) => (
            <button key={card.name} onClick={card.action} disabled={isLoading} className="group rounded-3xl border border-white/10 bg-white/[0.06] p-6 text-left transition hover:-translate-y-1 hover:border-cyan-300/60 hover:bg-white/[0.09] disabled:cursor-wait">
              <PlugZap className="mb-5 text-cyan-300" />
              <p className="text-sm uppercase tracking-[0.25em] text-slate-400">{card.label}</p>
              <h3 className="mt-2 text-2xl font-bold">{card.name}</h3>
              <p className="mt-3 text-slate-300">{card.description}</p>
            </button>
          ))}
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <div className="mb-5 flex items-center gap-3"><Coins className="text-cyan-300" /><h3 className="text-2xl font-bold">Recent transactions</h3></div>
          <div className="space-y-3">
            {transactions.length === 0 && <p className="rounded-2xl bg-slate-900/70 p-5 text-slate-300">Connect a wallet to see up to 10 recent transactions.</p>}
            {transactions.map((tx) => (
              <a key={tx.id} href={tx.link} target="_blank" rel="noreferrer" className="grid gap-4 rounded-2xl bg-slate-900/80 p-5 transition hover:bg-slate-800 md:grid-cols-[auto_1fr_auto] md:items-center">
                <div className={`rounded-2xl p-3 ${tx.type === 'Received' || tx.type === 'Confirmed' ? 'bg-emerald-400/15 text-emerald-300' : 'bg-orange-400/15 text-orange-300'}`}>{tx.type === 'Received' || tx.type === 'Confirmed' ? <ArrowDownLeft /> : <ArrowUpRight />}</div>
                <div>
                  <p className="font-bold">{tx.type} on {tx.network}</p>
                  <p className="mt-1 text-sm text-slate-400">From {tx.from} to {tx.to} • {tx.date}</p>
                </div>
                <div className="flex items-center gap-2 font-semibold text-cyan-100"><Copy size={16} /> {tx.amount}</div>
              </a>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
