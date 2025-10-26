import React, { useState, useEffect } from "react";
import { ethers } from "ethers";

const CHAIN_OPTIONS = [
  { id: "gnosis", name: "Gnosis Chain", baseUrl: "https://gnosis.blockscout.com" },
  { id: "optimism", name: "Optimism", baseUrl: "https://optimism.blockscout.com" },
  { id: "base", name: "Base", baseUrl: "https://base.blockscout.com" },
  { id: "ethereum", name: "Ethereum", baseUrl: "https://eth.blockscout.com" },
];

const ERC20_ABI = [
  "function approve(address spender, uint256 value) external returns (bool)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
];

export default function App() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(null);
  const [balance, setBalance] = useState(null);
  const [chain, setChain] = useState(CHAIN_OPTIONS[0]);
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(false);

  async function connectWallet() {
    try {
      if (!window.ethereum) {
        alert("Please install MetaMask!");
        return;
      }
      const ethProvider = new ethers.providers.Web3Provider(window.ethereum);
      await ethProvider.send("eth_requestAccounts", []);
      const s = ethProvider.getSigner();
      const addr = await s.getAddress();
      setProvider(ethProvider);
      setSigner(s);
      setAccount(addr);
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchBalance() {
    if (!provider || !account) return;
    const bal = await provider.getBalance(account);
    setBalance(ethers.utils.formatEther(bal));
  }

  async function fetchApprovals() {
    if (!account) return;
    setLoading(true);
    setApprovals([]);
    try {
      const url = `${chain.baseUrl}/api/v2/addresses/${account}/token-approvals`;
      const res = await fetch(url);
      const data = await res.json();
      const approvals = data?.items || data?.result || [];
      setApprovals(approvals);
    } catch (e) {
      console.error(e);
      alert("Could not fetch approvals (CORS or API issue)");
    }
    setLoading(false);
  }

  async function revokeApproval(item) {
    try {
      if (!signer) return alert("Connect wallet first");
      const tokenAddress =
        item.token_address || item.contract_address || item.token?.address;
      const spender =
        item.spender || item.spender_address || item.approved_spender;

      const token = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
      const tx = await token.approve(spender, 0);
      await tx.wait();
      alert("Revoked successfully!");
    } catch (e) {
      console.error(e);
      alert("Transaction failed");
    }
  }

  useEffect(() => {
    if (account) fetchBalance();
  }, [account, provider]);

  return (
    <div className="app">
      <header className="header">
        <h1>Cross-Chain Control Center (MVP)</h1>
        {!account ? (
          <button className="btn" onClick={connectWallet}>
            Connect Wallet
          </button>
        ) : (
          <div className="wallet-info">
            <p><b>Address:</b> {account}</p>
            <p><b>Balance:</b> {balance ? `${balance} ETH` : "Loading..."}</p>
            <select
              value={chain.id}
              onChange={(e) =>
                setChain(CHAIN_OPTIONS.find((c) => c.id === e.target.value))
              }
            >
              {CHAIN_OPTIONS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </header>

      <main className="main">
        <section className="card">
          <h2>Swapscout (Cross-chain Swap)</h2>
          <iframe
            src="https://swapscout.blockscout.com"
            title="Swapscout"
            frameBorder="0"
            className="iframe"
          ></iframe>
        </section>

        <section className="card">
          <h2>Token Approvals (RevokeScout)</h2>
          {account && (
            <button className="btn small" onClick={fetchApprovals}>
              Fetch Approvals
            </button>
          )}
          {!account && <p>Connect your wallet to see approvals.</p>}
          {loading && <p>Loading approvals...</p>}
          <div className="approvals">
            {approvals.map((a, i) => (
              <div key={i} className="approval-item">
                <p>
                  <b>Token:</b> {a.token_symbol || "Unknown"} <br />
                  <b>Spender:</b>{" "}
                  {a.spender || a.spender_address || "Unknown"}
                </p>
                <button
                  className="btn danger small"
                  onClick={() => revokeApproval(a)}
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
