import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Card,
  CardContent,
  Alert,
  InputAdornment,
  LinearProgress,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  useMediaQuery,
  useTheme,
  CircularProgress,
  Snackbar,
  Tabs,
  Tab,
  FormControlLabel,
  Switch
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import DeleteIcon from '@mui/icons-material/Delete';
import { collection, addDoc, getDocs, query, where, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import { format } from 'date-fns';
import { useAuth } from '../Auth/AuthContext';
import { parseFoodFromText, getMacrosFromGemini, areFoodsSimilar } from '../../utils/geminiApi';
import Footer from '../Common/Footer';
import { SEARCH_CONFIG } from '../../config/constants';

function DailyLogPage() {
  const [foods, setFoods] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedFood, setSelectedFood] = useState('');
  const [quantity, setQuantity] = useState(''); // Initialize as empty string for better UX
  const [calculatedMacros, setCalculatedMacros] = useState(null); // Store calculated values before saving
  const [dailyLogs, setDailyLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [foodsLoading, setFoodsLoading] = useState(true);
  const [message, setMessage] = useState({ text: '', type: '' });
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { currentUser } = useAuth();
  
  // Tab state
  const [tabValue, setTabValue] = useState(0);
  
  // Natural Language tab states
  const [nlText, setNlText] = useState('');
  const [nlLoading, setNlLoading] = useState(false);
  const [parsedFood, setParsedFood] = useState(null); // {foodName, quantity, unit}
  const [saveToFoodDatabase, setSaveToFoodDatabase] = useState(false); // Toggle for saving to food database
  const [searchUserDatabase, setSearchUserDatabase] = useState(true); // Toggle for searching user database first
  const [fetchedMacros, setFetchedMacros] = useState(null); // {calories, protein, carbs, fats, servingSize}
  const [calculatedNlMacros, setCalculatedNlMacros] = useState(null); // Calculated for user's quantity
  const [dataSource, setDataSource] = useState(null); // Track where data came from: 'database' or 'gemini'

  // Memoized date string to prevent unnecessary recalculations
  const dateString = useMemo(() => {
    return selectedDate.toISOString().split('T')[0];
  }, [selectedDate]);

  // Fetch foods from database - memoized callback
  const fetchFoods = useCallback(async () => {
    if (!currentUser) return;
    
    setFoodsLoading(true);
    try {
      // Fetch only user's own food items
      const foodQuery = query(
        collection(db, 'food_calorie_master'),
        where('userId', '==', currentUser.uid)
      );
      const foodSnapshot = await getDocs(foodQuery);
      const foodList = foodSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Sort the food list alphabetically by food_name
      const sortedFoodList = foodList.sort((a, b) => 
        a.food_name.localeCompare(b.food_name)
      );
      setFoods(sortedFoodList);
    } catch (error) {
      console.error("Error fetching foods: ", error);
      setMessage({ text: 'Failed to load food items', type: 'error' });
    } finally {
      setFoodsLoading(false);
    }
  }, [currentUser]);

  // Fetch daily logs - memoized callback
  const fetchDailyLogs = useCallback(async () => {
    if (!dateString || !currentUser) return;
    
    setLoading(true);
    try {
      const q = query(
        collection(db, 'daily_food_log'),
        where('date_eaten', '==', dateString),
        where('userId', '==', currentUser.uid) // Filter by current user ID
      );
      
      const logSnapshot = await getDocs(q);
      const logList = logSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setDailyLogs(logList);
    } catch (error) {
      console.error("Error fetching daily logs: ", error);
      setMessage({ text: 'Failed to load daily logs', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [dateString, currentUser]);

  // Initial data loading
  useEffect(() => {
    fetchFoods();
  }, [fetchFoods]);

  // Fetch logs when date changes
  useEffect(() => {
    if (dateString) {
      fetchDailyLogs();
    }
  }, [dateString, fetchDailyLogs]);

  // Memoized daily summary to prevent recalculation on every render
  const dailySummary = useMemo(() => {
    return dailyLogs.reduce((acc, log) => {
      return {
        calories: acc.calories + log.calories,
        protein: acc.protein + log.protein,
        carbs: acc.carbs + log.carbs,
        fat: acc.fat + log.fat
      };
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
  }, [dailyLogs]);

  const handleFoodChange = (e) => {
    setSelectedFood(e.target.value);
  };

  const handleQuantityChange = (e) => {
    // Allow empty string or valid number
    const value = e.target.value;
    if (value === '') {
      setQuantity('');
    } else {
      const numValue = parseFloat(value);
      if (!isNaN(numValue) && numValue >= 0) {
        setQuantity(numValue);
      }
    }
    // Clear calculated macros when quantity changes
    setCalculatedMacros(null);
  };
  
  // Calculate macros based on selected food and quantity
  const calculateMacros = () => {
    if (!selectedFood || quantity === '' || isNaN(quantity) || quantity <= 0) {
      setMessage({ text: 'Please select a food item and enter a valid quantity', type: 'error' });
      return;
    }
    
    const food = foods.find(f => f.id === selectedFood);
    if (!food) {
      setMessage({ text: 'Selected food not found', type: 'error' });
      return;
    }
    
    // Calculate proper ratio based on master record
    const ratio = quantity / food.measuring_quantity;
    
    const macros = {
      food_name: food.food_name,
      unit: food.measuring_unit,
      quantity: Number(quantity),
      calories: Number(food.calories_in_gms * ratio),
      protein: Number(food.Protien_in_gms * ratio),
      carbs: Number(food.carb_in_gms * ratio),
      fat: Number(food.fat_in_gms * ratio)
    };
    
    setCalculatedMacros(macros);
  };

  // Natural Language handlers
  const handleParseFood = async () => {
    if (!nlText.trim()) {
      setMessage({ text: 'Please enter what you ate', type: 'error' });
      return;
    }

    setNlLoading(true);
    try {
      console.log('Calling parseFoodFromText with:', nlText);
      const result = await parseFoodFromText(nlText);
      console.log('parseFoodFromText result:', result);

      setParsedFood({
        foodName: result.foodName,
        quantity: result.quantity,
        unit: result.unit
      });
      setMessage({ text: 'Food parsed successfully! Click "Fetch Macro Info" to continue.', type: 'success' });
    } catch (error) {
      console.error('Error parsing food:', error);
      console.error('Error type:', error.constructor.name);
      console.error('Error message:', error.message);
      setMessage({ text: `Error parsing food: ${error.message}`, type: 'error' });
      setParsedFood(null);
    } finally {
      setNlLoading(false);
    }
  };

  const handleFetchMacros = async () => {
    if (!parsedFood) return;

    setNlLoading(true);
    try {
      let macrosPerUnit;
      let servingSize;
      let existingFood = null;

      // Check if user wants to search their database first
      if (searchUserDatabase) {
        console.log('Searching user database for:', parsedFood.foodName);
        
        // First try exact match (case insensitive)
        const normalizedFoodName = parsedFood.foodName.toLowerCase().trim();
        existingFood = foods.find(f => 
          f.food_name.toLowerCase().trim() === normalizedFoodName
        );

        // If no exact match, try simple word-based matching
        if (!existingFood && foods.length > 0) {
          console.log('No exact match, trying word-based matching...');
          
          // Extract words from parsed food name
          const parsedWords = normalizedFoodName.split(' ').filter(w => w.length > 2);
          
          // Find foods that contain all the same words (regardless of order)
          const candidates = foods.filter(food => {
            const foodWords = food.food_name.toLowerCase().trim().split(' ').filter(w => w.length > 2);
            
            // Check if both have the same words (order doesn't matter)
            if (foodWords.length !== parsedWords.length) return false;
            
            const foodWordsSet = new Set(foodWords);
            const parsedWordsSet = new Set(parsedWords);
            
            // Check if sets are equal
            if (foodWordsSet.size !== parsedWordsSet.size) return false;
            
            for (const word of parsedWordsSet) {
              if (!foodWordsSet.has(word)) return false;
            }
            
            return true;
          });
          
          if (candidates.length > 0) {
            existingFood = candidates[0];
            console.log('Found word-match food:', existingFood.food_name);
          } else if (candidates.length === 0 && foods.length <= SEARCH_CONFIG.MAX_ITEMS_FOR_SEMANTIC_SEARCH) {
            // Only use semantic search if database is small (to avoid rate limits)
            console.log('Trying semantic search for small database...');
            for (const food of foods) {
              const isSimilar = await areFoodsSimilar(parsedFood.foodName, food.food_name);
              if (isSimilar) {
                existingFood = food;
                console.log('Found semantically similar food:', food.food_name);
                break;
              }
            }
          }
        }
      }

      if (existingFood) {
        // Use data from user's food database
        const ratio = 1 / existingFood.measuring_quantity;
        macrosPerUnit = {
          calories: Number(existingFood.calories_in_gms * ratio),
          protein: Number(existingFood.Protien_in_gms * ratio),
          carbs: Number(existingFood.carb_in_gms * ratio),
          fats: Number(existingFood.fat_in_gms * ratio)
        };
        servingSize = `1 ${existingFood.measuring_unit}`;
        setDataSource('database');
        setMessage({ text: `Found "${existingFood.food_name}" in your food database!`, type: 'success' });
      } else {
        // Call Gemini API to get macro information
        console.log('Not found in database, calling Gemini API...');
        const result = await getMacrosFromGemini(parsedFood.foodName, parsedFood.unit);
        macrosPerUnit = {
          calories: result.calories,
          protein: result.protein,
          carbs: result.carbs,
          fats: result.fats
        };
        servingSize = result.servingSize;
        setDataSource('gemini');
        setMessage({ text: 'Macro information fetched from Gemini AI!', type: 'success' });
      }

      setFetchedMacros({ ...macrosPerUnit, servingSize });

      // Calculate macros for user's quantity
      const calculated = {
        calories: Number(macrosPerUnit.calories * parsedFood.quantity).toFixed(2),
        protein: Number(macrosPerUnit.protein * parsedFood.quantity).toFixed(2),
        carbs: Number(macrosPerUnit.carbs * parsedFood.quantity).toFixed(2),
        fat: Number(macrosPerUnit.fats * parsedFood.quantity).toFixed(2)
      };

      setCalculatedNlMacros(calculated);
    } catch (error) {
      console.error('Error fetching macros:', error);
      
      // Check if it's a rate limit error
      if (error.message && error.message.includes('quota')) {
        setMessage({ 
          text: 'Gemini API rate limit reached. Please wait a few seconds and try again, or disable "Search my food database first".', 
          type: 'error' 
        });
      } else {
        setMessage({ text: 'Error fetching macro information. Please try again.', type: 'error' });
      }
      
      setFetchedMacros(null);
      setCalculatedNlMacros(null);
      setDataSource(null);
    } finally {
      setNlLoading(false);
    }
  };

  const handleSaveNlFood = async () => {
    if (!parsedFood || !calculatedNlMacros) {
      setMessage({ text: 'Please complete all steps before saving', type: 'error' });
      return;
    }

    try {
      const dateString = format(selectedDate, 'yyyy-MM-dd');

      // Check for duplicates
      const existingLog = dailyLogs.find(log => 
        log.food_name.toLowerCase().trim() === parsedFood.foodName.toLowerCase().trim() &&
        log.date_eaten === dateString
      );

      if (existingLog) {
        setMessage({ text: 'This food item is already logged for today', type: 'error' });
        return;
      }

      const logData = {
        date_eaten: dateString,
        food_item: parsedFood.foodName,
        food_name: parsedFood.foodName,
        unit: parsedFood.unit,
        quantity: Number(parsedFood.quantity),
        userId: currentUser.uid,
        createdAt: new Date().toISOString(),
        calories: Number(calculatedNlMacros.calories),
        protein: Number(calculatedNlMacros.protein),
        carbs: Number(calculatedNlMacros.carbs),
        fat: Number(calculatedNlMacros.fat)
      };

      await addDoc(collection(db, 'daily_food_log'), logData);
      
      // Optionally save to food database
      if (saveToFoodDatabase && fetchedMacros) {
        const foodData = {
          food_name: parsedFood.foodName,
          measuring_unit: parsedFood.unit,
          measuring_quantity: 1,
          calories_in_gms: Number(fetchedMacros.calories),
          Protien_in_gms: Number(fetchedMacros.protein),
          carb_in_gms: Number(fetchedMacros.carbs),
          fat_in_gms: Number(fetchedMacros.fats),
          userId: currentUser.uid,
          createdAt: new Date().toISOString()
        };
        
        await addDoc(collection(db, 'food_calorie_master'), foodData);
        setMessage({ text: 'Food added to log and food database!', type: 'success' });
      } else {
        setMessage({ text: 'Food added to log!', type: 'success' });
      }
      
      // Reset Natural Language form
      setNlText('');
      setParsedFood(null);
      setFetchedMacros(null);
      setCalculatedNlMacros(null);
      setSaveToFoodDatabase(false);
      setDataSource(null);
      
      fetchDailyLogs();
      if (saveToFoodDatabase) {
        fetchFoods(); // Refresh food list if we added to database
      }
    } catch (error) {
      console.error('Error saving natural language food:', error);
      setMessage({ text: 'Error adding food log', type: 'error' });
    }
  };

  const handleCancelNl = () => {
    setNlText('');
    setParsedFood(null);
    setFetchedMacros(null);
    setCalculatedNlMacros(null);
    setSaveToFoodDatabase(false);
    setDataSource(null);
    setMessage({ text: '', type: '' });
  };

  const handleAddLog = async () => {
    if (!calculatedMacros || !currentUser) {
      setMessage({ text: 'Please calculate macros first', type: 'error' });
      return;
    }

    try {
      const logData = {
        date_eaten: dateString,
        food_item: selectedFood,
        userId: currentUser.uid, // Add user ID to the log
        createdAt: new Date().toISOString(),
        ...calculatedMacros
      };
      
      await addDoc(collection(db, 'daily_food_log'), logData);
      setMessage({ text: 'Food added to log!', type: 'success' });
      setQuantity('');
      setSelectedFood('');
      setCalculatedMacros(null);
      fetchDailyLogs();
    } catch (error) {
      console.error("Error adding food log: ", error);
      setMessage({ text: 'Error adding food log', type: 'error' });
    }
  };

  const handleDeleteLog = async (id) => {
    try {
      await deleteDoc(doc(db, 'daily_food_log', id));
      setMessage({ text: 'Log entry deleted!', type: 'success' });
      fetchDailyLogs();
    } catch (error) {
      console.error("Error deleting food log: ", error);
      setMessage({ text: 'Error deleting log', type: 'error' });
    }
  };
  
  const handleCloseMessage = () => {
    setMessage({ text: '', type: '' });
  };

  // Simplified targets
  const targets = { calories: 2000, protein: 150, carbs: 250, fat: 70 };

  return (
    <div>
      <Typography variant="h5" component="h1" gutterBottom>
        Daily Food Log
      </Typography>

      <Snackbar 
        open={!!message.text} 
        autoHideDuration={3000} 
        onClose={handleCloseMessage}
      >
        <Alert 
          severity={message.type} 
          sx={{ width: '100%' }}
          onClose={handleCloseMessage}
        >
          {message.text}
        </Alert>
      </Snackbar>

      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <Tabs 
          value={tabValue} 
          onChange={(e, newValue) => setTabValue(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
        >
          <Tab label="My List" />
          <Tab label="New" />
        </Tabs>

        {/* Tab 1: Existing Food List */}
        {tabValue === 0 && (
          <>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="Date"
                    value={selectedDate}
                    onChange={(newValue) => {
                      setSelectedDate(newValue);
                      setCalculatedMacros(null); // Clear calculations on date change
                    }}
                    renderInput={(params) => 
                      <TextField {...params} fullWidth size="small" margin="dense" />
                    }
                  />
                </LocalizationProvider>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small" margin="dense">
                  <InputLabel id="food-select-label">Select Food</InputLabel>
                  <Select
                    labelId="food-select-label"
                    id="food-select"
                    value={selectedFood}
                    label="Select Food"
                    onChange={(e) => {
                      handleFoodChange(e);
                      setCalculatedMacros(null); // Clear calculations on food change
                    }}
                    disabled={foodsLoading}
                  >
                    {foods.map((food) => (
                      <MenuItem key={food.id} value={food.id}>
                        {food.food_name} (in {food.measuring_unit})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Quantity"
                  type="number"
                  value={quantity}
                  onChange={handleQuantityChange}
                  placeholder="Enter quantity"
                  size="small"
                  margin="dense"
                  InputProps={{ 
                    inputProps: { min: 0.1, step: "0.1" },
                    endAdornment: selectedFood && (
                      <InputAdornment position="end">
                        {foods.find(f => f.id === selectedFood)?.measuring_unit || 'units'}
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>
            </Grid>

            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button 
                onClick={calculateMacros} 
                variant="outlined" 
                color="primary" 
                size="small"
              >
                Calculate Macros
              </Button>
            </Box>
            
            {/* Show calculated macros before saving */}
            {calculatedMacros && (
              <Box sx={{ mt: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Calculated Nutrition for {calculatedMacros.quantity} {calculatedMacros.unit} of {calculatedMacros.food_name}:
                </Typography>
                
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={3}>
                    <Typography variant="body2" color="textSecondary">Calories</Typography>
                    <Typography variant="body1" fontWeight="bold">
                      {calculatedMacros.calories.toFixed(1)}
                    </Typography>
                  </Grid>
                  <Grid item xs={3}>
                    <Typography variant="body2" color="textSecondary">Protein</Typography>
                    <Typography variant="body1" fontWeight="bold">
                      {calculatedMacros.protein.toFixed(1)}g
                    </Typography>
                  </Grid>
                  <Grid item xs={3}>
                    <Typography variant="body2" color="textSecondary">Carbs</Typography>
                    <Typography variant="body1" fontWeight="bold">
                      {calculatedMacros.carbs.toFixed(1)}g
                    </Typography>
                  </Grid>
                  <Grid item xs={3}>
                    <Typography variant="body2" color="textSecondary">Fat</Typography>
                    <Typography variant="body1" fontWeight="bold">
                      {calculatedMacros.fat.toFixed(1)}g
                    </Typography>
                  </Grid>
                </Grid>
                
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                  <Button 
                    onClick={() => setCalculatedMacros(null)} 
                    variant="outlined"
                    size="small"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleAddLog} 
                    variant="contained" 
                    color="primary" 
                    size="small"
                  >
                    Add Food
                  </Button>
                </Box>
              </Box>
            )}
          </>
        )}

        {/* Tab 2: Natural Language */}
        {tabValue === 1 && (
          <>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="Date"
                    value={selectedDate}
                    onChange={(newValue) => setSelectedDate(newValue)}
                    renderInput={(params) => 
                      <TextField {...params} fullWidth size="small" margin="dense" />
                    }
                  />
                </LocalizationProvider>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="What did you eat today?"
                  placeholder="e.g., 2 bananas or 1 cup of rice"
                  value={nlText}
                  onChange={(e) => setNlText(e.target.value)}
                  size="small"
                  margin="dense"
                  multiline
                  rows={2}
                />
              </Grid>
            </Grid>

            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button 
                onClick={handleParseFood} 
                variant="outlined" 
                color="primary" 
                size="small"
                disabled={nlLoading || !nlText.trim()}
              >
                {nlLoading ? 'Processing...' : 'Parse Food'}
              </Button>
            </Box>

            {/* Show parsed food */}
            {parsedFood && (
              <Box sx={{ mt: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Parsed Food Item:
                </Typography>
                <Typography variant="body1">
                  <strong>Food:</strong> {parsedFood.foodName}
                </Typography>
                <Typography variant="body1">
                  <strong>Quantity:</strong> {parsedFood.quantity} {parsedFood.unit}
                </Typography>

                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={searchUserDatabase}
                        onChange={(e) => setSearchUserDatabase(e.target.checked)}
                        color="primary"
                        size="small"
                      />
                    }
                    label="Search my food database first"
                    sx={{ mr: 1 }}
                  />
                  <Button 
                    onClick={handleFetchMacros} 
                    variant="outlined" 
                    color="primary" 
                    size="small"
                    disabled={nlLoading}
                  >
                    {nlLoading ? 'Fetching...' : 'Fetch Macro Info'}
                  </Button>
                </Box>
              </Box>
            )}

            {/* Show fetched macros and calculated values */}
            {fetchedMacros && calculatedNlMacros && (
              <Box sx={{ mt: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Nutrition Information (per {fetchedMacros.servingSize}):
                </Typography>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={3}>
                    <Typography variant="body2" color="textSecondary">Calories</Typography>
                    <Typography variant="body2">
                      {fetchedMacros.calories.toFixed(1)}
                    </Typography>
                  </Grid>
                  <Grid item xs={3}>
                    <Typography variant="body2" color="textSecondary">Protein</Typography>
                    <Typography variant="body2">
                      {fetchedMacros.protein.toFixed(1)}g
                    </Typography>
                  </Grid>
                  <Grid item xs={3}>
                    <Typography variant="body2" color="textSecondary">Carbs</Typography>
                    <Typography variant="body2">
                      {fetchedMacros.carbs.toFixed(1)}g
                    </Typography>
                  </Grid>
                  <Grid item xs={3}>
                    <Typography variant="body2" color="textSecondary">Fats</Typography>
                    <Typography variant="body2">
                      {fetchedMacros.fats.toFixed(1)}g
                    </Typography>
                  </Grid>
                </Grid>

                <Typography variant="subtitle2" gutterBottom sx={{ mt: 3 }}>
                  Your Total ({parsedFood.quantity} {parsedFood.unit}):
                </Typography>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={3}>
                    <Typography variant="body2" color="textSecondary">Calories</Typography>
                    <Typography variant="body1" fontWeight="bold">
                      {calculatedNlMacros.calories}
                    </Typography>
                  </Grid>
                  <Grid item xs={3}>
                    <Typography variant="body2" color="textSecondary">Protein</Typography>
                    <Typography variant="body1" fontWeight="bold">
                      {calculatedNlMacros.protein}g
                    </Typography>
                  </Grid>
                  <Grid item xs={3}>
                    <Typography variant="body2" color="textSecondary">Carbs</Typography>
                    <Typography variant="body1" fontWeight="bold">
                      {calculatedNlMacros.carbs}g
                    </Typography>
                  </Grid>
                  <Grid item xs={3}>
                    <Typography variant="body2" color="textSecondary">Fat</Typography>
                    <Typography variant="body1" fontWeight="bold">
                      {calculatedNlMacros.fat}g
                    </Typography>
                  </Grid>
                </Grid>

                <Box sx={{ mt: 3, mb: 2 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={saveToFoodDatabase}
                        onChange={(e) => setSaveToFoodDatabase(e.target.checked)}
                        color="primary"
                      />
                    }
                    label="Also save to my food database for future use"
                  />
                </Box>

                {/* Buttons and Data Source Information - Arranged horizontally */}
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                  {/* Data Source Information */}
                  <Box sx={{ p: 1.5, bgcolor: dataSource === 'database' ? '#e8f5e9' : '#e3f2fd', borderRadius: 1, flex: '1 1 auto' }}>
                    <Typography variant="caption" color="textSecondary" sx={{ display: 'flex', alignItems: 'center' }}>
                      {dataSource === 'database' ? (
                        <>
                          ℹ️ Information fetched from your food database
                        </>
                      ) : (
                        <>
                          ℹ️ Gemini API used to fetch the food macro information
                        </>
                      )}
                    </Typography>
                  </Box>

                  {/* Action Buttons */}
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button 
                      onClick={handleCancelNl} 
                      variant="outlined"
                      size="small"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleSaveNlFood} 
                      variant="contained" 
                      color="primary" 
                      size="small"
                    >
                      Add Food
                    </Button>
                  </Box>
                </Box>
              </Box>
            )}
          </>
        )}
      </Paper>

      {/* Summary Cards - Simplified for mobile */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 2 }}>
          <Grid container spacing={1}>
            <Grid item xs={6} sm={3}>
              <Typography variant="subtitle2" color="textSecondary">
                Calories
              </Typography>
              <Typography variant={isMobile ? "h6" : "h5"}>
                {dailySummary.calories.toFixed(0)}
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={Math.min((dailySummary.calories / targets.calories) * 100, 100)} 
                sx={{ mt: 1 }}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="subtitle2" color="textSecondary">
                Protein
              </Typography>
              <Typography variant={isMobile ? "h6" : "h5"}>
                {dailySummary.protein.toFixed(1)}g
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={Math.min((dailySummary.protein / targets.protein) * 100, 100)}
                color="success" 
                sx={{ mt: 1 }}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="subtitle2" color="textSecondary">
                Carbs
              </Typography>
              <Typography variant={isMobile ? "h6" : "h5"}>
                {dailySummary.carbs.toFixed(1)}g
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={Math.min((dailySummary.carbs / targets.carbs) * 100, 100)}
                color="warning" 
                sx={{ mt: 1 }}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="subtitle2" color="textSecondary">
                Fat
              </Typography>
              <Typography variant={isMobile ? "h6" : "h5"}>
                {dailySummary.fat.toFixed(1)}g
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={Math.min((dailySummary.fat / targets.fat) * 100, 100)}
                color="error" 
                sx={{ mt: 1 }}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Food Log List */}
      <Typography variant="subtitle1" gutterBottom>
        Today's Food Log
      </Typography>
        
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
          <CircularProgress size={30} />
        </Box>
      ) : (
        <List sx={{ bgcolor: 'background.paper' }} component={Paper}>
          {dailyLogs.map((log) => (
            <React.Fragment key={log.id}>
              <ListItem>
                <ListItemText
                  primary={log.food_name}
                  secondary={
                    isMobile 
                      ? `${log.quantity} ${log.unit} | ${log.calories.toFixed(0)} cal | P:${log.protein.toFixed(1)}g | C:${log.carbs.toFixed(1)}g | F:${log.fat.toFixed(1)}g` 
                      : `${log.quantity} ${log.unit} | Calories: ${log.calories.toFixed(0)}`
                  }
                />
                {!isMobile && (
                  <Box sx={{ flex: 1, mx: 2 }}>
                    <Typography variant="body2">
                      P: {log.protein.toFixed(1)}g | C: {log.carbs.toFixed(1)}g | F: {log.fat.toFixed(1)}g
                    </Typography>
                  </Box>
                )}
                <ListItemSecondaryAction>
                  <IconButton edge="end" size="small" onClick={() => handleDeleteLog(log.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
              <Divider />
            </React.Fragment>
          ))}
          {dailyLogs.length === 0 && (
            <ListItem>
              <ListItemText primary="No food logged for today." />
            </ListItem>
          )}
        </List>
      )}
      <Footer />
    </div>
  );
}

// Use memo to prevent unnecessary re-renders
export default React.memo(DailyLogPage);
