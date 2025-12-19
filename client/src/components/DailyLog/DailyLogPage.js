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
  Switch,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import DeleteIcon from '@mui/icons-material/Delete';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { collection, addDoc, getDocs, query, where, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import { format } from 'date-fns';
import { useAuth } from '../Auth/AuthContext';
import { parseFoodFromText, getMacrosFromGemini, areFoodsSimilar, detectProteinSource } from '../../utils/geminiApi';
import { calculateProteinBreakdown, getProteinSourceChartData, getProteinSourceWithFallback } from '../../utils/proteinSourceUtils';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
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
  
  // Info dialog states for mobile
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
  const [infoDialogContent, setInfoDialogContent] = useState({ title: '', content: '' });
  
  // Meal category state
  const [mealCategory, setMealCategory] = useState('');

  // Helper function to get protein source badge color
  const getProteinSourceColor = (source) => {
    const colors = {
      'Vegetarian': { bg: '#e8f5e9', text: '#2e7d32' },
      'Animal': { bg: '#ffebee', text: '#c62828' },
      'Mixed': { bg: '#fff3e0', text: '#e65100' },
      'Low-Protein': { bg: '#fce4ec', text: '#ad1457' }
    };
    return colors[source] || { bg: '#f5f5f5', text: '#616161' };
  };

  // Handle info button click (for mobile and desktop)
  const handleInfoClick = (title, content) => {
    if (isMobile) {
      setInfoDialogContent({ title, content });
      setInfoDialogOpen(true);
    }
    // On desktop, tooltip will show on hover
  };

  const handleInfoDialogClose = () => {
    setInfoDialogOpen(false);
  };

  // Function to auto-detect meal category based on current time
  const getMealCategoryByTime = () => {
    const now = new Date();
    const hours = now.getHours();
    
    if (hours >= 6 && hours < 11) {
      return 'Breakfast';
    } else if (hours >= 11 && hours < 13) {
      return 'Pre-Lunch';
    } else if (hours >= 13 && hours < 16) {
      return 'Lunch';
    } else if (hours >= 16 && hours < 18) {
      return 'Evening-Snacks';
    } else if (hours >= 18 && hours < 22) {
      return 'Dinner';
    } else {
      return 'Extra Snacks';
    }
  };

  // Set meal category on component mount
  useEffect(() => {
    setMealCategory(getMealCategoryByTime());
  }, []);

  // Memoized date string to prevent unnecessary recalculations
  // Use local timezone instead of UTC to avoid date mismatch issues
  const dateString = useMemo(() => {
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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

  // Calculate protein breakdown by source
  const proteinBreakdown = useMemo(() => {
    return calculateProteinBreakdown(dailyLogs);
  }, [dailyLogs]);

  const proteinChartData = useMemo(() => {
    return getProteinSourceChartData(proteinBreakdown);
  }, [proteinBreakdown]);

  const totalProtein = useMemo(() => {
    return Object.values(proteinBreakdown).reduce((sum, val) => sum + val, 0);
  }, [proteinBreakdown]);

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

    // Add proteinSource only if it exists
    if (food.proteinSource) {
      macros.proteinSource = food.proteinSource;
    }
    
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
      const result = await parseFoodFromText(nlText, currentUser?.uid);
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
      let proteinSource;
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
        proteinSource = existingFood.proteinSource; // Get from database
        setDataSource('database');
        setMessage({ text: `Found "${existingFood.food_name}" in your food database!`, type: 'success' });
      } else {
        // Call Gemini API to get macro information
        console.log('Not found in database, calling Gemini API...');
        const result = await getMacrosFromGemini(parsedFood.foodName, parsedFood.unit, currentUser?.uid);
        macrosPerUnit = {
          calories: result.calories,
          protein: result.protein,
          carbs: result.carbs,
          fats: result.fats
        };
        servingSize = result.servingSize;
        proteinSource = result.proteinSource;
        
        // If proteinSource is not returned, use detectProteinSource as fallback
        if (!proteinSource) {
          console.log('Protein source not returned from macro API, detecting separately...');
          try {
            proteinSource = await detectProteinSource(parsedFood.foodName, currentUser?.uid);
            console.log('Detected protein source:', proteinSource);
          } catch (detectError) {
            console.warn('Failed to detect protein source:', detectError);
            // Continue without protein source if detection fails
          }
        }
        
        setDataSource('gemini');
        setMessage({ text: 'Macro information fetched from Gemini AI!', type: 'success' });
      }

      setFetchedMacros({ ...macrosPerUnit, servingSize, proteinSource });

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
      
      // Check if it's a rate limit or usage limit error
      if (error.message && error.message.includes('quota')) {
        setMessage({ 
          text: 'Gemini API rate limit reached. Please wait a few seconds and try again, or disable "Search my food database first".', 
          type: 'error' 
        });
      } else if (error.message && error.message.includes('daily limit')) {
        setMessage({ 
          text: error.message, 
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

      // Check for exact duplicates (same food, same quantity, same unit)
      // Users should be able to log the same food multiple times with different quantities
      const existingLog = dailyLogs.find(log => 
        log.food_name.toLowerCase().trim() === parsedFood.foodName.toLowerCase().trim() &&
        log.quantity === Number(parsedFood.quantity) &&
        log.unit === parsedFood.unit &&
        log.date_eaten === dateString
      );

      if (existingLog) {
        setMessage({ 
          text: 'This exact food entry (same item, quantity, and unit) is already logged for today. If you ate this food multiple times, please add them together or delete the existing entry first.', 
          type: 'warning' 
        });
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
        mealCategory: mealCategory || 'Others', // Add meal category
        calories: Number(calculatedNlMacros.calories),
        protein: Number(calculatedNlMacros.protein),
        carbs: Number(calculatedNlMacros.carbs),
        fat: Number(calculatedNlMacros.fat)
      };

      // Add proteinSource only if it exists
      if (fetchedMacros?.proteinSource) {
        logData.proteinSource = fetchedMacros.proteinSource;
      }

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

        // Add proteinSource only if it exists
        if (fetchedMacros?.proteinSource) {
          foodData.proteinSource = fetchedMacros.proteinSource;
        }
        
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
        mealCategory: mealCategory || 'Others', // Add meal category
        ...calculatedMacros
      };
      
      await addDoc(collection(db, 'daily_food_log'), logData);
      setMessage({ text: 'Food added to log!', type: 'success' });
      setQuantity('');
      setSelectedFood('');
      setCalculatedMacros(null);
      setMealCategory(getMealCategoryByTime()); // Reset to auto-detected category
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
    <Box sx={{ 
      minHeight: '100vh',
      bgcolor: '#f5f7fa',
      pb: 2
    }}>
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1.5, 
          mb: 2,
          background: 'linear-gradient(135deg, #66bb6a 0%, #4caf50 100%)',
          color: 'white',
          p: { xs: 2, sm: 2.5 },
          borderRadius: 2,
          boxShadow: '0 4px 12px rgba(102, 187, 106, 0.25)'
        }}>
          <RestaurantMenuIcon sx={{ fontSize: { xs: 28, sm: 36 } }} />
          <Typography variant="h6" component="h1" fontWeight="600" sx={{ fontSize: { xs: '1.1rem', sm: '1.5rem' } }}>
            Daily Food Log
          </Typography>
        </Box>

      <Snackbar 
        open={!!message.text} 
        autoHideDuration={3000} 
        onClose={handleCloseMessage}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          severity={message.type} 
          sx={{ width: '100%' }}
          onClose={handleCloseMessage}
        >
          {message.text}
        </Alert>
      </Snackbar>

      <Paper elevation={0} sx={{ 
        borderRadius: 2,
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        mb: 2
      }}>
        <Tabs 
          value={tabValue} 
          onChange={(e, newValue) => setTabValue(newValue)}
          variant="fullWidth"
          sx={{
            borderBottom: 1, 
            borderColor: 'divider',
            '& .MuiTab-root': {
              fontSize: { xs: '0.85rem', sm: '0.95rem' },
              fontWeight: 500,
              textTransform: 'none',
              minHeight: { xs: 48, sm: 56 }
            },
            '& .Mui-selected': {
              color: '#4caf50 !important'
            },
            '& .MuiTabs-indicator': {
              height: 3,
              background: 'linear-gradient(90deg, #4caf50 0%, #2e7d32 100%)'
            }
          }}
        >
          <Tab label="My Food DB" />
          <Tab label="NLP Based" />
        </Tabs>

        {/* Tab 1: Existing Food List */}
        {tabValue === 0 && (
          <Box sx={{ p: { xs: 2, sm: 3 }, bgcolor: 'white' }}>
            <Grid container spacing={1.5}>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ flex: 1 }}>
                    <LocalizationProvider dateAdapter={AdapterDateFns}>
                      <DatePicker
                        label="Date"
                        value={selectedDate}
                        onChange={(newValue) => {
                          setSelectedDate(newValue);
                          setCalculatedMacros(null); // Clear calculations on date change
                        }}
                        renderInput={(params) => 
                          <TextField {...params} fullWidth size="small" />
                        }
                        slotProps={{
                          textField: {
                            size: 'small',
                            sx: {
                              '& .MuiOutlinedInput-root': {
                                borderRadius: 1.5,
                                '&:hover fieldset': {
                                  borderColor: '#4caf50'
                                },
                                '&.Mui-focused fieldset': {
                                  borderColor: '#4caf50'
                                }
                              }
                            }
                          }
                        }}
                      />
                    </LocalizationProvider>
                  </Box>
                  <Tooltip 
                    title={
                      <Box sx={{ p: 0.5 }}>
                        <Typography variant="body2" gutterBottom sx={{ fontWeight: 600 }}>
                          How to Use:
                        </Typography>
                        <Typography variant="caption" display="block" sx={{ mb: 0.5 }}>
                          • <strong>My Food DB:</strong> Select from your personal food database that you maintain.
                        </Typography>
                        <Typography variant="caption" display="block" sx={{ mb: 0.5 }}>
                          • <strong>NLP Based:</strong> Use this tab if you don't have the food in your list. It fetches nutrition data from the internet.
                        </Typography>
                        <Typography variant="caption" display="block" sx={{ fontStyle: 'italic', mt: 1 }}>
                          Tip: Manage your food database from the menu at the bottom.
                        </Typography>
                      </Box>
                    }
                    arrow
                    placement={isMobile ? "bottom" : "right"}
                    enterDelay={200}
                    leaveDelay={200}
                    disableHoverListener={isMobile}
                    disableFocusListener={isMobile}
                    disableTouchListener={isMobile}
                    sx={{
                      '& .MuiTooltip-tooltip': {
                        bgcolor: 'rgba(0, 0, 0, 0.9)',
                        maxWidth: 300,
                        fontSize: '0.75rem',
                        p: 1.5
                      },
                      '& .MuiTooltip-arrow': {
                        color: 'rgba(0, 0, 0, 0.9)'
                      }
                    }}
                  >
                    <IconButton 
                      size="small" 
                      onClick={() => handleInfoClick(
                        'How to Use',
                        [
                          '• My Food DB: Select from your personal food database that you maintain.',
                          '• NLP Based: Use this tab if you don\'t have the food in your list. It fetches nutrition data from the internet.',
                          '',
                          'Tip: Manage your food database from the menu at the bottom.'
                        ]
                      )}
                      sx={{ 
                        color: '#4caf50',
                        '&:hover': { 
                          bgcolor: 'rgba(76, 175, 80, 0.1)' 
                        }
                      }}
                    >
                      <InfoOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel id="food-select-label">Select Food</InputLabel>
                  <Select
                    labelId="food-select-label"
                    id="food-select"
                    value={selectedFood}
                    label="Select Food"
                    onChange={(e) => {
                      handleFoodChange(e);
                      setCalculatedMacros(null); // Clear calculations on date change
                    }}
                    disabled={foodsLoading}
                    sx={{
                      borderRadius: 1.5,
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#4caf50'
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#4caf50'
                      }
                    }}
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
                  InputProps={{ 
                    inputProps: { min: 0.1, step: "0.1" },
                    endAdornment: selectedFood && (
                      <InputAdornment position="end">
                        {foods.find(f => f.id === selectedFood)?.measuring_unit || 'units'}
                      </InputAdornment>
                    )
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 1.5,
                      '&:hover fieldset': {
                        borderColor: '#4caf50'
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#4caf50'
                      }
                    }
                  }}
                />
              </Grid>
            </Grid>

            {/* Meal Category and Calculate Macros in same row */}
            <Box sx={{ mt: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <FormControl 
                sx={{
                  flex: '1 1 200px',
                  minWidth: 150
                }}
                size="small"
              >
                <InputLabel>Meal Category</InputLabel>
                <Select
                  value={mealCategory}
                  onChange={(e) => setMealCategory(e.target.value)}
                  label="Meal Category"
                  sx={{
                    borderRadius: 1.5,
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#4caf50'
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#4caf50'
                    }
                  }}
                >
                  <MenuItem value="Pre-Breakfast">Pre-Breakfast</MenuItem>
                  <MenuItem value="Pre-Workout">Pre-Workout</MenuItem>
                  <MenuItem value="Breakfast">Breakfast</MenuItem>
                  <MenuItem value="Pre-Lunch">Pre-Lunch</MenuItem>
                  <MenuItem value="Lunch">Lunch</MenuItem>
                  <MenuItem value="Evening-Snacks">Evening-Snacks</MenuItem>
                  <MenuItem value="Dinner">Dinner</MenuItem>
                  <MenuItem value="Post-Workout">Post-Workout</MenuItem>
                  <MenuItem value="Extra Snacks">Extra Snacks</MenuItem>
                  <MenuItem value="Others">Others</MenuItem>
                </Select>
              </FormControl>
              
              <Button 
                onClick={calculateMacros} 
                variant="outlined" 
                size="medium"
                sx={{
                  borderRadius: 2,
                  px: 3,
                  textTransform: 'none',
                  fontSize: { xs: '0.85rem', sm: '0.95rem' },
                  borderColor: '#4caf50',
                  color: '#4caf50',
                  whiteSpace: 'nowrap',
                  '&:hover': {
                    borderColor: '#4caf50',
                    bgcolor: '#f1f8f4'
                  }
                }}
              >
                Calculate Macros
              </Button>
            </Box>
            
            {/* Show calculated macros before saving */}
            {calculatedMacros && (
              <Box sx={{ 
                mt: 2, 
                p: { xs: 1.5, sm: 2 }, 
                bgcolor: '#f1f8f4', 
                borderRadius: 2,
                border: '1px solid #4caf50'
              }}>
                <Typography variant="body2" gutterBottom fontWeight="600" sx={{ fontSize: { xs: '0.85rem', sm: '0.9rem' } }}>
                  Calculated Nutrition for {calculatedMacros.quantity} {calculatedMacros.unit} of {calculatedMacros.food_name}:
                </Typography>
                
                <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
                  <Grid item xs={3}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>Calories</Typography>
                    <Typography variant="body2" fontWeight="600" sx={{ fontSize: { xs: '0.95rem', sm: '1rem' } }}>
                      {calculatedMacros.calories.toFixed(1)}
                    </Typography>
                  </Grid>
                  <Grid item xs={3}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>Protein</Typography>
                    <Typography variant="body2" fontWeight="600" sx={{ fontSize: { xs: '0.95rem', sm: '1rem' } }}>
                      {calculatedMacros.protein.toFixed(1)}g
                    </Typography>
                  </Grid>
                  <Grid item xs={3}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>Carbs</Typography>
                    <Typography variant="body2" fontWeight="600" sx={{ fontSize: { xs: '0.95rem', sm: '1rem' } }}>
                      {calculatedMacros.carbs.toFixed(1)}g
                    </Typography>
                  </Grid>
                  <Grid item xs={3}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>Fat</Typography>
                    <Typography variant="body2" fontWeight="600" sx={{ fontSize: { xs: '0.95rem', sm: '1rem' } }}>
                      {calculatedMacros.fat.toFixed(1)}g
                    </Typography>
                  </Grid>
                </Grid>
                
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
                  <Button 
                    onClick={() => setCalculatedMacros(null)} 
                    variant="outlined"
                    size="medium"
                    sx={{
                      borderRadius: 2,
                      px: 3,
                      textTransform: 'none',
                      fontSize: { xs: '0.85rem', sm: '0.95rem' },
                      borderColor: '#ccc',
                      color: '#666'
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleAddLog} 
                    variant="contained" 
                    size="medium"
                    sx={{
                      borderRadius: 2,
                      px: 3,
                      textTransform: 'none',
                      fontSize: { xs: '0.85rem', sm: '0.95rem' },
                      background: 'linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #2e7d32 0%, #4caf50 100%)'
                      }
                    }}
                  >
                    Add Food
                  </Button>
                </Box>
              </Box>
            )}
          </Box>
        )}

        {/* Tab 2: Natural Language */}
        {tabValue === 1 && (
          <Box sx={{ p: { xs: 2, sm: 3 }, bgcolor: 'white' }}>
            <Grid container spacing={1.5}>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ flex: 1 }}>
                    <LocalizationProvider dateAdapter={AdapterDateFns}>
                      <DatePicker
                        label="Date"
                        value={selectedDate}
                        onChange={(newValue) => setSelectedDate(newValue)}
                        renderInput={(params) => 
                          <TextField {...params} fullWidth size="small" />
                        }
                        slotProps={{
                          textField: {
                            size: 'small',
                            sx: {
                              '& .MuiOutlinedInput-root': {
                                borderRadius: 1.5,
                                '&:hover fieldset': {
                                  borderColor: '#4caf50'
                                },
                                '&.Mui-focused fieldset': {
                                  borderColor: '#4caf50'
                                }
                              }
                            }
                          }
                        }}
                      />
                    </LocalizationProvider>
                  </Box>
                  <Tooltip 
                    title={
                      <Box sx={{ p: 0.5 }}>
                        <Typography variant="body2" gutterBottom sx={{ fontWeight: 600 }}>
                          ⚠️ Important:
                        </Typography>
                        <Typography variant="caption" display="block" sx={{ mb: 0.5 }}>
                          Use this tab only if your food item is <strong>not already in your Food Database</strong>.
                        </Typography>
                        <Typography variant="caption" display="block" sx={{ mb: 0.5 }}>
                          This feature relies on internet data, which may not always precisely match your specific food item's macro information.
                        </Typography>
                        <Typography variant="caption" display="block" sx={{ fontStyle: 'italic', mt: 1, color: '#4caf50' }}>
                          💡 For accuracy, add frequently eaten foods to your Food Database first.
                        </Typography>
                      </Box>
                    }
                    arrow
                    placement={isMobile ? "bottom" : "right"}
                    enterDelay={200}
                    leaveDelay={200}
                    disableHoverListener={isMobile}
                    disableFocusListener={isMobile}
                    disableTouchListener={isMobile}
                    sx={{
                      '& .MuiTooltip-tooltip': {
                        bgcolor: 'rgba(0, 0, 0, 0.9)',
                        maxWidth: 320,
                        fontSize: '0.75rem',
                        p: 1.5
                      },
                      '& .MuiTooltip-arrow': {
                        color: 'rgba(0, 0, 0, 0.9)'
                      }
                    }}
                  >
                    <IconButton 
                      size="small" 
                      onClick={() => handleInfoClick(
                        '⚠️ Important',
                        [
                          'Use this tab only if your food item is not already in your Food Database.',
                          '',
                          'This feature relies on internet data, which may not always precisely match your specific food item\'s macro information.',
                          '',
                          '💡 For accuracy, add frequently eaten foods to your Food Database first.'
                        ]
                      )}
                      sx={{ 
                        color: '#ff9800',
                        '&:hover': { 
                          bgcolor: 'rgba(255, 152, 0, 0.1)' 
                        }
                      }}
                    >
                      <InfoOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="What did you eat today?"
                  placeholder="e.g., 2 bananas or 1 cup of rice"
                  value={nlText}
                  onChange={(e) => setNlText(e.target.value)}
                  size="small"
                  multiline
                  rows={2}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 1.5,
                      '&:hover fieldset': {
                        borderColor: '#4caf50'
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#4caf50'
                      }
                    }
                  }}
                />
              </Grid>
            </Grid>

            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button 
                onClick={handleParseFood} 
                variant="outlined" 
                size="medium"
                disabled={nlLoading || !nlText.trim()}
                sx={{
                  borderRadius: 2,
                  px: 3,
                  textTransform: 'none',
                  fontSize: { xs: '0.85rem', sm: '0.95rem' },
                  borderColor: '#4caf50',
                  color: '#4caf50',
                  '&:hover': {
                    borderColor: '#4caf50',
                    bgcolor: '#f1f8f4'
                  }
                }}
              >
                {nlLoading ? 'Processing...' : 'Parse Food'}
              </Button>
            </Box>

            {/* Show parsed food */}
            {parsedFood && (
              <Box sx={{ 
                mt: 2, 
                p: { xs: 1.5, sm: 2 }, 
                bgcolor: '#f1f8f4', 
                borderRadius: 2,
                border: '1px solid #4caf50'
              }}>
                <Typography variant="body2" gutterBottom fontWeight="600" sx={{ fontSize: { xs: '0.85rem', sm: '0.9rem' } }}>
                  Parsed Food Item:
                </Typography>
                <Typography variant="body2" sx={{ fontSize: { xs: '0.85rem', sm: '0.9rem' } }}>
                  <strong>Food:</strong> {parsedFood.foodName}
                </Typography>
                <Typography variant="body2" sx={{ fontSize: { xs: '0.85rem', sm: '0.9rem' } }}>
                  <strong>Quantity:</strong> {parsedFood.quantity} {parsedFood.unit}
                </Typography>

                <Box sx={{ mt: 2, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'flex-end', alignItems: { xs: 'stretch', sm: 'center' }, gap: 1.5 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={searchUserDatabase}
                        onChange={(e) => setSearchUserDatabase(e.target.checked)}
                        size="small"
                        sx={{ 
                          '& .MuiSwitch-switchBase.Mui-checked': {
                            color: '#4caf50',
                          },
                          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                            backgroundColor: '#4caf50',
                          }
                        }}
                      />
                    }
                    label={<Typography variant="caption" sx={{ fontSize: { xs: '0.8rem', sm: '0.85rem' } }}>Search my food database first</Typography>}
                  />
                  <Button 
                    onClick={handleFetchMacros} 
                    variant="outlined" 
                    size="medium"
                    disabled={nlLoading}
                    sx={{
                      borderRadius: 2,
                      px: 3,
                      textTransform: 'none',
                      fontSize: { xs: '0.85rem', sm: '0.95rem' },
                      borderColor: '#4caf50',
                      color: '#4caf50',
                      '&:hover': {
                        borderColor: '#4caf50',
                        bgcolor: '#f1f8f4'
                      }
                    }}
                  >
                    {nlLoading ? 'Fetching...' : 'Fetch Macro Info'}
                  </Button>
                </Box>
              </Box>
            )}

            {/* Show fetched macros and calculated values */}
            {fetchedMacros && calculatedNlMacros && (
              <Box sx={{ 
                mt: 2, 
                p: { xs: 1.5, sm: 2 }, 
                bgcolor: '#f1f8f4', 
                borderRadius: 2,
                border: '1px solid #4caf50'
              }}>
                <Typography variant="body2" gutterBottom fontWeight="600" sx={{ fontSize: { xs: '0.85rem', sm: '0.9rem' } }}>
                  Nutrition Information (per {fetchedMacros.servingSize}):
                </Typography>
                <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
                  <Grid item xs={3}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>Calories</Typography>
                    <Typography variant="body2" sx={{ fontSize: { xs: '0.85rem', sm: '0.9rem' } }}>
                      {fetchedMacros.calories.toFixed(1)}
                    </Typography>
                  </Grid>
                  <Grid item xs={3}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>Protein</Typography>
                    <Typography variant="body2" sx={{ fontSize: { xs: '0.85rem', sm: '0.9rem' } }}>
                      {fetchedMacros.protein.toFixed(1)}g
                    </Typography>
                  </Grid>
                  <Grid item xs={3}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>Carbs</Typography>
                    <Typography variant="body2" sx={{ fontSize: { xs: '0.85rem', sm: '0.9rem' } }}>
                      {fetchedMacros.carbs.toFixed(1)}g
                    </Typography>
                  </Grid>
                  <Grid item xs={3}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>Fats</Typography>
                    <Typography variant="body2" sx={{ fontSize: { xs: '0.85rem', sm: '0.9rem' } }}>
                      {fetchedMacros.fats.toFixed(1)}g
                    </Typography>
                  </Grid>
                </Grid>

                <Typography variant="body2" gutterBottom fontWeight="600" sx={{ mt: 2, fontSize: { xs: '0.85rem', sm: '0.9rem' } }}>
                  Your Total ({parsedFood.quantity} {parsedFood.unit}):
                </Typography>
                <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
                  <Grid item xs={3}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>Calories</Typography>
                    <Typography variant="body2" fontWeight="600" sx={{ fontSize: { xs: '0.95rem', sm: '1rem' } }}>
                      {calculatedNlMacros.calories}
                    </Typography>
                  </Grid>
                  <Grid item xs={3}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>Protein</Typography>
                    <Typography variant="body2" fontWeight="600" sx={{ fontSize: { xs: '0.95rem', sm: '1rem' } }}>
                      {calculatedNlMacros.protein}g
                    </Typography>
                  </Grid>
                  <Grid item xs={3}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>Carbs</Typography>
                    <Typography variant="body2" fontWeight="600" sx={{ fontSize: { xs: '0.95rem', sm: '1rem' } }}>
                      {calculatedNlMacros.carbs}g
                    </Typography>
                  </Grid>
                  <Grid item xs={3}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>Fat</Typography>
                    <Typography variant="body2" fontWeight="600" sx={{ fontSize: { xs: '0.95rem', sm: '1rem' } }}>
                      {calculatedNlMacros.fat}g
                    </Typography>
                  </Grid>
                </Grid>

                <Box sx={{ mt: 2 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={saveToFoodDatabase}
                        onChange={(e) => setSaveToFoodDatabase(e.target.checked)}
                        size="small"
                        sx={{ 
                          '& .MuiSwitch-switchBase.Mui-checked': {
                            color: '#4caf50',
                          },
                          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                            backgroundColor: '#4caf50',
                          }
                        }}
                      />
                    }
                    label={<Typography variant="caption" sx={{ fontSize: { xs: '0.8rem', sm: '0.85rem' } }}>Also save to my food database for future use</Typography>}
                  />
                </Box>

                {/* Data Source Information */}
                <Box sx={{ 
                  mt: 2, 
                  p: 1.5, 
                  bgcolor: dataSource === 'database' ? '#e8f5e9' : '#e3f2fd', 
                  borderRadius: 1.5,
                  border: `1px solid ${dataSource === 'database' ? '#66bb6a' : '#42a5f5'}`
                }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.8rem' } }}>
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
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
                  <Button 
                    onClick={handleCancelNl} 
                    variant="outlined"
                    size="medium"
                    sx={{
                      borderRadius: 2,
                      px: 3,
                      textTransform: 'none',
                      fontSize: { xs: '0.85rem', sm: '0.95rem' },
                      borderColor: '#ccc',
                      color: '#666'
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSaveNlFood} 
                    variant="contained" 
                    size="medium"
                    sx={{
                      borderRadius: 2,
                      px: 3,
                      textTransform: 'none',
                      fontSize: { xs: '0.85rem', sm: '0.95rem' },
                      background: 'linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #2e7d32 0%, #4caf50 100%)'
                      }
                    }}
                  >
                    Add Food
                  </Button>
                </Box>
              </Box>
            )}
          </Box>
        )}
      </Paper>

      {/* Summary Cards - Simplified for mobile */}
      <Box sx={{ 
        mb: 2,
        p: { xs: 1.5, sm: 2 },
        bgcolor: 'white',
        borderRadius: 2,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
      }}>
        <Typography variant="body2" fontWeight="600" color="#4caf50" gutterBottom sx={{ mb: 1.5, fontSize: { xs: '0.9rem', sm: '1rem' } }}>
          Today's Summary
        </Typography>
        <Grid container spacing={1.5}>
          <Grid item xs={6} sm={3}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
              Calories
            </Typography>
            <Typography variant="body1" fontWeight="600" sx={{ fontSize: { xs: '1.1rem', sm: '1.3rem' } }}>
              {dailySummary.calories.toFixed(0)}
            </Typography>
            <LinearProgress 
              variant="determinate" 
              value={Math.min((dailySummary.calories / targets.calories) * 100, 100)} 
              sx={{ mt: 0.5, height: 6, borderRadius: 1 }}
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
              Protein
            </Typography>
            <Typography variant="body1" fontWeight="600" sx={{ fontSize: { xs: '1.1rem', sm: '1.3rem' } }}>
              {dailySummary.protein.toFixed(1)}g
            </Typography>
            <LinearProgress 
              variant="determinate" 
              value={Math.min((dailySummary.protein / targets.protein) * 100, 100)}
              color="success" 
              sx={{ mt: 0.5, height: 6, borderRadius: 1 }}
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
              Carbs
            </Typography>
            <Typography variant="body1" fontWeight="600" sx={{ fontSize: { xs: '1.1rem', sm: '1.3rem' } }}>
              {dailySummary.carbs.toFixed(1)}g
            </Typography>
            <LinearProgress 
              variant="determinate" 
              value={Math.min((dailySummary.carbs / targets.carbs) * 100, 100)}
              color="warning" 
              sx={{ mt: 0.5, height: 6, borderRadius: 1 }}
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
              Fat
            </Typography>
            <Typography variant="body1" fontWeight="600" sx={{ fontSize: { xs: '1.1rem', sm: '1.3rem' } }}>
              {dailySummary.fat.toFixed(1)}g
            </Typography>
            <LinearProgress 
              variant="determinate" 
              value={Math.min((dailySummary.fat / targets.fat) * 100, 100)}
              color="error" 
              sx={{ mt: 0.5, height: 6, borderRadius: 1 }}
            />
          </Grid>
        </Grid>
      </Box>

      {/* Protein Source Analysis Chart */}
      {totalProtein > 0 && (
        <Box sx={{ 
          mb: 2,
          p: { xs: 1.5, sm: 2 },
          bgcolor: 'white',
          borderRadius: 2,
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
        }}>
          <Typography variant="body2" fontWeight="600" color="#4caf50" gutterBottom sx={{ mb: 1.5, fontSize: { xs: '0.9rem', sm: '1rem' } }}>
            Protein Source Analysis
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: 'center', gap: 2 }}>
            <Box sx={{ width: { xs: '100%', md: '300px' }, height: '250px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={proteinChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    label={false}
                    labelLine={false}
                  >
                    {proteinChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    formatter={(value) => `${value.toFixed(1)}g`}
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                      border: '1px solid #ddd', 
                      borderRadius: '8px',
                      padding: '8px 12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </Box>
            <Box sx={{ flex: 1, minWidth: { xs: '100%', md: 'auto' } }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Total Protein: <strong>{totalProtein.toFixed(1)}g</strong>
              </Typography>
              <Box sx={{ mt: 2 }}>
                {proteinChartData.map((item) => (
                  <Box key={item.name} sx={{ mb: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 12, height: 12, bgcolor: item.color, borderRadius: '50%' }} />
                        <Typography variant="body2">{item.name}</Typography>
                      </Box>
                      <Typography variant="body2" fontWeight="600">
                        {item.value.toFixed(1)}g ({((item.value / totalProtein) * 100).toFixed(1)}%)
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={(item.value / totalProtein) * 100}
                      sx={{ 
                        height: 6, 
                        borderRadius: 1,
                        bgcolor: 'rgba(0,0,0,0.08)',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: item.color
                        }
                      }}
                    />
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        </Box>
      )}

      {/* Food Log List */}
      <Box sx={{ 
        p: { xs: 1.5, sm: 2 }, 
        bgcolor: 'white', 
        borderRadius: 2,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
      }}>
        <Typography variant="body2" fontWeight="600" color="#4caf50" gutterBottom sx={{ fontSize: { xs: '0.9rem', sm: '1rem' }, mb: 1.5 }}>
          Today's Food Log
        </Typography>
        
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
          <CircularProgress size={30} />
        </Box>
      ) : (
        <List sx={{ bgcolor: 'transparent', p: 0 }}>
          {dailyLogs.map((log) => (
            <React.Fragment key={log.id}>
              <ListItem sx={{ px: 0 }}>
                <ListItemText
                  primary={
                    <Box>
                      <Typography component="span" sx={{ fontWeight: 600, fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                        {log.food_name}
                      </Typography>
                      {log.mealCategory && (
                        <Typography 
                          component="span" 
                          sx={{ 
                            ml: 1, 
                            px: 1, 
                            py: 0.25, 
                            bgcolor: '#e3f2fd', 
                            color: '#1976d2',
                            borderRadius: 1,
                            fontSize: { xs: '0.7rem', sm: '0.75rem' },
                            fontWeight: 500
                          }}
                        >
                          {log.mealCategory}
                        </Typography>
                      )}
                      {(() => {
                        const proteinSource = getProteinSourceWithFallback(log);
                        if (proteinSource && proteinSource !== 'Unclassified') {
                          return (
                            <Typography 
                              component="span" 
                              sx={{ 
                                ml: 1, 
                                px: 1, 
                                py: 0.25, 
                                bgcolor: getProteinSourceColor(proteinSource).bg, 
                                color: getProteinSourceColor(proteinSource).text,
                                borderRadius: 1,
                                fontSize: { xs: '0.7rem', sm: '0.75rem' },
                                fontWeight: 500
                              }}
                            >
                              {proteinSource}
                            </Typography>
                          );
                        }
                        return null;
                      })()}
                    </Box>
                  }
                  secondary={
                    isMobile 
                      ? `${log.quantity} ${log.unit} | ${log.calories.toFixed(0)} cal | P:${log.protein.toFixed(1)}g | C:${log.carbs.toFixed(1)}g | F:${log.fat.toFixed(1)}g` 
                      : `${log.quantity} ${log.unit} | Calories: ${log.calories.toFixed(0)}`
                  }
                  secondaryTypographyProps={{
                    fontSize: { xs: '0.75rem', sm: '0.85rem' }
                  }}
                />
                {!isMobile && (
                  <Box sx={{ flex: 1, mx: 2 }}>
                    <Typography variant="body2" sx={{ fontSize: { xs: '0.8rem', sm: '0.85rem' } }}>
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
            <ListItem sx={{ px: 0 }}>
              <ListItemText primary="No food logged for today." />
            </ListItem>
          )}
        </List>
      )}
      </Box>
      </Box>
      <Footer />
      
      {/* Info Dialog for Mobile */}
      <Dialog 
        open={infoDialogOpen} 
        onClose={handleInfoDialogClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            m: 2
          }
        }}
      >
        <DialogTitle sx={{ 
          bgcolor: '#4caf50', 
          color: 'white',
          fontWeight: 600
        }}>
          {infoDialogContent.title}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {Array.isArray(infoDialogContent.content) ? (
            infoDialogContent.content.map((line, index) => (
              <Typography 
                key={index} 
                variant="body2" 
                sx={{ 
                  mb: line === '' ? 1 : 0.5,
                  color: line.includes('💡') ? '#4caf50' : 'text.primary',
                  fontStyle: line.includes('💡') ? 'italic' : 'normal'
                }}
              >
                {line}
              </Typography>
            ))
          ) : (
            <Typography variant="body2">{infoDialogContent.content}</Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={handleInfoDialogClose} 
            variant="contained"
            sx={{
              background: 'linear-gradient(135deg, #66bb6a 0%, #2e7d32 100%)',
              textTransform: 'none'
            }}
          >
            Got it
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// Use memo to prevent unnecessary re-renders
export default React.memo(DailyLogPage);

