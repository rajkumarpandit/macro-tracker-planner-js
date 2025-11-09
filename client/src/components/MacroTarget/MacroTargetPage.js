import React, { useState, useEffect } from 'react';
import {
  Typography,
  Paper,
  TextField,
  Button,
  Box,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormControl,
  FormLabel,
  Grid,
  Snackbar,
  Alert
} from '@mui/material';
import { collection, addDoc, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import { useAuth } from '../Auth/AuthContext';
import Footer from '../Common/Footer';

function MacroTargetPage() {
  const { currentUser } = useAuth();
  const [targetType, setTargetType] = useState('maintenance');
  const [calories, setCalories] = useState('2000');
  const [protein, setProtein] = useState('140');
  const [carbs, setCarbs] = useState('200');
  const [fat, setFat] = useState('100');
  const [message, setMessage] = useState({ text: '', type: '' });
  const [existingTargetId, setExistingTargetId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savedTargets, setSavedTargets] = useState(null); // Track saved data separately

  // Preset values for different target types
  const presets = {
    deficit: { calories: '1600', protein: '140', carbs: '150', fat: '70' },
    bulking: { calories: '3000', protein: '180', carbs: '250', fat: '150' },
    maintenance: { calories: '2000', protein: '140', carbs: '200', fat: '100' }
  };

  // Load existing target on component mount
  useEffect(() => {
    const fetchTarget = async () => {
      if (!currentUser) return;

      try {
        const q = query(
          collection(db, 'macro_targets'),
          where('userId', '==', currentUser.uid)
        );
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const targetDoc = querySnapshot.docs[0];
          const data = targetDoc.data();
          setExistingTargetId(targetDoc.id);
          setTargetType(data.targetType || 'maintenance');
          setCalories(data.calories?.toString() || '2000');
          setProtein(data.protein?.toString() || '140');
          setCarbs(data.carbs?.toString() || '200');
          setFat(data.fat?.toString() || '100');
          
          // Store saved data separately for display
          setSavedTargets({
            targetType: data.targetType || 'maintenance',
            calories: data.calories || 2000,
            protein: data.protein || 140,
            carbs: data.carbs || 200,
            fat: data.fat || 100
          });
        } else {
          // Set default values for new users
          setTargetType('maintenance');
          setCalories('2000');
          setProtein('140');
          setCarbs('200');
          setFat('100');
          setSavedTargets(null); // No saved data yet
        }
      } catch (error) {
        console.error('Error fetching macro target:', error);
        setMessage({ text: 'Error loading macro targets', type: 'error' });
      } finally {
        setLoading(false);
      }
    };

    fetchTarget();
  }, [currentUser]);

  // Handle target type change
  const handleTargetTypeChange = (event) => {
    const newType = event.target.value;
    setTargetType(newType);
    
    // Auto-populate with preset values
    const preset = presets[newType];
    setCalories(preset.calories);
    setProtein(preset.protein);
    setCarbs(preset.carbs);
    setFat(preset.fat);
  };

  // Handle input changes
  const handleInputChange = (setter) => (e) => {
    const value = e.target.value;
    if (value === '' || (!isNaN(value) && Number(value) >= 0)) {
      setter(value);
    }
  };

  // Validate inputs
  const validateInputs = () => {
    if (!calories || !protein || !carbs || !fat) {
      setMessage({ text: 'Please fill in all fields', type: 'error' });
      return false;
    }

    if (Number(calories) <= 0 || Number(protein) < 0 || Number(carbs) < 0 || Number(fat) < 0) {
      setMessage({ text: 'Values must be positive numbers', type: 'error' });
      return false;
    }

    return true;
  };

  // Handle save
  const handleSave = async () => {
    if (!validateInputs()) return;

    try {
      const targetData = {
        userId: currentUser.uid,
        targetType,
        calories: Number(calories),
        protein: Number(protein),
        carbs: Number(carbs),
        fat: Number(fat),
        updatedAt: new Date().toISOString()
      };

      if (existingTargetId) {
        // Update existing document
        await updateDoc(doc(db, 'macro_targets', existingTargetId), targetData);
        setMessage({ text: 'Macro targets updated successfully!', type: 'success' });
      } else {
        // Create new document
        targetData.createdAt = new Date().toISOString();
        const docRef = await addDoc(collection(db, 'macro_targets'), targetData);
        setExistingTargetId(docRef.id);
        setMessage({ text: 'Macro targets saved successfully!', type: 'success' });
      }
      
      // Update saved targets after successful save
      setSavedTargets({
        targetType,
        calories: Number(calories),
        protein: Number(protein),
        carbs: Number(carbs),
        fat: Number(fat)
      });
    } catch (error) {
      console.error('Error saving macro target:', error);
      setMessage({ text: 'Error saving macro targets', type: 'error' });
    }
  };

  // Handle cancel
  const handleCancel = () => {
    // Reset to preset values based on current target type
    const preset = presets[targetType];
    setCalories(preset.calories);
    setProtein(preset.protein);
    setCarbs(preset.carbs);
    setFat(preset.fat);
    setMessage({ text: 'Changes cancelled', type: 'info' });
  };

  const handleCloseMessage = () => {
    setMessage({ text: '', type: '' });
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  return (
    <div>
      <Typography variant="h5" component="h1" gutterBottom>
        Set Your Daily Macro Target
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

      <Paper elevation={1} sx={{ p: 3, mt: 2 }}>
        <FormControl component="fieldset" sx={{ mb: 3 }}>
          <FormLabel component="legend">Select Your Goal</FormLabel>
          <RadioGroup
            row
            value={targetType}
            onChange={handleTargetTypeChange}
          >
            <FormControlLabel value="deficit" control={<Radio />} label="Deficit" />
            <FormControlLabel value="maintenance" control={<Radio />} label="Maintenance" />
            <FormControlLabel value="bulking" control={<Radio />} label="Bulking" />
          </RadioGroup>
        </FormControl>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Calories (kcal)"
              type="number"
              value={calories}
              onChange={handleInputChange(setCalories)}
              placeholder="Enter daily calorie target"
              inputProps={{ min: 0, step: 10 }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Protein (g)"
              type="number"
              value={protein}
              onChange={handleInputChange(setProtein)}
              placeholder="Enter protein target"
              inputProps={{ min: 0, step: 1 }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Carbs (g)"
              type="number"
              value={carbs}
              onChange={handleInputChange(setCarbs)}
              placeholder="Enter carbs target"
              inputProps={{ min: 0, step: 1 }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Fat (g)"
              type="number"
              value={fat}
              onChange={handleInputChange(setFat)}
              placeholder="Enter fat target"
              inputProps={{ min: 0, step: 1 }}
            />
          </Grid>
        </Grid>

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button 
            variant="outlined" 
            onClick={handleCancel}
            size="large"
          >
            Cancel
          </Button>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleSave}
            size="large"
          >
            Save Targets
          </Button>
        </Box>

        {savedTargets && (
          <Box sx={{ mt: 3, p: 2, bgcolor: '#e8f5e9', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Saved Target Summary:
            </Typography>
            <Typography variant="body2">
              <strong>Goal:</strong> {savedTargets.targetType.charAt(0).toUpperCase() + savedTargets.targetType.slice(1)}
            </Typography>
            <Typography variant="body2">
              <strong>Daily Targets:</strong> {savedTargets.calories} cal | {savedTargets.protein}g protein | {savedTargets.carbs}g carbs | {savedTargets.fat}g fat
            </Typography>
          </Box>
        )}
      </Paper>
      <Footer />
    </div>
  );
}

export default MacroTargetPage;
