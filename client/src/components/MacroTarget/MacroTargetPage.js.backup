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
  Alert,
  Tabs,
  Tab,
  Divider
} from '@mui/material';
import { collection, addDoc, getDocs, query, where, updateDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import { useAuth } from '../Auth/AuthContext';
import Footer from '../Common/Footer';
import { MACRO_TARGET_PRESETS, FIREBASE_COLLECTIONS } from '../../config/constants';

function MacroTargetPage() {
  const { currentUser } = useAuth();
  
  // Tab state
  const [tabValue, setTabValue] = useState(0);
  
  // Set Target tab states
  const [targetType, setTargetType] = useState('maintenance');
  const [calories, setCalories] = useState(String(MACRO_TARGET_PRESETS.maintenance.calories));
  const [protein, setProtein] = useState(String(MACRO_TARGET_PRESETS.maintenance.protein));
  const [carbs, setCarbs] = useState(String(MACRO_TARGET_PRESETS.maintenance.carbs));
  const [fat, setFat] = useState(String(MACRO_TARGET_PRESETS.maintenance.fat));
  const [message, setMessage] = useState({ text: '', type: '' });
  const [existingTargetId, setExistingTargetId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savedTargets, setSavedTargets] = useState(null);
  
  // Calculator tab states
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

  // Preset values for different target types (convert to strings for TextField)
  const presets = {
    deficit: { 
      calories: String(MACRO_TARGET_PRESETS.deficit.calories), 
      protein: String(MACRO_TARGET_PRESETS.deficit.protein), 
      carbs: String(MACRO_TARGET_PRESETS.deficit.carbs), 
      fat: String(MACRO_TARGET_PRESETS.deficit.fat) 
    },
    bulking: { 
      calories: String(MACRO_TARGET_PRESETS.bulking.calories), 
      protein: String(MACRO_TARGET_PRESETS.bulking.protein), 
      carbs: String(MACRO_TARGET_PRESETS.bulking.carbs), 
      fat: String(MACRO_TARGET_PRESETS.bulking.fat) 
    },
    maintenance: { 
      calories: String(MACRO_TARGET_PRESETS.maintenance.calories), 
      protein: String(MACRO_TARGET_PRESETS.maintenance.protein), 
      carbs: String(MACRO_TARGET_PRESETS.maintenance.carbs), 
      fat: String(MACRO_TARGET_PRESETS.maintenance.fat) 
    }
  };

  // Load existing target on component mount
  useEffect(() => {
    const fetchTarget = async () => {
      if (!currentUser) return;

      try {
        const q = query(
          collection(db, FIREBASE_COLLECTIONS.MACRO_TARGETS),
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

  // Load user profile data for calculator
  useEffect(() => {
    const fetchProfile = async () => {
      if (!currentUser) return;

      try {
        const userDocRef = doc(db, FIREBASE_COLLECTIONS.USERS, currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          
          // Set weight (field name is weightKg in profile)
          if (userData.weightKg) {
            setCalcWeight(userData.weightKg);
            setCalcWeightLbs((userData.weightKg * 2.20462).toFixed(1));
          }
          
          // Set height (stored as heightFeet and heightInches in profile)
          if (userData.heightFeet || userData.heightInches) {
            const feet = parseFloat(userData.heightFeet) || 0;
            const inches = parseFloat(userData.heightInches) || 0;
            setCalcHeightFeet(userData.heightFeet || '');
            setCalcHeightInches(userData.heightInches || '');
            
            // Calculate cm
            const totalInches = (feet * 12) + inches;
            if (totalInches > 0) {
              setCalcHeightCm((totalInches * 2.54).toFixed(1));
            }
          }
          
          // Set DOB (field name is dateOfBirth in profile)
          if (userData.dateOfBirth) {
            setCalcDOB(userData.dateOfBirth);
          }
          
          // Set sex (only if male or female)
          if (userData.sex === 'male' || userData.sex === 'female') {
            setCalcSex(userData.sex);
          }
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };

    fetchProfile();
  }, [currentUser]);

  // Calculate age from DOB
  useEffect(() => {
    if (calcDOB) {
      const birthDate = new Date(calcDOB);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      setCalcAge(age > 0 ? age.toString() : '');
    } else {
      setCalcAge('');
    }
  }, [calcDOB]);

  // Sync weight kg to lbs (auto-calculate lbs from kg)
  useEffect(() => {
    if (calcWeight && !isNaN(calcWeight) && Number(calcWeight) > 0) {
      setCalcWeightLbs((Number(calcWeight) * 2.20462).toFixed(1));
    } else {
      setCalcWeightLbs('');
    }
  }, [calcWeight]);

  // Sync height feet/inches to cm
  useEffect(() => {
    const feet = Number(calcHeightFeet) || 0;
    const inches = Number(calcHeightInches) || 0;
    
    if (feet > 0 || inches > 0) {
      const totalInches = (feet * 12) + inches;
      setCalcHeightCm((totalInches * 2.54).toFixed(1));
    }
  }, [calcHeightFeet, calcHeightInches]);

  // Calculate BMR using Harris-Benedict formula
  useEffect(() => {
    if (calcWeight && calcHeightCm && calcAge && calcSex) {
      const weight = Number(calcWeight);
      const height = Number(calcHeightCm);
      const age = Number(calcAge);
      
      let bmr;
      if (calcSex === 'male') {
        // Male: BMR = (13.397 × weight kg) + (4.799 × height cm) - (5.677 × age) + 88.362
        bmr = (13.397 * weight) + (4.799 * height) - (5.677 * age) + 88.362;
      } else if (calcSex === 'female') {
        // Female: BMR = (9.247 × weight kg) + (3.098 × height cm) - (4.330 × age) + 447.593
        bmr = (9.247 * weight) + (3.098 * height) - (4.330 * age) + 447.593;
      }
      
      setCalcBMR(bmr ? Math.round(bmr) : null);
      setCalcError('');
    } else {
      setCalcBMR(null);
      if (!calcWeight || !calcHeightCm || !calcAge || !calcSex) {
        setCalcError('Please fill in all required fields (Weight, Height, DOB, and Sex)');
      }
    }
  }, [calcWeight, calcHeightCm, calcAge, calcSex]);

  // Calculate maintenance calories
  useEffect(() => {
    if (calcBMR && calcActivityLevel) {
      const maintenance = calcBMR * Number(calcActivityLevel);
      setCalcMaintenanceCalories(Math.round(maintenance));
    } else {
      setCalcMaintenanceCalories(null);
    }
  }, [calcBMR, calcActivityLevel]);

  // Calculate macro breakdown
  useEffect(() => {
    if (calcMaintenanceCalories && calcWeight) {
      const weight = Number(calcWeight);
      
      // Protein: 1.5 × weight in kg
      const proteinGrams = Math.round(1.5 * weight);
      const proteinCalories = proteinGrams * 4;
      
      // Fat: 27.5% of total calories (middle of 25-30%)
      const fatCalories = Math.round(calcMaintenanceCalories * 0.275);
      const fatGrams = Math.round(fatCalories / 9);
      
      // Carbs: Remaining calories
      const remainingCalories = calcMaintenanceCalories - proteinCalories - fatCalories;
      const carbsGrams = Math.round(remainingCalories / 4);
      
      setCalcProtein(proteinGrams);
      setCalcFat(fatGrams);
      setCalcCarbs(carbsGrams);
    } else {
      setCalcProtein(null);
      setCalcFat(null);
      setCalcCarbs(null);
    }
  }, [calcMaintenanceCalories, calcWeight]);

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
        await updateDoc(doc(db, FIREBASE_COLLECTIONS.MACRO_TARGETS, existingTargetId), targetData);
        setMessage({ text: 'Macro targets updated successfully!', type: 'success' });
      } else {
        // Create new document
        targetData.createdAt = new Date().toISOString();
        const docRef = await addDoc(collection(db, FIREBASE_COLLECTIONS.MACRO_TARGETS), targetData);
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

  // Handle transfer of calculated values to Set Target tab
  const handleUseCalculatedValues = () => {
    if (calcMaintenanceCalories && calcProtein && calcFat && calcCarbs) {
      setTargetType('maintenance');
      setCalories(calcMaintenanceCalories.toString());
      setProtein(calcProtein.toString());
      setFat(calcFat.toString());
      setCarbs(calcCarbs.toString());
      setTabValue(0); // Switch to Set Target tab
      setMessage({ text: 'Calculated values transferred to Set Target tab', type: 'success' });
    }
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
        <Tabs 
          value={tabValue} 
          onChange={(e, newValue) => setTabValue(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}
        >
          <Tab label="Set Target" />
          <Tab label="Calculate Macro Target" />
        </Tabs>

        {/* Tab 1: Set Target */}
        {tabValue === 0 && (
          <Box>
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
          </Box>
        )}

        {/* Tab 2: Calculate Macro Target */}
        {tabValue === 1 && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Calculate your daily calorie and macro needs based on your body metrics and activity level.
            </Typography>

            {calcError && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                {calcError}
              </Alert>
            )}

            <Grid container spacing={2}>
              {/* Weight in kg (editable) */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Weight (kg)"
                  type="number"
                  value={calcWeight}
                  onChange={(e) => setCalcWeight(e.target.value)}
                  placeholder="Enter weight in kg"
                  inputProps={{ min: 0, step: 0.1 }}
                />
              </Grid>

              {/* Weight in lbs (calculated display) */}
              <Grid item xs={12} sm={6}>
                <Box sx={{ pt: 1 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Weight (lbs)
                  </Typography>
                  <Typography variant="h6">
                    {calcWeightLbs || '-'}
                  </Typography>
                </Box>
              </Grid>

              {/* Height Feet */}
              <Grid item xs={6} sm={3}>
                <TextField
                  fullWidth
                  label="Height (feet)"
                  type="number"
                  value={calcHeightFeet}
                  onChange={(e) => setCalcHeightFeet(e.target.value)}
                  placeholder="Feet"
                  inputProps={{ min: 0, max: 8, step: 1 }}
                />
              </Grid>

              {/* Height Inches */}
              <Grid item xs={6} sm={3}>
                <TextField
                  fullWidth
                  label="Height (inches)"
                  type="number"
                  value={calcHeightInches}
                  onChange={(e) => setCalcHeightInches(e.target.value)}
                  placeholder="Inches"
                  inputProps={{ min: 0, max: 11.9, step: 0.1 }}
                />
              </Grid>

              {/* Height in cm (calculated display) */}
              <Grid item xs={12} sm={6}>
                <Box sx={{ pt: 1 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Height (cm)
                  </Typography>
                  <Typography variant="h6">
                    {calcHeightCm || '-'}
                  </Typography>
                </Box>
              </Grid>

              {/* Date of Birth */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Date of Birth"
                  type="date"
                  value={calcDOB}
                  onChange={(e) => setCalcDOB(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              {/* Age (calculated display) */}
              <Grid item xs={12} sm={6}>
                <Box sx={{ pt: 1 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Age (years)
                  </Typography>
                  <Typography variant="h6">
                    {calcAge || '-'}
                  </Typography>
                </Box>
              </Grid>

              {/* Sex */}
              <Grid item xs={12}>
                <FormControl component="fieldset">
                  <FormLabel component="legend">Sex</FormLabel>
                  <RadioGroup
                    row
                    value={calcSex}
                    onChange={(e) => setCalcSex(e.target.value)}
                  >
                    <FormControlLabel value="male" control={<Radio />} label="Male" />
                    <FormControlLabel value="female" control={<Radio />} label="Female" />
                  </RadioGroup>
                </FormControl>
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            {/* BMR Display */}
            {calcBMR && (
              <Box sx={{ mb: 3, p: 2, bgcolor: '#e3f2fd', borderRadius: 1 }}>
                <Typography variant="subtitle1" gutterBottom>
                  <strong>Basal Metabolic Rate (BMR): {calcBMR} calories/day</strong>
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {calcSex === 'male' 
                    ? 'Formula: (13.397 × weight kg) + (4.799 × height cm) - (5.677 × age) + 88.362'
                    : 'Formula: (9.247 × weight kg) + (3.098 × height cm) - (4.330 × age) + 447.593'}
                </Typography>
              </Box>
            )}

            {/* Activity Level */}
            <Box sx={{ mb: 3 }}>
              <FormControl component="fieldset">
                <FormLabel component="legend">Activity Level</FormLabel>
                <RadioGroup
                  value={calcActivityLevel}
                  onChange={(e) => setCalcActivityLevel(e.target.value)}
                >
                  <FormControlLabel value="1.2" control={<Radio />} label="Sedentary (little or no exercise)" />
                  <FormControlLabel value="1.375" control={<Radio />} label="Lightly active (light exercise 1-3 days/week)" />
                  <FormControlLabel value="1.55" control={<Radio />} label="Moderately active (moderate exercise 3-5 days/week)" />
                  <FormControlLabel value="1.725" control={<Radio />} label="Active (hard exercise 6-7 days/week)" />
                  <FormControlLabel value="1.9" control={<Radio />} label="Very active (very hard exercise & physical job)" />
                </RadioGroup>
              </FormControl>
            </Box>

            {/* Maintenance Calories and Macro Breakdown */}
            {calcMaintenanceCalories && calcProtein && calcFat && calcCarbs && (
              <Box sx={{ p: 2, bgcolor: '#e8f5e9', borderRadius: 1, mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Daily Calorie Need for Maintenance: {calcMaintenanceCalories} cal
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Based on your BMR and activity level
                </Typography>
                <Box sx={{ bgcolor: '#fff', p: 1.5, borderRadius: 1, mb: 2 }}>
                  <Typography variant="caption" color="text.secondary" component="div" gutterBottom>
                    <strong>Activity Level Formulas:</strong>
                  </Typography>
                  <Typography variant="caption" color="text.secondary" component="div">
                    • Sedentary (little or no exercise): BMR × 1.2
                  </Typography>
                  <Typography variant="caption" color="text.secondary" component="div">
                    • Lightly active (exercise 1-3 days/week): BMR × 1.375
                  </Typography>
                  <Typography variant="caption" color="text.secondary" component="div">
                    • Moderately active (exercise 3-5 days/week): BMR × 1.55
                  </Typography>
                  <Typography variant="caption" color="text.secondary" component="div">
                    • Active (exercise 6-7 days/week): BMR × 1.725
                  </Typography>
                  <Typography variant="caption" color="text.secondary" component="div">
                    • Very active (hard exercise/physical job): BMR × 1.9
                  </Typography>
                  {calcBMR && (
                    <Typography variant="caption" color="primary" component="div" sx={{ mt: 1, fontWeight: 'bold' }}>
                      Your calculation: {calcBMR} × {calcActivityLevel} = {calcMaintenanceCalories} cal
                    </Typography>
                  )}
                </Box>

                <Divider sx={{ my: 2 }} />

                <Typography variant="subtitle1" gutterBottom>
                  <strong>Suggested Macro Breakdown:</strong>
                </Typography>
                <Typography variant="body2">
                  <strong>Protein:</strong> {calcProtein}g ({calcProtein * 4} cal) - 1.5 × body weight in kg
                </Typography>
                <Typography variant="body2">
                  <strong>Fat:</strong> {calcFat}g ({calcFat * 9} cal) - ~27.5% of total calories
                </Typography>
                <Typography variant="body2">
                  <strong>Carbs:</strong> {calcCarbs}g ({calcCarbs * 4} cal) - Remaining calories
                </Typography>

                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button 
                    variant="contained" 
                    color="primary" 
                    onClick={handleUseCalculatedValues}
                    size="large"
                  >
                    Use These Values in Set Target
                  </Button>
                </Box>
              </Box>
            )}
          </Box>
        )}
      </Paper>
      <Footer />
    </div>
  );
}

export default MacroTargetPage;
