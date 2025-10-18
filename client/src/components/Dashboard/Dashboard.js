import React, { useState, useEffect, useMemo } from 'react';
import {
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Box,
  Button,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Divider,
  CircularProgress,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { Link } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import { format } from 'date-fns';
import RestaurantIcon from '@mui/icons-material/Restaurant';

function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [dailyLogs, setDailyLogs] = useState([]);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Get today's date in YYYY-MM-DD format
  const today = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

  useEffect(() => {
    const fetchTodayLogs = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, 'daily_food_log'),
          where('date_eaten', '==', today)
        );
        
        const logSnapshot = await getDocs(q);
        const logList = logSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setDailyLogs(logList);
      } catch (error) {
        console.error("Error fetching daily logs: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTodayLogs();
  }, [today]);

  // Calculate daily summary
  const dailySummary = useMemo(() => {
    return dailyLogs.reduce((acc, log) => {
      return {
        calories: acc.calories + log.calories,
        protein: acc.protein + log.protein,
        carbs: acc.carbs + log.carbs,
        fat: acc.fat + log.fat
      };
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
  }, [dailyLogs]);

  // Simplified targets
  const targets = { calories: 2000, protein: 150, carbs: 250, fat: 70 };

  return (
    <div>
      <Typography variant="h5" component="h1" gutterBottom>
        Today's Overview
      </Typography>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress size={30} />
        </Box>
      ) : (
        <>
          {dailyLogs.length > 0 ? (
            <>
              <Card sx={{ mb: 3 }}>
                <CardContent sx={{ p: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="subtitle2" color="textSecondary">
                        Calories
                      </Typography>
                      <Typography variant={isMobile ? "h6" : "h5"}>
                        {dailySummary.calories.toFixed(0)}
                      </Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={Math.min((dailySummary.calories / targets.calories) * 100, 100)} 
                        sx={{ mt: 1 }}
                      />
                      <Typography variant="caption" color="textSecondary">
                        {Math.round((dailySummary.calories / targets.calories) * 100)}% of {targets.calories}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="subtitle2" color="textSecondary">
                        Protein
                      </Typography>
                      <Typography variant={isMobile ? "h6" : "h5"}>
                        {dailySummary.protein.toFixed(1)}g
                      </Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={Math.min((dailySummary.protein / targets.protein) * 100, 100)}
                        color="success" 
                        sx={{ mt: 1 }}
                      />
                      <Typography variant="caption" color="textSecondary">
                        {Math.round((dailySummary.protein / targets.protein) * 100)}% of {targets.protein}g
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="subtitle2" color="textSecondary">
                        Carbs
                      </Typography>
                      <Typography variant={isMobile ? "h6" : "h5"}>
                        {dailySummary.carbs.toFixed(1)}g
                      </Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={Math.min((dailySummary.carbs / targets.carbs) * 100, 100)}
                        color="warning" 
                        sx={{ mt: 1 }}
                      />
                      <Typography variant="caption" color="textSecondary">
                        {Math.round((dailySummary.carbs / targets.carbs) * 100)}% of {targets.carbs}g
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="subtitle2" color="textSecondary">
                        Fat
                      </Typography>
                      <Typography variant={isMobile ? "h6" : "h5"}>
                        {dailySummary.fat.toFixed(1)}g
                      </Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={Math.min((dailySummary.fat / targets.fat) * 100, 100)}
                        color="error" 
                        sx={{ mt: 1 }}
                      />
                      <Typography variant="caption" color="textSecondary">
                        {Math.round((dailySummary.fat / targets.fat) * 100)}% of {targets.fat}g
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              <Typography variant="subtitle1" gutterBottom>
                Today's Food ({dailyLogs.length} items)
              </Typography>

              <List sx={{ bgcolor: 'background.paper', mb: 3 }} component={Paper}>
                {dailyLogs.map((log) => (
                  <React.Fragment key={log.id}>
                    <ListItem>
                      <ListItemText
                        primary={log.food_name}
                        secondary={
                          `${log.quantity} ${log.unit} | ${log.calories.toFixed(0)} cal | P:${log.protein.toFixed(1)}g | C:${log.carbs.toFixed(1)}g | F:${log.fat.toFixed(1)}g`
                        }
                      />
                    </ListItem>
                    <Divider />
                  </React.Fragment>
                ))}
              </List>

              <Button 
                component={Link}
                to="/daily-log"
                variant="contained" 
                color="primary" 
                fullWidth
              >
                Add More Food
              </Button>
            </>
          ) : (
            <Paper sx={{ p: 4, textAlign: 'center', my: 4 }}>
              <RestaurantIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                No meals logged for today
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                Start tracking your nutrition by adding your first meal of the day.
              </Typography>
              <Button 
                component={Link}
                to="/daily-log"
                variant="contained" 
                color="primary" 
                sx={{ mt: 2 }}
              >
                Add Your First Meal
              </Button>
            </Paper>
          )}
        </>
      )}
    </div>
  );
}

export default React.memo(Dashboard);