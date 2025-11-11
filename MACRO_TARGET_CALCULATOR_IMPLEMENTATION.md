# Macro Target Calculator Implementation

## Overview
Added a tabbed interface to the Macro Target page with a new BMR (Basal Metabolic Rate) calculator to help users scientifically determine their optimal macro targets.

## Features Implemented

### Tab 1: Set Target (Existing Functionality)
- Radio buttons for goal selection: Deficit, Maintenance, Bulking
- Manual input fields for Calories, Protein, Carbs, Fat
- Save/Cancel buttons
- Summary display of saved targets

### Tab 2: Calculate Macro Target (NEW)
A comprehensive BMR calculator that includes:

#### Input Fields (Auto-populated from User Profile)
1. **Weight**
   - Input in lbs (editable)
   - Auto-conversion to kg
   - Both values displayed for reference

2. **Height**
   - Input in feet and inches (editable)
   - Auto-conversion to cm (read-only)

3. **Date of Birth**
   - Date picker
   - Auto-calculates age (read-only display)

4. **Sex**
   - Radio buttons: Male, Female
   - Required for BMR calculation
   - Only male/female supported for Harris-Benedict formula

5. **Activity Level**
   - Sedentary (1.2) - little or no exercise
   - Lightly active (1.375) - light exercise 1-3 days/week
   - Moderately active (1.55) - moderate exercise 3-5 days/week [DEFAULT]
   - Active (1.725) - hard exercise 6-7 days/week
   - Very active (1.9) - very hard exercise & physical job

#### Calculations

##### BMR (Harris-Benedict Formula)
- **Male**: BMR = (13.397 × weight kg) + (4.799 × height cm) - (5.677 × age) + 88.362
- **Female**: BMR = (9.247 × weight kg) + (3.098 × height cm) - (4.330 × age) + 447.593

##### Maintenance Calories
- Daily Calorie Need = BMR × Activity Level Multiplier

##### Macro Breakdown
- **Protein**: 1.5 × body weight in kg
  - Example: 70 kg × 1.5 = 105g protein
  - Calories from protein = 105g × 4 cal/g = 420 cal

- **Fat**: ~27.5% of total calories (middle of 25-30% range)
  - Example: 2000 cal × 0.275 = 550 cal from fat
  - Fat grams = 550 cal ÷ 9 cal/g = 61g

- **Carbs**: Remaining calories after protein and fat
  - Example: 2000 - 420 - 550 = 1030 cal from carbs
  - Carbs grams = 1030 cal ÷ 4 cal/g = 258g

#### Data Flow
1. **Auto-population**: On component mount, fetches user profile data from Firestore
   - Weight (kg), Height (cm), DOB, Sex
   - Only populates if sex is "male" or "female"
   - If sex is "others" or "prefer not to say", leaves sex field unselected

2. **Real-time Calculations**: All calculations update automatically as user modifies inputs
   - Unit conversions (kg↔lbs, ft/in↔cm)
   - Age calculation from DOB
   - BMR calculation
   - Maintenance calories
   - Macro breakdown

3. **Validation**: Shows warning message if required fields are missing
   - Weight, Height, DOB, and Sex must be filled for calculations

4. **Transfer Values**: "Use These Values in Set Target" button
   - Copies calculated values to Tab 1
   - Sets target type to "Maintenance"
   - Switches to Tab 1 automatically
   - Shows success message

5. **Session-Only Data**: Calculator data is NOT saved to database
   - Only used for calculations in current session
   - Profile data is read from database but calculations are temporary

## Technical Implementation

### New State Variables
```javascript
// Tab management
const [tabValue, setTabValue] = useState(0);

// Calculator states
const [calcWeight, setCalcWeight] = useState('');
const [calcWeightLbs, setCalcWeightLbs] = useState('');
const [calcHeightFeet, setCalcHeightFeet] = useState('');
const [calcHeightInches, setCalcHeightInches] = useState('');
const [calcHeightCm, setCalcHeightCm] = useState('');
const [calcDOB, setCalcDOB] = useState('');
const [calcAge, setCalcAge] = useState('');
const [calcSex, setCalcSex] = useState('');
const [calcActivityLevel, setCalcActivityLevel] = useState('1.55');
const [calcBMR, setCalcBMR] = useState(null);
const [calcMaintenanceCalories, setCalcMaintenanceCalories] = useState(null);
const [calcProtein, setCalcProtein] = useState(null);
const [calcFat, setCalcFat] = useState(null);
const [calcCarbs, setCalcCarbs] = useState(null);
const [calcError, setCalcError] = useState('');
```

