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
  Snackbar
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import DeleteIcon from '@mui/icons-material/Delete';
import { collection, addDoc, getDocs, query, where, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import { format } from 'date-fns';
import { useAuth } from '../Auth/AuthContext';

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

  // Memoized date string to prevent unnecessary recalculations
  const dateString = useMemo(() => {
    return selectedDate.toISOString().split('T')[0];
  }, [selectedDate]);

  // Fetch foods from database - memoized callback
  const fetchFoods = useCallback(async () => {
    setFoodsLoading(true);
    try {
      const foodCollection = collection(db, 'food_calorie_master');
      const foodSnapshot = await getDocs(foodCollection);
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
  }, []);

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
    </div>
  );
}

// Use memo to prevent unnecessary re-renders
export default React.memo(DailyLogPage);
