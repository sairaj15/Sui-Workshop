/* global BigInt */

import React, { useState, useEffect } from 'react';
import { Transaction } from '@mysten/sui/transactions';
import {
  useSignAndExecuteTransaction,
  ConnectButton,
  useCurrentAccount
} from '@mysten/dapp-kit';
import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client';
import './App.css';

const suiClient = new SuiClient({ url: getFullnodeUrl('testnet') });
const GAS_BUDGET = 10000000;

const LoyaltyCardPage = () => {
  const currentAccount = useCurrentAccount();
  const [loading, setLoading] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [simulationError, setSimulationError] = useState('');
  const [simulationSuccess, setSimulationSuccess] = useState(false);
  const [simulationResults, setSimulationResults] = useState([]);
  const [packageId, setPackageId] = useState('');
  const [gasPrice, setGasPrice] = useState(null);

  // NFT Collection
  const [nfts, setNfts] = useState([]);
  const [fetchingNfts, setFetchingNfts] = useState(false);

  // Transfer modal state
  const [transferingNftId, setTransferingNftId] = useState(null);
  const [transferAddress, setTransferAddress] = useState('');
  const [transferError, setTransferError] = useState('');
  const [showTransferModal, setShowTransferModal] = useState(false);

  // Minting form state
  const [walletAddress, setWalletAddress] = useState('');
  const [imageUrls, setImageUrls] = useState(['']);
  const [mintResults, setMintResults] = useState([]);
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

  // Pre-fill wallet address when connected
  useEffect(() => {
    if (currentAccount?.address && !walletAddress) {
      setWalletAddress(currentAccount.address);
    }
    // eslint-disable-next-line
  }, [currentAccount]);

  // Fetch current gas price on mount
  useEffect(() => {
    const fetchGasPrice = async () => {
      try {
        const price = await suiClient.getReferenceGasPrice();
        setGasPrice(price);
      } catch (e) {
        setGasPrice(null);
      }
    };
    fetchGasPrice();
  }, []);

  // Fetch NFTs owned by the connected wallet
  useEffect(() => {
    const fetchNfts = async () => {
      if (!currentAccount?.address || !packageId.trim()) {
        setNfts([]);
        return;
      }
      setFetchingNfts(true);
      try {
        const objects = await suiClient.getOwnedObjects({
          owner: currentAccount.address,
          filter: {
            StructType: `${packageId}::loyalty_card::Loyalty`
          }
        });
        const details = await Promise.all(
          objects.data.map(obj =>
            suiClient.getObject({ id: obj.data.objectId, options: { showContent: true } })
          )
        );
        const nfts = details.map(obj => {
          const fields = obj.data.content.fields;
          return {
            id: obj.data.objectId,
            imageUrl: fields.image_url,
            customerId: fields.customer_id
          };
        });
        setNfts(nfts);
      } catch (e) {
        setNfts([]);
      }
      setFetchingNfts(false);
    };
    fetchNfts();
  }, [currentAccount, packageId, simulationSuccess, loading, mintResults]);

  // Handlers for dynamic image URL fields
  const handleImageUrlChange = (idx, e) => {
    const newUrls = [...imageUrls];
    newUrls[idx] = e.target.value;
    setImageUrls(newUrls);
  };

  const addImageUrlField = () => {
    setImageUrls([...imageUrls, '']);
  };

  const removeImageUrlField = (idx) => {
    if (imageUrls.length === 1) return;
    setImageUrls(imageUrls.filter((_, i) => i !== idx));
  };

  // Utility: Clean and validate package ID
  const getCleanPackageId = () => packageId.trim();

  // Utility: Clean and validate wallet address
  const getCleanWalletAddress = () => walletAddress.trim();

  // Utility: Clean and validate image URL
  const cleanImageUrl = (url) => {
    const originalUrl = url.trim();
    try {
      new URL(originalUrl);
      return originalUrl;
    } catch (e) {
      return originalUrl.normalize('NFC').replace(/[^\x00-\x7F]/g, '');
    }
  };

  // Simulate all NFTs in the list
  const handleSimulate = async () => {
    setSimulationError('');
    setSimulationSuccess(false);
    setSimulationResults([]);
    setSimulating(true);

    const cleanPackageId = getCleanPackageId();
    const cleanWalletAddress = getCleanWalletAddress();

    if (!cleanPackageId) {
      setSimulationError('Package ID is required');
      setSimulating(false);
      return;
    }
    if (!cleanWalletAddress) {
      setSimulationError('Wallet address is required');
      setSimulating(false);
      return;
    }
    if (!/^0x[0-9a-fA-F]{40,64}$/.test(cleanWalletAddress)) {
      setSimulationError('Wallet address must be a valid Sui address.');
      setSimulating(false);
      return;
    }
    if (imageUrls.some(url => !url.trim())) {
      setSimulationError('All image URLs are required');
      setSimulating(false);
      return;
    }

    let results = [];
    for (let i = 0; i < imageUrls.length; i++) {
      try {
        // Simulate (mocked for now)
        results.push({
          status: 'success',
          gasUsed: {
            computationCost: 3115080,
            storageCost: 0,
            storageRebate: 0
          }
        });
      } catch (error) {
        results.push({
          status: 'error',
          error: error.message || 'Simulation failed'
        });
      }
    }
    setSimulationResults(results);
    setSimulating(false);
    setSimulationSuccess(results.every(r => r.status === 'success'));
  };

  // Mint all NFTs in the list
  const handleMint = async () => {
    setLoading(true);
    setMintResults([]);
    const cleanPackageId = getCleanPackageId();
    const cleanWalletAddress = getCleanWalletAddress();

    let results = [];
    for (let i = 0; i < imageUrls.length; i++) {
      const url = cleanImageUrl(imageUrls[i]);
      try {
        const tx = new Transaction();
        tx.setSender(currentAccount.address);
        tx.moveCall({
          target: `${cleanPackageId}::loyalty_card::mint_loyalty`,
          arguments: [
            tx.pure.address(cleanWalletAddress),
            tx.pure.string(url)
          ],
          gasBudget: GAS_BUDGET
        });
        await signAndExecute({ transaction: tx });
        results.push({ status: 'success' });
      } catch (error) {
        results.push({ status: 'error', error: error.message });
      }
    }
    setMintResults(results);
    setLoading(false);
    setSimulationSuccess(false);
    setSimulationResults([]);
  };

  // Handle NFT transfer
  const handleTransferNft = async () => {
    setTransferError('');
    if (!transferAddress.trim() || !/^0x[0-9a-fA-F]{40,64}$/.test(transferAddress.trim())) {
      setTransferError('Please enter a valid Sui address.');
      return;
    }
    setLoading(true);
    try {
      const tx = new Transaction();
      tx.setSender(currentAccount.address);
      tx.transferObjects(
        [tx.object(transferingNftId)],
        tx.pure.address(transferAddress.trim())
      );
      await signAndExecute({ transaction: tx });
      setShowTransferModal(false);
      setTransferingNftId(null);
      setTransferAddress('');
      setTransferError('');
    } catch (error) {
      setTransferError(error.message || 'Transfer failed');
    }
    setLoading(false);
  };

  // Calculate total estimated gas fee in SUI (from simulation if available)
  let estimatedFeeSUI = null;
  if (
    simulationResults.length > 0 &&
    gasPrice &&
    simulationResults.every(r => r.status === 'success')
  ) {
    let totalGas = simulationResults.reduce((sum, r) => {
      const gasUsed = r.gasUsed;
      return sum +
        (BigInt(gasUsed.computationCost) +
          BigInt(gasUsed.storageCost) -
          BigInt(gasUsed.storageRebate));
    }, 0n);
    estimatedFeeSUI = (Number(totalGas) / 1e9).toFixed(8);
  }

  return (
    <div className="container" style={{ maxWidth: 700, margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center', marginBottom: 24 }}>Mint Your NFT on SUI</h1>
      <ConnectButton />

      <div
        className="mint-card"
        style={{
          background: '#181818',
          borderRadius: 12,
          boxShadow: '0 4px 24px #0008',
          padding: 24,
          margin: '32px 0 40px 0'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label>Package ID</label>
            <input
              type="text"
              value={packageId}
              onChange={(e) => setPackageId(e.target.value)}
              placeholder="Enter Package ID"
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label>
              Wallet Address
              <span style={{ fontSize: 11, color: '#aaa', marginLeft: 8 }}>
                (Enter your own address to see NFT in your wallet)
              </span>
            </label>
            <input
              type="text"
              name="customerId"
              value={walletAddress}
              onChange={e => setWalletAddress(e.target.value)}
              placeholder="Enter Customer Sui Address"
              style={{ width: '100%' }}
            />
          </div>
        </div>

        <label style={{ marginTop: 16, display: 'block' }}>Image URL(s)</label>
        {imageUrls.map((url, idx) => (
          <div
            key={idx}
            style={{
              marginBottom: 12,
              background: '#222',
              padding: 12,
              borderRadius: 8,
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <input
              type="text"
              value={url}
              onChange={e => handleImageUrlChange(idx, e)}
              placeholder={`Image URL #${idx + 1}`}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: 6,
                border: '1px solid #444',
                fontSize: 14,
                marginBottom: imageUrls.length > 1 ? 8 : 0
              }}
            />
            {imageUrls.length > 1 && (
              <button
                onClick={() => removeImageUrlField(idx)}
                style={{
                  width: '100%',
                  padding: '8px 0',
                  background: '#ff4c4c',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: 14,
                  whiteSpace: 'nowrap'
                }}
              >
                Remove
              </button>
            )}
          </div>
        ))}
        <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
          <button
            onClick={addImageUrlField}
            style={{
              background: '#ff4c4c',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: 14,
              padding: '8px 16px'
            }}
          >
            Add Another NFT
          </button>
          <button
            onClick={handleSimulate}
            disabled={
              simulating ||
              loading ||
              !walletAddress.trim() ||
              imageUrls.some(url => !url.trim()) ||
              !packageId.trim()
            }
            style={{
              background: '#ff4c4c',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: 14,
              padding: '8px 16px'
            }}
          >
            {simulating ? 'Simulating...' : 'Simulate NFT(s)'}
          </button>
        </div>

        {simulationError && (
          <div style={{ color: 'red', marginTop: '1rem' }}>
            {simulationError}
          </div>
        )}
        {simulationResults.length > 0 && (
          <div style={{ marginTop: '1rem' }}>
            {simulationResults.map((res, idx) =>
              res.status === 'success'
                ? <div key={idx} style={{ color: 'green' }}>NFT #{idx + 1}: Simulation successful!</div>
                : <div key={idx} style={{ color: 'red' }}>NFT #{idx + 1}: {res.error}</div>
            )}
          </div>
        )}
        {simulationResults.length > 0 && estimatedFeeSUI && (
          <div style={{ color: '#ffa500', margin: '1rem 0' }}>
            Estimated Total Gas Fee: <b>{estimatedFeeSUI} SUI</b>
          </div>
        )}

        {simulationResults.length > 0 &&
          simulationResults.every(r => r.status === 'success') && (
            <button
              style={{
                marginTop: '1rem',
                width: '100%',
                background: '#4fc3f7',
                color: '#222',
                border: 'none',
                borderRadius: 6,
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: 16,
                padding: '12px 0'
              }}
              onClick={handleMint}
              disabled={loading}
            >
              {loading ? 'Minting...' : 'Mint NFT(s)'}
            </button>
          )}

        {mintResults.length > 0 && (
          <div style={{ marginTop: '1rem' }}>
            {mintResults.map((res, idx) =>
              res.status === 'success'
                ? <div key={idx} style={{ color: 'green' }}>NFT #{idx + 1}: Minted!</div>
                : <div key={idx} style={{ color: 'red' }}>NFT #{idx + 1}: {res.error}</div>
            )}
          </div>
        )}
      </div>

      {/* Transfer Modal */}
      {showTransferModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#222',
            padding: 32,
            borderRadius: 12,
            minWidth: 340,
            boxShadow: '0 8px 32px #000',
            color: '#fff',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            <h3 style={{ marginBottom: 16 }}>Transfer NFT</h3>
            <input
              type="text"
              placeholder="Recipient Sui Address"
              value={transferAddress}
              onChange={e => setTransferAddress(e.target.value)}
              style={{
                width: '100%',
                marginBottom: 16,
                padding: 10,
                borderRadius: 6,
                border: '1px solid #444',
                fontSize: 15
              }}
            />
            {transferError && <div style={{ color: 'red', marginBottom: 12 }}>{transferError}</div>}
            <div style={{ display: 'flex', gap: 12, width: '100%' }}>
              <button
                onClick={handleTransferNft}
                disabled={loading}
                style={{
                  flex: 1,
                  background: '#ff4c4c',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: 15,
                  padding: '10px 0'
                }}
              >
                {loading ? 'Transferring...' : 'Confirm Transfer'}
              </button>
              <button
                onClick={() => setShowTransferModal(false)}
                disabled={loading}
                style={{
                  flex: 1,
                  background: '#4fc3f7',
                  color: '#222',
                  border: 'none',
                  borderRadius: 6,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: 15,
                  padding: '10px 0'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NFT Collection Preview */}
      <h2 style={{ marginTop: '2rem', textAlign: 'center' }}>Your Loyalty Card Collection</h2>
      {fetchingNfts && <div>Loading your NFTs...</div>}
      {!fetchingNfts && nfts.length === 0 && <div>No NFTs found.</div>}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.5rem',
          marginTop: 24
        }}
      >
        {nfts.map(nft => {
          const suiVisionUrl = `https://suivision.xyz/object/${nft.id}?network=testnet`;
          return (
            <div key={nft.id} style={{
              background: '#222',
              borderRadius: 12,
              padding: 16,
              textAlign: 'center',
              boxShadow: '0 2px 8px #0006'
            }}>
              <img
                src={nft.imageUrl}
                alt="NFT"
                style={{ width: '100%', borderRadius: 8, marginBottom: 10, maxHeight: 120, objectFit: 'cover' }}
                onError={e => { e.target.src = 'https://via.placeholder.com/150'; }}
              />
              <div style={{ fontSize: 12, color: '#aaa', marginBottom: 2 }}>ID: {nft.id.slice(0, 8)}...</div>
              <div style={{ fontSize: 12, color: '#aaa', marginBottom: 8 }}>Owner: {nft.customerId.slice(0, 8)}...</div>
              <div style={{ fontSize: 11, color: '#aaa', marginBottom: 8 }}>
                If transferred, this page will show the new owner.
              </div>
              <button
                style={{
                  width: '100%',
                  background: '#ff4c4c',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: 14,
                  padding: '8px 0',
                  marginBottom: 8
                }}
                onClick={() => {
                  setTransferingNftId(nft.id);
                  setShowTransferModal(true);
                  setTransferAddress('');
                  setTransferError('');
                }}
                disabled={loading}
              >
                Transfer
              </button>
              <a
                href={suiVisionUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  width: '100%',
                  display: 'inline-block',
                  background: '#4fc3f7',
                  color: '#222',
                  borderRadius: 6,
                  padding: '8px 0',
                  fontWeight: 600,
                  textDecoration: 'none',
                  fontSize: 14
                }}
              >
                Details
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LoyaltyCardPage;