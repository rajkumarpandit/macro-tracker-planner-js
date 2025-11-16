import React, { useState, useEffect, useCallback } from 'react';
import {
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  Box,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  Divider,
  IconButton,
  Snackbar,
  CircularProgress
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { collection, addDoc, updateDoc, deleteDoc, doc, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { useAuth } from '../Auth/AuthContext';
import { db } from '../../firebase/firebase';
import { format } from 'date-fns';
import { FIREBASE_COLLECTIONS } from '../../config/constants';
import Footer from '../Common/Footer';

const ACTIVITY_TYPES = [
  { value: 'walking', label: 'Walking (Step Count)', unit: 'steps' },
  { value: 'gym', label: 'Gym (Exercising/Weight Lifting)', unit: 'minutes' },
  { value: 'running', label: 'Running (Outside/Treadmill)', unit: 'minutes' },
  { value: 'swimming', label: 'Swimming', unit: 'minutes' },
  { value: 'basketball', label: 'Playing Basketball', unit: 'minutes' },
  { value: 'badminton', label: 'Playing Badminton', unit: 'minutes' },
  { value: 'cricket', label: 'Playing Cricket', unit: 'minutes' },
  { value: 'other', label: 'Other Activity', unit: 'minutes' }
];

// Approximate calories burned per unit (these are estimates)
const CALORIES_PER_UNIT = {
  walking: 0.04, // per step
  gym: 5.5, // per minute
  running: 10, // per minute
  swimming: 8, // per minute
  basketball: 7, // per minute
  badminton: 6, // per minute
  cricket: 5, // per minute
  other: 5 // per minute
};

function CaloriesBurntPage() {
  const { currentUser } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activityType, setActivityType] = useState('');
  const [duration, setDuration] = useState('');
  const [caloriesBurnt, setCaloriesBurnt] = useState('');
  const [notes, setNotes] = useState('');
  const [activities, setActivities] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Get today's date in YYYY-MM-DD format
  const getDateStr = (date) => format(date, 'yyyy-MM-dd');

  // Fetch activities for selected date
  const fetchActivities = useCallback(async () => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      const dateStr = getDateStr(selectedDate);
      const q = query(
        collection(db, FIREBASE_COLLECTIONS.CALORIES_BURNT_LOG),
        where('userId', '==', currentUser.uid),
        where('dateStr', '==', dateStr)
      );
      
      const snapshot = await getDocs(q);
      const activityList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Sort by creation time
      activityList.sort((a, b) => {
        const timeA = a.createdAt?.toDate?.() || new Date(0);
        const timeB = b.createdAt?.toDate?.() || new Date(0);
        return timeB - timeA;
      });
      
      setActivities(activityList);
    } catch (error) {
      console.error('Error fetching activities:', error);
      setMessage({ text: 'Error loading activities', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [currentUser, selectedDate]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // Auto-calculate calories when activity type or duration changes
  useEffect(() => {
    if (activityType && duration) {
      const durationNum = parseFloat(duration);
      if (durationNum > 0) {
        const estimated = Math.round(durationNum * CALORIES_PER_UNIT[activityType]);
        setCaloriesBurnt(estimated.toString());
      }
    }
  }, [activityType, duration]);

  const handleSave = async () => {
    if (!activityType || !duration || !caloriesBurnt) {
      setMessage({ text: 'Please fill in all required fields', type: 'error' });
      return;
    }

    const durationNum = parseFloat(duration);
    const caloriesNum = parseFloat(caloriesBurnt);

    if (durationNum <= 0 || caloriesNum <= 0) {
      setMessage({ text: 'Duration and calories must be greater than 0', type: 'error' });
      return;
    }

    try {
      setLoading(true);
      const dateStr = getDateStr(selectedDate);
      const activityData = {
        userId: currentUser.uid,
        dateStr: dateStr,
        activityType: activityType,
        duration: durationNum,
        caloriesBurnt: caloriesNum,
        notes: notes.trim(),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      if (editingId) {
        // Update existing activity
        await updateDoc(doc(db, FIREBASE_COLLECTIONS.CALORIES_BURNT_LOG, editingId), {
          ...activityData,
          createdAt: undefined // Don't update createdAt
        });
        setMessage({ text: 'Activity updated successfully!', type: 'success' });
      } else {
        // Add new activity
        await addDoc(collection(db, FIREBASE_COLLECTIONS.CALORIES_BURNT_LOG), activityData);
        setMessage({ text: 'Activity added successfully!', type: 'success' });
      }

      // Clear form
      handleCancel();
      
      // Refresh list
      fetchActivities();
    } catch (error) {
      console.error('Error saving activity:', error);
      setMessage({ text: 'Error saving activity: ' + error.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setActivityType('');
    setDuration('');
    setCaloriesBurnt('');
    setNotes('');
    setEditingId(null);
  };

  const handleEdit = (activity) => {
    setActivityType(activity.activityType);
    setDuration(activity.duration.toString());
    setCaloriesBurnt(activity.caloriesBurnt.toString());
    setNotes(activity.notes || '');
    setEditingId(activity.id);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this activity?')) {
      return;
    }

    try {
      setLoading(true);
      await deleteDoc(doc(db, FIREBASE_COLLECTIONS.CALORIES_BURNT_LOG, id));
      setMessage({ text: 'Activity deleted successfully!', type: 'success' });
      fetchActivities();
    } catch (error) {
      console.error('Error deleting activity:', error);
      setMessage({ text: 'Error deleting activity', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const getTotalCaloriesBurnt = () => {
    return activities.reduce((sum, activity) => sum + activity.caloriesBurnt, 0);
  };

  const getActivityLabel = (type) => {
    const activity = ACTIVITY_TYPES.find(a => a.value === type);
    return activity ? activity.label : type;
  };

  const getActivityUnit = (type) => {
    const activity = ACTIVITY_TYPES.find(a => a.value === type);
    return activity ? activity.unit : 'minutes';
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f7fa', pb: 2 }}>
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        {/* Header */}
        <Box sx={{ 
          background: 'linear-gradient(135deg, #66bb6a 0%, #4caf50 100%)',
          p: { xs: 2, sm: 2.5 },
          mb: 2,
          borderRadius: 2,
          boxShadow: '0 4px 12px rgba(102, 187, 106, 0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: 1.5
        }}>
          <LocalFireDepartmentIcon sx={{ fontSize: { xs: 28, sm: 36 }, color: 'white' }} />
          <Typography variant="h5" component="h1" sx={{ color: 'white', fontWeight: 600, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
            Calories Burnt Log
          </Typography>
        </Box>

        {/* Input Form */}
        <Paper elevation={0} sx={{ p: { xs: 1.5, sm: 2 }, mb: 2, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <Grid container spacing={1.5}>
            <Grid item xs={12} sm={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Date"
                  value={selectedDate}
                  onChange={setSelectedDate}
                  slotProps={{ 
                    textField: { 
                      fullWidth: true,
                      size: 'small',
                      sx: {
                        borderRadius: 1.5,
                        '& .MuiOutlinedInput-root': {
                          '&:hover fieldset': { borderColor: '#667eea' },
                          '&.Mui-focused fieldset': { borderColor: '#667eea' }
                        }
                      }
                    } 
                  }}
                />
              </LocalizationProvider>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Activity Type *</InputLabel>
                <Select
                  value={activityType}
                  label="Activity Type *"
                  onChange={(e) => setActivityType(e.target.value)}
                  sx={{
                    borderRadius: 1.5,
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#667eea' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#667eea' }
                  }}
                >
                  {ACTIVITY_TYPES.map(activity => (
                    <MenuItem key={activity.value} value={activity.value}>
                      {activity.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={6} sm={4}>
              <TextField
                label={`Duration (${activityType ? getActivityUnit(activityType) : 'unit'}) *`}
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                fullWidth
                size="small"
                inputProps={{ min: 0, step: activityType === 'walking' ? 100 : 1 }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1.5,
                    '&:hover fieldset': { borderColor: '#667eea' },
                    '&.Mui-focused fieldset': { borderColor: '#667eea' }
                  }
                }}
              />
            </Grid>

            <Grid item xs={6} sm={4}>
              <TextField
                label="Calories Burnt * (auto)"
                type="number"
                value={caloriesBurnt}
                onChange={(e) => setCaloriesBurnt(e.target.value)}
                fullWidth
                size="small"
                inputProps={{ min: 0, step: 1 }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1.5,
                    '&:hover fieldset': { borderColor: '#667eea' },
                    '&.Mui-focused fieldset': { borderColor: '#667eea' }
                  }
                }}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                label="Notes (Optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                fullWidth
                size="small"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1.5,
                    '&:hover fieldset': { borderColor: '#667eea' },
                    '&.Mui-focused fieldset': { borderColor: '#667eea' }
                  }
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
                {editingId && (
                  <Button
                    variant="outlined"
                    onClick={handleCancel}
                    sx={{
                      textTransform: 'none',
                      borderRadius: 2,
                      px: 3,
                      fontSize: { xs: '0.85rem', sm: '0.95rem' },
                      borderColor: '#9e9e9e',
                      color: '#616161',
                      '&:hover': {
                        borderColor: '#757575',
                        bgcolor: 'rgba(0,0,0,0.04)'
                      }
                    }}
                  >
                    Cancel
                  </Button>
                )}
                <Button
                  variant="contained"
                  onClick={handleSave}
                  disabled={loading}
                  sx={{
                    textTransform: 'none',
                    borderRadius: 2,
                    px: 3,
                    fontSize: { xs: '0.85rem', sm: '0.95rem' },
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #5568d3 0%, #633d8a 100%)',
                    }
                  }}
                >
                  {editingId ? 'Update Activity' : 'Add Activity'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* Activities List */}
        {loading && activities.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress sx={{ color: '#667eea' }} />
          </Box>
        ) : (
          <>
            {/* Summary */}
            {activities.length > 0 && (
              <Box sx={{ 
                p: { xs: 1.5, sm: 2 }, 
                bgcolor: 'white', 
                borderRadius: 2, 
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                mb: 2,
                textAlign: 'center'
              }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                  Total Calories Burnt Today
                </Typography>
                <Typography variant="h5" sx={{ fontSize: { xs: '1.5rem', sm: '2rem' }, fontWeight: 600, color: '#f44336', mt: 0.5 }}>
                  {getTotalCaloriesBurnt()} cal
                </Typography>
              </Box>
            )}

            {/* Activities List */}
            <Box sx={{ p: { xs: 1.5, sm: 2 }, bgcolor: 'white', borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
              <Typography variant="body2" fontWeight="600" color="#667eea" gutterBottom sx={{ fontSize: { xs: '0.9rem', sm: '1rem' }, mb: 1.5 }}>
                Activities for {format(selectedDate, 'MMM d, yyyy')} ({activities.length})
              </Typography>

              {activities.length === 0 ? (
                <Alert severity="info" sx={{ borderRadius: 1.5 }}>
                  No activities logged for this date. Add your first activity above!
                </Alert>
              ) : (
                <List sx={{ p: 0 }}>
                  {activities.map((activity, index) => (
                    <React.Fragment key={activity.id}>
                      <ListItem 
                        sx={{ px: 0 }}
                        secondaryAction={
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <IconButton 
                              size="small"
                              onClick={() => handleEdit(activity)}
                              sx={{ color: '#667eea' }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton 
                              size="small"
                              onClick={() => handleDelete(activity.id)}
                              sx={{ color: '#ef5350' }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        }
                      >
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, flexWrap: 'wrap' }}>
                              <Typography variant="body1" component="span" sx={{ fontSize: { xs: '0.9rem', sm: '1rem' }, fontWeight: 600 }}>
                                {getActivityLabel(activity.activityType)}
                              </Typography>
                              <Typography variant="h6" component="span" sx={{ fontSize: { xs: '1rem', sm: '1.1rem' }, fontWeight: 600, color: '#f44336' }}>
                                {activity.caloriesBurnt} cal
                              </Typography>
                            </Box>
                          }
                          secondary={
                            <>
                              <Typography component="span" variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.85rem' }, display: 'block' }}>
                                {activity.duration} {getActivityUnit(activity.activityType)}
                              </Typography>
                              {activity.notes && (
                                <Typography component="span" variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.85rem' }, fontStyle: 'italic', display: 'block', mt: 0.5 }}>
                                  Note: {activity.notes}
                                </Typography>
                              )}
                            </>
                          }
                        />
                      </ListItem>
                      {index < activities.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </Box>
          </>
        )}
      </Box>

      {/* Snackbar for messages */}
      <Snackbar
        open={message.text !== ''}
        autoHideDuration={message.type === 'success' ? 4000 : null}
        onClose={(event, reason) => {
          if (reason === 'clickaway') return;
          if (message.type === 'success') {
            setMessage({ text: '', type: '' });
          }
        }}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setMessage({ text: '', type: '' })}
          severity={message.type}
          sx={{ width: '100%' }}
        >
          {message.text}
        </Alert>
      </Snackbar>
      
      <Footer />
    </Box>
  );
}

export default CaloriesBurntPage;
