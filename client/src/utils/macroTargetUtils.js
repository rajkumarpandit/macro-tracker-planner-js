import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase/firebase';

/**
 * Fetch user's macro targets from Firestore
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Macro targets object
 */
export async function fetchUserMacroTargets(userId) {
  if (!userId) {
    return getDefaultTargets();
  }

  try {
    const q = query(
      collection(db, 'macro_targets'),
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const data = querySnapshot.docs[0].data();
      return {
        calories: data.calories || 2000,
        protein: data.protein || 140,
        carbs: data.carbs || 200,
        fat: data.fat || 100
      };
    }

    // Return default targets if none found
    return getDefaultTargets();
  } catch (error) {
    console.error('Error fetching macro targets:', error);
    return getDefaultTargets();
  }
}

/**
 * Get default macro targets
 * @returns {Object} - Default macro targets
 */
function getDefaultTargets() {
  return {
    calories: 2000,
    protein: 140,
    carbs: 200,
    fat: 100
  };
}
