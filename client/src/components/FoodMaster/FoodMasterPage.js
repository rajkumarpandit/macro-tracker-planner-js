import React, { useState, useEffect, useCallback } from 'react';
import { 
  Typography, 
  Paper, 
  TextField, 
  Button, 
  Grid, 
  IconButton,
  Box,
  Alert,
  InputAdornment,
  useMediaQuery,
  useTheme,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  CircularProgress,
  Snackbar
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebase';

function FoodMasterPage() {
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: '', type: '' });
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [formData, setFormData] = useState({
    food_name: '',
    measuring_unit: '',
    measuring_quantity: 1,
    calories_in_gms: 0,
    Protien_in_gms: 0,
    carb_in_gms: 0,
    fat_in_gms: 0
  });
  
  const [editing, setEditing] = useState(false);
  const [currentId, setCurrentId] = useState('');

  // Memoized fetch function to avoid unnecessary re-renders
  const fetchFoods = useCallback(async () => {
    setLoading(true);
    try {
      const foodCollection = collection(db, 'food_calorie_master');
      const foodSnapshot = await getDocs(foodCollection);
      const foodList = foodSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setFoods(foodList);
    } catch (error) {
      console.error("Error fetching foods: ", error);
      setMessage({ text: 'Failed to load food items', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  // Load food items on component mount
  useEffect(() => {
    fetchFoods();
  }, [fetchFoods]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'food_name' || name === 'measuring_unit' ? value : Number(value)
    });
  };

  const resetForm = () => {
    setFormData({
      food_name: '',
      measuring_unit: '',
      measuring_quantity: 1,
      calories_in_gms: 0,
      Protien_in_gms: 0,
      carb_in_gms: 0,
      fat_in_gms: 0
    });
    setEditing(false);
    setCurrentId('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editing) {
        // Update existing food
        const foodRef = doc(db, 'food_calorie_master', currentId);
        await updateDoc(foodRef, formData);
        setMessage({ text: 'Food item updated!', type: 'success' });
      } else {
        // Add new food
        await addDoc(collection(db, 'food_calorie_master'), formData);
        setMessage({ text: 'Food item added!', type: 'success' });
      }
      resetForm();
      fetchFoods();
    } catch (error) {
      console.error("Error saving food: ", error);
      setMessage({ text: 'Error saving food item', type: 'error' });
    }
  };

  const handleEdit = (food) => {
    setFormData({
      food_name: food.food_name,
      measuring_unit: food.measuring_unit,
      measuring_quantity: food.measuring_quantity,
      calories_in_gms: food.calories_in_gms,
      Protien_in_gms: food.Protien_in_gms,
      carb_in_gms: food.carb_in_gms,
      fat_in_gms: food.fat_in_gms
    });
    setEditing(true);
    setCurrentId(food.id);
  };

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, 'food_calorie_master', id));
      setMessage({ text: 'Food item deleted!', type: 'success' });
      fetchFoods();
    } catch (error) {
      console.error("Error deleting food: ", error);
      setMessage({ text: 'Error deleting food item', type: 'error' });
    }
  };

  const handleCloseMessage = () => {
    setMessage({ text: '', type: '' });
  };

  return (
    <div>
      <Typography variant="h5" component="h1" gutterBottom>
        Food Database
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
        <Typography variant="subtitle1" component="h2" gutterBottom>
          {editing ? 'Edit Food Item' : 'Add New Food Item'}
        </Typography>
        
        <form onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Food Name"
                name="food_name"
                value={formData.food_name}
                onChange={handleInputChange}
                required
                margin="dense"
                variant="outlined"
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Measuring Unit"
                name="measuring_unit"
                value={formData.measuring_unit}
                onChange={handleInputChange}
                required
                margin="dense"
                variant="outlined"
                size="small"
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField
                fullWidth
                label="Quantity"
                name="measuring_quantity"
                type="number"
                value={formData.measuring_quantity}
                onChange={handleInputChange}
                required
                margin="dense"
                variant="outlined"
                size="small"
                InputProps={{ inputProps: { min: 0, step: "0.01" } }}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField
                fullWidth
                label="Calories"
                name="calories_in_gms"
                type="number"
                value={formData.calories_in_gms}
                onChange={handleInputChange}
                required
                margin="dense"
                variant="outlined"
                size="small"
                InputProps={{ 
                  inputProps: { min: 0, step: "0.1" },
                  endAdornment: <InputAdornment position="end">cal</InputAdornment>
                }}
              />
            </Grid>
            <Grid item xs={4} sm={2}>
              <TextField
                fullWidth
                label="Protein"
                name="Protien_in_gms"
                type="number"
                value={formData.Protien_in_gms}
                onChange={handleInputChange}
                required
                margin="dense"
                variant="outlined"
                size="small"
                InputProps={{ 
                  inputProps: { min: 0, step: "0.1" },
                  endAdornment: <InputAdornment position="end">g</InputAdornment>
                }}
              />
            </Grid>
            <Grid item xs={4} sm={2}>
              <TextField
                fullWidth
                label="Carbs"
                name="carb_in_gms"
                type="number"
                value={formData.carb_in_gms}
                onChange={handleInputChange}
                required
                margin="dense"
                variant="outlined"
                size="small"
                InputProps={{ 
                  inputProps: { min: 0, step: "0.1" },
                  endAdornment: <InputAdornment position="end">g</InputAdornment>
                }}
              />
            </Grid>
            <Grid item xs={4} sm={2}>
              <TextField
                fullWidth
                label="Fat"
                name="fat_in_gms"
                type="number"
                value={formData.fat_in_gms}
                onChange={handleInputChange}
                required
                margin="dense"
                variant="outlined"
                size="small"
                InputProps={{ 
                  inputProps: { min: 0, step: "0.1" },
                  endAdornment: <InputAdornment position="end">g</InputAdornment>
                }}
              />
            </Grid>
          </Grid>

          <Box sx={{ mt: 2, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            <Button 
              type="submit" 
              variant="contained" 
              color="primary" 
              size="small"
            >
              {editing ? 'Update' : 'Add'}
            </Button>
            {editing && (
              <Button 
                variant="outlined" 
                color="secondary" 
                onClick={resetForm}
                size="small"
              >
                Cancel
              </Button>
            )}
          </Box>
        </form>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress size={30} />
        </Box>
      ) : (
        <>
          <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
            Food Items ({foods.length})
          </Typography>
          
          {isMobile ? (
            // Mobile view - List
            <List sx={{ bgcolor: 'background.paper' }} component={Paper}>
              {foods.map((food) => (
                <React.Fragment key={food.id}>
                  <ListItem>
                    <ListItemText
                      primary={food.food_name}
                      secondary={
                        <>
                          {`${food.measuring_quantity} ${food.measuring_unit} | ${food.calories_in_gms} cal`}
                          <br />
                          {`P: ${food.Protien_in_gms}g | C: ${food.carb_in_gms}g | F: ${food.fat_in_gms}g`}
                        </>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton edge="end" size="small" onClick={() => handleEdit(food)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton edge="end" size="small" onClick={() => handleDelete(food.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                  <Divider />
                </React.Fragment>
              ))}
              {foods.length === 0 && (
                <ListItem>
                  <ListItemText primary="No food items found. Add some!" />
                </ListItem>
              )}
            </List>
          ) : (
            // Desktop view - Grid
            <Grid container spacing={2}>
              {foods.map((food) => (
                <Grid item xs={12} sm={6} md={4} key={food.id}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle1" component="div">
                      {food.food_name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {`${food.measuring_quantity} ${food.measuring_unit}`}
                    </Typography>
                    <Typography variant="body1" sx={{ mt: 1 }}>
                      {`${food.calories_in_gms} calories`}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {`P: ${food.Protien_in_gms}g | C: ${food.carb_in_gms}g | F: ${food.fat_in_gms}g`}
                    </Typography>
                    <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
                      <IconButton size="small" onClick={() => handleEdit(food)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDelete(food.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Paper>
                </Grid>
              ))}
              {foods.length === 0 && (
                <Grid item xs={12}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography>No food items found. Add some!</Typography>
                  </Paper>
                </Grid>
              )}
            </Grid>
          )}
        </>
      )}
    </div>
  );
}

// Use memo to prevent unnecessary re-renders
export default React.memo(FoodMasterPage);
