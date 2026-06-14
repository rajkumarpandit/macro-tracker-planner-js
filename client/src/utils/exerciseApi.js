import { getGeminiResponse } from './geminiApi';

/**
 * Create a cache key from user profile parameters
 * @param {Object} userProfile - User's fitness profile
 * @returns {string} Cache key
 */
function createCacheKey(userProfile) {
  const {
    userId,
    fitnessLevel,
    workoutFrequency,
    equipmentAccess,
    primaryGoal,
    timePerSession,
    injuries,
  } = userProfile;
  
  // Create a deterministic key from parameters
  const key = `workout_plan_${userId}_${fitnessLevel}_${workoutFrequency}_${equipmentAccess}_${primaryGoal}_${timePerSession}_${injuries || 'none'}`;
  return key;
}

/**
 * Get cached workout plans if available
 * @param {string} cacheKey - Cache key
 * @returns {Array|null} Cached plans or null
 */
function getCachedPlans(cacheKey) {
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const { plans, timestamp } = JSON.parse(cached);
      
      // Cache expires after 30 days
      const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
      if (Date.now() - timestamp < thirtyDaysInMs) {
        console.log('Returning cached workout plans');
        return plans;
      } else {
        // Remove expired cache
        localStorage.removeItem(cacheKey);
      }
    }
  } catch (error) {
    console.error('Error reading cached plans:', error);
  }
  return null;
}

/**
 * Cache workout plans
 * @param {string} cacheKey - Cache key
 * @param {Array} plans - Workout plans to cache
 */
function cachePlans(cacheKey, plans) {
  try {
    const cacheData = {
      plans,
      timestamp: Date.now(),
    };
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    console.log('Cached workout plans');
  } catch (error) {
    console.error('Error caching plans:', error);
  }
}

/**
 * Generate workout plans using Gemini AI (with caching for deterministic results)
 * @param {Object} userProfile - User's fitness profile
 * @returns {Promise<Array>} Array of workout plans
 */
