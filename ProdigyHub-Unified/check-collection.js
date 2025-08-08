// Check if productofferings collection is capped
const mongoose = require('mongoose');

async function checkCollection() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tmf-api');
    
    const db = mongoose.connection.db;
    const collection = db.collection('productofferings');
    
    // Check if collection is capped
    const isCapped = await collection.isCapped();
    console.log('Is productofferings collection capped?', isCapped);
    
    // Get collection stats
    const stats = await collection.stats();
    console.log('Collection stats:', {
      count: stats.count,
      size: stats.size,
      capped: stats.capped,
      max: stats.max,
      maxSize: stats.maxSize
    });
    
  } catch (error) {
    console.error('Error checking collection:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkCollection();