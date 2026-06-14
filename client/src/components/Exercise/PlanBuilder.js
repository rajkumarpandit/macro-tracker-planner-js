import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormControlLabel,
  FormLabel,
  RadioGroup,
  Radio,
  TextField,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider,
  Checkbox,
  Tooltip,
  IconButton,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { appColors, cardSx, primaryBtnSx, outlinedBtnSx } from '../../theme';
import { useAuth } from '../Auth/AuthContext';
import { db } from '../../firebase/firebase';
import { collection, addDoc, updateDoc, doc, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { generateWorkoutPlan } from '../../utils/exerciseApi';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

const steps = ['Fitness Assessment', 'Goals & Preferences', 'Choose Your Plan', 'Plan Preview', 'Choose Exercises'];
const mobileSteps = ['Assessment', 'Goals', 'Plan', 'Preview', 'Exercises'];

function PlanBuilder() {
  const { currentUser } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [hasExistingPlan, setHasExistingPlan] = useState(false);
  const [existingPlan, setExistingPlan] = useState(null);

  // Step 1: Fitness Assessment
  const [fitnessLevel, setFitnessLevel] = useState('beginner');
  const [workoutFrequency, setWorkoutFrequency] = useState('3');
  const [equipmentAccess, setEquipmentAccess] = useState('full_gym');

  // Step 2: Goals & Preferences
  const [primaryGoal, setPrimaryGoal] = useState('build_muscle');
  const [timePerSession, setTimePerSession] = useState('60');
  const [workoutDays, setWorkoutDays] = useState([1, 3, 5]); // Mon, Wed, Fri
  const [injuries, setInjuries] = useState('');

  // Step 3: Generated Plans
  const [generatedPlans, setGeneratedPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);

  // Step 5: Selected Exercises (user's routine)
  const [selectedExercises, setSelectedExercises] = useState({});

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  useEffect(() => {
    if (currentUser) {
      checkExistingPlan();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  // Auto-generate plans when user reaches step 2 without plans
  useEffect(() => {
    if (activeStep === 2 && generatedPlans.length === 0 && !loading) {
      generatePlans();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStep]);

  const checkExistingPlan = async () => {
    if (!currentUser) return;
    
    try {
      const q = query(
        collection(db, 'exercise_plans'),
        where('userId', '==', currentUser.uid),
        where('active', '==', true)
      );
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const plan = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
        setHasExistingPlan(true);
        setExistingPlan(plan);
      }
    } catch (error) {
      console.error('Error checking existing plan:', error);
    }
  };

  const handleNext = async () => {
    if (activeStep === 2 && !selectedPlan) {
      setMessage({ type: 'error', text: 'Please select a workout plan' });
      return;
    }

    if (activeStep === 3) {
      // Initialize selected exercises when moving to step 4
      initializeExerciseSelection();
    }

    if (activeStep === 4) {
      // Validate exercise selection
      const hasSelectedExercises = Object.values(selectedExercises).some(dayExercises => dayExercises.length > 0);
      if (!hasSelectedExercises) {
        setMessage({ type: 'error', text: 'Please select at least one exercise to track' });
        return;
      }
      // Save plan to Firestore
      await savePlan();
      return;
    }

    // Move to next step immediately for better UX
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
    setMessage({ type: '', text: '' });
    
    // Clear generated plans when going back from step 2 (to allow regeneration with changed parameters)
    if (activeStep === 2) {
      setGeneratedPlans([]);
      setSelectedPlan(null);
    }
    
    // Clear selected plan when going back from step 3
    if (activeStep === 3) {
      setSelectedPlan(null);
    }
    
    // Clear selected exercises when going back from step 4
    if (activeStep === 4) {
      setSelectedExercises({});
    }
  };

  const generatePlans = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const userProfile = {
        userId: currentUser.uid,
        fitnessLevel,
        workoutFrequency: parseInt(workoutFrequency),
        equipmentAccess,
        primaryGoal,
        timePerSession: parseInt(timePerSession),
        workoutDays,
        injuries: injuries.trim() || 'None',
      };

      const plans = await generateWorkoutPlan(userProfile);
      setGeneratedPlans(plans);
      setMessage({ type: 'success', text: `${plans.length} workout plans generated successfully!` });
    } catch (error) {
      console.error('Error generating plans:', error);
      setMessage({ type: 'error', text: 'Failed to generate workout plans. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const initializeExerciseSelection = () => {
    if (!selectedPlan) return;
    
    // Initialize with all exercises selected by default
    const initialSelection = {};
    selectedPlan.weeklySchedule.forEach(session => {
      initialSelection[session.day] = session.exercises.map((ex, idx) => idx);
    });
    setSelectedExercises(initialSelection);
  };

  const toggleExercise = (dayIndex, exerciseIndex) => {
    setSelectedExercises(prev => {
      const dayExercises = prev[dayIndex] || [];
      if (dayExercises.includes(exerciseIndex)) {
        return { ...prev, [dayIndex]: dayExercises.filter(idx => idx !== exerciseIndex) };
      } else {
        return { ...prev, [dayIndex]: [...dayExercises, exerciseIndex].sort((a, b) => a - b) };
      }
    });
  };

  const savePlan = async () => {
    if (!selectedPlan || !currentUser) return;

    setLoading(true);
    try {
      // Deactivate existing plans
      if (hasExistingPlan && existingPlan) {
        await updateDoc(doc(db, 'exercise_plans', existingPlan.id), { active: false });
      }

      // Filter exercises based on user selection
      const filteredSchedule = selectedPlan.weeklySchedule.map(session => {
        const selectedIndices = selectedExercises[session.day] || [];
        return {
          ...session,
          exercises: session.exercises.filter((_, idx) => selectedIndices.includes(idx)),
          exerciseCount: selectedIndices.length
        };
      });

      // Save new plan
      const planData = {
        userId: currentUser.uid,
        planName: selectedPlan.name,
        description: selectedPlan.description,
        fitnessLevel,
        primaryGoal,
        equipmentAccess,
        timePerSession: parseInt(timePerSession),
        weeklySchedule: filteredSchedule,
        totalWeeks: 12,
        currentWeek: 1,
        active: true,
        createdAt: Timestamp.now(),
      };

      await addDoc(collection(db, 'exercise_plans'), planData);

      setMessage({ type: 'success', text: '🎉 Workout plan saved successfully! Head to Workout Tracker to start.' });
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('Error saving plan:', error);
      setMessage({ type: 'error', text: 'Failed to save plan. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const toggleWorkoutDay = (day) => {
    if (workoutDays.includes(day)) {
      setWorkoutDays(workoutDays.filter(d => d !== day));
    } else {
      setWorkoutDays([...workoutDays, day].sort());
    }
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom sx={{ color: appColors.textPrimary, fontWeight: 600, mb: 3 }}>
              Tell us about your fitness background
            </Typography>

            <FormControl component="fieldset" fullWidth sx={{ mb: 3 }}>
              <FormLabel sx={{ mb: 1, color: appColors.textPrimary, fontWeight: 500 }}>Experience Level</FormLabel>
              <RadioGroup value={fitnessLevel} onChange={(e) => setFitnessLevel(e.target.value)}>
                <FormControlLabel value="beginner" control={<Radio />} label="Beginner (0-1 year)" />
                <FormControlLabel value="intermediate" control={<Radio />} label="Intermediate (1-3 years)" />
                <FormControlLabel value="advanced" control={<Radio />} label="Advanced (3+ years)" />
              </RadioGroup>
            </FormControl>

            <FormControl component="fieldset" fullWidth sx={{ mb: 3 }}>
              <FormLabel sx={{ mb: 1, color: appColors.textPrimary, fontWeight: 500 }}>How many days can you work out per week?</FormLabel>
              <RadioGroup value={workoutFrequency} onChange={(e) => setWorkoutFrequency(e.target.value)} row={!isMobile}>
                <FormControlLabel value="3" control={<Radio />} label="3 days" />
                <FormControlLabel value="4" control={<Radio />} label="4 days" />
                <FormControlLabel value="5" control={<Radio />} label="5 days" />
                <FormControlLabel value="6" control={<Radio />} label="6 days" />
              </RadioGroup>
            </FormControl>

            <FormControl component="fieldset" fullWidth>
              <FormLabel sx={{ mb: 1, color: appColors.textPrimary, fontWeight: 500 }}>Equipment Access</FormLabel>
              <RadioGroup value={equipmentAccess} onChange={(e) => setEquipmentAccess(e.target.value)}>
                <FormControlLabel value="full_gym" control={<Radio />} label="Full Gym (All equipment)" />
                <FormControlLabel value="home_gym" control={<Radio />} label="Home Gym (Basic equipment)" />
                <FormControlLabel value="minimal" control={<Radio />} label="Minimal (Dumbbells/Bands)" />
                <FormControlLabel value="bodyweight" control={<Radio />} label="Bodyweight Only" />
              </RadioGroup>
            </FormControl>
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom sx={{ color: appColors.textPrimary, fontWeight: 600, mb: 3 }}>
              What are your fitness goals?
            </Typography>

            <FormControl component="fieldset" fullWidth sx={{ mb: 3 }}>
              <FormLabel sx={{ mb: 1, color: appColors.textPrimary, fontWeight: 500 }}>Primary Goal</FormLabel>
              <RadioGroup value={primaryGoal} onChange={(e) => setPrimaryGoal(e.target.value)}>
                <FormControlLabel value="lose_fat" control={<Radio />} label="Lose Fat / Cut" />
                <FormControlLabel value="build_muscle" control={<Radio />} label="Build Muscle / Bulk" />
                <FormControlLabel value="maintain" control={<Radio />} label="Maintain / Stay Fit" />
                <FormControlLabel value="recomposition" control={<Radio />} label="Body Recomposition" />
              </RadioGroup>
            </FormControl>

            <FormControl component="fieldset" fullWidth sx={{ mb: 3 }}>
              <FormLabel sx={{ mb: 1, color: appColors.textPrimary, fontWeight: 500 }}>Time per Session</FormLabel>
              <RadioGroup value={timePerSession} onChange={(e) => setTimePerSession(e.target.value)} row={!isMobile}>
                <FormControlLabel value="30" control={<Radio />} label="30 min" />
                <FormControlLabel value="45" control={<Radio />} label="45 min" />
                <FormControlLabel value="60" control={<Radio />} label="60 min" />
                <FormControlLabel value="90" control={<Radio />} label="90 min" />
              </RadioGroup>
            </FormControl>

            <FormControl component="fieldset" fullWidth sx={{ mb: 3 }}>
              <FormLabel sx={{ mb: 1, color: appColors.textPrimary, fontWeight: 500 }}>
                Preferred Workout Days (Select {workoutFrequency} days)
              </FormLabel>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                {weekDays.map((day, index) => (
                  <Chip
                    key={index}
                    label={day}
                    onClick={() => toggleWorkoutDay(index)}
                    color={workoutDays.includes(index) ? 'primary' : 'default'}
                    sx={{
                      bgcolor: workoutDays.includes(index) ? appColors.blue : appColors.bgCard,
                      color: workoutDays.includes(index) ? 'white' : appColors.textSecondary,
                      border: `1px solid ${workoutDays.includes(index) ? appColors.blue : appColors.border}`,
                      '&:hover': {
                        bgcolor: workoutDays.includes(index) ? appColors.blueDark : appColors.blueLight,
                      },
                    }}
                  />
                ))}
              </Box>
            </FormControl>

            <TextField
              fullWidth
              multiline
              rows={3}
              label="Any injuries or limitations? (Optional)"
              value={injuries}
              onChange={(e) => setInjuries(e.target.value)}
              placeholder="e.g., Lower back pain, shoulder injury, etc."
              sx={{ mb: 2 }}
            />
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom sx={{ color: appColors.textPrimary, fontWeight: 600, mb: 3, fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
              Choose Your Workout Plan
            </Typography>

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
                <CircularProgress sx={{ color: appColors.blue }} />
                <Typography sx={{ ml: 2, color: appColors.textSecondary }}>
                  Generating personalized workout plans...
                </Typography>
              </Box>
            ) : generatedPlans.length > 0 ? (
              <Grid container spacing={2}>
                {generatedPlans.map((plan, index) => (
                  <Grid item xs={12} md={6} key={index}>
                    <Card
                      sx={{
                        border: selectedPlan?.name === plan.name ? `2px solid ${appColors.blue}` : `1px solid ${appColors.border}`,
                        bgcolor: selectedPlan?.name === plan.name ? appColors.blueLight : appColors.bgCard,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': {
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          transform: 'translateY(-2px)',
                        },
                      }}
                      onClick={() => setSelectedPlan(plan)}
                    >
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="h6" sx={{ fontWeight: 600, color: appColors.textPrimary }}>
                            {plan.name}
                          </Typography>
                          {selectedPlan?.name === plan.name && (
                            <CheckCircleIcon sx={{ color: appColors.blue }} />
                          )}
                        </Box>
                        <Typography variant="body2" sx={{ color: appColors.textSecondary, mb: 2 }}>
                          {plan.description}
                        </Typography>
                        <Typography variant="caption" sx={{ color: appColors.textPrimary, fontWeight: 500 }}>
                          Sample Week:
                        </Typography>
                        <List dense>
                          {plan.weeklySchedule.slice(0, 3).map((session, i) => (
                            <ListItem key={i} sx={{ py: 0.5, px: 0 }}>
                              <ListItemText
                                primary={`${weekDays[session.day]}: ${session.focus}`}
                                primaryTypographyProps={{ variant: 'caption', color: appColors.textSecondary }}
                              />
                            </ListItem>
                          ))}
                        </List>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Alert severity="info">Click "Next" to generate workout plans based on your preferences.</Alert>
            )}
          </Box>
        );

      case 3:
        if (!selectedPlan) return null;
        return (
          <Box>
            <Typography variant="h6" gutterBottom sx={{ color: appColors.textPrimary, fontWeight: 600, mb: 3, fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
              12-Week Plan Preview
            </Typography>

            <Paper sx={{ ...cardSx, mb: 3 }}>
              <Typography variant="h5" sx={{ fontWeight: 600, color: appColors.blue, mb: 3, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                {selectedPlan.name}
              </Typography>

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6} sm={6} md={3}>
                  <Box>
                    <Typography variant="caption" sx={{ color: appColors.textSecondary }}>Duration</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: appColors.textPrimary }}>12 Weeks</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={6} md={3}>
                  <Box>
                    <Typography variant="caption" sx={{ color: appColors.textSecondary }}>Days/Week</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: appColors.textPrimary }}>{workoutDays.length}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={6} md={3}>
                  <Box>
                    <Typography variant="caption" sx={{ color: appColors.textSecondary }}>Time/Session</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: appColors.textPrimary }}>{timePerSession} min</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={6} md={3}>
                  <Box>
                    <Typography variant="caption" sx={{ color: appColors.textSecondary }}>Goal</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: appColors.textPrimary }}>
                      {primaryGoal.replace('_', ' ')}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: appColors.textPrimary }}>
                Weekly Schedule:
              </Typography>
              <Grid container spacing={1}>
                {selectedPlan.weeklySchedule.map((session, index) => (
                  <Grid item xs={12} sm={6} key={index}>
                    <Box sx={{ p: 1.5, bgcolor: appColors.bgPage, borderRadius: 1, border: `1px solid ${appColors.border}` }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: appColors.textPrimary }}>
                        {weekDays[session.day]}: {session.focus}
                      </Typography>
                      <Typography variant="caption" sx={{ color: appColors.textSecondary }}>
                        {session.exerciseCount} exercises • {session.estimatedTime} min
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>

              <Alert severity="info" sx={{ mt: 3 }}>
                💡 The plan includes progressive overload and deload weeks at weeks 4, 8, and 12 for optimal recovery and growth.
              </Alert>
            </Paper>
          </Box>
        );

      case 4:
        if (!selectedPlan) return null;
        return (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Typography variant="h6" sx={{ color: appColors.textPrimary, fontWeight: 600, fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
                Choose Your Exercises
              </Typography>
              <Tooltip 
                title="Select the specific exercises you'll follow in your routine. Only selected exercises will appear in the Workout Tracker. This helps you stay consistent and follow a disciplined regime."
                arrow
                placement="right"
                enterDelay={0}
                leaveDelay={200}
              >
                <IconButton size="small" sx={{ color: appColors.blue }}>
                  <InfoOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>

            {selectedPlan.weeklySchedule.map((session, sessionIdx) => (
              <Paper key={sessionIdx} sx={{ ...cardSx, mb: 2 }}>
                <Box sx={{ p: 2, bgcolor: appColors.blueLight, borderRadius: '8px 8px 0 0', mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: appColors.navy }}>
                    {weekDays[session.day]}: {session.focus}
                  </Typography>
                  <Typography variant="caption" sx={{ color: appColors.textSecondary }}>
                    {selectedExercises[session.day]?.length || 0} of {session.exercises.length} exercises selected
                  </Typography>
                </Box>

                <Box sx={{ px: 2, pb: 2 }}>
                  {session.exercises.map((exercise, exIdx) => (
                    <Box
                      key={exIdx}
                      sx={{
                        mb: 1,
                        p: 1.5,
                        bgcolor: selectedExercises[session.day]?.includes(exIdx) ? appColors.successLight : appColors.bgPage,
                        border: `1px solid ${selectedExercises[session.day]?.includes(exIdx) ? appColors.success : appColors.border}`,
                        borderRadius: 1,
                        transition: 'all 0.2s',
                      }}
                    >
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={selectedExercises[session.day]?.includes(exIdx) || false}
                            onChange={() => toggleExercise(session.day, exIdx)}
                            sx={{
                              color: appColors.blue,
                              '&.Mui-checked': { color: appColors.success }
                            }}
                          />
                        }
                        label={
                          <Box sx={{ width: '100%' }}>
                            <Typography variant="body1" sx={{ fontWeight: 500, color: appColors.textPrimary }}>
                              {exercise.name}
                            </Typography>
                            <Typography variant="caption" sx={{ color: appColors.textSecondary }}>
                              {exercise.muscleGroup} • {exercise.targetSets} sets × {exercise.targetReps} reps • Rest: {exercise.restTime}
                            </Typography>
                          </Box>
                        }
                        sx={{ width: '100%', m: 0 }}
                      />
                    </Box>
                  ))}

                  {session.exercises.length > 3 && (
                    <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          // Select all exercises for this day
                          setSelectedExercises(prev => ({
                            ...prev,
                            [session.day]: session.exercises.map((_, idx) => idx)
                          }));
                        }}
                        sx={{ ...outlinedBtnSx }}
                      >
                        Select All
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          // Deselect all exercises for this day
                          setSelectedExercises(prev => ({
                            ...prev,
                            [session.day]: []
                          }));
                        }}
                        sx={{ ...outlinedBtnSx }}
                      >
                        Clear All
                      </Button>
                    </Box>
                  )}
                </Box>
              </Paper>
            ))}

            <Alert severity="success" sx={{ mt: 2 }}>
              💪 Selected exercises will be your routine. The Workout Tracker will only show these exercises to help you stay disciplined and consistent.
            </Alert>
          </Box>
        );

      default:
        return null;
    }
  };

  if (hasExistingPlan && existingPlan) {
    return (
      <Box sx={{ ...cardSx, textAlign: 'center', py: 6 }}>
        <FitnessCenterIcon sx={{ fontSize: 60, color: appColors.blue, mb: 2 }} />
        <Typography variant="h5" sx={{ fontWeight: 600, color: appColors.textPrimary, mb: 2 }}>
          Active Plan Found
        </Typography>
        <Typography variant="body1" sx={{ color: appColors.textSecondary, mb: 1 }}>
          You already have an active workout plan: <strong>{existingPlan.planName}</strong>
        </Typography>
        <Typography variant="body2" sx={{ color: appColors.textSecondary, mb: 3 }}>
          Week {existingPlan.currentWeek} of {existingPlan.totalWeeks}
        </Typography>
        <Button
          variant="outlined"
          onClick={() => {
            setHasExistingPlan(false);
            setExistingPlan(null);
          }}
          sx={{ ...outlinedBtnSx }}
        >
          Create New Plan (Replaces Current)
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Stepper 
        activeStep={activeStep} 
        alternativeLabel={isMobile}
        sx={{ 
          mb: { xs: 3, sm: 4 },
          '& .MuiStepLabel-label': {
            fontSize: { xs: '0.65rem', sm: '0.875rem' },
            fontWeight: 500,
            mt: { xs: 0.5, sm: 1 },
          },
          '& .MuiStepLabel-iconContainer': {
            paddingRight: { xs: 0, sm: 1 },
          },
          '& .MuiStepIcon-root': {
            fontSize: { xs: '1.25rem', sm: '1.5rem' },
          },
          '& .MuiStepConnector-line': {
            borderTopWidth: { xs: 1, sm: 2 },
          },
        }}
      >
        {(isMobile ? mobileSteps : steps).map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Paper sx={{ ...cardSx }}>
        {message.text && (
          <Alert severity={message.type} sx={{ mb: 3 }} onClose={() => setMessage({ type: '', text: '' })}>
            {message.text}
          </Alert>
        )}

        {renderStepContent()}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4, pt: 3, borderTop: `1px solid ${appColors.border}` }}>
          <Button
            disabled={activeStep === 0}
            onClick={handleBack}
            sx={{ ...outlinedBtnSx }}
          >
            Back
          </Button>
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={loading || (activeStep === 1 && workoutDays.length !== parseInt(workoutFrequency))}
            sx={{ ...primaryBtnSx }}
          >
            {loading ? (
              <CircularProgress size={24} sx={{ color: 'white' }} />
            ) : activeStep === steps.length - 1 ? (
              'Save Plan'
            ) : (
              'Next'
            )}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}

export default PlanBuilder;
