import React, { useState, useEffect, useCallback } from 'react';
import {
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  Box,
  Alert,
  Container,
  InputAdornment,
  Card,
  CardContent,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { collection, addDoc, updateDoc, deleteDoc, doc, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { useAuth } from '../Auth/AuthContext';
import { db } from '../../firebase/firebase';
import { format, subDays } from 'date-fns';

const WeightLogPage = () => {
  const { currentUser } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weight, setWeight] = useState('');
  const [savedWeights, setSavedWeights] = useState([]);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isLoading, setIsLoading] = useState(false);

  // Define fetchWeightData with useCallback to prevent unnecessary re-renders
  const fetchWeightData = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      // Query that explicitly filters by userId (required by security rules)
      const weightCollection = collection(db, 'weights');
      
      console.log('Executing weight query with userId filter:', currentUser.uid);
      
      // Create a query that matches our security rule requirements
      const weightQuery = query(
        weightCollection,
        where('userId', '==', currentUser.uid),
        // Note: We're not filtering by date in the query since our rules only allow userId filtering
        // We'll filter by date client-side
      );

      const weightSnapshot = await getDocs(weightQuery);
      const weights = [];
      
      console.log('Query results count:', weightSnapshot.size);
      
      weightSnapshot.forEach(doc => {
        const data = doc.data();
        console.log('Found weight document:', doc.id, data);
        
        // Safely handle date conversion
        let dateObj;
        try {
          dateObj = data.date.toDate();
        } catch (e) {
          console.warn('Failed to convert date, using current date instead');
          dateObj = new Date();
        }
        
      weights.push({
        id: doc.id,
        ...data,
        date: dateObj
      });
    });
    
    // Calculate date range: last 7 days
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    
    const startDate = subDays(endDate, 7);
    startDate.setHours(0, 0, 0, 0);
    
    console.log('Filtering weights for last 7 days:', startDate, 'to', endDate);
    
    // Filter weights to show last 7 days
    const filteredWeights = weights.filter(weight => {
      const isInRange = weight.date >= startDate && weight.date <= endDate;
      console.log('Weight entry date:', weight.date, 'isInRange:', isInRange);
      return isInRange;
    });
    
    // Sort by date descending (most recent first)
    filteredWeights.sort((a, b) => b.date - a.date);
    
    console.log('Filtered weights for last 7 days:', filteredWeights.length);
    setSavedWeights(filteredWeights);
    
    // Get the selected date as YYYY-MM-DD string for checking if entry exists for selected date
    const selectedDateStr = new Date(selectedDate).toISOString().split('T')[0];
    
    // Pre-fill the weight input if there's already a weight entry for the selected date
    const selectedDateEntry = filteredWeights.find(w => {
      const entryDateStr = w.dateStr || w.date.toISOString().split('T')[0];
      return entryDateStr === selectedDateStr;
    });
    
    if (selectedDateEntry) {
      setWeight(selectedDateEntry.weight.toString());
    } else {
      setWeight('');
    }      // Clear any error status if the query was successful
      setStatus({ type: '', message: '' });
    } catch (error) {
      console.error('Error fetching weight data:', error);
      console.error('Error details:', error.code, error.message);
      setStatus({
        type: 'error',
        message: `Failed to load weight data: ${error.message || 'Unknown error'}`
      });
    }
  }, [currentUser, selectedDate]);
  
  // Fetch data when component mounts or dependencies change
  useEffect(() => {
    if (currentUser) {
      console.log('Fetching weight data for user:', currentUser.uid, 'date:', selectedDate);
      fetchWeightData();
    }
  }, [currentUser, selectedDate, fetchWeightData]);

  const handleDateChange = (newDate) => {
    setSelectedDate(newDate);
  };

  const handleWeightChange = (e) => {
    const value = e.target.value;
    // Allow only numbers with up to 2 decimal places
    if (value === '' || /^\d+(\.\d{0,2})?$/.test(value)) {
      setWeight(value);
    }
  };

  const handleSave = async () => {
    if (!weight) {
      setStatus({
        type: 'error',
        message: 'Please enter your weight'
      });
      return;
    }

    try {
      setIsLoading(true);
      
      // Create a Date object that is set to noon on the selected day to avoid timezone issues
      const dateToStore = new Date(selectedDate);
      dateToStore.setHours(12, 0, 0, 0);
      
      // Add dateStr field with YYYY-MM-DD format to make filtering consistent with food logs
      const dateStr = dateToStore.toISOString().split('T')[0];
      
      const weightData = {
        userId: currentUser.uid,
        weight: parseFloat(weight),
        date: Timestamp.fromDate(dateToStore),
        dateStr: dateStr // Store date as string for consistent filtering
      };
      
      console.log('Saving weight data:', weightData);
      console.log('Date in YYYY-MM-DD format:', dateStr);
      
      // Check if there's already an entry for this date
      const existingEntry = savedWeights.find(w => w.dateStr === dateStr);
      
      if (existingEntry) {
        // Update existing entry
        const docRef = doc(db, 'weights', existingEntry.id);
        await updateDoc(docRef, {
          weight: parseFloat(weight),
          date: Timestamp.fromDate(dateToStore)
        });
        console.log('Weight updated successfully for:', dateStr);
        
        setStatus({
          type: 'success',
          message: 'Weight updated successfully!'
        });
      } else {
        // Add new document to the weights collection
        const docRef = await addDoc(collection(db, 'weights'), weightData);
        console.log('Weight saved successfully with ID:', docRef.id);
        
        setStatus({
          type: 'success',
          message: 'Weight saved successfully!'
        });
      }
      
      // Refresh the weight data
      await fetchWeightData();
      
      // Clear weight input after successful save
      setWeight('');
    } catch (error) {
      console.error('Error saving weight:', error);
      console.error('Error details:', error.code, error.message);
      
      let errorMessage = 'Failed to save weight. ';
      
      if (error.code === 'permission-denied') {
        errorMessage += 'You do not have permission to add weight entries.';
      } else if (error.message) {
        errorMessage += error.message;
      } else {
        errorMessage += 'Please try again.';
      }
      
      setStatus({
        type: 'error',
        message: errorMessage
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setWeight('');
    setStatus({ type: '', message: '' });
  };

  const handleDelete = async (weightId) => {
    if (!window.confirm('Are you sure you want to delete this weight entry?')) {
      return;
    }

    try {
      setIsLoading(true);
      
      const docRef = doc(db, 'weights', weightId);
      await deleteDoc(docRef);
      
      console.log('Weight deleted successfully:', weightId);
      
      setStatus({
        type: 'success',
        message: 'Weight entry deleted successfully!'
      });
      
      // Refresh the weight data
      await fetchWeightData();
      
      // Clear weight input
      setWeight('');
    } catch (error) {
      console.error('Error deleting weight:', error);
      setStatus({
        type: 'error',
        message: 'Failed to delete weight entry. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (weightEntry) => {
    setWeight(weightEntry.weight.toString());
    setStatus({
      type: 'info',
      message: 'Editing entry. Click Save to update or Cancel to discard changes.'
    });
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Weight Log
      </Typography>

      <Paper sx={{ p: 3, mb: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Date"
                value={selectedDate}
                onChange={handleDateChange}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </LocalizationProvider>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Weight"
              type="number"
              value={weight}
              onChange={handleWeightChange}
              fullWidth
              InputProps={{
                endAdornment: <InputAdornment position="end">kg</InputAdornment>,
              }}
              inputProps={{
                step: 0.01,
                min: 0
              }}
            />
          </Grid>
          <Grid item xs={12}>
            {status.message && (
              <Alert severity={status.type} sx={{ mb: 2 }}>
                {status.message}
              </Alert>
            )}
            <Box display="flex" justifyContent="flex-end" gap={2}>
              <Button
                variant="outlined"
                color="secondary"
                onClick={handleCancel}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                color="primary"
                onClick={handleSave}
                disabled={isLoading}
              >
                Save
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {savedWeights.length > 0 && (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" component="h2" gutterBottom>
              Weight History - Last 7 Days
            </Typography>
            <List>
              {savedWeights.map((entry, index) => (
                <React.Fragment key={entry.id}>
                  <ListItem
                    secondaryAction={
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <IconButton 
                          edge="end" 
                          aria-label="edit"
                          onClick={() => handleEdit(entry)}
                          color="primary"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton 
                          edge="end" 
                          aria-label="delete"
                          onClick={() => handleDelete(entry.id)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    }
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                          <Typography variant="h6" component="span">
                            {entry.weight.toFixed(2)} kg
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {format(entry.date, 'MMM d, yyyy')}
                          </Typography>
                        </Box>
                      }
                      secondary={format(entry.date, 'h:mm a')}
                    />
                  </ListItem>
                  {index < savedWeights.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
        Track your weight progress over time. Your data will be displayed on the Reports page.
      </Typography>
    </Container>
  );
};

export default WeightLogPage;