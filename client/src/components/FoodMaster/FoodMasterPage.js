import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Snackbar,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Tabs,
  Tab
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc, query, where } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import { useAuth } from '../Auth/AuthContext';
import { detectProteinSource } from '../../utils/geminiApi';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Footer from '../Common/Footer';
import { appColors, cardSx, sectionTitleSx, primaryBtnSx, outlinedBtnSx } from '../../theme';

function FoodMasterPage() {
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [tabValue, setTabValue] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [scanPreview, setScanPreview] = useState(null);
  const fileInputRef = useRef(null);
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
    fat_in_gms: '',
    proteinSource: ''
  });
  
  const [editing, setEditing] = useState(false);
  const [currentId, setCurrentId] = useState('');
  const [detectingSource, setDetectingSource] = useState(false);

  // Helper function to get protein source badge color
  const getProteinSourceColor = (source) => {
    const colors = {
      'Vegetarian': { bg: appColors.lightGreen, text: appColors.green },
      'Animal': { bg: '#ffebee', text: '#c62828' },
      'Mixed': { bg: '#fff3e0', text: '#e65100' },
      'Low-Protein': { bg: '#fce4ec', text: '#ad1457' }
    };
    return colors[source] || { bg: '#f5f5f5', text: '#616161' };
  };

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
      fat_in_gms: '',
      proteinSource: ''
    });
    setEditing(false);
    setCurrentId('');
  };

  const handleDetectProteinSource = async () => {
    if (!formData.food_name || !formData.food_name.trim()) {
      setMessage({ text: 'Please enter a food name first', type: 'error' });
      return;
    }

    setDetectingSource(true);
    try {
      const detectedSource = await detectProteinSource(formData.food_name, currentUser.uid);
      setFormData(prev => ({ ...prev, proteinSource: detectedSource }));
      setMessage({ text: `Detected protein source: ${detectedSource}`, type: 'success' });
    } catch (error) {
      console.error('Error detecting protein source:', error);
      
      // Check for specific error messages
      if (error.message?.includes('Daily limit')) {
        setMessage({ text: error.message, type: 'error' });
      } else if (error.message?.includes('rate limit')) {
        setMessage({ text: 'Rate limit exceeded. Please try again in a minute.', type: 'error' });
      } else {
        setMessage({ text: 'Failed to detect protein source. You can select it manually.', type: 'error' });
      }
    } finally {
      setDetectingSource(false);
    }
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
        fat_in_gms: fats,
        proteinSource: formData.proteinSource || undefined
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
      fat_in_gms: food.fat_in_gms,
      proteinSource: food.proteinSource || ''
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

  // Scan nutrition label with Gemini Vision API
  const handleScanLabel = async (file) => {
    if (!file) return;
    
    setScanning(true);
    setMessage({ text: 'Processing nutrition label...', type: 'info' });
    
    try {
      // Convert image to base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = async () => {
        const base64Image = reader.result.split(',')[1];
        setScanPreview(reader.result);
        
        // Call Gemini Vision API
        const genAI = new GoogleGenerativeAI(process.env.REACT_APP_GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
        
        const prompt = `Extract nutrition information from this food nutrition label image.
Return ONLY valid JSON with these exact fields (use numbers only, no units):
{
  "servingSize": "serving size with unit as text",
  "calories": number,
  "protein": number in grams,
  "carbs": number in grams,
  "fat": number in grams
}
If the label shows per 100g or per serving, extract those values. Do not include units in numeric fields.`;
        
        const result = await model.generateContent([
          prompt,
          {
            inlineData: {
              mimeType: file.type,
              data: base64Image
            }
          }
        ]);
        
        const response = await result.response;
        const text = response.text();
        
        // Parse JSON response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('Could not parse nutrition data from label');
        }
        
        const nutritionData = JSON.parse(jsonMatch[0]);
        
        // Parse serving size to extract quantity and unit
        const servingSizeMatch = nutritionData.servingSize.match(/([\d.]+)\s*([a-zA-Z]+)/);
        const quantity = servingSizeMatch ? servingSizeMatch[1] : '1';
        const unit = servingSizeMatch ? servingSizeMatch[2] : 'serving';
        
        // Pre-fill form with scanned data
        setFormData({
          food_name: '',
          measuring_unit: unit,
          measuring_quantity: quantity,
          calories_in_gms: nutritionData.calories.toString(),
          Protien_in_gms: nutritionData.protein.toString(),
          carb_in_gms: nutritionData.carbs.toString(),
          fat_in_gms: nutritionData.fat.toString(),
          proteinSource: ''
        });
        
        setMessage({ text: 'Label scanned successfully! Please add food name and review the data.', type: 'success' });
        setTabValue(0); // Switch to Manual tab to show the pre-filled form
      };
      
      reader.onerror = () => {
        throw new Error('Failed to read image file');
      };
    } catch (error) {
      console.error('Error scanning label:', error);
      setMessage({ text: 'Failed to scan label. Please try again or enter manually.', type: 'error' });
    } finally {
      setScanning(false);
      setScanPreview(null);
    }
  };
  
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      handleScanLabel(file);
    } else {
      setMessage({ text: 'Please select a valid image file', type: 'error' });
    }
  };
  
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    if (newValue === 0) {
      // Reset scan preview when switching to Manual tab
      setScanPreview(null);
    }
  };

  return (
    <Box sx={{ 
      minHeight: '100vh',
      bgcolor: appColors.bgPage,
      pb: 2
    }}>
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1.5, 
          mb: 2
        }}>
          <MenuBookIcon sx={{ fontSize: { xs: 28, sm: 36 }, color: 'primary.main' }} />
          <Typography variant="h6" component="h1" fontWeight="600" sx={{ fontSize: { xs: '1.1rem', sm: '1.5rem' }, color: 'text.primary' }}>
            My Food Database
          </Typography>
        </Box>

      {/* Tabs */}
      <Paper elevation={0} sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 500,
              fontSize: { xs: '0.85rem', sm: '0.95rem' },
              py: 1.5
            },
            '& .Mui-selected': {
              color: appColors.green
            },
            '& .MuiTabs-indicator': {
              backgroundColor: appColors.green
            }
          }}
        >
          <Tab label="Manual Entry" />
          <Tab label="Scan Food Label" icon={<CameraAltIcon />} iconPosition="start" />
        </Tabs>
      </Paper>
      
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

      {/* Tab 0: Manual Entry */}
      {tabValue === 0 && (
        <Paper elevation={0} sx={{ 
          p: { xs: 2, sm: 3 }, 
          mb: 2,
          borderRadius: '0 0 8px 8px',
          borderTop: 'none',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
        }}>
          
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
                      borderColor: appColors.blue
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: appColors.blue
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
                      borderColor: appColors.blue
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: appColors.blue
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
                      borderColor: appColors.blue
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: appColors.blue
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
                      borderColor: appColors.blue
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: appColors.blue
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
                      borderColor: appColors.blue
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: appColors.blue
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
                      borderColor: appColors.blue
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: appColors.blue
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
                      borderColor: appColors.blue
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: appColors.blue
                    }
                  }
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                <FormControl 
                  fullWidth 
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 1.5,
                      '&:hover fieldset': {
                        borderColor: appColors.blue
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: appColors.blue
                      }
                    }
                  }}
                >
                  <InputLabel>Protein Source (Optional)</InputLabel>
                  <Select
                    value={formData.proteinSource}
                    onChange={(e) => setFormData(prev => ({ ...prev, proteinSource: e.target.value }))}
                    label="Protein Source (Optional)"
                  >
                    <MenuItem value="">
                      <em>Not specified</em>
                    </MenuItem>
                    <MenuItem value="Vegetarian">Vegetarian</MenuItem>
                    <MenuItem value="Animal">Animal</MenuItem>
                    <MenuItem value="Mixed">Mixed</MenuItem>
                    <MenuItem value="Low-Protein">Low-Protein</MenuItem>
                  </Select>
                </FormControl>
                <Button
                  variant="outlined"
                  onClick={handleDetectProteinSource}
                  disabled={detectingSource || !formData.food_name}
                  size="small"
                  startIcon={detectingSource ? <CircularProgress size={16} /> : <AutoFixHighIcon />}
                  sx={{
                    ...outlinedBtnSx,
                    whiteSpace: 'nowrap',
                    minWidth: 'auto',
                    height: '40px',
                    '&.Mui-disabled': {
                      borderColor: '#ccc',
                      color: '#999'
                    }
                  }}
                >
                  Auto-Detect
                </Button>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                Use Auto-Detect to identify protein source automatically
              </Typography>
            </Grid>
          </Grid>

          <Box sx={{ mt: 2, display: 'flex', gap: 1.5, justifyContent: 'flex-end' }}>
            <Button 
              type="submit" 
              variant="contained" 
              size="medium"
              sx={primaryBtnSx}
            >
              {editing ? 'Update' : 'Add'}
            </Button>
            {editing && (
              <Button 
                variant="outlined" 
                onClick={resetForm}
                size="medium"
                sx={outlinedBtnSx}
              >
                Cancel
              </Button>
            )}
          </Box>
        </form>
      </Paper>
      )}

      {/* Tab 1: Scan Food Label */}
      {tabValue === 1 && (
        <Paper elevation={0} sx={{ 
          p: { xs: 2, sm: 3 }, 
          mb: 2,
          borderRadius: '0 0 8px 8px',
          borderTop: 'none',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          textAlign: 'center'
        }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          
          <PhotoCameraIcon sx={{ fontSize: 80, color: appColors.green, mb: 2 }} />
          
          <Typography variant="h6" gutterBottom fontWeight="600" color={appColors.green}>
            Scan Nutrition Facts Label
          </Typography>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, px: { xs: 1, sm: 4 } }}>
            Take a photo of the nutrition facts label on your food package. We'll automatically extract the calories, protein, carbs, and fat information.
          </Typography>
          
          {scanPreview && (
            <Box sx={{ mb: 2 }}>
              <img src={scanPreview} alt="Scanned label" style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px' }} />
            </Box>
          )}
          
          <Button
            variant="contained"
            size="large"
            startIcon={scanning ? <CircularProgress size={20} color="inherit" /> : <CameraAltIcon />}
            onClick={() => fileInputRef.current?.click()}
            disabled={scanning}
            sx={{ ...primaryBtnSx, py: 1.5, fontSize: '1rem' }}
          >
            {scanning ? 'Processing...' : 'Scan Nutrition Label'}
          </Button>
          
          <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 2 }}>
            Tip: Ensure good lighting and the label is clearly visible
          </Typography>
        </Paper>
      )}

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
            <Typography variant="body2" fontWeight="600" color={appColors.green} gutterBottom sx={{ fontSize: { xs: '0.9rem', sm: '1rem' }, mb: 1.5 }}>
              Food Items ({foods.length})
            </Typography>
          
          {isMobile ? (
            // Mobile view - List
            <List sx={{ bgcolor: 'transparent', p: 0 }}>
              {foods.map((food) => (
                <React.Fragment key={food.id}>
                  <ListItem sx={{ px: 0 }}>
                    <ListItemText
                      primary={
                        <Box>
                          <Typography component="span" sx={{ fontWeight: 600, fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                            {food.food_name}
                          </Typography>
                          {food.proteinSource && (
                            <Typography 
                              component="span" 
                              sx={{ 
                                ml: 1, 
                                px: 1, 
                                py: 0.25, 
                                bgcolor: getProteinSourceColor(food.proteinSource).bg, 
                                color: getProteinSourceColor(food.proteinSource).text,
                                borderRadius: 1,
                                fontSize: { xs: '0.7rem', sm: '0.75rem' },
                                fontWeight: 500
                              }}
                            >
                              {food.proteinSource}
                            </Typography>
                          )}
                        </Box>
                      }
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
                      <IconButton edge="end" size="small" onClick={() => handleEdit(food)} sx={{ color: appColors.blue }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton edge="end" size="small" onClick={() => handleDelete(food.id)} sx={{ color: appColors.red }}>
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
                    bgcolor: appColors.bgPage, 
                    borderRadius: 1.5,
                    border: '1px solid #e0e0e0',
                    '&:hover': {
                      boxShadow: '0 2px 8px rgba(102, 126, 234, 0.15)',
                      borderColor: appColors.blue
                    }
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 0.5 }}>
                      <Typography variant="subtitle2" component="span" fontWeight="600" sx={{ fontSize: { xs: '0.95rem', sm: '1rem' } }}>
                        {food.food_name}
                      </Typography>
                      {food.proteinSource && (
                        <Typography 
                          component="span" 
                          sx={{ 
                            px: 1, 
                            py: 0.25, 
                            bgcolor: getProteinSourceColor(food.proteinSource).bg, 
                            color: getProteinSourceColor(food.proteinSource).text,
                            borderRadius: 1,
                            fontSize: '0.7rem',
                            fontWeight: 500
                          }}
                        >
                          {food.proteinSource}
                        </Typography>
                      )}
                    </Box>
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
                      <IconButton size="small" onClick={() => handleEdit(food)} sx={{ color: appColors.blue }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDelete(food.id)} sx={{ color: appColors.red }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                </Grid>
              ))}
              {foods.length === 0 && (
                <Grid item xs={12}>
                  <Box sx={{ p: 2, textAlign: 'center', bgcolor: appColors.bgPage, borderRadius: 1.5 }}>
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

