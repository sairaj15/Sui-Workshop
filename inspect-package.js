const { SuiClient, getFullnodeUrl } = require('@mysten/sui.js/client');

// Initialize Sui client for testnet
const suiClient = new SuiClient({ url: getFullnodeUrl('testnet') });

// Your provided package ID
const PACKAGE_ID = '0x2dd087ebff39b64d32a92e5a44acad5d35986809c8593ba53c10eba50bfbe68f';

async function inspectPackage() {
  console.log('🔍 Inspecting Sui Package...');
  console.log(`📦 Package ID: ${PACKAGE_ID}`);
  console.log('');

  try {
    // Try to get the package object
    console.log('🔎 Checking if package exists...');
    const packageObj = await suiClient.getObject({
      id: PACKAGE_ID,
      options: {
        showContent: true,
        showType: true,
        showOwner: true,
        showPreviousTransaction: true,
        showStorageRebate: true,
        showDisplay: true
      }
    });

    if (packageObj.error) {
      console.log('❌ Package not found or error occurred:');
      console.log(`   Error: ${packageObj.error}`);
      return;
    }

    console.log('✅ Package found!');
    console.log(`   Object ID: ${packageObj.data.objectId}`);
    console.log(`   Version: ${packageObj.data.version}`);
    console.log(`   Type: ${packageObj.data.type || 'N/A'}`);
    console.log(`   Owner: ${JSON.stringify(packageObj.data.owner)}`);
    console.log('');

    // Try to get all objects owned by this package or related to it
    console.log('🔍 Checking package contents...');
    if (packageObj.data.content) {
      console.log('📄 Package Content:');
      console.log(JSON.stringify(packageObj.data.content, null, 2));
    } else {
      console.log('❓ No content information available');
    }

  } catch (error) {
    console.log('💥 Error inspecting package:');
    console.log(`   ${error.message}`);
    
    // Try alternative approach - check if it's a valid address format
    if (error.message.includes('Invalid Sui address')) {
      console.log('');
      console.log('💡 The package ID format seems invalid.');
      console.log('   Make sure it starts with 0x and is the correct length.');
    }
  }

  // Let's also try to get the package using a different method
  try {
    console.log('');
    console.log('🔍 Trying alternative package inspection...');
    
    // This might give us more information about available functions
    const normalizedPackageId = PACKAGE_ID.startsWith('0x') ? 
      PACKAGE_ID : `0x${PACKAGE_ID}`;
    
    console.log(`   Normalized ID: ${normalizedPackageId}`);
    
    // Try to get package info using multiGetObjects
    const objects = await suiClient.multiGetObjects({
      ids: [normalizedPackageId],
      options: {
        showContent: true,
        showType: true,
        showOwner: true
      }
    });

    if (objects && objects.length > 0) {
      console.log('📋 Multi-get results:');
      objects.forEach((obj, index) => {
        console.log(`   Object ${index + 1}:`);
        if (obj.error) {
          console.log(`     Error: ${obj.error}`);
        } else {
          console.log(`     ID: ${obj.data?.objectId}`);
          console.log(`     Type: ${obj.data?.type}`);
          console.log(`     Version: ${obj.data?.version}`);
        }
      });
    }

  } catch (altError) {
    console.log(`❌ Alternative inspection failed: ${altError.message}`);
  }
}

// Run the inspection
inspectPackage().catch(console.error);
