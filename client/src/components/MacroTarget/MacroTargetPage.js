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
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
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
          <FitnessCenterIcon sx={{ fontSize: { xs: 28, sm: 36 } }} />
          <Typography variant="h6" component="h1" fontWeight="600" sx={{ fontSize: { xs: '1.1rem', sm: '1.5rem' } }}>
            Daily Macro Target
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

        <Paper 
          elevation={0} 
          sx={{ 
            borderRadius: 2,
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
          }}
        >
          <Tabs 
            value={tabValue} 
            onChange={(e, newValue) => setTabValue(newValue)}
            variant="fullWidth"
            sx={{ 
              bgcolor: 'white',
              '& .MuiTab-root': {
                fontSize: { xs: '0.85rem', sm: '0.95rem' },
                fontWeight: 600,
                py: { xs: 1.5, sm: 2 },
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
            <Tab 
              label="Set Target" 
            />
            <Tab 
              label="Calculate" 
            />
          </Tabs>

          {/* Tab 1: Set Target */}
          {tabValue === 0 && (
            <Box sx={{ p: { xs: 2, sm: 3 }, bgcolor: 'white' }}>
              <FormControl component="fieldset" sx={{ mb: 3, width: '100%' }}>
                <FormLabel 
                  component="legend" 
                  sx={{ 
                    fontSize: { xs: '0.95rem', sm: '1rem' },
                    fontWeight: 600, 
                    mb: 1.5,
                    color: '#4caf50'
                  }}
                >
                  Select Your Goal
                </FormLabel>
                <RadioGroup
                  value={targetType}
                  onChange={handleTargetTypeChange}
                  sx={{ 
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    gap: 1.5
                  }}
                >
                  <Box
                    onClick={() => handleTargetTypeChange({ target: { value: 'deficit' }})}
                    sx={{ 
                      flex: 1,
                      cursor: 'pointer',
                      border: targetType === 'deficit' ? '2px solid #4caf50' : '1px solid #e0e0e0',
                      bgcolor: targetType === 'deficit' ? '#f1f8f4' : 'white',
                      p: { xs: 1.5, sm: 2 },
                      borderRadius: 2,
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      '&:active': {
                        transform: 'scale(0.98)'
                      }
                    }}
                  >
                    <Radio 
                      checked={targetType === 'deficit'} 
                      value="deficit"
                      sx={{ 
                        p: 0,
                        '&.Mui-checked': { color: '#4caf50' }
                      }}
                    />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body1" fontWeight="600" sx={{ fontSize: { xs: '0.95rem', sm: '1rem' } }}>
                        Deficit
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Weight Loss
                      </Typography>
                    </Box>
                  </Box>

                  <Box
                    onClick={() => handleTargetTypeChange({ target: { value: 'maintenance' }})}
                    sx={{ 
                      flex: 1,
                      cursor: 'pointer',
                      border: targetType === 'maintenance' ? '2px solid #4caf50' : '1px solid #e0e0e0',
                      bgcolor: targetType === 'maintenance' ? '#f1f8f4' : 'white',
                      p: { xs: 1.5, sm: 2 },
                      borderRadius: 2,
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      '&:active': {
                        transform: 'scale(0.98)'
                      }
                    }}
                  >
                    <Radio 
                      checked={targetType === 'maintenance'} 
                      value="maintenance"
                      sx={{ 
                        p: 0,
                        '&.Mui-checked': { color: '#4caf50' }
                      }}
                    />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body1" fontWeight="600" sx={{ fontSize: { xs: '0.95rem', sm: '1rem' } }}>
                        Maintenance
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Maintain Weight
                      </Typography>
                    </Box>
                  </Box>

                  <Box
                    onClick={() => handleTargetTypeChange({ target: { value: 'bulking' }})}
                    sx={{ 
                      flex: 1,
                      cursor: 'pointer',
                      border: targetType === 'bulking' ? '2px solid #4caf50' : '1px solid #e0e0e0',
                      bgcolor: targetType === 'bulking' ? '#f1f8f4' : 'white',
                      p: { xs: 1.5, sm: 2 },
                      borderRadius: 2,
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      '&:active': {
                        transform: 'scale(0.98)'
                      }
                    }}
                  >
                    <Radio 
                      checked={targetType === 'bulking'} 
                      value="bulking"
                      sx={{ 
                        p: 0,
                        '&.Mui-checked': { color: '#4caf50' }
                      }}
                    />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body1" fontWeight="600" sx={{ fontSize: { xs: '0.95rem', sm: '1rem' } }}>
                        Bulking
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Muscle Gain
                      </Typography>
                    </Box>
                  </Box>
                </RadioGroup>
              </FormControl>

            <Grid container spacing={2}>
              <Grid item xs={6} sm={6}>
                <TextField
                  fullWidth
                  label="Calories"
                  type="number"
                  value={calories}
                  onChange={handleInputChange(setCalories)}
                  placeholder="kcal"
                  inputProps={{ min: 0, step: 10 }}
                  size="small"
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
              <Grid item xs={6} sm={6}>
                <TextField
                  fullWidth
                  label="Protein"
                  type="number"
                  value={protein}
                  onChange={handleInputChange(setProtein)}
                  placeholder="grams"
                  inputProps={{ min: 0, step: 1 }}
                  size="small"
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
              <Grid item xs={6} sm={6}>
                <TextField
                  fullWidth
                  label="Carbs"
                  type="number"
                  value={carbs}
                  onChange={handleInputChange(setCarbs)}
                  placeholder="grams"
                  inputProps={{ min: 0, step: 1 }}
                  size="small"
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
              <Grid item xs={6} sm={6}>
                <TextField
                  fullWidth
                  label="Fat"
                  type="number"
                  value={fat}
                  onChange={handleInputChange(setFat)}
                  placeholder="grams"
                  inputProps={{ min: 0, step: 1 }}
                  size="small"
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

            <Box sx={{ mt: 3, display: 'flex', gap: 1.5, justifyContent: 'flex-end' }}>
              <Button 
                variant="outlined" 
                onClick={handleCancel}
                size="medium"
                sx={{
                  borderRadius: 2,
                  px: 3,
                  textTransform: 'none',
                  fontSize: { xs: '0.9rem', sm: '0.95rem' },
                  borderColor: '#4caf50',
                  color: '#4caf50',
                  '&:hover': {
                    borderColor: '#2e7d32',
                    bgcolor: '#f1f8f4'
                  }
                }}
              >
                Cancel
              </Button>
              <Button 
                variant="contained" 
                onClick={handleSave}
                size="medium"
                sx={{
                  borderRadius: 2,
                  px: 3,
                  textTransform: 'none',
                  fontSize: { xs: '0.9rem', sm: '0.95rem' },
                  background: 'linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)',
                  boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #2e7d32 0%, #4caf50 100%)',
                    boxShadow: '0 3px 12px rgba(102, 126, 234, 0.4)'
                  }
                }}
              >
                Save
              </Button>
            </Box>

            {savedTargets && (
              <Box 
                sx={{ 
                  mt: 3,
                  p: 2,
                  background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
                  border: '2px solid #66bb6a',
                  borderRadius: 2
                }}
              >
                <Typography variant="body2" gutterBottom fontWeight="600" color="#2e7d32">
                  ✓ Saved Target
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5, mt: 1.5 }}>
                  <Box sx={{ bgcolor: 'white', p: 1.5, borderRadius: 1 }}>
                    <Typography variant="caption" color="text.secondary">Goal</Typography>
                    <Typography variant="body2" fontWeight="600">
                      {savedTargets.targetType.charAt(0).toUpperCase() + savedTargets.targetType.slice(1)}
                    </Typography>
                  </Box>
                  <Box sx={{ bgcolor: 'white', p: 1.5, borderRadius: 1 }}>
                    <Typography variant="caption" color="text.secondary">Calories</Typography>
                    <Typography variant="body2" fontWeight="600">{savedTargets.calories}</Typography>
                  </Box>
                  <Box sx={{ bgcolor: 'white', p: 1.5, borderRadius: 1 }}>
                    <Typography variant="caption" color="text.secondary">Protein</Typography>
                    <Typography variant="body2" fontWeight="600">{savedTargets.protein}g</Typography>
                  </Box>
                  <Box sx={{ bgcolor: 'white', p: 1.5, borderRadius: 1 }}>
                    <Typography variant="caption" color="text.secondary">Carbs</Typography>
                    <Typography variant="body2" fontWeight="600">{savedTargets.carbs}g</Typography>
                  </Box>
                  <Box sx={{ bgcolor: 'white', p: 1.5, borderRadius: 1 }}>
                    <Typography variant="caption" color="text.secondary">Fat</Typography>
                    <Typography variant="body2" fontWeight="600">{savedTargets.fat}g</Typography>
                  </Box>
                </Box>
              </Box>
            )}
          </Box>
        )}

        {/* Tab 2: Calculate Macro Target */}
        {tabValue === 1 && (
          <Box sx={{ p: { xs: 2, sm: 3 }, bgcolor: 'white' }}>
            <Box sx={{ 
              mb: 2, 
              p: { xs: 1.5, sm: 2 }, 
              bgcolor: '#f1f8f4', 
              borderRadius: 2,
              borderLeft: '3px solid #4caf50'
            }}>
              <Typography variant="body2" fontWeight="600" color="#4caf50" gutterBottom sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                BMR Calculator
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.8rem' } }}>
                Calculate your daily needs using Harris-Benedict formula
              </Typography>
            </Box>

            {calcError && (
              <Alert 
                severity="warning" 
                sx={{ 
                  mb: 2,
                  borderRadius: 1.5,
                  fontSize: { xs: '0.85rem', sm: '0.9rem' }
                }}
              >
                {calcError}
              </Alert>
            )}

            <Grid container spacing={1.5}>
              {/* Weight in kg (editable) */}
              <Grid item xs={5} sm={6}>
                <TextField
                  fullWidth
                  label="Weight (kg)"
                  type="number"
                  value={calcWeight}
                  onChange={(e) => setCalcWeight(e.target.value)}
                  placeholder="kg"
                  inputProps={{ min: 0, step: 0.1 }}
                  size="small"
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

              {/* Weight in lbs (calculated display) */}
              <Grid item xs={7} sm={6}>
                <Box sx={{ 
                  p: 1.5,
                  bgcolor: '#f5f5f5',
                  borderRadius: 1.5,
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1
                }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', whiteSpace: 'nowrap' }}>
                    Weight (lbs):
                  </Typography>
                  <Typography variant="body2" color="#4caf50" fontWeight="600">
                    {calcWeightLbs || '-'}
                  </Typography>
                </Box>
              </Grid>

              {/* Height Feet */}
              <Grid item xs={3} sm={4}>
                <TextField
                  fullWidth
                  label="Height (ft)"
                  type="number"
                  value={calcHeightFeet}
                  onChange={(e) => setCalcHeightFeet(e.target.value)}
                  placeholder="ft"
                  inputProps={{ min: 0, max: 8, step: 1 }}
                  size="small"
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

              {/* Height Inches */}
              <Grid item xs={3} sm={4}>
                <TextField
                  fullWidth
                  label="Height (inch)"
                  type="number"
                  value={calcHeightInches}
                  onChange={(e) => setCalcHeightInches(e.target.value)}
                  placeholder="in"
                  inputProps={{ min: 0, max: 11.9, step: 0.1 }}
                  size="small"
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

              {/* Height in cm (calculated display) */}
              <Grid item xs={6} sm={4}>
                <Box sx={{ 
                  p: 1.5,
                  bgcolor: '#f5f5f5',
                  borderRadius: 1.5,
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1
                }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', whiteSpace: 'nowrap' }}>
                    Height (cm):
                  </Typography>
                  <Typography variant="body2" color="#4caf50" fontWeight="600">
                    {calcHeightCm || '-'}
                  </Typography>
                </Box>
              </Grid>

              {/* Date of Birth */}
              <Grid item xs={5} sm={6}>
                <TextField
                  fullWidth
                  label="DoB"
                  type="date"
                  value={calcDOB}
                  onChange={(e) => setCalcDOB(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  size="small"
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

              {/* Age (calculated display) */}
              <Grid item xs={7} sm={6}>
                <Box sx={{ 
                  p: 1.5,
                  bgcolor: '#f5f5f5',
                  borderRadius: 1.5,
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1
                }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', whiteSpace: 'nowrap' }}>
                    Age (years):
                  </Typography>
                  <Typography variant="body2" color="#4caf50" fontWeight="600">
                    {calcAge || '-'}
                  </Typography>
                </Box>
              </Grid>

              {/* Sex */}
              <Grid item xs={12}>
                <FormControl component="fieldset" sx={{ width: '100%' }}>
                  <FormLabel component="legend" sx={{ fontSize: { xs: '0.85rem', sm: '0.9rem' }, mb: 1 }}>Sex</FormLabel>
                  <RadioGroup
                    row
                    value={calcSex}
                    onChange={(e) => setCalcSex(e.target.value)}
                    sx={{ gap: 1 }}
                  >
                    <Box
                      onClick={() => setCalcSex('male')}
                      sx={{
                        flex: 1,
                        cursor: 'pointer',
                        border: calcSex === 'male' ? '2px solid #4caf50' : '1px solid #e0e0e0',
                        bgcolor: calcSex === 'male' ? '#f1f8f4' : 'white',
                        p: 1,
                        borderRadius: 1.5,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 0.5,
                        transition: 'all 0.2s'
                      }}
                    >
                      <Radio 
                        checked={calcSex === 'male'} 
                        value="male"
                        size="small"
                        sx={{ p: 0, '&.Mui-checked': { color: '#4caf50' } }}
                      />
                      <Typography variant="body2" sx={{ fontSize: { xs: '0.85rem', sm: '0.9rem' } }}>Male</Typography>
                    </Box>
                    <Box
                      onClick={() => setCalcSex('female')}
                      sx={{
                        flex: 1,
                        cursor: 'pointer',
                        border: calcSex === 'female' ? '2px solid #4caf50' : '1px solid #e0e0e0',
                        bgcolor: calcSex === 'female' ? '#f1f8f4' : 'white',
                        p: 1,
                        borderRadius: 1.5,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 0.5,
                        transition: 'all 0.2s'
                      }}
                    >
                      <Radio 
                        checked={calcSex === 'female'} 
                        value="female"
                        size="small"
                        sx={{ p: 0, '&.Mui-checked': { color: '#4caf50' } }}
                      />
                      <Typography variant="body2" sx={{ fontSize: { xs: '0.85rem', sm: '0.9rem' } }}>Female</Typography>
                    </Box>
                  </RadioGroup>
                </FormControl>
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />

            {/* BMR Display */}
            {calcBMR && (
              <Box 
                sx={{ 
                  mb: 2, 
                  p: { xs: 1.5, sm: 2 },
                  background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                  border: '2px solid #42a5f5',
                  borderRadius: 2
                }}
              >
                <Typography variant="body1" gutterBottom fontWeight="600" color="#1976d2" sx={{ fontSize: { xs: '0.95rem', sm: '1.1rem' } }}>
                  BMR: {calcBMR} cal/day
                </Typography>
                <Box sx={{ mt: 1, p: 1.5, bgcolor: 'white', borderRadius: 1.5 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight="600" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                    Formula:
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', fontSize: { xs: '0.65rem', sm: '0.7rem' } }}>
                    {calcSex === 'male' 
                      ? '(13.397 × weight kg) + (4.799 × height cm) - (5.677 × age) + 88.362'
                      : '(9.247 × weight kg) + (3.098 × height cm) - (4.330 × age) + 447.593'}
                  </Typography>
                </Box>
              </Box>
            )}

            {/* Activity Level */}
            <Box sx={{ mb: 2 }}>
              <FormControl component="fieldset" sx={{ width: '100%' }}>
                <FormLabel 
                  component="legend" 
                  sx={{ 
                    fontSize: { xs: '0.95rem', sm: '1rem' },
                    fontWeight: 600, 
                    mb: 1.5,
                    color: '#4caf50'
                  }}
                >
                  Activity Level
                </FormLabel>
                <RadioGroup
                  value={calcActivityLevel}
                  onChange={(e) => setCalcActivityLevel(e.target.value)}
                  sx={{ gap: 0.5 }}
                >
                  <FormControlLabel 
                    value="1.2" 
                    control={<Radio size="small" sx={{ '&.Mui-checked': { color: '#4caf50' } }} />} 
                    label={<Typography variant="body2" sx={{ fontSize: { xs: '0.85rem', sm: '0.9rem' } }}>Sedentary (little or no exercise)</Typography>}
                    sx={{ mx: 0 }}
                  />
                  <FormControlLabel 
                    value="1.375" 
                    control={<Radio size="small" sx={{ '&.Mui-checked': { color: '#4caf50' } }} />} 
                    label={<Typography variant="body2" sx={{ fontSize: { xs: '0.85rem', sm: '0.9rem' } }}>Lightly active (exercise 1-3 days/week)</Typography>}
                    sx={{ mx: 0 }}
                  />
                  <FormControlLabel 
                    value="1.55" 
                    control={<Radio size="small" sx={{ '&.Mui-checked': { color: '#4caf50' } }} />} 
                    label={<Typography variant="body2" sx={{ fontSize: { xs: '0.85rem', sm: '0.9rem' } }}>Moderately active (exercise 3-5 days/week)</Typography>}
                    sx={{ mx: 0 }}
                  />
                  <FormControlLabel 
                    value="1.725" 
                    control={<Radio size="small" sx={{ '&.Mui-checked': { color: '#4caf50' } }} />} 
                    label={<Typography variant="body2" sx={{ fontSize: { xs: '0.85rem', sm: '0.9rem' } }}>Active (hard exercise 6-7 days/week)</Typography>}
                    sx={{ mx: 0 }}
                  />
                  <FormControlLabel 
                    value="1.9" 
                    control={<Radio size="small" sx={{ '&.Mui-checked': { color: '#4caf50' } }} />} 
                    label={<Typography variant="body2" sx={{ fontSize: { xs: '0.85rem', sm: '0.9rem' } }}>Very active (very hard exercise & physical job)</Typography>}
                    sx={{ mx: 0 }}
                  />
                </RadioGroup>
              </FormControl>
            </Box>

            {/* Maintenance Calories and Macro Breakdown */}
            {calcMaintenanceCalories && calcProtein && calcFat && calcCarbs && (
              <Box 
                sx={{ 
                  background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
                  border: '2px solid #66bb6a',
                  borderRadius: 2,
                  p: { xs: 1.5, sm: 2 },
                  mt: 2
                }}
              >
                <Typography variant="body1" gutterBottom fontWeight="600" color="#2e7d32" sx={{ fontSize: { xs: '0.95rem', sm: '1.1rem' } }}>
                  Daily Maintenance: {calcMaintenanceCalories} cal
                </Typography>
                <Typography variant="caption" sx={{ mb: 1.5, display: 'block', fontSize: { xs: '0.75rem', sm: '0.8rem' } }} color="text.secondary">
                  Based on BMR and activity level
                </Typography>
                
                <Box sx={{ bgcolor: 'white', p: 1.5, borderRadius: 1.5, mb: 2 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight="600" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                    Your Calculation:
                  </Typography>
                  {calcBMR && (
                    <Typography variant="body2" color="#2e7d32" component="div" sx={{ mt: 0.5, fontWeight: '600', fontSize: { xs: '0.8rem', sm: '0.85rem' } }}>
                      {calcBMR} cal × {calcActivityLevel} = {calcMaintenanceCalories} cal
                    </Typography>
                  )}
                </Box>

                <Divider sx={{ my: 1.5 }} />

                <Typography variant="body2" gutterBottom fontWeight="600" color="#2e7d32" sx={{ mb: 1.5, fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                  Macro Breakdown:
                </Typography>
                
                <Grid container spacing={1.5}>
                  <Grid item xs={6} sm={4}>
                    <Box sx={{ bgcolor: '#fff3e0', border: '2px solid #ff9800', textAlign: 'center', p: 1.5, borderRadius: 1.5 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', sm: '0.7rem' } }}>PROTEIN</Typography>
                      <Typography variant="h6" fontWeight="bold" color="#f57c00" sx={{ fontSize: { xs: '1.2rem', sm: '1.5rem' } }}>{calcProtein}g</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.6rem', sm: '0.65rem' } }}>
                        {calcProtein * 4} cal
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <Box sx={{ bgcolor: '#fce4ec', border: '2px solid #ec407a', textAlign: 'center', p: 1.5, borderRadius: 1.5 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', sm: '0.7rem' } }}>FAT</Typography>
                      <Typography variant="h6" fontWeight="bold" color="#c2185b" sx={{ fontSize: { xs: '1.2rem', sm: '1.5rem' } }}>{calcFat}g</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.6rem', sm: '0.65rem' } }}>
                        {calcFat * 9} cal
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ bgcolor: '#e1f5fe', border: '2px solid #03a9f4', textAlign: 'center', p: 1.5, borderRadius: 1.5 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', sm: '0.7rem' } }}>CARBS</Typography>
                      <Typography variant="h6" fontWeight="bold" color="#0277bd" sx={{ fontSize: { xs: '1.2rem', sm: '1.5rem' } }}>{calcCarbs}g</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.6rem', sm: '0.65rem' } }}>
                        {calcCarbs * 4} cal
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>

                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button 
                    variant="contained" 
                    onClick={handleUseCalculatedValues}
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
                    Use These Values
                  </Button>
                </Box>
              </Box>
            )}
          </Box>
        )}
        </Paper>
      </Box>
      <Footer />
    </Box>
  );
}

export default MacroTargetPage;

