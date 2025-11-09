import React, { useState, useEffect, useCallback } from 'react';
import {
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  Divider,
  CircularProgress,
  useMediaQuery,
  useTheme,
  Button
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { collection, query, where, getDocs, limit, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';
import { useAuth } from '../Auth/AuthContext';

// Only import the specific components needed to reduce bundle size
import {
  ResponsiveContainer,
  BarChart, Bar,
  LineChart, Line,
  XAxis, YAxis,
  Tooltip, Legend
} from 'recharts';

function ReportPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState('month'); // Changed default from 'week' to 'month'
  const [tabValue, setTabValue] = useState(0);
  const [weightTabValue, setWeightTabValue] = useState(0); // Separate tab state for weight tracking
  // Changed default to last 30 days instead of just current week
  const [startDate, setStartDate] = useState(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState(new Date());
  const [dailyData, setDailyData] = useState([]);
  const [weightData, setWeightData] = useState([]);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { currentUser } = useAuth();

  // Handle period change - memoized callback
  const handlePeriodChange = useCallback((event) => {
    const newPeriod = event.target.value;
    setPeriod(newPeriod);
    
    if (newPeriod === 'week') {
      setStartDate(subDays(new Date(), 7));
      setEndDate(new Date());
    } else if (newPeriod === 'month') {
      setStartDate(subDays(new Date(), 30));
      setEndDate(new Date());
    }
  }, []);

  // Helper function to process query results
  const processResults = useCallback((logSnapshot) => {
    const logs = logSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Group by date
    const dailyLogs = logs.reduce((acc, log) => {
      if (!acc[log.date_eaten]) {
        acc[log.date_eaten] = {
          date: log.date_eaten,
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0
        };
      }
      
      // Coerce to numbers and guard against missing fields
      acc[log.date_eaten].calories += Number(log.calories) || 0;
      acc[log.date_eaten].protein += Number(log.protein) || 0;
      acc[log.date_eaten].carbs += Number(log.carbs) || 0;
      acc[log.date_eaten].fat += Number(log.fat) || 0;
      
      return acc;
    }, {});
    
    // Convert to array and sort by date
    const dailyDataArray = Object.values(dailyLogs).sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );
    
    setDailyData(dailyDataArray);
  }, []);

  // Memoized fetch function
  const fetchReportData = useCallback(async () => {
    if (!startDate || !endDate || !currentUser) return;
    
    setLoading(true);
    setError("");
    
    try {
      // First, check if we have any logs at all for this user (requires no complex index)
      const checkQ = query(
        collection(db, 'daily_food_log'),
        where('userId', '==', currentUser.uid),
        limit(1)
      );
      
      const checkSnapshot = await getDocs(checkQ);
      console.log("User has any logs:", !checkSnapshot.empty);
      
      // Use the same date string format as DailyLog (UTC ISO date) to avoid timezone mismatches
      const startDateStr = new Date(startDate).toISOString().split('T')[0];
      const endDateStr = new Date(endDate).toISOString().split('T')[0];      // Try the simplified approach with backup strategy
      let querySucceeded = false;
      try {
        // Approach 1: Optimized with index - userId first, then date range filter
        const q = query(
          collection(db, 'daily_food_log'),
          where('userId', '==', currentUser.uid),
          where('date_eaten', '>=', startDateStr),
          where('date_eaten', '<=', endDateStr)
        );
        
        const logSnapshot = await getDocs(q);
        console.log("Main query returned entries:", logSnapshot.size);
        
        // If we got results, use them
        if (logSnapshot.size > 0) {
          processResults(logSnapshot);
          querySucceeded = true;
        }
      } catch (indexError) {
        console.log("Index-optimized query failed, falling back:", indexError);
        // We'll continue to the fallback approach
      }
      
      // Fallback approach: Get all user logs first, then filter by date in memory
      // Only run if the first query didn't succeed
      if (!querySucceeded) {
        console.log("Using fallback query approach");
        const fallbackQ = query(
          collection(db, 'daily_food_log'),
          where('userId', '==', currentUser.uid)
        );
        
        // This is our final query that we'll use for processing
        // Bug fix: We were using 'q' here but it's undefined in the fallback case.
        // We should be using fallbackQ instead.
        const logSnapshot = await getDocs(fallbackQ);
        
        // For debugging: Show the query parameters and returned logs
        console.log("Report query:", { 
          startDate: startDateStr, 
          endDate: endDateStr, 
          userId: currentUser.uid,
          resultsCount: logSnapshot.size
        });
        
        // Filter logs by date manually
        const logs = logSnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
          .filter(log => {
            return log.date_eaten >= startDateStr && log.date_eaten <= endDateStr;
          });
        
        console.log("Filtered log entries:", logs);
        
        // Process the filtered logs using our common function
        if (logs.length > 0) {
          // Convert logs to a snapshot-like structure for processResults
          const filteredSnapshot = {
            docs: logs.map(log => ({
              id: log.id,
              data: () => log
            }))
          };
          processResults(filteredSnapshot);
        } else {
          setDailyData([]);
        }
      }
    } catch (error) {
      console.error("Error fetching report data: ", error);
      // Surface a friendly message when common Firestore index error occurs
      const msg = (error?.message || "");
      const code = error?.code || "";
      
      console.log("Error details:", { message: msg, code });
      
      if (msg.includes("FAILED_PRECONDITION") || msg.includes("index") || msg.includes("requires an index")) {
        setError(`Reports query requires a Firestore composite index. We've added and deployed it, but you may need to refresh or restart the app. Error: ${code}`);
      } else {
        setError(`Could not load report data: ${msg.substring(0, 100)}`);
      }
    } finally {
      setLoading(false);
    }
    
    // Now fetch weight data for the same period
    try {
      console.log('Fetching weight data for user:', currentUser.uid, 'from', startDate, 'to', endDate);
      
      // Directly access the date string values used for the food log query
      // This ensures we're using the exact same date format for both queries
      const startDateStr = new Date(startDate).toISOString().split('T')[0];
      const endDateStr = new Date(endDate).toISOString().split('T')[0];
      
      console.log('Using date strings:', startDateStr, endDateStr);
      
      // Get all weight entries for the current user first
      const weightQuery = query(
        collection(db, 'weights'),
        where('userId', '==', currentUser.uid)
      );
      
      const weightSnapshot = await getDocs(weightQuery);
      console.log('Found', weightSnapshot.size, 'total weight entries for user');
      
      // Process weight data
      const allWeights = [];
      weightSnapshot.forEach(doc => {
        const data = doc.data();
        
        try {
          if (data.date && typeof data.date.toDate === 'function') {
            const dateObj = data.date.toDate();
            // Format the date as YYYY-MM-DD to match the food log format
            const calculatedDateStr = dateObj.toISOString().split('T')[0];
            
            // Use the dateStr from DB if available, otherwise use calculated one
            const finalDateStr = data.dateStr || calculatedDateStr;
            
            allWeights.push({
              id: doc.id,
              date: dateObj,
              dateStr: finalDateStr, // Use DB dateStr if available, otherwise calculated
              weight: data.weight,
              formattedDate: format(dateObj, 'MMM d')
            });
            
            console.log('Processed weight entry:', doc.id, 
                       'dateStr:', finalDateStr, 
                       '(from DB:', data.dateStr ? 'YES' : 'NO, calculated', ')');
          } else {
            console.warn('Invalid date format in weight entry:', data);
          }
        } catch (e) {
          console.warn('Failed to process weight entry:', e, data);
        }
      });
      
      console.log('========================================');
      console.log('Processed weight entries:', allWeights.length);
      console.log('Filter date range:', startDateStr, 'to', endDateStr);
      console.log('========================================');
      
      // First try filtering using the dateStr field
      let filteredWeights = allWeights.filter(entry => {
        if (entry.dateStr) {
          const isInRange = entry.dateStr >= startDateStr && entry.dateStr <= endDateStr;
          console.log('Checking weight entry:', 
                     'dateStr:', entry.dateStr, 
                     'weight:', entry.weight,
                     'isInRange:', isInRange);
          return isInRange;
        }
        console.warn('Weight entry missing dateStr:', entry);
        return false;
      });
      
      console.log('========================================');
      console.log('Filter result: Found', filteredWeights.length, 'entries');
      console.log('========================================');
      
      // If no results with dateStr field, fall back to timestamp-based filtering
      if (filteredWeights.length === 0) {
        console.log('No weight entries found with dateStr, falling back to date-based filtering');
        
        // Create date objects with time set to beginning and end of day
        const startDateObj = new Date(startDate);
        startDateObj.setHours(0, 0, 0, 0);
        
        const endDateObj = new Date(endDate);
        endDateObj.setHours(23, 59, 59, 999);
        
        // Get timestamps for cleaner comparison
        const startTimestamp = startDateObj.getTime();
        const endTimestamp = endDateObj.getTime();
        
        console.log('Using timestamp range:', startTimestamp, 'to', endTimestamp);
        
        // Filter by timestamp comparison
        filteredWeights = allWeights.filter(entry => {
          if (!entry.date) return false;
          
          // Convert date to timestamp for comparison
          const entryTimestamp = entry.date.getTime();
          const isInRange = entryTimestamp >= startTimestamp && entryTimestamp <= endTimestamp;
          
          console.log('Entry date:', entry.date.toISOString(), 
                     'timestamp:', entryTimestamp, 
                     'isInRange:', isInRange);
          
          return isInRange;
        });
      }
      
      // Sort by date
      filteredWeights.sort((a, b) => a.date.getTime() - b.date.getTime());
      
      console.log(`Found ${filteredWeights.length} weight entries for selected date range`);
      setWeightData(filteredWeights);
      
      // If we have weight data but it's not showing, try to find the problem
      if (allWeights.length > 0 && filteredWeights.length === 0) {
        console.log('No weights in range, checking all date strings:');
        allWeights.forEach(entry => {
          console.log(`Weight entry date: ${entry.dateStr}, In range: ${entry.dateStr >= startDateStr && entry.dateStr <= endDateStr}`);
        });
        
        // Expand date range by 1 day in each direction as a fallback
        const expandedStartDate = new Date(startDate);
        expandedStartDate.setDate(expandedStartDate.getDate() - 1);
        const expandedStartStr = expandedStartDate.toISOString().split('T')[0];
        
        const expandedEndDate = new Date(endDate);
        expandedEndDate.setDate(expandedEndDate.getDate() + 1);
        const expandedEndStr = expandedEndDate.toISOString().split('T')[0];
        
        console.log('Expanded date range:', expandedStartStr, 'to', expandedEndStr);
        
        const expandedFilteredWeights = allWeights.filter(entry => {
          return entry.dateStr >= expandedStartStr && entry.dateStr <= expandedEndStr;
        });
        
        if (expandedFilteredWeights.length > 0) {
          console.log(`Found ${expandedFilteredWeights.length} weights with expanded date range`);
          expandedFilteredWeights.sort((a, b) => a.date.getTime() - b.date.getTime());
          setWeightData(expandedFilteredWeights);
        }
      }
    } catch (error) {
      console.error("Error fetching weight data: ", error);
      console.error('Error details:', error.code, error.message);
      // We don't set the main error since weight data is supplementary
    }
  }, [startDate, endDate, currentUser, processResults]);

  // Debug function to check all weight entries in the database
  const debugWeightData = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      const weightCollection = collection(db, 'weights');
      const weightQuery = query(
        weightCollection,
        where('userId', '==', currentUser.uid)
      );
      
      const snapshot = await getDocs(weightQuery);
      console.log('========================================');
      console.log('=== WEIGHT DATA DEBUG ===');
      console.log('========================================');
      console.log(`Total weight entries found: ${snapshot.size}`);
      console.log(`Current user ID: ${currentUser.uid}`);
      
      if (snapshot.size > 0) {
        const entries = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          if (data.date && typeof data.date.toDate === 'function') {
            const date = data.date.toDate();
            const dateStr = date.toISOString().split('T')[0];
            entries.push({
              id: doc.id,
              weight: data.weight,
              date: date,
              dateStr: data.dateStr || dateStr,
              formattedDate: format(date, 'MMM d, yyyy')
            });
            console.log(`\nEntry ${doc.id}:`);
            console.log(`  Weight: ${data.weight} kg`);
            console.log(`  Date: ${date.toISOString()}`);
            console.log(`  DateStr in DB: ${data.dateStr || 'NOT SET'}`);
            console.log(`  Calculated DateStr: ${dateStr}`);
            console.log(`  Formatted: ${format(date, 'MMM d, yyyy')}`);
          } else {
            console.log(`\nInvalid entry ${doc.id}:`, JSON.stringify(data));
          }
        });
        
        // Sort and show date range
        entries.sort((a, b) => a.date - b.date);
        if (entries.length > 0) {
          console.log(`\n--- DATE RANGE SUMMARY ---`);
          console.log(`Earliest entry: ${entries[0].formattedDate}`);
          console.log(`Latest entry: ${entries[entries.length - 1].formattedDate}`);
          console.log(`\nChecking for October 9-12, 2025 entries:`);
          const octEntries = entries.filter(e => 
            e.dateStr >= '2025-10-09' && e.dateStr <= '2025-10-12'
          );
          console.log(`Found ${octEntries.length} entries in Oct 9-12 range`);
          octEntries.forEach(e => console.log(`  - ${e.formattedDate}: ${e.weight} kg`));
        }
      } else {
        console.log('NO WEIGHT ENTRIES FOUND IN DATABASE!');
        console.log('Please add weight entries using the Weight Log page.');
      }
      console.log('========================================');
      console.log('=== END DEBUG ===');
      console.log('========================================');
    } catch (error) {
      console.error('Debug error:', error);
    }
  }, [currentUser]);

  // Fetch data when period or dates change
  useEffect(() => {
    fetchReportData();
    // Run debug function to check all weight entries
    debugWeightData();
  }, [period, startDate, endDate, fetchReportData, currentUser, debugWeightData]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleWeightTabChange = (event, newValue) => {
    setWeightTabValue(newValue);
  };

  // Calculate averages - more efficient calculation
  const averages = React.useMemo(() => {
    if (dailyData.length === 0) {
      return { calories: 0, protein: 0, carbs: 0, fat: 0 };
    }
    
    const totals = dailyData.reduce((acc, day) => {
      return {
        calories: acc.calories + day.calories,
        protein: acc.protein + day.protein,
        carbs: acc.carbs + day.carbs,
        fat: acc.fat + day.fat
      };
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
    
    return {
      calories: totals.calories / dailyData.length,
      protein: totals.protein / dailyData.length,
      carbs: totals.carbs / dailyData.length,
      fat: totals.fat / dailyData.length
    };
  }, [dailyData]);

  // Simplified chart data with fewer data points for mobile
  const chartData = React.useMemo(() => {
    if (isMobile && dailyData.length > 7) {
      // For mobile, if we have more than 7 days, we'll show fewer points
      const step = Math.ceil(dailyData.length / 7);
      return dailyData
        .filter((_, i) => i % step === 0)
        .map(day => ({
          date: format(new Date(day.date), 'M/d'),
          calories: Number(day.calories),
          protein: Number(day.protein),
          carbs: Number(day.carbs),
          fat: Number(day.fat)
        }));
    }
    
    return dailyData.map(day => ({
      date: format(new Date(day.date), isMobile ? 'M/d' : 'MMM d'),
      calories: Number(day.calories),
      protein: Number(day.protein),
      carbs: Number(day.carbs),
      fat: Number(day.fat)
    }));
  }, [dailyData, isMobile]);

  return (
    <div>
      <Typography variant="h5" component="h1" gutterBottom>
        Nutrition Reports
      </Typography>

      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <FormControl fullWidth size="small" margin="dense">
          <InputLabel id="period-select-label">Time Period</InputLabel>
          <Select
            labelId="period-select-label"
            value={period}
            label="Time Period"
            onChange={handlePeriodChange}
          >
            <MenuItem value="week">Last 7 Days</MenuItem>
            <MenuItem value="month">Last 30 Days</MenuItem>
            <MenuItem value="custom">Custom Range</MenuItem>
          </Select>
        </FormControl>
          
        {period === 'custom' && (
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Start Date"
                  value={startDate}
                  onChange={setStartDate}
                  renderInput={(params) => 
                    <Box sx={{ width: '100%' }}>{params.input}</Box>
                  }
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="End Date"
                  value={endDate}
                  onChange={setEndDate}
                  renderInput={(params) => 
                    <Box sx={{ width: '100%' }}>{params.input}</Box>
                  }
                />
              </LocalizationProvider>
            </Grid>
          </Grid>
        )}
      </Paper>

      {!!error && (
        <Box sx={{ mb: 2 }}>
          <Paper elevation={0} sx={{ p: 2, bgcolor: 'error.light' }}>
            <Typography variant="body2" color="error.main">{error}</Typography>
          </Paper>
        </Box>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
          <CircularProgress size={30} />
        </Box>
      ) : (
        <>
          <Grid container spacing={2}>
            <Grid item xs={6} sm={3}>
              <Card>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Avg. Calories
                  </Typography>
                  <Typography variant={isMobile ? "h6" : "h5"} component="div">
                    {averages.calories.toFixed(0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Avg. Protein
                  </Typography>
                  <Typography variant={isMobile ? "h6" : "h5"} component="div">
                    {averages.protein.toFixed(1)}g
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Avg. Carbs
                  </Typography>
                  <Typography variant={isMobile ? "h6" : "h5"} component="div">
                    {averages.carbs.toFixed(1)}g
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Avg. Fat
                  </Typography>
                  <Typography variant={isMobile ? "h6" : "h5"} component="div">
                    {averages.fat.toFixed(1)}g
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Box sx={{ mt: 3, mb: 2 }}>
            <Tabs 
              value={tabValue} 
              onChange={handleTabChange} 
              variant="fullWidth"
              sx={{ borderBottom: 1, borderColor: 'divider' }}
            >
              <Tab label="Calories" />
              <Tab label="Macros" />
              <Tab label="Data" />
            </Tabs>

            {tabValue === 0 && chartData.length > 0 && (
              <Box sx={{ mt: 2, height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                  >
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      padding={{ left: 10, right: 10 }}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      width={30}
                    />
                    <Tooltip 
                      formatter={(value) => [Math.round(value), "Calories"]}
                      contentStyle={{ 
                        fontSize: '11px', 
                        padding: '5px 8px',
                        borderRadius: '3px',
                      }}
                      itemStyle={{ 
                        padding: '1px 0',
                        fontSize: '11px',
                      }}
                      labelStyle={{ 
                        fontSize: '10px',
                        padding: '0 0 2px 0',
                        marginBottom: '2px'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="calories" 
                      stroke="#8884d8" 
                      name="Calories" 
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            )}

            {tabValue === 1 && chartData.length > 0 && (
              <Box sx={{ mt: 2, height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                    barSize={isMobile ? 10 : 20}
                  >
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      scale="point"
                      padding={{ left: 10, right: 10 }}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      width={30}
                    />
                    <Tooltip 
                      formatter={(value, name) => [Math.round(value), name]}
                      contentStyle={{ 
                        fontSize: '11px', 
                        padding: '5px 8px',
                        borderRadius: '3px',
                      }}
                      itemStyle={{ 
                        padding: '1px 0',
                        fontSize: '11px',
                      }}
                      labelStyle={{ 
                        fontSize: '10px',
                        padding: '0 0 2px 0',
                        marginBottom: '2px'
                      }}
                    />
                    <Legend />
                    <Bar dataKey="protein" fill="#8884d8" name="Protein" />
                    <Bar dataKey="carbs" fill="#82ca9d" name="Carbs" />
                    <Bar dataKey="fat" fill="#ff8042" name="Fat" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            )}

            {tabValue === 2 && (
              <List sx={{ bgcolor: 'background.paper', mt: 2 }} component={Paper}>
                {dailyData.map((day) => (
                  <React.Fragment key={day.date}>
                    <ListItem>
                      <ListItemText
                        primary={format(new Date(day.date), 'MMM d, yyyy')}
                        secondary={
                          `Calories: ${Math.round(day.calories)} | P: ${Math.round(day.protein)}g | C: ${Math.round(day.carbs)}g | F: ${Math.round(day.fat)}g`
                        }
                      />
                    </ListItem>
                    <Divider />
                  </React.Fragment>
                ))}
                {dailyData.length === 0 && (
                  <ListItem>
                    <ListItemText primary="No data for this period" />
                  </ListItem>
                )}
              </List>
            )}
          </Box>
        </>
      )}

      {/* Weight Tracking Section */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" component="h2" gutterBottom>
          Weight Tracking
        </Typography>

        <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
          {loading && <LinearProgress />}
          
          {weightData.length > 0 ? (
            <>
              <Tabs 
                value={weightTabValue} 
                onChange={handleWeightTabChange} 
                variant="fullWidth"
                sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
              >
                <Tab label="Chart" />
                <Tab label="Data Table" />
              </Tabs>

              {/* Tab 0: Chart View */}
              {weightTabValue === 0 && (
                <Box sx={{ height: 300, pt: 2 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={weightData.map(item => ({
                        date: item.formattedDate,
                        weight: item.weight,
                        rawDate: item.date.toString() // For debugging
                      }))}
                      margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                    >
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12 }}
                        padding={{ left: 10, right: 10 }}
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }}
                        width={40}
                        domain={['dataMin - 1', 'dataMax + 1']}
                      />
                      <Tooltip 
                        formatter={(value, name, props) => {
                          if (name === 'weight') {
                            return [`${value.toFixed(2)} kg`, 'Weight'];
                          }
                          return [value, name];
                        }}
                        labelFormatter={(label, items) => {
                          const item = items[0]?.payload;
                          if (item) {
                            return label;
                          }
                          return label;
                        }}
                        contentStyle={{ 
                          fontSize: '12px',
                          padding: '8px',
                          borderRadius: '4px'
                        }}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="weight" 
                        stroke="#ff5722" 
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                        name="Weight (kg)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              )}

              {/* Tab 1: Data Table */}
              {weightTabValue === 1 && (
                <Box sx={{ mt: 2 }}>
                  <List>
                    {weightData.map((entry, index) => (
                      <React.Fragment key={entry.id}>
                        <ListItem>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="body1">
                                  {format(entry.date, 'EEEE, MMM d, yyyy')}
                                </Typography>
                                <Typography variant="h6" color="primary">
                                  {entry.weight.toFixed(2)} kg
                                </Typography>
                              </Box>
                            }
                            secondary={
                              <Box sx={{ mt: 1 }}>
                                <Typography variant="body2" color="textSecondary">
                                  {format(entry.date, 'h:mm a')}
                                </Typography>
                              </Box>
                            }
                          />
                        </ListItem>
                        {index < weightData.length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                </Box>
              )}
            </>
          ) : (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography color="textSecondary">
                No weight data available for this period. Add entries in the Weight Log.
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                Current date range: {format(new Date(startDate), 'MMM d, yyyy')} - {format(new Date(endDate), 'MMM d, yyyy')}
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5, fontSize: '0.75rem' }}>
                Date strings: {new Date(startDate).toISOString().split('T')[0]} to {new Date(endDate).toISOString().split('T')[0]}
              </Typography>
              
              {/* Debug button to add a weight entry for today - Only shown in development */}
              {process.env.NODE_ENV === 'development' && (
                <Box sx={{ mt: 2 }}>
                  <Button 
                    variant="outlined" 
                    color="secondary"
                    size="small"
                    onClick={async () => {
                      try {
                        if (!currentUser) return;
                        
                        const today = new Date();
                        const dateStr = today.toISOString().split('T')[0];
                        
                        const weightData = {
                          userId: currentUser.uid,
                          weight: 70 + Math.random() * 5, // Random weight between 70-75
                          date: Timestamp.fromDate(today),
                          dateStr: dateStr
                        };
                        
                        console.log('Adding debug weight entry:', weightData);
                        await addDoc(collection(db, 'weights'), weightData);
                        console.log('Added debug weight entry with dateStr:', dateStr);
                        
                        // Refresh data
                        fetchReportData();
                      } catch (error) {
                        console.error('Error adding debug weight:', error);
                      }
                    }}
                  >
                    Add Test Weight for Today
                  </Button>
                </Box>
              )}
            </Box>
          )}
        </Paper>
      </Box>
    </div>
  );
}

// Use memo to prevent unnecessary re-renders
export default React.memo(ReportPage);
