import React, { useState, useEffect, useCallback } from 'react';
import {
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  Box,
  Alert,
  InputAdornment,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Divider,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { collection, addDoc, updateDoc, deleteDoc, doc, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { useAuth } from '../Auth/AuthContext';
import { db } from '../../firebase/firebase';
import { format, subDays } from 'date-fns';
import Footer from '../Common/Footer';

const WeightLogPage = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState(0); // 0: Weight, 1: Biceps, 2: Waist, 3: Chest, 4: Hips
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weight, setWeight] = useState('');
  const [biceps, setBiceps] = useState('');
  const [waist, setWaist] = useState('');
  const [chest, setChest] = useState('');
  const [hips, setHips] = useState('');
  const [bicepsUnit, setBicepsUnit] = useState('cm');
  const [waistUnit, setWaistUnit] = useState('cm');
  const [chestUnit, setChestUnit] = useState('inch');
  const [hipsUnit, setHipsUnit] = useState('inch');
  const [savedMetrics, setSavedMetrics] = useState([]);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isLoading, setIsLoading] = useState(false);

  // Get current collection name based on active tab
  const getCollectionName = () => {
    switch (activeTab) {
      case 0: return 'weights';
      case 1: return 'biceps';
      case 2: return 'waist';
      case 3: return 'chest';
      case 4: return 'hips';
      default: return 'weights';
    }
  };

  // Get current metric type for display
  const getMetricType = () => {
    switch (activeTab) {
      case 0: return 'weight';
      case 1: return 'biceps';
      case 2: return 'waist';
      case 3: return 'chest';
      case 4: return 'hips';
      default: return 'weight';
    }
  };

  // Define fetchMetricData with useCallback to prevent unnecessary re-renders
  const fetchMetricData = useCallback(async () => {
    if (!currentUser) return;
    
    const collectionName = getCollectionName();
    const metricType = getMetricType();
    
    try {
      // Query from the appropriate collection based on metric type
      const metricsCollection = collection(db, collectionName);
      
      console.log(`Executing ${metricType} query with userId filter:`, currentUser.uid);
      
      // Create a query that matches our security rule requirements
      const metricsQuery = query(
        metricsCollection,
        where('userId', '==', currentUser.uid)
      );

      const metricsSnapshot = await getDocs(metricsQuery);
      const metrics = [];
      
      console.log('Query results count:', metricsSnapshot.size);
      
      metricsSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`Found ${metricType} document:`, doc.id, data);
        
        // Safely handle date conversion
        let dateObj;
        try {
          dateObj = data.date.toDate();
        } catch (e) {
          console.warn('Failed to convert date, using current date instead');
          dateObj = new Date();
        }
        
        // Normalize the data structure - weight uses 'weight' field, biceps/waist use 'value' field
        const normalizedData = {
          id: doc.id,
          ...data,
          date: dateObj,
          value: metricType === 'weight' ? data.weight : data.value
        };
        
        metrics.push(normalizedData);
      });
    
      // Calculate date range: last 7 days
      const endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
      
      const startDate = subDays(endDate, 7);
      startDate.setHours(0, 0, 0, 0);
      
      console.log(`Filtering ${metricType} for last 7 days:`, startDate, 'to', endDate);
      
      // Filter metrics to show last 7 days
      const filteredMetrics = metrics.filter(metric => {
        const isInRange = metric.date >= startDate && metric.date <= endDate;
        console.log(`${metricType} entry date:`, metric.date, 'isInRange:', isInRange);
        return isInRange;
      });
      
      // Sort by date descending (most recent first)
      filteredMetrics.sort((a, b) => b.date - a.date);
      
      console.log(`Filtered ${metricType} for last 7 days:`, filteredMetrics.length);
      setSavedMetrics(filteredMetrics);
    
    // Get the selected date as YYYY-MM-DD string for checking if entry exists for selected date
    const selectedDateStr = new Date(selectedDate).toISOString().split('T')[0];
    
    // Pre-fill the input if there's already an entry for the selected date
    const selectedDateEntry = filteredMetrics.find(m => {
      const entryDateStr = m.dateStr || m.date.toISOString().split('T')[0];
      return entryDateStr === selectedDateStr;
    });
    
    if (selectedDateEntry) {
      switch (metricType) {
        case 'weight':
          setWeight(selectedDateEntry.value.toString());
          break;
        case 'biceps':
          setBiceps(selectedDateEntry.value.toString());
          setBicepsUnit(selectedDateEntry.unit || 'cm');
          break;
        case 'waist':
          setWaist(selectedDateEntry.value.toString());
          setWaistUnit(selectedDateEntry.unit || 'cm');
          break;
        case 'chest':
          setChest(selectedDateEntry.value.toString());
          setChestUnit(selectedDateEntry.unit || 'inch');
          break;
        case 'hips':
          setHips(selectedDateEntry.value.toString());
          setHipsUnit(selectedDateEntry.unit || 'inch');
          break;
        default:
          break;
      }
    } else {
      // Clear inputs if no entry exists for selected date
      switch (metricType) {
        case 'weight':
          setWeight('');
          break;
        case 'biceps':
          setBiceps('');
          break;
        case 'waist':
          setWaist('');
          break;
        case 'chest':
          setChest('');
          break;
        case 'hips':
          setHips('');
          break;
        default:
          break;
      }
    }      // Clear any error status if the query was successful
      setStatus({ type: '', message: '' });
    } catch (error) {
      console.error(`Error fetching ${metricType} data:`, error);
      console.error('Error details:', error.code, error.message);
      setStatus({
        type: 'error',
        message: `Failed to load ${metricType} data: ${error.message || 'Unknown error'}`
      });
    }
  }, [currentUser, selectedDate, activeTab]);
  
  // Fetch data when component mounts or dependencies change
  useEffect(() => {
    if (currentUser) {
      console.log(`Fetching ${getMetricType()} data for user:`, currentUser.uid, 'date:', selectedDate);
      fetchMetricData();
    }
  }, [currentUser, selectedDate, activeTab, fetchMetricData]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setStatus({ type: '', message: '' });
  };

  const handleDateChange = (newDate) => {
    setSelectedDate(newDate);
  };

  const handleValueChange = (e) => {
    const value = e.target.value;
    // Allow only numbers with up to 2 decimal places
    if (value === '' || /^\d+(\.\d{0,2})?$/.test(value)) {
      switch (activeTab) {
        case 0:
          setWeight(value);
          break;
        case 1:
          setBiceps(value);
          break;
        case 2:
          setWaist(value);
          break;
        case 3:
          setChest(value);
          break;
        case 4:
          setHips(value);
          break;
        default:
          break;
      }
    }
  };

  const getCurrentValue = () => {
    switch (activeTab) {
      case 0: return weight;
      case 1: return biceps;
      case 2: return waist;
      case 3: return chest;
      case 4: return hips;
      default: return '';
    }
  };

  const getCurrentUnit = () => {
    switch (activeTab) {
      case 0: return 'kg';
      case 1: return bicepsUnit;
      case 2: return waistUnit;
      case 3: return chestUnit;
      case 4: return hipsUnit;
      default: return '';
    }
  };

  const getMetricLabel = () => {
    switch (activeTab) {
      case 0: return 'Weight';
      case 1: return 'Biceps';
      case 2: return 'Waist';
      case 3: return 'Chest';
      case 4: return 'Hips';
      default: return 'Metric';
    }
  };

  const handleSave = async () => {
    const collectionName = getCollectionName();
    const metricType = getMetricType();
    const currentValue = getCurrentValue();
    
    if (!currentValue) {
      setStatus({
        type: 'error',
        message: `Please enter your ${getMetricLabel().toLowerCase()}`
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
      
      let metricData;
      
      // Weight uses original structure (no metricType field, uses 'weight' field)
      if (metricType === 'weight') {
        metricData = {
          userId: currentUser.uid,
          weight: parseFloat(currentValue),
          date: Timestamp.fromDate(dateToStore),
          dateStr: dateStr
        };
      } else {
        // Biceps and waist use 'value' and 'unit' fields
        metricData = {
          userId: currentUser.uid,
          value: parseFloat(currentValue),
          unit: getCurrentUnit(),
          date: Timestamp.fromDate(dateToStore),
          dateStr: dateStr
        };
      }
      
      console.log(`Saving ${metricType} data:`, metricData);
      console.log('Date in YYYY-MM-DD format:', dateStr);
      
      // Check if there's already an entry for this date
      const existingEntry = savedMetrics.find(m => m.dateStr === dateStr);
      
      if (existingEntry) {
        // Update existing entry
        const docRef = doc(db, collectionName, existingEntry.id);
        let updateData;
        
        if (metricType === 'weight') {
          updateData = {
            weight: parseFloat(currentValue),
            date: Timestamp.fromDate(dateToStore)
          };
        } else {
          updateData = {
            value: parseFloat(currentValue),
            unit: getCurrentUnit(),
            date: Timestamp.fromDate(dateToStore)
          };
        }
        
        await updateDoc(docRef, updateData);
        console.log(`${metricType} updated successfully for:`, dateStr);
        
        setStatus({
          type: 'success',
          message: `${getMetricLabel()} updated successfully!`
        });
      } else {
        // Add new document to the appropriate collection
        const docRef = await addDoc(collection(db, collectionName), metricData);
        console.log(`${metricType} saved successfully with ID:`, docRef.id);
        
        setStatus({
          type: 'success',
          message: `${getMetricLabel()} saved successfully!`
        });
      }
      
      // Refresh the metric data
      await fetchMetricData();
      
      // Clear input after successful save
      switch (activeTab) {
        case 0:
          setWeight('');
          break;
        case 1:
          setBiceps('');
          break;
        case 2:
          setWaist('');
          break;
        case 3:
          setChest('');
          break;
        case 4:
          setHips('');
          break;
        default:
          break;
      }
    } catch (error) {
      console.error(`Error saving ${metricType}:`, error);
      console.error('Error details:', error.code, error.message);
      
      let errorMessage = `Failed to save ${metricType}. `;
      
      if (error.code === 'permission-denied') {
        errorMessage += `You do not have permission to add ${metricType} entries.`;
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
    switch (activeTab) {
      case 0:
        setWeight('');
        break;
      case 1:
        setBiceps('');
        break;
      case 2:
        setWaist('');
        break;
      case 3:
        setChest('');
        break;
      case 4:
        setHips('');
        break;
      default:
        break;
    }
    setStatus({ type: '', message: '' });
  };

  const handleDelete = async (metricId) => {
    const collectionName = getCollectionName();
    const metricType = getMetricType();
    
    if (!window.confirm(`Are you sure you want to delete this ${metricType} entry?`)) {
      return;
    }

    try {
      setIsLoading(true);
      
      const docRef = doc(db, collectionName, metricId);
      await deleteDoc(docRef);
      
      console.log(`${metricType} deleted successfully:`, metricId);
      
      setStatus({
        type: 'success',
        message: `${getMetricLabel()} entry deleted successfully!`
      });
      
      // Refresh the metric data
      await fetchMetricData();
      
      // Clear input
      switch (activeTab) {
        case 0:
          setWeight('');
          break;
        case 1:
          setBiceps('');
          break;
        case 2:
          setWaist('');
          break;
        default:
          break;
      }
    } catch (error) {
      console.error(`Error deleting ${metricType}:`, error);
      setStatus({
        type: 'error',
        message: `Failed to delete ${metricType} entry. Please try again.`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (metricEntry) => {
    const metricType = getMetricType();
    
    switch (metricType) {
      case 'weight':
        setWeight(metricEntry.value.toString());
        break;
      case 'biceps':
        setBiceps(metricEntry.value.toString());
        setBicepsUnit(metricEntry.unit || 'cm');
        break;
      case 'waist':
        setWaist(metricEntry.value.toString());
        setWaistUnit(metricEntry.unit || 'cm');
        break;
      case 'chest':
        setChest(metricEntry.value.toString());
        setChestUnit(metricEntry.unit || 'inch');
        break;
      case 'hips':
        setHips(metricEntry.value.toString());
        setHipsUnit(metricEntry.unit || 'inch');
        break;
      default:
        break;
    }
    
    setSelectedDate(metricEntry.date);
    setStatus({
      type: 'info',
      message: 'Editing entry. Click Save to update or Cancel to discard changes.'
    });
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f7fa', pb: 2 }}>
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        {/* Header */}
        <Box sx={{ 
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          mb: 2
        }}>
          <FitnessCenterIcon sx={{ fontSize: { xs: 28, sm: 36 }, color: 'primary.main' }} />
          <Typography variant="h5" component="h1" sx={{ color: 'text.primary', fontWeight: 600, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
            Body Parameter Log
          </Typography>
        </Box>

        {/* Tabs */}
        <Paper elevation={0} sx={{ mb: 2, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange}
            variant="fullWidth"
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontSize: { xs: '0.85rem', sm: '0.95rem' },
                fontWeight: 500,
                py: 2
              },
              '& .MuiTabs-indicator': {
                backgroundColor: '#4caf50',
                height: 3
              },
              '& .Mui-selected': {
                color: '#4caf50 !important',
                fontWeight: 600
              }
            }}
          >
            <Tab label="Weight" />
            <Tab label="Biceps" />
            <Tab label="Waist" />
            <Tab label="Chest" />
            <Tab label="Hips" />
          </Tabs>
        </Paper>

      <Paper elevation={0} sx={{ p: { xs: 1.5, sm: 2 }, mb: 2, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <Grid container spacing={1.5}>
          <Grid item xs={12} sm={6}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Date"
                value={selectedDate}
                onChange={handleDateChange}
                slotProps={{ 
                  textField: { 
                    fullWidth: true,
                    size: 'small',
                    sx: {
                      borderRadius: 1.5,
                      '& .MuiOutlinedInput-root': {
                        '&:hover fieldset': { borderColor: '#4caf50' },
                        '&.Mui-focused fieldset': { borderColor: '#4caf50' }
                      }
                    }
                  } 
                }}
              />
            </LocalizationProvider>
          </Grid>
          
          {/* Weight Tab Input */}
          {activeTab === 0 && (
            <Grid item xs={12} sm={6}>
              <TextField
                label="Weight"
                type="number"
                value={weight}
                onChange={handleValueChange}
                fullWidth
                size="small"
                InputProps={{
                  endAdornment: <InputAdornment position="end">kg</InputAdornment>,
                }}
                inputProps={{
                  step: 0.01,
                  min: 0
                }}
                sx={{
                  borderRadius: 1.5,
                  '& .MuiOutlinedInput-root': {
                    '&:hover fieldset': { borderColor: '#4caf50' },
                    '&.Mui-focused fieldset': { borderColor: '#4caf50' }
                  }
                }}
              />
            </Grid>
          )}

          {/* Biceps Tab Input */}
          {activeTab === 1 && (
            <>
              <Grid item xs={8} sm={4}>
                <TextField
                  label="Biceps"
                  type="number"
                  value={biceps}
                  onChange={handleValueChange}
                  fullWidth
                  size="small"
                  inputProps={{
                    step: 0.01,
                    min: 0
                  }}
                  sx={{
                    borderRadius: 1.5,
                    '& .MuiOutlinedInput-root': {
                      '&:hover fieldset': { borderColor: '#4caf50' },
                      '&.Mui-focused fieldset': { borderColor: '#4caf50' }
                    }
                  }}
                />
              </Grid>
              <Grid item xs={4} sm={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Unit</InputLabel>
                  <Select
                    value={bicepsUnit}
                    onChange={(e) => setBicepsUnit(e.target.value)}
                    label="Unit"
                    sx={{
                      borderRadius: 1.5,
                      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#4caf50' },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#4caf50' }
                    }}
                  >
                    <MenuItem value="cm">cm</MenuItem>
                    <MenuItem value="inch">inch</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </>
          )}

          {/* Waist Tab Input */}
          {activeTab === 2 && (
            <>
              <Grid item xs={8} sm={4}>
                <TextField
                  label="Waist"
                  type="number"
                  value={waist}
                  onChange={handleValueChange}
                  fullWidth
                  size="small"
                  inputProps={{
                    step: 0.01,
                    min: 0
                  }}
                  sx={{
                    borderRadius: 1.5,
                    '& .MuiOutlinedInput-root': {
                      '&:hover fieldset': { borderColor: '#4caf50' },
                      '&.Mui-focused fieldset': { borderColor: '#4caf50' }
                    }
                  }}
                />
              </Grid>
              <Grid item xs={4} sm={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Unit</InputLabel>
                  <Select
                    value={waistUnit}
                    onChange={(e) => setWaistUnit(e.target.value)}
                    label="Unit"
                    sx={{
                      borderRadius: 1.5,
                      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#4caf50' },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#4caf50' }
                    }}
                  >
                    <MenuItem value="cm">cm</MenuItem>
                    <MenuItem value="inch">inch</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </>
          )}

          {/* Chest Tab Input */}
          {activeTab === 3 && (
            <>
              <Grid item xs={8} sm={4}>
                <TextField
                  label="Chest"
                  type="number"
                  value={chest}
                  onChange={handleValueChange}
                  fullWidth
                  size="small"
                  inputProps={{
                    step: 0.01,
                    min: 0
                  }}
                  sx={{
                    borderRadius: 1.5,
                    '& .MuiOutlinedInput-root': {
                      '&:hover fieldset': { borderColor: '#4caf50' },
                      '&.Mui-focused fieldset': { borderColor: '#4caf50' }
                    }
                  }}
                />
              </Grid>
              <Grid item xs={4} sm={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Unit</InputLabel>
                  <Select
                    value={chestUnit}
                    onChange={(e) => setChestUnit(e.target.value)}
                    label="Unit"
                    sx={{
                      borderRadius: 1.5,
                      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#4caf50' },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#4caf50' }
                    }}
                  >
                    <MenuItem value="cm">cm</MenuItem>
                    <MenuItem value="inch">inch</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </>
          )}

          {/* Hips Tab Input */}
          {activeTab === 4 && (
            <>
              <Grid item xs={8} sm={4}>
                <TextField
                  label="Hips"
                  type="number"
                  value={hips}
                  onChange={handleValueChange}
                  fullWidth
                  size="small"
                  inputProps={{
                    step: 0.01,
                    min: 0
                  }}
                  sx={{
                    borderRadius: 1.5,
                    '& .MuiOutlinedInput-root': {
                      '&:hover fieldset': { borderColor: '#4caf50' },
                      '&.Mui-focused fieldset': { borderColor: '#4caf50' }
                    }
                  }}
                />
              </Grid>
              <Grid item xs={4} sm={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Unit</InputLabel>
                  <Select
                    value={hipsUnit}
                    onChange={(e) => setHipsUnit(e.target.value)}
                    label="Unit"
                    sx={{
                      borderRadius: 1.5,
                      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#4caf50' },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#4caf50' }
                    }}
                  >
                    <MenuItem value="cm">cm</MenuItem>
                    <MenuItem value="inch">inch</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </>
          )}

          <Grid item xs={12}>
            {status.message && (
              <Alert severity={status.type} sx={{ mb: 1.5, borderRadius: 1.5, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                {status.message}
              </Alert>
            )}
            <Box display="flex" justifyContent="flex-end" gap={1.5}>
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
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={isLoading}
                sx={{
                  textTransform: 'none',
                  borderRadius: 2,
                  px: 3,
                  fontSize: { xs: '0.85rem', sm: '0.95rem' },
                  background: 'linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5568d3 0%, #633d8a 100%)',
                  }
                }}
              >
                Save
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {savedMetrics.length > 0 && (
        <Box sx={{ p: { xs: 1.5, sm: 2 }, bgcolor: 'white', borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', mb: 2 }}>
          <Typography variant="body2" fontWeight="600" color="#4caf50" gutterBottom sx={{ fontSize: { xs: '0.9rem', sm: '1rem' }, mb: 1.5 }}>
            {getMetricLabel()} History - Last 7 Days
          </Typography>
          <List sx={{ p: 0 }}>
            {savedMetrics.map((entry, index) => (
              <React.Fragment key={entry.id}>
                <ListItem
                  sx={{ px: 0 }}
                  secondaryAction={
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <IconButton 
                        size="small"
                        aria-label="edit"
                        onClick={() => handleEdit(entry)}
                        sx={{ color: '#4caf50' }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton 
                        size="small"
                        aria-label="delete"
                        onClick={() => handleDelete(entry.id)}
                        sx={{ color: '#ef5350' }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  }
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                        <Typography variant="h6" component="span" sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' }, fontWeight: 600, color: '#4caf50' }}>
                          {entry.value.toFixed(2)} {entry.unit || 'kg'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                          {format(entry.date, 'MMM d, yyyy')}
                        </Typography>
                      </Box>
                    }
                    secondary={format(entry.date, 'h:mm a')}
                    secondaryTypographyProps={{
                      fontSize: { xs: '0.75rem', sm: '0.85rem' }
                    }}
                  />
                </ListItem>
                {index < savedMetrics.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </Box>
      )}

      <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' }, mt: 1 }}>
        Track your body metrics progress over time. Your data will be displayed on the Reports page.
      </Typography>
      </Box>
      <Footer />
    </Box>
  );
};

export default WeightLogPage;