### New useEffects
1. **fetchProfile**: Loads user data from `users` collection
2. **Calculate Age**: Converts DOB to age automatically
3. **Weight Sync**: Syncs kg ↔ lbs conversions
4. **Height Sync**: Converts feet/inches to cm
5. **BMR Calculation**: Applies Harris-Benedict formula based on sex
6. **Maintenance Calories**: Multiplies BMR by activity level
7. **Macro Breakdown**: Calculates protein/fat/carbs distribution

### New Functions
- `handleUseCalculatedValues()`: Transfers calculated values to Set Target tab

## User Experience Flow

### Scenario 1: New User with Complete Profile
1. User navigates to Macro Target page
2. Clicks "Calculate Macro Target" tab
3. All fields auto-populate from profile
4. BMR and maintenance calories display immediately
5. User adjusts activity level if needed
6. Macro breakdown updates automatically
7. Clicks "Use These Values in Set Target"
8. Switched to Set Target tab with values populated
9. Clicks "Save Targets" to persist to database

### Scenario 2: User with Incomplete Profile
1. User navigates to Macro Target page
2. Clicks "Calculate Macro Target" tab
3. Some fields are empty or sex is not male/female
4. Warning message appears: "Please fill in all required fields"
5. User manually enters missing data
6. Calculations appear once all required fields are filled
7. Can transfer and save values

### Scenario 3: Manual Override
1. User uses calculator to get baseline values
2. Transfers to Set Target tab
3. Manually adjusts values (e.g., increases protein for muscle building)
4. Changes target type from Maintenance to Bulking
5. Saves customized targets

## Design Patterns

### Material-UI Components Used
- `Tabs` and `Tab` for tabbed interface
- `RadioGroup` for goal, sex, and activity level selection
- `TextField` with various types (number, date)
- `Alert` for validation messages
- `Divider` for visual separation
- `Box` and `Grid` for layout

### Color Coding
- BMR Display: Light blue (`#e3f2fd`)
- Calculated Results: Light green (`#e8f5e9`)
- Warning Messages: Yellow (Alert severity="warning")
- Success Messages: Green (Alert severity="success")

## Database Collections Used
- **users**: Read user profile data (weight, height, dob, sex)
- **macro_targets**: Save user's final macro targets (only from Tab 1)

## Validation Rules
1. **Weight**: Must be > 0
2. **Height Feet**: 0-8 feet
3. **Height Inches**: 0-11.9 inches
4. **DOB**: Must result in age > 0
5. **Sex**: Must be "male" or "female" for calculations
6. **Activity Level**: One of 5 predefined multipliers

## Future Enhancement Ideas
1. Support for other BMR formulas (Mifflin-St Jeor, Katch-McArdle)
2. Custom macro ratio settings (e.g., keto, low-carb)
3. Save multiple calculation scenarios
4. Comparison with current macro target
5. Weekly adjustment recommendations based on weight trends
6. Export calculator results as PDF

## Testing Checklist
- [x] Tab switching works correctly
- [x] Auto-population from user profile
- [x] Unit conversions (kg↔lbs, ft/in↔cm)
- [x] Age calculation from DOB
- [x] BMR calculation (male and female formulas)
- [x] Activity level multipliers
- [x] Macro breakdown calculations
- [x] Value transfer to Set Target tab
- [x] Validation error messages
- [x] Save functionality (Set Target tab)
- [x] No errors in console
- [x] Responsive layout on mobile

## Files Modified
- `client/src/components/MacroTarget/MacroTargetPage.js`
  - Added Tabs, Tab, Divider imports from Material-UI
  - Added getDoc import from Firebase
  - Added 16 new state variables for calculator
  - Added 7 new useEffect hooks
  - Added handleUseCalculatedValues function
  - Restructured return JSX with tabbed interface
  - Tab 1: Existing Set Target functionality (indented)
  - Tab 2: New Calculate Macro Target section (240+ lines)

## Notes
- Calculator data is NOT persisted to database (session-only)
- Formula references displayed to users for transparency
- Default activity level is "Moderately active" (1.55)
- Fat percentage set to 27.5% (middle of recommended 25-30% range)
- Protein calculation aligns with standard recommendation for active individuals

---

**Implementation Date**: December 2024  
**Implemented By**: Raj Kumar Pandit  
**Status**: ✅ Complete and Tested