export async function generateWorkoutPlan(userProfile) {
  const {
    fitnessLevel,
    workoutFrequency,
    equipmentAccess,
    primaryGoal,
    timePerSession,
    injuries,
  } = userProfile;

  // Check cache first - if same parameters, return cached plans
  const cacheKey = createCacheKey(userProfile);
  const cachedPlans = getCachedPlans(cacheKey);
  if (cachedPlans) {
    return cachedPlans;
  }

  const equipmentMap = {
    full_gym: 'full gym with all equipment (barbells, dumbbells, machines, cables)',
    home_gym: 'home gym with basic equipment (dumbbells, bench, resistance bands)',
    minimal: 'minimal equipment (dumbbells and resistance bands only)',
    bodyweight: 'bodyweight only (no equipment)',
  };

  const goalMap = {
    lose_fat: 'fat loss with muscle preservation',
    build_muscle: 'muscle building and hypertrophy',
    maintain: 'maintaining current physique and fitness',
    recomposition: 'body recomposition (simultaneous fat loss and muscle gain)',
  };

  const prompt = `You are an expert fitness coach. Generate 2-3 different workout program options for the following user profile:

**User Profile:**
- Experience Level: ${fitnessLevel}
- Workout Frequency: ${workoutFrequency} days per week
- Equipment Access: ${equipmentMap[equipmentAccess]}
- Primary Goal: ${goalMap[primaryGoal]}
- Time per Session: ${timePerSession} minutes
- Injuries/Limitations: ${injuries}

**Requirements:**
1. Suggest 2-3 different workout split options (e.g., Push/Pull/Legs, Upper/Lower, Full Body, Bro Split)
2. Each program should be suitable for 12 weeks with progressive overload
3. Include deload weeks at weeks 4, 8, and 12
4. Match the equipment access specified
5. Consider the time constraint per session
6. Account for any injuries or limitations

**Response Format (JSON):**
Return ONLY a valid JSON array with this exact structure:
[
  {
    "name": "Program name (e.g., Push/Pull/Legs)",
    "description": "Brief description of the program (2-3 sentences)",
    "weeklySchedule": [
      {
        "day": 0,
        "focus": "Push Day",
        "exercises": [
          {
            "name": "Bench Press",
            "muscleGroup": "Chest",
            "targetSets": 3,
            "targetReps": "8-10",
            "restTime": "90s"
          }
        ],
        "exerciseCount": 6,
        "estimatedTime": 60
      }
    ]
  }
]

**Important:**
- day field should be 0-6 representing Monday-Sunday (0=Monday, 6=Sunday)
- Include ${workoutFrequency} workout days in the weeklySchedule
- Each workout should have 5-8 exercises
- estimatedTime should match the requested ${timePerSession} minutes
- Return ONLY the JSON array, no markdown, no explanations, no code blocks`;

  try {
    const response = await getGeminiResponse(prompt);
    
    // Clean up response - remove markdown code blocks if present
    let cleanedResponse = response.trim();
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/```\n?/g, '');
    }
    
    const plans = JSON.parse(cleanedResponse);
    
    // Validate and ensure we have the right structure
    if (!Array.isArray(plans) || plans.length === 0) {
      throw new Error('Invalid response format from AI');
    }

    // Cache the generated plans for future requests with same parameters
    cachePlans(cacheKey, plans);

    return plans;
  } catch (error) {
    console.error('Error generating workout plan:', error);
    
    // Return fallback plans if Gemini fails
    const fallbackPlans = getFallbackPlans(userProfile);
    
    // Cache fallback plans too for consistency
    cachePlans(cacheKey, fallbackPlans);
    
    return fallbackPlans;
  }
}

/**
 * Fallback workout plans when Gemini API fails
 */
function getFallbackPlans(userProfile) {
  const { workoutFrequency, timePerSession } = userProfile;

  if (workoutFrequency >= 5) {
    return [
      {
        name: 'Push/Pull/Legs Split',
        description: 'Classic bodybuilding split focusing on pushing movements, pulling movements, and legs on separate days. Ideal for muscle building and allows adequate recovery.',
        weeklySchedule: [
          {
            day: 0,
            focus: 'Push Day (Chest, Shoulders, Triceps)',
            exercises: [
              { name: 'Bench Press', muscleGroup: 'Chest', targetSets: 3, targetReps: '8-10', restTime: '90s' },
              { name: 'Overhead Press', muscleGroup: 'Shoulders', targetSets: 3, targetReps: '8-10', restTime: '90s' },
              { name: 'Incline Dumbbell Press', muscleGroup: 'Chest', targetSets: 3, targetReps: '10-12', restTime: '60s' },
              { name: 'Lateral Raises', muscleGroup: 'Shoulders', targetSets: 3, targetReps: '12-15', restTime: '60s' },
              { name: 'Tricep Dips', muscleGroup: 'Triceps', targetSets: 3, targetReps: '10-12', restTime: '60s' },
              { name: 'Cable Tricep Extensions', muscleGroup: 'Triceps', targetSets: 3, targetReps: '12-15', restTime: '60s' },
            ],
            exerciseCount: 6,
            estimatedTime: timePerSession,
          },
          {
            day: 2,
            focus: 'Pull Day (Back, Biceps)',
            exercises: [
              { name: 'Deadlift', muscleGroup: 'Back', targetSets: 3, targetReps: '6-8', restTime: '120s' },
              { name: 'Pull-ups', muscleGroup: 'Back', targetSets: 3, targetReps: '8-10', restTime: '90s' },
              { name: 'Barbell Rows', muscleGroup: 'Back', targetSets: 3, targetReps: '8-10', restTime: '90s' },
              { name: 'Face Pulls', muscleGroup: 'Rear Delts', targetSets: 3, targetReps: '12-15', restTime: '60s' },
              { name: 'Barbell Curls', muscleGroup: 'Biceps', targetSets: 3, targetReps: '10-12', restTime: '60s' },
              { name: 'Hammer Curls', muscleGroup: 'Biceps', targetSets: 3, targetReps: '12-15', restTime: '60s' },
            ],
            exerciseCount: 6,
            estimatedTime: timePerSession,
          },
          {
            day: 4,
            focus: 'Leg Day',
            exercises: [
              { name: 'Squat', muscleGroup: 'Quads', targetSets: 4, targetReps: '6-8', restTime: '120s' },
              { name: 'Romanian Deadlift', muscleGroup: 'Hamstrings', targetSets: 3, targetReps: '8-10', restTime: '90s' },
              { name: 'Leg Press', muscleGroup: 'Quads', targetSets: 3, targetReps: '10-12', restTime: '90s' },
              { name: 'Leg Curls', muscleGroup: 'Hamstrings', targetSets: 3, targetReps: '12-15', restTime: '60s' },
              { name: 'Calf Raises', muscleGroup: 'Calves', targetSets: 4, targetReps: '15-20', restTime: '45s' },
            ],
            exerciseCount: 5,
            estimatedTime: timePerSession,
          },
        ],
      },
      {
        name: 'Upper/Lower Split',
        description: 'Efficient split alternating between upper body and lower body workouts. Great for strength and muscle building with good frequency.',
        weeklySchedule: [
          {
            day: 0,
            focus: 'Upper Body A',
            exercises: [
              { name: 'Bench Press', muscleGroup: 'Chest', targetSets: 4, targetReps: '6-8', restTime: '120s' },
              { name: 'Barbell Rows', muscleGroup: 'Back', targetSets: 4, targetReps: '6-8', restTime: '120s' },
              { name: 'Overhead Press', muscleGroup: 'Shoulders', targetSets: 3, targetReps: '8-10', restTime: '90s' },
              { name: 'Pull-ups', muscleGroup: 'Back', targetSets: 3, targetReps: '8-10', restTime: '90s' },
              { name: 'Barbell Curls', muscleGroup: 'Biceps', targetSets: 3, targetReps: '10-12', restTime: '60s' },
              { name: 'Tricep Dips', muscleGroup: 'Triceps', targetSets: 3, targetReps: '10-12', restTime: '60s' },
            ],
            exerciseCount: 6,
            estimatedTime: timePerSession,
          },
          {
            day: 3,
            focus: 'Lower Body A',
            exercises: [
              { name: 'Squat', muscleGroup: 'Quads', targetSets: 4, targetReps: '6-8', restTime: '120s' },
              { name: 'Romanian Deadlift', muscleGroup: 'Hamstrings', targetSets: 3, targetReps: '8-10', restTime: '90s' },
              { name: 'Leg Press', muscleGroup: 'Quads', targetSets: 3, targetReps: '10-12', restTime: '90s' },
              { name: 'Leg Curls', muscleGroup: 'Hamstrings', targetSets: 3, targetReps: '12-15', restTime: '60s' },
              { name: 'Calf Raises', muscleGroup: 'Calves', targetSets: 4, targetReps: '15-20', restTime: '45s' },
            ],
            exerciseCount: 5,
            estimatedTime: timePerSession,
          },
        ],
      },
    ];
  } else {
    // For 3-4 days, suggest full body
    return [
      {
        name: 'Full Body Strength',
        description: 'Full body workouts hitting all major muscle groups each session. Perfect for beginners or those with limited time. Focuses on compound movements.',
        weeklySchedule: [
          {
            day: 0,
            focus: 'Full Body A',
            exercises: [
              { name: 'Squat', muscleGroup: 'Legs', targetSets: 3, targetReps: '8-10', restTime: '120s' },
              { name: 'Bench Press', muscleGroup: 'Chest', targetSets: 3, targetReps: '8-10', restTime: '90s' },
              { name: 'Barbell Rows', muscleGroup: 'Back', targetSets: 3, targetReps: '8-10', restTime: '90s' },
              { name: 'Overhead Press', muscleGroup: 'Shoulders', targetSets: 3, targetReps: '8-10', restTime: '90s' },
              { name: 'Plank', muscleGroup: 'Core', targetSets: 3, targetReps: '45-60s', restTime: '60s' },
            ],
            exerciseCount: 5,
            estimatedTime: timePerSession,
          },
          {
            day: 2,
            focus: 'Full Body B',
            exercises: [
              { name: 'Deadlift', muscleGroup: 'Back/Legs', targetSets: 3, targetReps: '6-8', restTime: '120s' },
              { name: 'Incline Dumbbell Press', muscleGroup: 'Chest', targetSets: 3, targetReps: '8-10', restTime: '90s' },
              { name: 'Pull-ups', muscleGroup: 'Back', targetSets: 3, targetReps: '8-10', restTime: '90s' },
              { name: 'Lunges', muscleGroup: 'Legs', targetSets: 3, targetReps: '10-12', restTime: '60s' },
              { name: 'Face Pulls', muscleGroup: 'Rear Delts', targetSets: 3, targetReps: '12-15', restTime: '60s' },
            ],
            exerciseCount: 5,
            estimatedTime: timePerSession,
          },
          {
            day: 4,
            focus: 'Full Body C',
            exercises: [
              { name: 'Front Squat', muscleGroup: 'Legs', targetSets: 3, targetReps: '8-10', restTime: '120s' },
              { name: 'Dumbbell Bench Press', muscleGroup: 'Chest', targetSets: 3, targetReps: '8-10', restTime: '90s' },
              { name: 'Seated Cable Rows', muscleGroup: 'Back', targetSets: 3, targetReps: '10-12', restTime: '90s' },
              { name: 'Dumbbell Shoulder Press', muscleGroup: 'Shoulders', targetSets: 3, targetReps: '8-10', restTime: '90s' },
              { name: 'Russian Twists', muscleGroup: 'Core', targetSets: 3, targetReps: '20', restTime: '60s' },
            ],
            exerciseCount: 5,
            estimatedTime: timePerSession,
          },
        ],
      },
    ];
  }
}
