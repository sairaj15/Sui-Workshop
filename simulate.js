const { SuiClient, getFullnodeUrl } = require('@mysten/sui.js/client');
const { Transaction } = require('@mysten/sui/transactions');

// Initialize Sui client for testnet
const suiClient = new SuiClient({ url: getFullnodeUrl('testnet') });

// Your provided parameters
const PACKAGE_ID = '0x2dd087ebff39b64d32a92e5a44acad5d35986809c8593ba53c10eba50bfbe68f';
const WALLET_ADDRESS = '0x255158151d4ee767c2a5516b7cc391b4fcbcb35487425e81b5fcad3c89783838';
const IMAGE_URL = 'https://pokemonletsgo.pokemon.com/assets/img/common/char-pikachu.png';

async function trySimulationWithUrl(imageUrl, urlDescription) {
  console.log(`🔍 Trying simulation with ${urlDescription}: ${imageUrl}`);
  
  try {
    const tx = new Transaction();
    tx.setSender(WALLET_ADDRESS);
    
    tx.moveCall({
      target: `${PACKAGE_ID}::loyalty_card::mint_loyalty`,
      arguments: [
        tx.pure.address(WALLET_ADDRESS),
        tx.pure.string(imageUrl)
      ]
    });

    const txBytes = await tx.build({ client: suiClient });
    const result = await suiClient.devInspectTransactionBlock({
      sender: WALLET_ADDRESS,
      transactionBlock: txBytes,
    });

    return { success: true, result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function simulateNFTMinting() {
  console.log('🚀 Starting Sui NFT Minting Simulation...');
  console.log(`📦 Package ID: ${PACKAGE_ID}`);
  console.log(`💰 Wallet Address: ${WALLET_ADDRESS}`);
  console.log(`🖼️  Original Image URL: ${IMAGE_URL}`);
  console.log('');

  // Try different versions of the image URL
  const urlsToTry = [
    { url: IMAGE_URL, description: 'original URL' },
    { url: 'pikachu-nft', description: 'simplified string' },
    { url: 'test', description: 'basic test string' },
    { url: 'https://example.com/pikachu.png', description: 'example URL' }
  ];

  for (const { url, description } of urlsToTry) {
    const { success, result, error } = await trySimulationWithUrl(url, description);
    
    if (success) {
      // Check simulation results
      if (
        result.effects &&
        result.effects.status &&
        result.effects.status.status === 'success'
      ) {
        console.log('✅ Simulation SUCCESSFUL!');
        console.log('');
        console.log('📊 Simulation Results:');
        console.log(`   Status: ${result.effects.status.status}`);
        console.log(`   Gas Used: ${result.effects.gasUsed?.computationCost || 'N/A'}`);
        
        if (result.effects.created && result.effects.created.length > 0) {
          console.log('📄 Objects Created:');
          result.effects.created.forEach((obj, index) => {
            console.log(`   ${index + 1}. ${obj.reference.objectId} (${obj.reference.version})`);
          });
        }
        
        if (result.effects.mutated && result.effects.mutated.length > 0) {
          console.log('🔄 Objects Mutated:');
          result.effects.mutated.forEach((obj, index) => {
            console.log(`   ${index + 1}. ${obj.reference.objectId} (${obj.reference.version})`);
          });
        }

        console.log('');
        console.log(`🎉 The NFT minting transaction would succeed with ${description}!`);
        console.log('💡 You can now proceed with the actual minting through the UI.');
        return; // Success! Exit the function
        
      } else {
        console.log(`❌ Simulation with ${description} failed at execution level`);
        const errorMsg = result.effects?.status?.error || 'Unknown error';
        console.log(`❗ Error: ${errorMsg}`);
        console.log('');
      }
    } else {
      console.log(`💥 Simulation with ${description} encountered error: ${error}`);
      console.log('');
    }
  }

  // If we get here, all attempts failed
  console.log('🚫 All simulation attempts failed.');
  console.log('');
  console.log('💡 This might indicate:');
  console.log('   - The package ID is incorrect');
  console.log('   - The function name "mint_loyalty" doesn\'t exist');
  console.log('   - The contract hasn\'t been deployed to testnet');
  console.log('   - There are issues with the Move contract itself');
}

// Run the simulation
simulateNFTMinting().catch(console.error);
