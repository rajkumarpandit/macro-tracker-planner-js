import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  List,
  Checkbox,
  TextField,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Collapse,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import StopIcon from '@mui/icons-material/Stop';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import TimerIcon from '@mui/icons-material/Timer';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import { appColors, cardSx, sectionTitleSx, primaryBtnSx, outlinedBtnSx } from '../../theme';
import { useAuth } from '../Auth/AuthContext';
import { db } from '../../firebase/firebase';
import { collection, addDoc, updateDoc, doc, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { FIREBASE_COLLECTIONS } from '../../config/constants';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

function WorkoutTracker() {
  const { currentUser } = useAuth();
  const [activePlan, setActivePlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [workoutStarted, setWorkoutStarted] = useState(false);
  const [workoutPaused, setWorkoutPaused] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [timerInterval, setTimerInterval] = useState(null);
  const [currentSessionId, setCurrentSessionId] = useState(null);

  // Today's workout
  const [todaysWorkout, setTodaysWorkout] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [expandedExercise, setExpandedExercise] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showSummaryDialog, setShowSummaryDialog] = useState(false);
  const [workoutDuration, setWorkoutDuration] = useState(0);
  const [editingDuration, setEditingDuration] = useState(false);
  const [completedWorkout, setCompletedWorkout] = useState(null);

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  useEffect(() => {
    if (currentUser) {
      loadActivePlan();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  useEffect(() => {
    return () => {
      if (timerInterval) clearInterval(timerInterval);
    };
  }, [timerInterval]);

  const loadActivePlan = async () => {
    if (!currentUser) return;

    setLoading(true);
    try {
      // Get active plan
      const planQuery = query(
        collection(db, 'exercise_plans'),
        where('userId', '==', currentUser.uid),
        where('active', '==', true)
      );
      const planSnapshot = await getDocs(planQuery);

      if (!planSnapshot.empty) {
        const plan = { id: planSnapshot.docs[0].id, ...planSnapshot.docs[0].data() };
        setActivePlan(plan);
        loadTodaysWorkout(plan);
      }
    } catch (error) {
      console.error('Error loading plan:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTodaysWorkout = async (plan) => {
    const today = new Date().getDay();
    const todayIndex = today === 0 ? 6 : today - 1; // Convert Sunday=0 to Sunday=6

    const workout = plan.weeklySchedule.find(w => w.day === todayIndex);
    
    if (workout) {
      setTodaysWorkout(workout);
      // Initialize exercises with empty sets
      const initialExercises = workout.exercises.map(ex => ({
        ...ex,
        sets: ex.sets || Array(ex.targetSets || 3).fill(null).map(() => ({ weight: '', reps: '', completed: false })),
        completed: false,
        expanded: false,
      }));
      setExercises(initialExercises);
      
      // Check if workout already completed today
      await checkTodayWorkoutCompletion();
    } else {
      setTodaysWorkout(null);
      setExercises([]);
    }
  };

  const checkTodayWorkoutCompletion = async () => {
    if (!currentUser) return;
    
    try {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const sessionQuery = query(
        collection(db, 'workout_sessions'),
        where('userId', '==', currentUser.uid),
        where('dateStr', '==', todayStr),
        where('status', '==', 'completed')
      );
      
      const sessionSnapshot = await getDocs(sessionQuery);
      if (!sessionSnapshot.empty) {
        const session = { id: sessionSnapshot.docs[0].id, ...sessionSnapshot.docs[0].data() };
        setCompletedWorkout(session);
      } else {
        setCompletedWorkout(null);
      }
    } catch (error) {
      console.error('Error checking workout completion:', error);
    }
  };

  const handleStartWorkout = async () => {
    const now = new Date();
    setWorkoutStarted(true);
    setWorkoutPaused(false);

    // Start timer
    const interval = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
    setTimerInterval(interval);

    // Create session in Firestore
    try {
      const sessionData = {
        userId: currentUser.uid,
        planId: activePlan.id,
        date: Timestamp.fromDate(now),
        weekNumber: activePlan.currentWeek,
        workoutType: todaysWorkout.focus,
        startTime: Timestamp.fromDate(now),
        status: 'in_progress',
        exercises: exercises.map(ex => ({
          name: ex.name,
          muscleGroup: ex.muscleGroup,
          sets: ex.sets,
          completed: false,
        })),
      };

      const sessionRef = await addDoc(collection(db, 'workout_sessions'), sessionData);
      setCurrentSessionId(sessionRef.id);
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

  const handlePauseWorkout = () => {
    setWorkoutPaused(true);
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
  };

  const handleResumeWorkout = () => {
    setWorkoutPaused(false);
    const interval = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
    setTimerInterval(interval);
  };

  const handleFinishWorkout = () => {
    if (timerInterval) clearInterval(timerInterval);
    setWorkoutDuration(elapsedTime);
    setShowSummaryDialog(true);
  };

  const handleSaveWorkout = async () => {
    const endTime = new Date();
    const duration = workoutDuration;
    const dateStr = format(endTime, 'yyyy-MM-dd');

    // Calculate calories burned (6 cal/min for strength training)
    const caloriesBurned = Math.round((duration / 60) * 6);

    try {
      // Update session in Firestore
      if (currentSessionId) {
        await updateDoc(doc(db, 'workout_sessions', currentSessionId), {
          endTime: Timestamp.fromDate(endTime),
          duration: duration,
          dateStr: dateStr,
          caloriesBurned: caloriesBurned,
          status: 'completed',
          exercises: exercises.map(ex => ({
            name: ex.name,
            muscleGroup: ex.muscleGroup,
            sets: ex.sets,
            completed: ex.completed,
            notes: ex.notes || '',
          })),
          updatedAt: Timestamp.now(),
        });

        // Also log to calories_burnt_log collection for integration
        await addDoc(collection(db, FIREBASE_COLLECTIONS.CALORIES_BURNT_LOG), {
          userId: currentUser.uid,
          dateStr: dateStr,
          activityType: 'Gym',
          duration: duration / 60, // minutes
          caloriesBurnt: caloriesBurned,
          notes: `${todaysWorkout.focus} - ${exercises.filter(e => e.completed).length}/${exercises.length} exercises completed`,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      }

      setShowSummaryDialog(false);
      setMessage({ type: 'success', text: `🎉 Workout completed! Burned ${caloriesBurned} calories in ${formatTime(duration)}` });
      
      // Set completed workout to show summary card
      await checkTodayWorkoutCompletion();
      
      // Reset workout state
      setWorkoutStarted(false);
      setWorkoutPaused(false);
      setElapsedTime(0);
      setCurrentSessionId(null);
      if (timerInterval) clearInterval(timerInterval);
    } catch (error) {
      console.error('Error finishing workout:', error);
      setMessage({ type: 'error', text: 'Error saving workout. Please try again.' });
    }
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleExerciseComplete = (index) => {
    const updated = [...exercises];
    updated[index].completed = !updated[index].completed;
    setExercises(updated);
  };

  const updateSet = (exerciseIndex, setIndex, field, value) => {
    const updated = [...exercises];
    updated[exerciseIndex].sets[setIndex][field] = value;
    setExercises(updated);
  };

  const toggleSetComplete = (exerciseIndex, setIndex) => {
    const updated = [...exercises];
    updated[exerciseIndex].sets[setIndex].completed = !updated[exerciseIndex].sets[setIndex].completed;
    setExercises(updated);
  };

  const addSet = (exerciseIndex) => {
    const updated = [...exercises];
    updated[exerciseIndex].sets.push({ weight: '', reps: '', completed: false });
    setExercises(updated);
  };

  const removeSet = (exerciseIndex, setIndex) => {
    const updated = [...exercises];
    updated[exerciseIndex].sets.splice(setIndex, 1);
    setExercises(updated);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
        <CircularProgress sx={{ color: appColors.blue }} />
      </Box>
    );
  }

  if (!activePlan) {
    return (
      <Box sx={{ ...cardSx, textAlign: 'center', py: 6 }}>
        <FitnessCenterIcon sx={{ fontSize: { xs: 50, sm: 60 }, color: appColors.blue, mb: 2 }} />
        <Typography variant="h5" sx={{ fontWeight: 600, color: appColors.textPrimary, mb: 2, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
          No Active Plan
        </Typography>
        <Typography variant="body1" sx={{ color: appColors.textSecondary, mb: 3 }}>
          Create a workout plan in the Plan Builder tab to start tracking your workouts.
        </Typography>
      </Box>
    );
  }

  if (!todaysWorkout) {
    return (
      <Box sx={{ ...cardSx, textAlign: 'center', py: 6 }}>
        <Typography variant="h5" sx={{ fontWeight: 600, color: appColors.textPrimary, mb: 2, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
          Rest Day 😌
        </Typography>
        <Typography variant="body1" sx={{ color: appColors.textSecondary }}>
          No workout scheduled for today. Enjoy your rest day!
        </Typography>
        <Typography variant="body2" sx={{ color: appColors.textSecondary, mt: 2 }}>
          Active Plan: <strong>{activePlan.planName}</strong> (Week {activePlan.currentWeek}/{activePlan.totalWeeks})
        </Typography>
      </Box>
    );
  }

  // Show completion card if workout already done today
  if (completedWorkout) {
    return (
      <Box>
        {message.text && (
          <Alert severity={message.type} sx={{ mb: 2 }} onClose={() => setMessage({ type: '', text: '' })}>
            {message.text}
          </Alert>
        )}
        
        <Paper sx={{ ...cardSx, textAlign: 'center', py: 6 }}>
          <CheckCircleIcon sx={{ fontSize: 80, color: appColors.green, mb: 2 }} />
          <Typography variant="h5" sx={{ fontWeight: 600, color: appColors.textPrimary, mb: 2, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
            Workout Completed! 🎉
          </Typography>
          <Typography variant="body1" sx={{ color: appColors.textSecondary, mb: 1 }}>
            Great job completing today's workout!
          </Typography>
          <Typography variant="body2" sx={{ color: appColors.textSecondary, mb: 3 }}>
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </Typography>
          
          <Box sx={{ bgcolor: appColors.greyLight, p: 2, borderRadius: 2, maxWidth: 400, mx: 'auto' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: appColors.textPrimary, mb: 1 }}>
              {todaysWorkout.focus}
            </Typography>
            <Typography variant="body2" sx={{ color: appColors.textSecondary, mb: 2 }}>
              Duration: {formatTime(completedWorkout.duration || 0)}
            </Typography>
            <Chip 
              label={`${completedWorkout.caloriesBurned || 0} calories burned`}
              sx={{ bgcolor: appColors.orangeLight, color: appColors.orange, fontWeight: 600 }}
            />
          </Box>
        </Paper>
      </Box>
    );
  }

  return (
    <Box>
      {message.text && (
        <Alert severity={message.type} sx={{ mb: 2 }} onClose={() => setMessage({ type: '', text: '' })}>
          {message.text}
        </Alert>
      )}

      {/* Workout Header */}
      <Paper sx={{ ...cardSx, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, flexWrap: 'wrap', gap: 1 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, color: appColors.textPrimary, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
              Week {activePlan.currentWeek}, {weekDays[todaysWorkout.day]}: {todaysWorkout.focus}
            </Typography>
            <Typography variant="body2" sx={{ color: appColors.textSecondary }}>
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </Typography>
          </Box>
          <Chip
            label={`${exercises.filter(e => e.completed).length}/${exercises.length} exercises`}
            sx={{ bgcolor: appColors.blueLight, color: appColors.blue, fontWeight: 600 }}
          />
        </Box>

        {/* Timer */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 2,
            bgcolor: workoutStarted ? appColors.blueLight : appColors.bgPage,
            borderRadius: 2,
            border: `1px solid ${workoutStarted ? appColors.blue : appColors.border}`,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TimerIcon sx={{ color: workoutStarted ? appColors.blue : appColors.textSecondary, fontSize: { xs: '1.5rem', sm: '2rem' } }} />
            <Typography variant="h5" sx={{ fontWeight: 700, fontFamily: 'monospace', color: appColors.textPrimary, fontSize: { xs: '1.5rem', sm: '2rem' } }}>
              {formatTime(elapsedTime)}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {!workoutStarted ? (
              <Button
                variant="contained"
                startIcon={<PlayArrowIcon />}
                onClick={handleStartWorkout}
                sx={{ ...primaryBtnSx }}
              >
                Start Workout
              </Button>
            ) : (
              <>
                {!workoutPaused ? (
                  <Button
                    variant="outlined"
                    startIcon={<PauseIcon />}
                    onClick={handlePauseWorkout}
                    sx={{ ...outlinedBtnSx }}
                  >
                    Pause
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    startIcon={<PlayArrowIcon />}
                    onClick={handleResumeWorkout}
                    sx={{ ...primaryBtnSx }}
                  >
                    Resume
                  </Button>
                )}
                <Button
                  variant="contained"
                  startIcon={<StopIcon />}
                  onClick={handleFinishWorkout}
                  sx={{
                    ...primaryBtnSx,
                    background: `linear-gradient(135deg, ${appColors.success} 0%, ${appColors.success} 100%)`,
                    '&:hover': {
                      background: `linear-gradient(135deg, ${appColors.success} 0%, ${appColors.success} 100%)`,
                      opacity: 0.9,
                    },
                  }}
                >
                  Finish
                </Button>
              </>
            )}
          </Box>
        </Box>
      </Paper>

      {/* Exercise List */}
      <Paper sx={{ ...cardSx }}>
        <Typography sx={{ ...sectionTitleSx, mb: 2 }}>Today's Exercises</Typography>

        <List sx={{ p: 0 }}>
          {exercises.map((exercise, exIndex) => (
            <Box key={exIndex} sx={{ mb: 2 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 1.5,
                  bgcolor: exercise.completed ? appColors.successLight : appColors.bgPage,
                  borderRadius: 1,
                  border: `1px solid ${exercise.completed ? appColors.success : appColors.border}`,
                  cursor: 'pointer',
                }}
                onClick={() => setExpandedExercise(expandedExercise === exIndex ? null : exIndex)}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
                  <Checkbox
                    checked={exercise.completed}
                    onChange={() => toggleExerciseComplete(exIndex)}
                    onClick={(e) => e.stopPropagation()}
                    sx={{
                      color: appColors.textSecondary,
                      '&.Mui-checked': { color: appColors.success },
                    }}
                  />
                  <Box>
                    <Typography
                      variant="body1"
                      sx={{
                        fontWeight: 600,
                        color: exercise.completed ? appColors.success : appColors.textPrimary,
                        textDecoration: exercise.completed ? 'line-through' : 'none',
                      }}
                    >
                      {exercise.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: appColors.textSecondary }}>
                      {exercise.muscleGroup} • {exercise.sets.length} sets × {exercise.targetReps} reps
                    </Typography>
                  </Box>
                </Box>
                <IconButton size="small">
                  {expandedExercise === exIndex ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
              </Box>

              <Collapse in={expandedExercise === exIndex}>
                <Box sx={{ pl: 6, pr: 2, pt: 2 }}>
                  {exercise.sets.map((set, setIndex) => (
                    <Box key={setIndex} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                      <Typography variant="body2" sx={{ width: 60, color: appColors.textSecondary }}>
                        Set {setIndex + 1}
                      </Typography>
                      <TextField
                        size="small"
                        type="number"
                        placeholder="Weight"
                        value={set.weight}
                        onChange={(e) => updateSet(exIndex, setIndex, 'weight', e.target.value)}
                        sx={{ width: 90 }}
                        InputProps={{ endAdornment: <Typography variant="caption">kg</Typography> }}
                      />
                      <Typography variant="body2" sx={{ color: appColors.textSecondary }}>×</Typography>
                      <TextField
                        size="small"
                        type="number"
                        placeholder="Reps"
                        value={set.reps}
                        onChange={(e) => updateSet(exIndex, setIndex, 'reps', e.target.value)}
                        sx={{ width: 80 }}
                        InputProps={{ endAdornment: <Typography variant="caption">reps</Typography> }}
                      />
                      <Checkbox
                        checked={set.completed}
                        onChange={() => toggleSetComplete(exIndex, setIndex)}
                        sx={{
                          color: appColors.textSecondary,
                          '&.Mui-checked': { color: appColors.success },
                        }}
                      />
                      <IconButton
                        size="small"
                        onClick={() => removeSet(exIndex, setIndex)}
                        sx={{ color: appColors.error }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => addSet(exIndex)}
                    sx={{ mt: 1, color: appColors.blue }}
                  >
                    Add Set
                  </Button>
                </Box>
              </Collapse>
            </Box>
          ))}
        </List>
      </Paper>

      {/* Summary Dialog */}
      <Dialog 
        open={showSummaryDialog} 
        onClose={() => setShowSummaryDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: appColors.blueLight, color: appColors.navy }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            🎯 Workout Summary
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ color: appColors.textSecondary, mb: 1 }}>
              Workout Duration
            </Typography>
            {editingDuration ? (
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <TextField
                  type="number"
                  value={Math.floor(workoutDuration / 60)}
                  onChange={(e) => {
                    const mins = parseInt(e.target.value) || 0;
                    const secs = workoutDuration % 60;
                    setWorkoutDuration(mins * 60 + secs);
                  }}
                  label="Minutes"
                  size="small"
                  sx={{ width: 100 }}
                />
                <TextField
                  type="number"
                  value={workoutDuration % 60}
                  onChange={(e) => {
                    const secs = parseInt(e.target.value) || 0;
                    const mins = Math.floor(workoutDuration / 60);
                    setWorkoutDuration(mins * 60 + secs);
                  }}
                  label="Seconds"
                  size="small"
                  sx={{ width: 100 }}
                />
                <Button
                  size="small"
                  onClick={() => setEditingDuration(false)}
                  sx={{ ...primaryBtnSx }}
                >
                  Done
                </Button>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h5" sx={{ fontWeight: 600, color: appColors.blue }}>
                  {formatTime(workoutDuration)}
                </Typography>
                <Button
                  size="small"
                  onClick={() => setEditingDuration(true)}
                  sx={{ ...outlinedBtnSx }}
                >
                  Edit
                </Button>
              </Box>
            )}
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ color: appColors.textSecondary, mb: 1 }}>
              Estimated Calories Burned
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 600, color: appColors.success }}>
              {Math.round((workoutDuration / 60) * 6)} cal
            </Typography>
            <Typography variant="caption" sx={{ color: appColors.textSecondary }}>
              Based on 6 cal/min for strength training
            </Typography>
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={{ color: appColors.textSecondary, mb: 1 }}>
              Exercises Completed
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 600, color: appColors.textPrimary }}>
              {exercises.filter(e => e.completed).length} / {exercises.length} exercises
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button
            onClick={() => {
              setShowSummaryDialog(false);
              setEditingDuration(false);
            }}
            sx={{ ...outlinedBtnSx }}
          >
            Continue Workout
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveWorkout}
            sx={{ ...primaryBtnSx }}
          >
            Save & Finish
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default WorkoutTracker;
