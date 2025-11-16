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
import MenuBookIcon from '@mui/icons-material/MenuBook';
import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc, query, where } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import { useAuth } from '../Auth/AuthContext';
import Footer from '../Common/Footer';

function FoodMasterPage() {
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: '', type: '' });
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { currentUser } = useAuth();
  
  const [formData, setFormData] = useState({
    food_name: '',
    measuring_unit: '',
    measuring_quantity: '',
    calories_in_gms: '',
    Protien_in_gms: '',
    carb_in_gms: '',
    fat_in_gms: ''
  });
  
  const [editing, setEditing] = useState(false);
  const [currentId, setCurrentId] = useState('');

  // Memoized fetch function to avoid unnecessary re-renders
  const fetchFoods = useCallback(async () => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      // Users can only see their own food items
      const userQuery = query(
        collection(db, 'food_calorie_master'),
        where('userId', '==', currentUser.uid)
      );
      
      const userSnapshot = await getDocs(userQuery);
      
      const foodsToDisplay = userSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        isEditable: true // Users can edit their own items
      }));
      
      // Sort alphabetically by food_name
      const sortedFoods = foodsToDisplay.sort((a, b) => 
        a.food_name.localeCompare(b.food_name)
      );
      
      setFoods(sortedFoods);
    } catch (error) {
      console.error("Error fetching foods: ", error);
      setMessage({ text: 'Failed to load food items', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // Load food items on component mount
  useEffect(() => {
    fetchFoods();
  }, [fetchFoods]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    // Allow empty string for number fields, convert to empty string if user clears
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const resetForm = () => {
    setFormData({
      food_name: '',
      measuring_unit: '',
      measuring_quantity: '',
      calories_in_gms: '',
      Protien_in_gms: '',
      carb_in_gms: '',
      fat_in_gms: ''
    });
    setEditing(false);
    setCurrentId('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!currentUser) {
      setMessage({ text: 'You must be logged in to save food items', type: 'error' });
      return;
    }
    
    // Validation: Check if all numeric fields have valid values
    const quantity = Number(formData.measuring_quantity);
    const calories = Number(formData.calories_in_gms);
    const protein = Number(formData.Protien_in_gms);
    const carbs = Number(formData.carb_in_gms);
    const fats = Number(formData.fat_in_gms);
    
    if (!formData.food_name || !formData.measuring_unit) {
      setMessage({ text: 'Please fill in food name and measuring unit', type: 'error' });
      return;
    }
    
    if (isNaN(quantity) || quantity <= 0) {
      setMessage({ text: 'Please enter a valid quantity greater than 0', type: 'error' });
      return;
    }
    
    if (isNaN(calories) || calories < 0 || isNaN(protein) || protein < 0 || 
        isNaN(carbs) || carbs < 0 || isNaN(fats) || fats < 0) {
      setMessage({ text: 'Please enter valid numeric values (0 or greater) for all nutrition fields', type: 'error' });
      return;
    }
    
    try {
      const dataToSave = {
        food_name: formData.food_name,
        measuring_unit: formData.measuring_unit,
        measuring_quantity: quantity,
        calories_in_gms: calories,
        Protien_in_gms: protein,
        carb_in_gms: carbs,
        fat_in_gms: fats
      };
      
      if (editing) {
        // Update existing food
        const foodRef = doc(db, 'food_calorie_master', currentId);
        await updateDoc(foodRef, {
          ...dataToSave,
          lastUpdatedAt: new Date().toISOString()
        });
        setMessage({ text: 'Food item updated!', type: 'success' });
      } else {
        // Add new food
        await addDoc(collection(db, 'food_calorie_master'), {
          ...dataToSave,
          userId: currentUser.uid,
          createdAt: new Date().toISOString()
        });
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
    if (!currentUser) {
      setMessage({ text: 'You must be logged in to delete food items', type: 'error' });
      return;
    }
    
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
          <MenuBookIcon sx={{ fontSize: { xs: 28, sm: 36 } }} />
          <Typography variant="h6" component="h1" fontWeight="600" sx={{ fontSize: { xs: '1.1rem', sm: '1.5rem' } }}>
            My Food Database
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
        p: { xs: 2, sm: 3 }, 
        mb: 2,
        borderRadius: 2,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
      }}>
        <Typography variant="body2" component="h2" gutterBottom fontWeight="600" color="#667eea" sx={{ mb: 2, fontSize: { xs: '0.9rem', sm: '1rem' } }}>
          {editing ? 'Edit Food Item' : 'Add New Food Item'}
        </Typography>
        
        <form onSubmit={handleSubmit}>
          <Grid container spacing={1.5}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Food Name"
                name="food_name"
                value={formData.food_name}
                onChange={handleInputChange}
                required
                variant="outlined"
                size="small"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1.5,
                    '&:hover fieldset': {
                      borderColor: '#667eea'
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#667eea'
                    }
                  }
                }}
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
                variant="outlined"
                size="small"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1.5,
                    '&:hover fieldset': {
                      borderColor: '#667eea'
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#667eea'
                    }
                  }
                }}
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
                variant="outlined"
                size="small"
                InputProps={{ inputProps: { min: 0, step: "0.01" } }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1.5,
                    '&:hover fieldset': {
                      borderColor: '#667eea'
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#667eea'
                    }
                  }
                }}
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
                variant="outlined"
                size="small"
                InputProps={{ 
                  inputProps: { min: 0, step: "0.1" },
                  endAdornment: <InputAdornment position="end">cal</InputAdornment>
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1.5,
                    '&:hover fieldset': {
                      borderColor: '#667eea'
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#667eea'
                    }
                  }
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
                variant="outlined"
                size="small"
                InputProps={{ 
                  inputProps: { min: 0, step: "0.1" },
                  endAdornment: <InputAdornment position="end">g</InputAdornment>
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1.5,
                    '&:hover fieldset': {
                      borderColor: '#667eea'
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#667eea'
                    }
                  }
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
                variant="outlined"
                size="small"
                InputProps={{ 
                  inputProps: { min: 0, step: "0.1" },
                  endAdornment: <InputAdornment position="end">g</InputAdornment>
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1.5,
                    '&:hover fieldset': {
                      borderColor: '#667eea'
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#667eea'
                    }
                  }
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
                variant="outlined"
                size="small"
                InputProps={{ 
                  inputProps: { min: 0, step: "0.1" },
                  endAdornment: <InputAdornment position="end">g</InputAdornment>
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1.5,
                    '&:hover fieldset': {
                      borderColor: '#667eea'
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#667eea'
                    }
                  }
                }}
              />
            </Grid>
          </Grid>

          <Box sx={{ mt: 2, display: 'flex', gap: 1.5, justifyContent: 'flex-end' }}>
            <Button 
              type="submit" 
              variant="contained" 
              size="medium"
              sx={{
                borderRadius: 2,
                px: 3,
                textTransform: 'none',
                fontSize: { xs: '0.85rem', sm: '0.95rem' },
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)'
                }
              }}
            >
              {editing ? 'Update' : 'Add'}
            </Button>
            {editing && (
              <Button 
                variant="outlined" 
                onClick={resetForm}
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
          <Box sx={{ 
            p: { xs: 1.5, sm: 2 }, 
            bgcolor: 'white', 
            borderRadius: 2,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
          }}>
            <Typography variant="body2" fontWeight="600" color="#667eea" gutterBottom sx={{ fontSize: { xs: '0.9rem', sm: '1rem' }, mb: 1.5 }}>
              Food Items ({foods.length})
            </Typography>
          
          {isMobile ? (
            // Mobile view - List
            <List sx={{ bgcolor: 'transparent', p: 0 }}>
              {foods.map((food) => (
                <React.Fragment key={food.id}>
                  <ListItem sx={{ px: 0 }}>
                    <ListItemText
                      primary={food.food_name}
                      primaryTypographyProps={{
                        fontWeight: 600,
                        fontSize: { xs: '0.9rem', sm: '1rem' }
                      }}
                      secondary={
                        <>
                          {`${food.measuring_quantity} ${food.measuring_unit} | ${food.calories_in_gms} cal`}
                          <br />
                          {`P: ${food.Protien_in_gms}g | C: ${food.carb_in_gms}g | F: ${food.fat_in_gms}g`}
                        </>
                      }
                      secondaryTypographyProps={{
                        fontSize: { xs: '0.75rem', sm: '0.85rem' }
                      }}
                    />
                    <ListItemSecondaryAction>
                      <IconButton edge="end" size="small" onClick={() => handleEdit(food)} sx={{ color: '#667eea' }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton edge="end" size="small" onClick={() => handleDelete(food.id)} sx={{ color: '#ef5350' }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                  <Divider />
                </React.Fragment>
              ))}
              {foods.length === 0 && (
                <ListItem sx={{ px: 0 }}>
                  <ListItemText primary="No food items found. Add some!" />
                </ListItem>
              )}
            </List>
          ) : (
            // Desktop view - Grid
            <Grid container spacing={1.5}>
              {foods.map((food) => (
                <Grid item xs={12} sm={6} md={4} key={food.id}>
                  <Box sx={{ 
                    p: 2, 
                    bgcolor: '#f9f9f9', 
                    borderRadius: 1.5,
                    border: '1px solid #e0e0e0',
                    '&:hover': {
                      boxShadow: '0 2px 8px rgba(102, 126, 234, 0.15)',
                      borderColor: '#667eea'
                    }
                  }}>
                    <Typography variant="subtitle2" component="div" fontWeight="600" sx={{ fontSize: { xs: '0.95rem', sm: '1rem' } }}>
                      {food.food_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.8rem' } }}>
                      {`${food.measuring_quantity} ${food.measuring_unit}`}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1, fontSize: { xs: '0.9rem', sm: '0.95rem' } }}>
                      {`${food.calories_in_gms} calories`}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.8rem' } }}>
                      {`P: ${food.Protien_in_gms}g | C: ${food.carb_in_gms}g | F: ${food.fat_in_gms}g`}
                    </Typography>
                    <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                      <IconButton size="small" onClick={() => handleEdit(food)} sx={{ color: '#667eea' }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDelete(food.id)} sx={{ color: '#ef5350' }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                </Grid>
              ))}
              {foods.length === 0 && (
                <Grid item xs={12}>
                  <Box sx={{ p: 2, textAlign: 'center', bgcolor: '#f9f9f9', borderRadius: 1.5 }}>
                    <Typography variant="body2" color="text.secondary">No food items found. Add some!</Typography>
                  </Box>
                </Grid>
              )}
            </Grid>
          )}
          </Box>
        </>
      )}
      </Box>
      <Footer />
    </Box>
  );
}

// Use memo to prevent unnecessary re-renders
export default React.memo(FoodMasterPage);
