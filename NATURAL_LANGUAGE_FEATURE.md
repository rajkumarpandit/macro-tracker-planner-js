# Natural Language Food Logging Feature

## Overview
This feature allows users to log food items using natural language descriptions (e.g., "2 bananas" or "1 cup of rice") instead of selecting from a dropdown. The system uses Google Gemini AI to parse food descriptions and fetch nutritional information.

## Implementation Details

### 1. Files Modified/Created

#### **geminiApi.js** (NEW)
- Location: `client/src/utils/geminiApi.js`
- Purpose: Utility functions for Google Gemini AI integration
- Functions:
  - `parseFoodFromText(text)`: Parses natural language text to extract food name, quantity, and unit
  - `getMacrosFromGemini(foodName, unit)`: Fetches macro nutrition data for a food item

#### **DailyLogPage.js** (MODIFIED)
- Location: `client/src/components/DailyLog/DailyLogPage.js`
- Changes:
  - Added tab interface with two tabs:
    1. "On your existing food list" (original functionality)
    2. "Using Natural Language" (new feature)
  - Added state variables for Natural Language workflow
  - Added handler functions for parsing, fetching macros, saving, and canceling

### 2. Feature Workflow

#### Step 1: Enter Natural Language Description
- User enters text like "2 bananas" in the text field
- Clicks "Parse Food" button

#### Step 2: Parse Food Item
- System calls `parseFoodFromText()` function
- Gemini AI extracts:
  - Food name (e.g., "banana")
  - Quantity (e.g., 2)
  - Unit (e.g., "piece")
- System validates that only ONE food item is entered
- Parsed information is displayed (read-only)

#### Step 3: Fetch Macro Information
- User clicks "Fetch Macro Info" button
- System first checks user's personal food database
  - If found: Uses existing data
  - If not found: Calls `getMacrosFromGemini()` to fetch data
- Displays two sections:
  - **Per Unit Macros**: Calories, Protein, Carbs, Fats per 1 unit
  - **Your Total**: Calculated macros for entered quantity

#### Step 4: Save or Cancel
- User reviews the calculated macros (read-only)
- Options:
  - **Add Food**: Saves to daily_food_log with duplicate checking
  - **Cancel**: Clears all Natural Language form fields

### 3. Key Features

#### Single Food Item Validation
- System enforces ONE food item per entry
- Multiple items (e.g., "2 bananas and 1 apple") will result in an error
- User must log each food item separately

#### Smart Database Lookup
- System checks user's personal food database first
- Only calls Gemini API if food item not found locally
- Reduces API calls and improves response time

#### Duplicate Entry Prevention
- System checks if the same food item is already logged for the selected date
- Prevents accidental duplicate entries

#### Non-Editable Macro Display
- All calculated macros are displayed as read-only
- Users cannot manually edit macro values
- Ensures data integrity

### 4. Environment Configuration

#### .env File
- Location: `client/.env`
- Required variable:
  ```
  REACT_APP_GEMINI_API_KEY=your_api_key_here
  ```
- **IMPORTANT**: This file is in .gitignore and should never be committed to version control

#### Package Dependency
- Package: `@google/generative-ai` (v0.24.1)
- Already installed in package.json
- No additional installation needed

### 5. Testing the Feature

#### Test Case 1: Parse Single Food Item
1. Navigate to Daily Food Log page
2. Click "Using Natural Language" tab
3. Enter: "2 bananas"
4. Click "Parse Food"
5. Expected: Shows "Food: banana, Quantity: 2 piece"

#### Test Case 2: Check Database Lookup
1. First, add "banana" to your personal food database
2. Enter "2 bananas" in Natural Language tab
3. Click "Parse Food", then "Fetch Macro Info"
4. Expected: Message "Found in your food database!"

#### Test Case 3: Gemini API Fallback
1. Enter food item NOT in your database (e.g., "3 apples")
2. Click "Parse Food", then "Fetch Macro Info"
3. Expected: Message "Macro information fetched from Gemini AI!"

#### Test Case 4: Multiple Food Items Error
1. Enter: "2 bananas and 1 apple"
2. Click "Parse Food"
3. Expected: Error message about multiple items

#### Test Case 5: Duplicate Entry Prevention
1. Add "2 bananas" successfully
2. Try to add "2 bananas" again for the same date
3. Expected: Error message "This food item is already logged for today"

### 6. Error Handling

The system handles the following error scenarios:
- Empty text input
- Multiple food items detected
- Invalid food item that Gemini cannot recognize
- Network errors during API calls
- Missing or invalid API key
- Duplicate entries for the same date

### 7. User Experience

#### Mobile-Friendly Design
- Tabs are scrollable on mobile devices
- Text input expands to 2 rows for better visibility
- Buttons are appropriately sized for touch interaction

#### Loading States
- "Parse Food" button shows "Processing..." during API call
- "Fetch Macro Info" button shows "Fetching..." during API call
- Buttons are disabled during loading to prevent duplicate requests

#### Clear Feedback
- Success/error messages displayed via Snackbar
- Parsed food information displayed before macro fetch
- Both unit macros and calculated totals shown before saving

### 8. Data Structure

#### Saved to daily_food_log Collection
```javascript
{
  date_eaten: "2025-11-09",        // Selected date
  food_item: "banana",              // Parsed food name
  food_name: "banana",              // Duplicate for consistency
  unit: "piece",                    // Parsed unit
  quantity: 2,                      // Parsed quantity
  userId: "user_uid",               // Current user
  createdAt: "2025-11-09T...",     // Timestamp
  calories: 210,                    // Calculated
  protein: 2.6,                     // Calculated
  carbs: 54,                        // Calculated
  fat: 0.8                          // Calculated
}
```

### 9. Next Steps

After initial testing, consider:
1. Add support for more complex food descriptions
2. Implement food database suggestions based on Natural Language input
3. Add bulk logging (multiple items at once)
4. Implement voice input for Natural Language descriptions
5. Add recent Natural Language searches for quick re-entry

### 10. Troubleshooting

#### Issue: "Parse Food" button not working
- Check browser console for errors
- Verify .env file has REACT_APP_GEMINI_API_KEY
- Restart development server after adding/modifying .env

#### Issue: "Fetch Macro Info" fails
- Check network connection
- Verify Gemini API key is valid
- Check browser console for specific error messages

#### Issue: Macros look incorrect
- Verify Gemini AI response format
- Check user's food database for conflicting entries
- Review calculation logic in handleFetchMacros

## Conclusion

The Natural Language food logging feature is now fully implemented and ready for testing. It provides a user-friendly alternative to the traditional dropdown selection method while maintaining data integrity and leveraging AI for improved user experience.
