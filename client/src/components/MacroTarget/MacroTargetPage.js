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
  Tab
} from '@mui/material';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import { collection, addDoc, getDocs, query, where, updateDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import { useAuth } from '../Auth/AuthContext';
import Footer from '../Common/Footer';
import { appColors, primaryBtnSx, outlinedBtnSx } from '../../theme';
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
  const [calcBMI, setCalcBMI] = useState(null);
  const [calcRecommendedGoal, setCalcRecommendedGoal] = useState('');
  
  // Results for all three goal types
  const [calcMaintenance, setCalcMaintenance] = useState(null);
  const [calcDeficit, setCalcDeficit] = useState(null);
  const [calcBulking, setCalcBulking] = useState(null);
  
  // Legacy states (kept for backward compatibility with existing UI)
  const [calcMaintenanceCalories, setCalcMaintenanceCalories] = useState(null);

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
    } else {
      setCalcBMR(null);
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

  // Calculate BMI and recommend goal
  useEffect(() => {
    if (calcWeight && calcHeightCm) {
      const weight = Number(calcWeight);
      const heightM = Number(calcHeightCm) / 100; // convert cm to meters
      const bmi = weight / (heightM * heightM);
      setCalcBMI(bmi.toFixed(1));
      
      // Recommend goal based on BMI
      if (bmi < 18.5) {
        setCalcRecommendedGoal('bulking');
      } else if (bmi >= 25) {
        setCalcRecommendedGoal('deficit');
      } else {
        setCalcRecommendedGoal('maintenance');
      }
    } else {
      setCalcBMI(null);
      setCalcRecommendedGoal('');
    }
  }, [calcWeight, calcHeightCm]);

  // Calculate macro breakdown for all three goals
  useEffect(() => {
    if (calcMaintenanceCalories && calcWeight) {
      const weight = Number(calcWeight);
      const maintenanceCal = calcMaintenanceCalories;
      
      // MAINTENANCE: 1.6g/kg protein, 27.5% fat
      const maintProtein = Math.round(1.6 * weight);
      const maintProteinCal = maintProtein * 4;
      const maintFatCal = Math.round(maintenanceCal * 0.275);
      const maintFat = Math.round(maintFatCal / 9);
      const maintCarbsCal = maintenanceCal - maintProteinCal - maintFatCal;
      const maintCarbs = Math.round(maintCarbsCal / 4);
      
      setCalcMaintenance({
        calories: maintenanceCal,
        protein: maintProtein,
        fat: maintFat,
        carbs: maintCarbs
      });
      
      // DEFICIT: Maintenance - 500 cal, 2.0g/kg protein (preserve muscle), 25% fat
      const deficitCal = Math.max(1200, maintenanceCal - 500); // Don't go below 1200
      const deficitProtein = Math.round(2.0 * weight);
      const deficitProteinCal = deficitProtein * 4;
      const deficitFatCal = Math.round(deficitCal * 0.25);
      const deficitFat = Math.round(deficitFatCal / 9);
      const deficitCarbsCal = deficitCal - deficitProteinCal - deficitFatCal;
      const deficitCarbs = Math.max(0, Math.round(deficitCarbsCal / 4));
      
      setCalcDeficit({
        calories: deficitCal,
        protein: deficitProtein,
        fat: deficitFat,
        carbs: deficitCarbs
      });
      
      // BULKING: Maintenance + 300 cal, 1.8g/kg protein, 30% fat
      const bulkingCal = maintenanceCal + 300;
      const bulkingProtein = Math.round(1.8 * weight);
      const bulkingProteinCal = bulkingProtein * 4;
      const bulkingFatCal = Math.round(bulkingCal * 0.30);
      const bulkingFat = Math.round(bulkingFatCal / 9);
      const bulkingCarbsCal = bulkingCal - bulkingProteinCal - bulkingFatCal;
      const bulkingCarbs = Math.round(bulkingCarbsCal / 4);
      
      setCalcBulking({
        calories: bulkingCal,
        protein: bulkingProtein,
        fat: bulkingFat,
        carbs: bulkingCarbs
      });
    } else {
      setCalcMaintenance(null);
      setCalcDeficit(null);
      setCalcBulking(null);
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

  // Helper function to get BMI category
  const getBMICategory = (bmi) => {
    if (!bmi) return '';
    const bmiNum = Number(bmi);
    if (bmiNum < 18.5) return 'Underweight';
    if (bmiNum < 25) return 'Normal Weight';
    if (bmiNum < 30) return 'Overweight';
    return 'Obese';
  };

  // Handle transfer of calculated values to Set Target tab
  const handleUseCalculatedValues = (goalType = 'maintenance') => {
    let goalData;
    if (goalType === 'deficit' && calcDeficit) {
      goalData = calcDeficit;
    } else if (goalType === 'bulking' && calcBulking) {
      goalData = calcBulking;
    } else if (goalType === 'maintenance' && calcMaintenance) {
      goalData = calcMaintenance;
    }
    
    if (goalData) {
      setTargetType(goalType);
      setCalories(goalData.calories.toString());
      setProtein(goalData.protein.toString());
      setFat(goalData.fat.toString());
      setCarbs(goalData.carbs.toString());
      setTabValue(0); // Switch to Set Target tab
      setMessage({ text: `${goalType.charAt(0).toUpperCase() + goalType.slice(1)} values transferred to Set Target tab`, type: 'success' });
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
          <TrackChangesIcon sx={{ fontSize: { xs: 28, sm: 36 }, color: 'primary.main' }} />
          <Typography variant="h6" component="h1" fontWeight="600" sx={{ fontSize: { xs: '1.1rem', sm: '1.5rem' }, color: 'text.primary' }}>
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
              bgcolor: appColors.bgCard,
              '& .MuiTab-root': {
                fontSize: { xs: '0.85rem', sm: '0.95rem' },
                fontWeight: 600,
                py: { xs: 1.5, sm: 2 },
                textTransform: 'none',
                minHeight: { xs: 48, sm: 56 }
              },
              '& .Mui-selected': {
                color: `${appColors.blue} !important`
              },
              '& .MuiTabs-indicator': {
                height: 3,
                background: `linear-gradient(90deg, ${appColors.blue} 0%, ${appColors.blueDark} 100%)`
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
            <Box sx={{ p: { xs: 2, sm: 3 }, bgcolor: appColors.bgCard }}>
              <FormControl component="fieldset" sx={{ mb: 3, width: '100%' }}>
                <FormLabel 
                  component="legend" 
                  sx={{ 
                    fontSize: { xs: '0.95rem', sm: '1rem' },
                    fontWeight: 600, 
                    mb: 1.5,
                    color: appColors.blue
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
                      border: targetType === 'deficit' ? `2px solid ${appColors.blue}` : `1px solid ${appColors.border}`,
                      bgcolor: targetType === 'deficit' ? appColors.blueLight : appColors.bgCard,
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
                        '&.Mui-checked': { color: appColors.blue }
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
                      border: targetType === 'maintenance' ? `2px solid ${appColors.blue}` : `1px solid ${appColors.border}`,
                      bgcolor: targetType === 'maintenance' ? appColors.blueLight : appColors.bgCard,
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
                        '&.Mui-checked': { color: appColors.blue }
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
                      border: targetType === 'bulking' ? `2px solid ${appColors.blue}` : `1px solid ${appColors.border}`,
                      bgcolor: targetType === 'bulking' ? appColors.blueLight : appColors.bgCard,
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
                        '&.Mui-checked': { color: appColors.blue }
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
                        borderColor: appColors.blue
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: appColors.blue
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
                        borderColor: appColors.blue
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: appColors.blue
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
                        borderColor: appColors.blue
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: appColors.blue
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
                        borderColor: appColors.blue
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: appColors.blue
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
                  ...outlinedBtnSx,
                  px: 3,
                  fontSize: { xs: '0.9rem', sm: '0.95rem' }
                }}
              >
                Cancel
              </Button>
              <Button 
                variant="contained" 
                onClick={handleSave}
                size="medium"
                sx={{
                  ...primaryBtnSx,
                  px: 3,
                  fontSize: { xs: '0.9rem', sm: '0.95rem' }
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
                  background: `linear-gradient(135deg, ${appColors.successLight} 0%, ${appColors.blueLight} 100%)`,
                  border: `2px solid ${appColors.success}`,
                  borderRadius: 2
                }}
              >
                <Typography variant="body2" gutterBottom fontWeight="600" color={appColors.success}>
                  ✓ Saved Target
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5, mt: 1.5 }}>
                  <Box sx={{ bgcolor: appColors.bgCard, p: 1.5, borderRadius: 1 }}>
                    <Typography variant="caption" color="text.secondary">Goal</Typography>
                    <Typography variant="body2" fontWeight="600">
                      {savedTargets.targetType.charAt(0).toUpperCase() + savedTargets.targetType.slice(1)}
                    </Typography>
                  </Box>
                  <Box sx={{ bgcolor: appColors.bgCard, p: 1.5, borderRadius: 1 }}>
                    <Typography variant="caption" color="text.secondary">Calories</Typography>
                    <Typography variant="body2" fontWeight="600">{savedTargets.calories}</Typography>
                  </Box>
                  <Box sx={{ bgcolor: appColors.bgCard, p: 1.5, borderRadius: 1 }}>
                    <Typography variant="caption" color="text.secondary">Protein</Typography>
                    <Typography variant="body2" fontWeight="600">{savedTargets.protein}g</Typography>
                  </Box>
                  <Box sx={{ bgcolor: appColors.bgCard, p: 1.5, borderRadius: 1 }}>
                    <Typography variant="caption" color="text.secondary">Carbs</Typography>
                    <Typography variant="body2" fontWeight="600">{savedTargets.carbs}g</Typography>
                  </Box>
                  <Box sx={{ bgcolor: appColors.bgCard, p: 1.5, borderRadius: 1 }}>
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
          <Box sx={{ p: { xs: 2, sm: 3 }, bgcolor: appColors.bgCard }}>
            <Box sx={{ 
              mb: 3, 
              p: { xs: 1.5, sm: 2 }, 
              bgcolor: appColors.blueLight, 
              borderRadius: 2,
              borderLeft: `3px solid ${appColors.blue}`
            }}>
              <Typography variant="body2" fontWeight="600" color={appColors.blue} gutterBottom sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                📊 Macro Calculator Questionnaire
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.8rem' } }}>
                Answer a few questions to get personalized macro recommendations
              </Typography>
            </Box>

            {/* Question 1: Weight */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" fontWeight="600" gutterBottom sx={{ color: appColors.blue, mb: 1.5, fontSize: { xs: '0.95rem', sm: '1rem' } }}>
                Q1. What is your weight?
              </Typography>
              <Grid container spacing={1.5}>
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
                          borderColor: appColors.blue
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: appColors.blue
                        }
                      }
                    }}
                  />
                </Grid>
                <Grid item xs={7} sm={6}>
                  <Box sx={{ 
                    p: 1.5,
                    bgcolor: appColors.bgPage,
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
                    <Typography variant="body2" color={appColors.blue} fontWeight="600">
                      {calcWeightLbs || '-'}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>

            {/* Question 2: Height */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" fontWeight="600" gutterBottom sx={{ color: appColors.blue, mb: 1.5, fontSize: { xs: '0.95rem', sm: '1rem' } }}>
                Q2. What is your height?
              </Typography>
              <Grid container spacing={1.5}>
                <Grid item xs={3} sm={4}>
                  <TextField
                    fullWidth
                    label="Feet"
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
                          borderColor: appColors.blue
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: appColors.blue
                        }
                      }
                    }}
                  />
                </Grid>
                <Grid item xs={3} sm={4}>
                  <TextField
                    fullWidth
                    label="Inches"
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
                          borderColor: appColors.blue
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: appColors.blue
                        }
                      }
                    }}
                  />
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Box sx={{ 
                    p: 1.5,
                    bgcolor: appColors.bgPage,
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
                    <Typography variant="body2" color={appColors.blue} fontWeight="600">
                      {calcHeightCm || '-'}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>

            {/* Question 3: Age/DOB */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" fontWeight="600" gutterBottom sx={{ color: appColors.blue, mb: 1.5, fontSize: { xs: '0.95rem', sm: '1rem' } }}>
                Q3. What is your date of birth?
              </Typography>
              <Grid container spacing={1.5}>
                <Grid item xs={5} sm={6}>
                  <TextField
                    fullWidth
                    label="Date of Birth"
                    type="date"
                    value={calcDOB}
                    onChange={(e) => setCalcDOB(e.target.value)}
                    InputLabelProps={{ shrink: true }}
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
                <Grid item xs={7} sm={6}>
                  <Box sx={{ 
                    p: 1.5,
                    bgcolor: appColors.bgPage,
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
                    <Typography variant="body2" color={appColors.blue} fontWeight="600">
                      {calcAge || '-'}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>

            {/* Question 4: Sex */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" fontWeight="600" gutterBottom sx={{ color: appColors.blue, mb: 1.5, fontSize: { xs: '0.95rem', sm: '1rem' } }}>
                Q4. What is your biological sex?
              </Typography>
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
                    border: calcSex === 'male' ? `2px solid ${appColors.blue}` : `1px solid ${appColors.border}`,
                    bgcolor: calcSex === 'male' ? appColors.blueLight : appColors.bgCard,
                    p: 1.5,
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
                    sx={{ p: 0, '&.Mui-checked': { color: appColors.blue } }}
                  />
                  <Typography variant="body2" sx={{ fontSize: { xs: '0.85rem', sm: '0.9rem' } }}>Male</Typography>
                </Box>
                <Box
                  onClick={() => setCalcSex('female')}
                  sx={{
                    flex: 1,
                    cursor: 'pointer',
                    border: calcSex === 'female' ? `2px solid ${appColors.blue}` : `1px solid ${appColors.border}`,
                    bgcolor: calcSex === 'female' ? appColors.blueLight : appColors.bgCard,
                    p: 1.5,
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
                    sx={{ p: 0, '&.Mui-checked': { color: appColors.blue } }}
                  />
                  <Typography variant="body2" sx={{ fontSize: { xs: '0.85rem', sm: '0.9rem' } }}>Female</Typography>
                </Box>
              </RadioGroup>
            </Box>

            {/* BMR & BMI Results */}
            {calcBMR && calcBMI && (
              <Box sx={{ 
                mb: 3,
                p: 2,
                bgcolor: appColors.blueLight,
                border: `2px solid ${appColors.blue}`,
                borderRadius: 2
              }}>
                <Typography variant="body2" fontWeight="600" color={appColors.blue} gutterBottom>
                  📈 Your Results:
                </Typography>
                <Grid container spacing={2} sx={{ mt: 0.5 }}>
                  <Grid item xs={6}>
                    <Box sx={{ bgcolor: appColors.bgCard, p: 1.5, borderRadius: 1.5 }}>
                      <Typography variant="caption" color="text.secondary">BMR (Basal Metabolic Rate)</Typography>
                      <Typography variant="h6" fontWeight="bold" color={appColors.blue}>{calcBMR} cal</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                        Calories at rest
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box sx={{ bgcolor: appColors.bgCard, p: 1.5, borderRadius: 1.5 }}>
                      <Typography variant="caption" color="text.secondary">BMI (Body Mass Index)</Typography>
                      <Typography variant="h6" fontWeight="bold" color={appColors.blue}>{calcBMI}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                        {getBMICategory(calcBMI)}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* Question 5: Activity Level */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" fontWeight="600" gutterBottom sx={{ color: appColors.blue, mb: 1.5, fontSize: { xs: '0.95rem', sm: '1rem' } }}>
                Q5. What is your activity level?
              </Typography>
              <RadioGroup
                value={calcActivityLevel}
                onChange={(e) => setCalcActivityLevel(e.target.value)}
                sx={{ gap: 0.5 }}
              >
                <FormControlLabel 
                  value="1.2" 
                  control={<Radio size="small" sx={{ '&.Mui-checked': { color: appColors.blue } }} />} 
                  label={<Typography variant="body2" sx={{ fontSize: { xs: '0.85rem', sm: '0.9rem' } }}>Sedentary (little or no exercise)</Typography>}
                  sx={{ mx: 0 }}
                />
                <FormControlLabel 
                  value="1.375" 
                  control={<Radio size="small" sx={{ '&.Mui-checked': { color: appColors.blue } }} />} 
                  label={<Typography variant="body2" sx={{ fontSize: { xs: '0.85rem', sm: '0.9rem' } }}>Lightly active (exercise 1-3 days/week)</Typography>}
                  sx={{ mx: 0 }}
                />
                <FormControlLabel 
                  value="1.55" 
                  control={<Radio size="small" sx={{ '&.Mui-checked': { color: appColors.blue } }} />} 
                  label={<Typography variant="body2" sx={{ fontSize: { xs: '0.85rem', sm: '0.9rem' } }}>Moderately active (exercise 3-5 days/week)</Typography>}
                  sx={{ mx: 0 }}
                />
                <FormControlLabel 
                  value="1.725" 
                  control={<Radio size="small" sx={{ '&.Mui-checked': { color: appColors.blue } }} />} 
                  label={<Typography variant="body2" sx={{ fontSize: { xs: '0.85rem', sm: '0.9rem' } }}>Active (hard exercise 6-7 days/week)</Typography>}
                  sx={{ mx: 0 }}
                />
                <FormControlLabel 
                  value="1.9" 
                  control={<Radio size="small" sx={{ '&.Mui-checked': { color: appColors.blue } }} />} 
                  label={<Typography variant="body2" sx={{ fontSize: { xs: '0.85rem', sm: '0.9rem' } }}>Very active (very hard exercise & physical job)</Typography>}
                  sx={{ mx: 0 }}
                />
              </RadioGroup>
            </Box>

            {/* Question 6: Recommendations for All Goals */}
            {calcMaintenance && calcDeficit && calcBulking && (
              <Box>
                <Typography variant="body2" fontWeight="600" gutterBottom sx={{ color: appColors.blue, mb: 2, fontSize: { xs: '0.95rem', sm: '1rem' } }}>
                  Q6. Choose your goal - Here are your personalized recommendations:
                </Typography>

                {/* BMI-based Recommendation Banner */}
                {calcRecommendedGoal && (
                  <Box sx={{ 
                    mb: { xs: 2, sm: 3 }, 
                    p: { xs: 1.5, sm: 2 }, 
                    bgcolor: appColors.successLight,
                    border: `2px solid ${appColors.success}`,
                    borderRadius: 2
                  }}>
                    <Typography variant="body2" fontWeight="600" color={appColors.success} gutterBottom sx={{ fontSize: { xs: '0.85rem', sm: '0.95rem' } }}>
                      💡 Based on your BMI ({calcBMI} - {getBMICategory(calcBMI)}):
                    </Typography>
                    <Typography variant="body2" color="text.primary" sx={{ fontSize: { xs: '0.8rem', sm: '0.9rem' } }}>
                      We recommend the <strong>{calcRecommendedGoal.toUpperCase()}</strong> plan to help you achieve a healthy weight.
                    </Typography>
                  </Box>
                )}

                <Grid container spacing={{ xs: 2, sm: 2, md: 2 }}>
                  {/* DEFICIT Card */}
                  <Grid item xs={12} sm={12} md={6} lg={4}>
                    <Box sx={{ 
                      p: { xs: 1.5, sm: 2, md: 2.5 },
                      bgcolor: calcRecommendedGoal === 'deficit' ? appColors.successLight : appColors.bgCard,
                      border: calcRecommendedGoal === 'deficit' ? `3px solid ${appColors.success}` : `2px solid ${appColors.border}`,
                      borderRadius: 2,
                      position: 'relative',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column'
                    }}>
                      {calcRecommendedGoal === 'deficit' && (
                        <Box sx={{ 
                          position: 'absolute', 
                          top: -10, 
                          right: 10,
                          bgcolor: appColors.success,
                          color: 'white',
                          px: 1.5,
                          py: 0.5,
                          borderRadius: 1,
                          fontSize: '0.75rem',
                          fontWeight: 600
                        }}>
                          RECOMMENDED
                        </Box>
                      )}
                      <Typography variant="h6" fontWeight="700" gutterBottom color={appColors.blue} sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
                        🔥 Calorie Deficit
                      </Typography>
                      <Typography variant="caption" color="text.secondary" gutterBottom sx={{ mb: 2, fontSize: { xs: '0.75rem', sm: '0.85rem' } }}>
                        For weight loss (-500 cal/day ≈ 1 lb/week)
                      </Typography>

                      <Box sx={{ mb: 2, p: { xs: 1, sm: 1.5 }, bgcolor: appColors.bgPage, borderRadius: 1.5 }}>
                        <Typography variant="h5" fontWeight="bold" color={appColors.blue} sx={{ fontSize: { xs: '1.3rem', sm: '1.5rem' } }}>
                          {calcDeficit.calories} cal/day
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {calcBMR} × {calcActivityLevel} - 500
                        </Typography>
                      </Box>

                      <Typography variant="caption" fontWeight="600" color="text.secondary" gutterBottom sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                        Macro Targets:
                      </Typography>
                      <Box sx={{ display: 'flex', gap: { xs: 0.5, sm: 1 }, mb: 2 }}>
                        <Box sx={{ flex: 1, textAlign: 'center', p: { xs: 0.75, sm: 1 }, bgcolor: appColors.proteinLight, borderRadius: 1 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>Protein</Typography>
                          <Typography variant="body2" fontWeight="600" color={appColors.protein} sx={{ fontSize: { xs: '0.85rem', sm: '0.95rem' } }}>{calcDeficit.protein}g</Typography>
                        </Box>
                        <Box sx={{ flex: 1, textAlign: 'center', p: { xs: 0.75, sm: 1 }, bgcolor: appColors.fatLight, borderRadius: 1 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>Fat</Typography>
                          <Typography variant="body2" fontWeight="600" color={appColors.fat} sx={{ fontSize: { xs: '0.85rem', sm: '0.95rem' } }}>{calcDeficit.fat}g</Typography>
                        </Box>
                        <Box sx={{ flex: 1, textAlign: 'center', p: { xs: 0.75, sm: 1 }, bgcolor: appColors.carbsLight, borderRadius: 1 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>Carbs</Typography>
                          <Typography variant="body2" fontWeight="600" color={appColors.carbs} sx={{ fontSize: { xs: '0.85rem', sm: '0.95rem' } }}>{calcDeficit.carbs}g</Typography>
                        </Box>
                      </Box>

                      <Typography variant="caption" sx={{ mb: 2, fontSize: '0.7rem' }} color="text.secondary">
                        • High protein (2.0g/kg) to preserve muscle<br/>
                        • Lower fat (25%) for calorie reduction
                      </Typography>

                      <Button 
                        variant={calcRecommendedGoal === 'deficit' ? 'contained' : 'outlined'}
                        onClick={() => handleUseCalculatedValues('deficit')}
                        fullWidth
                        sx={{
                          mt: 'auto',
                          ...(calcRecommendedGoal === 'deficit' ? primaryBtnSx : outlinedBtnSx),
                          fontSize: { xs: '0.85rem', sm: '0.9rem' },
                          minHeight: { xs: 44, sm: 40 },
                          py: { xs: 1.25, sm: 1 }
                        }}
                      >
                        Apply Deficit Plan
                      </Button>
                    </Box>
                  </Grid>

                  {/* MAINTENANCE Card */}
                  <Grid item xs={12} sm={12} md={6} lg={4}>
                    <Box sx={{ 
                      p: { xs: 1.5, sm: 2, md: 2.5 },
                      bgcolor: calcRecommendedGoal === 'maintenance' ? appColors.successLight : appColors.bgCard,
                      border: calcRecommendedGoal === 'maintenance' ? `3px solid ${appColors.success}` : `2px solid ${appColors.border}`,
                      borderRadius: 2,
                      position: 'relative',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column'
                    }}>
                      {calcRecommendedGoal === 'maintenance' && (
                        <Box sx={{ 
                          position: 'absolute', 
                          top: -10, 
                          right: 10,
                          bgcolor: appColors.success,
                          color: 'white',
                          px: 1.5,
                          py: 0.5,
                          borderRadius: 1,
                          fontSize: '0.75rem',
                          fontWeight: 600
                        }}>
                          RECOMMENDED
                        </Box>
                      )}
                      <Typography variant="h6" fontWeight="700" gutterBottom color={appColors.blue} sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
                        ⚖️ Maintenance
                      </Typography>
                      <Typography variant="caption" color="text.secondary" gutterBottom sx={{ mb: 2, fontSize: { xs: '0.75rem', sm: '0.85rem' } }}>
                        For maintaining current weight
                      </Typography>

                      <Box sx={{ mb: 2, p: { xs: 1, sm: 1.5 }, bgcolor: appColors.bgPage, borderRadius: 1.5 }}>
                        <Typography variant="h5" fontWeight="bold" color={appColors.blue} sx={{ fontSize: { xs: '1.3rem', sm: '1.5rem' } }}>
                          {calcMaintenance.calories} cal/day
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {calcBMR} × {calcActivityLevel}
                        </Typography>
                      </Box>

                      <Typography variant="caption" fontWeight="600" color="text.secondary" gutterBottom sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                        Macro Targets:
                      </Typography>
                      <Box sx={{ display: 'flex', gap: { xs: 0.5, sm: 1 }, mb: 2 }}>
                        <Box sx={{ flex: 1, textAlign: 'center', p: { xs: 0.75, sm: 1 }, bgcolor: appColors.proteinLight, borderRadius: 1 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>Protein</Typography>
                          <Typography variant="body2" fontWeight="600" color={appColors.protein} sx={{ fontSize: { xs: '0.85rem', sm: '0.95rem' } }}>{calcMaintenance.protein}g</Typography>
                        </Box>
                        <Box sx={{ flex: 1, textAlign: 'center', p: { xs: 0.75, sm: 1 }, bgcolor: appColors.fatLight, borderRadius: 1 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>Fat</Typography>
                          <Typography variant="body2" fontWeight="600" color={appColors.fat} sx={{ fontSize: { xs: '0.85rem', sm: '0.95rem' } }}>{calcMaintenance.fat}g</Typography>
                        </Box>
                        <Box sx={{ flex: 1, textAlign: 'center', p: { xs: 0.75, sm: 1 }, bgcolor: appColors.carbsLight, borderRadius: 1 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>Carbs</Typography>
                          <Typography variant="body2" fontWeight="600" color={appColors.carbs} sx={{ fontSize: { xs: '0.85rem', sm: '0.95rem' } }}>{calcMaintenance.carbs}g</Typography>
                        </Box>
                      </Box>

                      <Typography variant="caption" sx={{ mb: 2, fontSize: '0.7rem' }} color="text.secondary">
                        • Moderate protein (1.6g/kg)<br/>
                        • Balanced fat (27.5%) for health
                      </Typography>

                      <Button 
                        variant={calcRecommendedGoal === 'maintenance' ? 'contained' : 'outlined'}
                        onClick={() => handleUseCalculatedValues('maintenance')}
                        fullWidth
                        sx={{
                          mt: 'auto',
                          ...(calcRecommendedGoal === 'maintenance' ? primaryBtnSx : outlinedBtnSx),
                          fontSize: { xs: '0.85rem', sm: '0.9rem' },
                          minHeight: { xs: 44, sm: 40 },
                          py: { xs: 1.25, sm: 1 }
                        }}
                      >
                        Apply Maintenance Plan
                      </Button>
                    </Box>
                  </Grid>

                  {/* BULKING Card */}
                  <Grid item xs={12} sm={12} md={12} lg={4}>
                    <Box sx={{ 
                      p: { xs: 1.5, sm: 2, md: 2.5 },
                      bgcolor: calcRecommendedGoal === 'bulking' ? appColors.successLight : appColors.bgCard,
                      border: calcRecommendedGoal === 'bulking' ? `3px solid ${appColors.success}` : `2px solid ${appColors.border}`,
                      borderRadius: 2,
                      position: 'relative',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column'
                    }}>
                      {calcRecommendedGoal === 'bulking' && (
                        <Box sx={{ 
                          position: 'absolute', 
                          top: -10, 
                          right: 10,
                          bgcolor: appColors.success,
                          color: 'white',
                          px: 1.5,
                          py: 0.5,
                          borderRadius: 1,
                          fontSize: '0.75rem',
                          fontWeight: 600
                        }}>
                          RECOMMENDED
                        </Box>
                      )}
                      <Typography variant="h6" fontWeight="700" gutterBottom color={appColors.blue} sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
                        💪 Bulking
                      </Typography>
                      <Typography variant="caption" color="text.secondary" gutterBottom sx={{ mb: 2, fontSize: { xs: '0.75rem', sm: '0.85rem' } }}>
                        For muscle gain (+300 cal/day)
                      </Typography>

                      <Box sx={{ mb: 2, p: { xs: 1, sm: 1.5 }, bgcolor: appColors.bgPage, borderRadius: 1.5 }}>
                        <Typography variant="h5" fontWeight="bold" color={appColors.blue} sx={{ fontSize: { xs: '1.3rem', sm: '1.5rem' } }}>
                          {calcBulking.calories} cal/day
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {calcBMR} × {calcActivityLevel} + 300
                        </Typography>
                      </Box>

                      <Typography variant="caption" fontWeight="600" color="text.secondary" gutterBottom sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                        Macro Targets:
                      </Typography>
                      <Box sx={{ display: 'flex', gap: { xs: 0.5, sm: 1 }, mb: 2 }}>
                        <Box sx={{ flex: 1, textAlign: 'center', p: { xs: 0.75, sm: 1 }, bgcolor: appColors.proteinLight, borderRadius: 1 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>Protein</Typography>
                          <Typography variant="body2" fontWeight="600" color={appColors.protein} sx={{ fontSize: { xs: '0.85rem', sm: '0.95rem' } }}>{calcBulking.protein}g</Typography>
                        </Box>
                        <Box sx={{ flex: 1, textAlign: 'center', p: { xs: 0.75, sm: 1 }, bgcolor: appColors.fatLight, borderRadius: 1 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>Fat</Typography>
                          <Typography variant="body2" fontWeight="600" color={appColors.fat} sx={{ fontSize: { xs: '0.85rem', sm: '0.95rem' } }}>{calcBulking.fat}g</Typography>
                        </Box>
                        <Box sx={{ flex: 1, textAlign: 'center', p: { xs: 0.75, sm: 1 }, bgcolor: appColors.carbsLight, borderRadius: 1 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>Carbs</Typography>
                          <Typography variant="body2" fontWeight="600" color={appColors.carbs} sx={{ fontSize: { xs: '0.85rem', sm: '0.95rem' } }}>{calcBulking.carbs}g</Typography>
                        </Box>
                      </Box>

                      <Typography variant="caption" sx={{ mb: 2, fontSize: '0.7rem' }} color="text.secondary">
                        • Higher protein (1.8g/kg) for muscle growth<br/>
                        • Higher fat (30%) for extra calories
                      </Typography>

                      <Button 
                        variant={calcRecommendedGoal === 'bulking' ? 'contained' : 'outlined'}
                        onClick={() => handleUseCalculatedValues('bulking')}
                        fullWidth
                        sx={{
                          mt: 'auto',
                          ...(calcRecommendedGoal === 'bulking' ? primaryBtnSx : outlinedBtnSx),
                          fontSize: { xs: '0.85rem', sm: '0.9rem' },
                          minHeight: { xs: 44, sm: 40 },
                          py: { xs: 1.25, sm: 1 }
                        }}
                      >
                        Apply Bulking Plan
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
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

