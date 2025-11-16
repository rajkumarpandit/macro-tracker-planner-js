import React, { useState, useEffect, useMemo } from 'react';
import {
  Typography,
  Paper,
  Grid,
  Box,
  Button,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Divider,
  CircularProgress
} from '@mui/material';
import { Link } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import { format } from 'date-fns';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import DashboardIcon from '@mui/icons-material/Dashboard';
import { useAuth } from '../Auth/AuthContext';
import { fetchUserMacroTargets } from '../../utils/macroTargetUtils';
import { FIREBASE_COLLECTIONS } from '../../config/constants';
import Footer from '../Common/Footer';

function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [dailyLogs, setDailyLogs] = useState([]);
  const [caloriesBurntLogs, setCaloriesBurntLogs] = useState([]);
  const [targets, setTargets] = useState({ calories: 2000, protein: 140, carbs: 200, fat: 100 });
  const { currentUser } = useAuth();
  
  // Get today's date in YYYY-MM-DD format
  const today = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

  useEffect(() => {
    const fetchTodayLogs = async () => {
      if (!currentUser) return;
      
      setLoading(true);
      try {
        // Fetch food logs
        const foodQuery = query(
          collection(db, FIREBASE_COLLECTIONS.DAILY_FOOD_LOG),
          where('date_eaten', '==', today),
          where('userId', '==', currentUser.uid)
        );
        
        const foodSnapshot = await getDocs(foodQuery);
        const foodList = foodSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setDailyLogs(foodList);

        // Fetch calories burnt logs
        const burntQuery = query(
          collection(db, FIREBASE_COLLECTIONS.CALORIES_BURNT_LOG),
          where('dateStr', '==', today),
          where('userId', '==', currentUser.uid)
        );
        
        const burntSnapshot = await getDocs(burntQuery);
        const burntList = burntSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setCaloriesBurntLogs(burntList);
      } catch (error) {
        console.error("Error fetching daily logs: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTodayLogs();
  }, [today, currentUser]);

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

  // Calculate total calories burnt
  const totalCaloriesBurnt = useMemo(() => {
    return caloriesBurntLogs.reduce((sum, log) => sum + log.caloriesBurnt, 0);
  }, [caloriesBurntLogs]);

  // Calculate net calories (consumed - burnt)
  const netCalories = dailySummary.calories - totalCaloriesBurnt;

  // Fetch user's macro targets
  useEffect(() => {
    const loadTargets = async () => {
      if (!currentUser) return;
      const userTargets = await fetchUserMacroTargets(currentUser.uid);
      setTargets(userTargets);
    };
    loadTargets();
  }, [currentUser]);

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
          <DashboardIcon sx={{ fontSize: { xs: 28, sm: 36 }, color: 'white' }} />
          <Typography variant="h5" component="h1" sx={{ color: 'white', fontWeight: 600, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
            Today's Overview
          </Typography>
        </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress size={30} sx={{ color: '#667eea' }} />
        </Box>
      ) : (
        <>
          {dailyLogs.length > 0 || caloriesBurntLogs.length > 0 ? (
            <>
              {/* Calories Summary */}
              <Box sx={{ p: { xs: 1.5, sm: 2 }, bgcolor: 'white', borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', mb: 2 }}>
                <Typography variant="body2" fontWeight="600" color="#667eea" gutterBottom sx={{ fontSize: { xs: '0.9rem', sm: '1rem' }, mb: 1.5 }}>
                  Calories Summary
                </Typography>
                <Grid container spacing={1.5}>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                      Consumed
                    </Typography>
                    <Typography variant="h6" sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' }, fontWeight: 600, color: '#4caf50' }}>
                      {dailySummary.calories.toFixed(0)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                      cal
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                      Burnt
                    </Typography>
                    <Typography variant="h6" sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' }, fontWeight: 600, color: '#f44336' }}>
                      {totalCaloriesBurnt.toFixed(0)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                      cal
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                      Net
                    </Typography>
                    <Typography variant="h6" sx={{ 
                      fontSize: { xs: '1.1rem', sm: '1.25rem' }, 
                      fontWeight: 600, 
                      color: netCalories >= 0 ? '#667eea' : '#ff9800'
                    }}>
                      {netCalories >= 0 ? '+' : ''}{netCalories.toFixed(0)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                      cal
                    </Typography>
                  </Grid>
                </Grid>
              </Box>

              {dailyLogs.length > 0 && (
                <>
              <Box sx={{ p: { xs: 1.5, sm: 2 }, bgcolor: 'white', borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', mb: 2 }}>
                  <Grid container spacing={1.5}>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                        Calories
                      </Typography>
                      <Typography variant="h6" sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' }, fontWeight: 600, color: '#667eea' }}>
                        {dailySummary.calories.toFixed(0)}
                      </Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={Math.min((dailySummary.calories / targets.calories) * 100, 100)} 
                        sx={{ mt: 1, height: 6, borderRadius: 3, bgcolor: '#e8eaf6', '& .MuiLinearProgress-bar': { bgcolor: '#667eea' } }}
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                        {Math.round((dailySummary.calories / targets.calories) * 100)}% of {targets.calories}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                        Protein
                      </Typography>
                      <Typography variant="h6" sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' }, fontWeight: 600, color: '#667eea' }}>
                        {dailySummary.protein.toFixed(1)}g
                      </Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={Math.min((dailySummary.protein / targets.protein) * 100, 100)}
                        sx={{ mt: 1, height: 6, borderRadius: 3, bgcolor: '#e8f5e9', '& .MuiLinearProgress-bar': { bgcolor: '#4caf50' } }}
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                        {Math.round((dailySummary.protein / targets.protein) * 100)}% of {targets.protein}g
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                        Carbs
                      </Typography>
                      <Typography variant="h6" sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' }, fontWeight: 600, color: '#667eea' }}>
                        {dailySummary.carbs.toFixed(1)}g
                      </Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={Math.min((dailySummary.carbs / targets.carbs) * 100, 100)}
                        sx={{ mt: 1, height: 6, borderRadius: 3, bgcolor: '#fff3e0', '& .MuiLinearProgress-bar': { bgcolor: '#ff9800' } }}
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                        {Math.round((dailySummary.carbs / targets.carbs) * 100)}% of {targets.carbs}g
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                        Fat
                      </Typography>
                      <Typography variant="h6" sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' }, fontWeight: 600, color: '#667eea' }}>
                        {dailySummary.fat.toFixed(1)}g
                      </Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={Math.min((dailySummary.fat / targets.fat) * 100, 100)}
                        sx={{ mt: 1, height: 6, borderRadius: 3, bgcolor: '#ffebee', '& .MuiLinearProgress-bar': { bgcolor: '#f44336' } }}
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                        {Math.round((dailySummary.fat / targets.fat) * 100)}% of {targets.fat}g
                      </Typography>
                    </Grid>
                  </Grid>
              </Box>

              <Box sx={{ p: { xs: 1.5, sm: 2 }, bgcolor: 'white', borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', mb: 2 }}>
                <Typography variant="body2" fontWeight="600" color="#667eea" gutterBottom sx={{ fontSize: { xs: '0.9rem', sm: '1rem' }, mb: 1.5 }}>
                  Today's Food ({dailyLogs.length} items)
                </Typography>

                <List sx={{ p: 0 }}>
                  {dailyLogs.map((log) => (
                    <React.Fragment key={log.id}>
                      <ListItem sx={{ px: 0 }}>
                        <ListItemText
                          primary={log.food_name}
                          primaryTypographyProps={{
                            fontWeight: 600,
                            fontSize: { xs: '0.9rem', sm: '1rem' }
                          }}
                          secondary={
                            `${log.quantity} ${log.unit} | ${log.calories.toFixed(0)} cal | P:${log.protein.toFixed(1)}g | C:${log.carbs.toFixed(1)}g | F:${log.fat.toFixed(1)}g`
                          }
                          secondaryTypographyProps={{
                            fontSize: { xs: '0.75rem', sm: '0.85rem' }
                          }}
                        />
                      </ListItem>
                      <Divider />
                    </React.Fragment>
                  ))}
                </List>
              </Box>

              <Button 
                component={Link}
                to="/daily-log"
                variant="contained"
                fullWidth
                sx={{
                  textTransform: 'none',
                  borderRadius: 2,
                  py: 1.5,
                  fontSize: { xs: '0.9rem', sm: '1rem' },
                  fontWeight: 600,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5568d3 0%, #633d8a 100%)',
                  }
                }}
              >
                Add More Food
              </Button>
                </>
              )}
            </>
          ) : (
            <Paper elevation={0} sx={{ p: { xs: 3, sm: 4 }, textAlign: 'center', borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
              <RestaurantIcon sx={{ fontSize: { xs: 50, sm: 60 }, color: '#667eea', mb: 2, opacity: 0.6 }} />
              <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' }, fontWeight: 600 }}>
                No meals logged for today
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                Start tracking your nutrition by adding your first meal of the day.
              </Typography>
              <Button 
                component={Link}
                to="/daily-log"
                variant="contained"
                sx={{ 
                  mt: 2,
                  textTransform: 'none',
                  borderRadius: 2,
                  px: 4,
                  py: 1.5,
                  fontSize: { xs: '0.9rem', sm: '1rem' },
                  fontWeight: 600,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5568d3 0%, #633d8a 100%)',
                  }
                }}
              >
                Add Your First Meal
              </Button>
            </Paper>
          )}
        </>
      )}
      </Box>
      <Footer />
    </Box>
  );
}

export default React.memo(Dashboard);