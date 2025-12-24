// Script untuk fix PS database - hapus entry dengan userId invalid
const fs = require('fs').promises;
const path = require('path');

const PS_DATA_DIR = path.join(process.cwd(), 'data/ps');

async function fixPSDatabase() {
  console.log('🔧 Starting PS Database Fix...\n');
  
  for (let psNum = 1; psNum <= 7; psNum++) {
    const filePath = path.join(PS_DATA_DIR, `ps${psNum}.json`);
    
    try {
      // Read file
      const data = await fs.readFile(filePath, 'utf-8');
      const psData = JSON.parse(data);
      
      console.log(`📁 PS${psNum}: Found ${psData.participants.length} entries`);
      
      // Filter out invalid entries
      const originalCount = psData.participants.length;
      psData.participants = psData.participants.filter(p => {
        // Keep only valid entries (not placeholder and has proper data)
        return p.discordName !== '-' && p.discordName !== '' && p.robloxUsn && p.robloxUsn !== '-';
      });
      
      const removedCount = originalCount - psData.participants.length;
      
      if (removedCount > 0) {
        // Save fixed data
        await fs.writeFile(filePath, JSON.stringify(psData, null, 2));
        console.log(`✅ PS${psNum}: Removed ${removedCount} invalid entries, kept ${psData.participants.length} valid entries`);
      } else {
        console.log(`✅ PS${psNum}: No invalid entries found`);
      }
      
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log(`⚠️  PS${psNum}: File not found (empty PS)`);
      } else {
        console.error(`❌ PS${psNum}: Error - ${error.message}`);
      }
    }
    
    console.log('');
  }
  
  console.log('🎉 Database fix complete!\n');
  console.log('⚠️  IMPORTANT: Invalid userId entries were removed.');
  console.log('📝 Please re-add participants using: !addptops[1-7] @user roblox');
}

fixPSDatabase().catch(console.error);
