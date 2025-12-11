/**
 * Utility functions for protein source classification
 */

// Keyword-based classification for fallback when proteinSource is undefined
const PROTEIN_SOURCE_KEYWORDS = {
  vegetarian: [
    'paneer', 'tofu', 'tempeh', 'seitan', 'lentil', 'lentils', 'dal', 'daal',
    'chickpea', 'chickpeas', 'chana', 'rajma', 'kidney bean', 'black bean',
    'pinto bean', 'soybean', 'soy', 'edamame', 'peas', 'quinoa', 'chia',
    'hemp seed', 'pumpkin seed', 'sunflower seed', 'almond', 'peanut',
    'cashew', 'walnut', 'spirulina', 'nutritional yeast', 'beans', 'bean',
    'mung', 'moong', 'urad', 'toor', 'masoor', 'soya', 'soy chunk'
  ],
  animal: [
    'chicken', 'fish', 'salmon', 'tuna', 'cod', 'tilapia', 'sardine',
    'egg', 'eggs', 'beef', 'pork', 'mutton', 'lamb', 'turkey', 'duck',
    'prawn', 'shrimp', 'crab', 'lobster', 'meat', 'bacon', 'ham',
    'sausage', 'steak', 'milk', 'cheese', 'yogurt', 'yoghurt', 'curd',
    'butter', 'ghee', 'paneer' /* paneer is dairy but animal-based */,
    'whey', 'casein', 'protein powder' /* usually whey */, 'goat', 'venison'
  ],
  lowProtein: [
    'rice', 'wheat', 'bread', 'roti', 'chapati', 'naan', 'pasta',
    'noodle', 'oil', 'ghee', 'butter', 'sugar', 'honey', 'jam',
    'juice', 'soda', 'water', 'tea', 'coffee', 'potato', 'french fries',
    'chips', 'cake', 'cookie', 'biscuit', 'candy', 'chocolate' /* unless protein bar */,
    'ice cream', 'pickle', 'sauce', 'ketchup', 'mayo', 'vegetable',
    'cucumber', 'tomato', 'onion', 'lettuce', 'cabbage', 'carrot'
  ]
};

/**
 * Classify protein source based on food name using keywords
 * @param {string} foodName - Name of the food item
 * @returns {string} - 'Vegetarian', 'Animal', 'Low-Protein', or 'Unclassified'
 */
export function classifyProteinSource(foodName) {
  if (!foodName) return 'Unclassified';
  
  const lowerFoodName = foodName.toLowerCase().trim();
  
  // Check vegetarian keywords
  for (const keyword of PROTEIN_SOURCE_KEYWORDS.vegetarian) {
    if (lowerFoodName.includes(keyword)) {
      return 'Vegetarian';
    }
  }
  
  // Check animal keywords
  for (const keyword of PROTEIN_SOURCE_KEYWORDS.animal) {
    if (lowerFoodName.includes(keyword)) {
      return 'Animal';
    }
  }
  
  // Check low-protein keywords
  for (const keyword of PROTEIN_SOURCE_KEYWORDS.lowProtein) {
    if (lowerFoodName.includes(keyword)) {
      return 'Low-Protein';
    }
  }
  
  // If no match found
  return 'Unclassified';
}

/**
 * Get protein source with fallback to keyword-based classification
 * @param {Object} foodItem - Food item object
 * @returns {string} - Protein source category
 */
export function getProteinSourceWithFallback(foodItem) {
  // If proteinSource is defined, use it
  if (foodItem.proteinSource && foodItem.proteinSource !== 'undefined') {
    return foodItem.proteinSource;
  }
  
  // Otherwise, use keyword-based classification
  return classifyProteinSource(foodItem.food_name || foodItem.foodName);
}

/**
 * Calculate protein breakdown by source from daily logs
 * @param {Array} dailyLogs - Array of food log entries
 * @returns {Object} - Breakdown of protein by source
 */
export function calculateProteinBreakdown(dailyLogs) {
  const breakdown = {
    Vegetarian: 0,
    Animal: 0,
    'Low-Protein': 0,
    Unclassified: 0
  };
  
  dailyLogs.forEach(log => {
    const proteinAmount = log.protein || 0;
    const source = getProteinSourceWithFallback(log);
    
    if (breakdown[source] !== undefined) {
      breakdown[source] += proteinAmount;
    } else {
      breakdown.Unclassified += proteinAmount;
    }
  });
  
  return breakdown;
}

/**
 * Get chart data for protein source donut chart
 * @param {Object} breakdown - Protein breakdown object
 * @returns {Array} - Chart data array
 */
export function getProteinSourceChartData(breakdown) {
  const colors = {
    Vegetarian: '#66bb6a',
    Animal: '#ef5350',
    'Low-Protein': '#ffa726',
    Unclassified: '#bdbdbd'
  };
  
  return Object.entries(breakdown)
    .filter(([_, value]) => value > 0)
    .map(([name, value]) => ({
      name,
      value: parseFloat(value.toFixed(1)),
      color: colors[name] || '#bdbdbd'
    }));
}
