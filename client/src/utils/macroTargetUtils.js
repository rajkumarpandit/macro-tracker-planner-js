import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { DEFAULT_MACRO_TARGETS, FIREBASE_COLLECTIONS } from '../config/constants';

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
      collection(db, FIREBASE_COLLECTIONS.MACRO_TARGETS),
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const data = querySnapshot.docs[0].data();
      return {
        calories: data.calories || DEFAULT_MACRO_TARGETS.calories,
        protein: data.protein || DEFAULT_MACRO_TARGETS.protein,
        carbs: data.carbs || DEFAULT_MACRO_TARGETS.carbs,
        fat: data.fat || DEFAULT_MACRO_TARGETS.fat
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
  return { ...DEFAULT_MACRO_TARGETS };
}
