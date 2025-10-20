import { db } from './src/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

// This script helps identify any composite indexes that might be needed
// It's for development purposes and should NOT be included in production

async function checkDailyLogQueries() {
  console.log("Testing daily log queries to identify needed indexes...");
  
  try {
    // Get a test user ID
    const usersCollection = collection(db, 'users');
    const usersSnapshot = await getDocs(usersCollection);
    
    if (!usersSnapshot.empty) {
      const testUserId = usersSnapshot.docs[0].id;
      console.log(`Using test user ID: ${testUserId}`);
      
      // Test date range query
      const currentDate = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const dailyLogCollection = collection(db, 'daily_food_log');
      
      // Query that will need an index
      const dateRangeQuery = query(
        dailyLogCollection,
        where('userId', '==', testUserId),
        where('date', '>=', thirtyDaysAgo),
        where('date', '<=', currentDate)
      );
      
      const snapshot = await getDocs(dateRangeQuery);
      console.log(`Found ${snapshot.size} entries in date range`);
    } else {
      console.log("No users found for testing");
    }
  } catch (error) {
    console.error("Error running test queries:", error);
    if (error.code === 'permission-denied') {
      console.log("Permission denied - this indicates security rules are working");
    }
    // If the error is about missing indexes, it will provide details in the console
  }
}

// Run the test
checkDailyLogQueries()
  .then(() => console.log("Finished checking queries"))
  .catch(err => console.error("Error:", err));