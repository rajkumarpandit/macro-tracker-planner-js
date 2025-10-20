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
  useTheme
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
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
  const [period, setPeriod] = useState('week');
  const [tabValue, setTabValue] = useState(0);
  const [startDate, setStartDate] = useState(startOfWeek(new Date()));
  const [endDate, setEndDate] = useState(new Date());
  const [dailyData, setDailyData] = useState([]);
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
          return;
        }
      } catch (indexError) {
        console.log("Index-optimized query failed, falling back:", indexError);
        // We'll continue to the fallback approach
      }
      
      // Fallback approach: Get all user logs first, then filter by date in memory
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
  }, [startDate, endDate, currentUser, processResults]);

  // Fetch data when period or dates change
  useEffect(() => {
    fetchReportData();
  }, [period, startDate, endDate, fetchReportData, currentUser]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
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
    </div>
  );
}

// Use memo to prevent unnecessary re-renders
export default React.memo(ReportPage);
