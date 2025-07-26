const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Your parameters
const PACKAGE_ID = '0x2dd087ebff39b64d32a92e5a44acad5d35986809c8593ba53c10eba50bfbe68f';
const WALLET_ADDRESS = '0x255158151d4ee767c2a5516b7cc391b4fcbcb35487425e81b5fcad3c89783838';
const IMAGE_URL = 'https://pokemonletsgo.pokemon.com/assets/img/common/char-pikachu.png';

async function mintNFTViaCLI() {
  console.log('🚀 Minting NFT via Sui CLI...');
  console.log(`📦 Package ID: ${PACKAGE_ID}`);
  console.log(`💰 Wallet Address: ${WALLET_ADDRESS}`);
  console.log(`🖼️  Image URL: ${IMAGE_URL}`);
  console.log('');

  try {
    // First, let's do a dry run to make sure everything works
    console.log('🔍 Running dry-run simulation...');
    const dryRunCommand = `sui client call --package ${PACKAGE_ID} --module loyalty_card --function mint_loyalty --args ${WALLET_ADDRESS} "${IMAGE_URL}" --dry-run`;
    
    const dryRunResult = await execAsync(dryRunCommand);
    console.log('✅ Dry run successful!');
    console.log('Dry run output:');
    console.log(dryRunResult.stdout);
    
    // If dry run succeeds, ask user if they want to proceed with actual minting
    console.log('');
    console.log('🎯 Dry run completed successfully!');
    console.log('💡 To execute the actual minting, run:');
    console.log('');
    console.log(`sui client call --package ${PACKAGE_ID} --module loyalty_card --function mint_loyalty --args ${WALLET_ADDRESS} "${IMAGE_URL}"`);
    console.log('');
    console.log('⚠️  Note: This will use gas from your active Sui wallet and actually mint the NFT.');
    
  } catch (error) {
    console.log('❌ Error occurred:');
    console.log('Error message:', error.message);
    if (error.stdout) {
      console.log('Stdout:', error.stdout);
    }
    if (error.stderr) {
      console.log('Stderr:', error.stderr);
    }
  }
}

// Run the minting
mintNFTViaCLI().catch(console.error);
