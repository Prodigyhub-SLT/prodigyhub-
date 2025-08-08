// Convert capped collection to regular collection
const mongoose = require('mongoose');

async function convertCollection() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tmf-api');
    
    const db = mongoose.connection.db;
    const collection = db.collection('productofferings');
    
    // Check if it's capped first
    const isCapped = await collection.isCapped();
    console.log('Is collection capped?', isCapped);
    
    if (isCapped) {
      console.log('Converting capped collection to regular collection...');
      
      // Step 1: Export all data
      const data = await collection.find({}).toArray();
      console.log(`Found ${data.length} documents to preserve`);
      
      // Step 2: Drop the capped collection
      await collection.drop();
      console.log('Dropped capped collection');
      
      // Step 3: Recreate as regular collection
      const newCollection = db.collection('productofferings');
      
      // Step 4: Re-insert all data
      if (data.length > 0) {
        await newCollection.insertMany(data);
        console.log(`Re-inserted ${data.length} documents`);
      }
      
      console.log('✅ Successfully converted to regular collection!');
      
      // Verify
      const newStats = await newCollection.stats();
      console.log('New collection stats:', {
        count: newStats.count,
        capped: newStats.capped || false
      });
    } else {
      console.log('Collection is already a regular collection');
    }
    
  } catch (error) {
    console.error('Error converting collection:', error);
  } finally {
    await mongoose.disconnect();
  }
}

convertCollection();