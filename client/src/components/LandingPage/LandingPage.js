import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  Grid,
  Paper,
  Typography
} from '@mui/material';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AssessmentIcon from '@mui/icons-material/Assessment';

import { useAuth } from '../Auth/AuthContext';
import Footer from '../Common/Footer';

const LandingPage = () => {
  const { currentUser } = useAuth();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f7fa', display: 'flex', flexDirection: 'column' }}>
      <Container maxWidth="lg" sx={{ flex: 1, display: 'flex', alignItems: 'center', py: { xs: 4, md: 8 } }}>
        <Grid container spacing={4} alignItems="center">
          {/* Hero Section */}
          <Grid item xs={12} md={6}>
            <Box sx={{ textAlign: { xs: 'center', md: 'left' } }}>
              <Typography 
                variant="h2" 
                component="h1"
                sx={{ 
                  fontWeight: 700, 
                  mb: 2,
                  fontSize: { xs: '2rem', sm: '2.5rem', md: '3.5rem' },
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}
              >
                Macro Tracker & Planner
              </Typography>
              <Typography 
                variant="h5" 
                color="text.secondary" 
                sx={{ mb: 4, fontSize: { xs: '1.1rem', sm: '1.25rem', md: '1.5rem' } }}
              >
                Track your nutrition, achieve your fitness goals
              </Typography>
              <Typography 
                variant="body1" 
                color="text.secondary" 
                sx={{ mb: 4, maxWidth: 500, mx: { xs: 'auto', md: 0 } }}
              >
                Monitor your daily calories, track macros, log workouts, and visualize your progress with detailed reports.
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: { xs: 'center', md: 'flex-start' } }}>
                {currentUser ? (
                  <Button 
                    variant="contained" 
                    size="large"
                    component={RouterLink}
                    to="/dashboard"
                    sx={{ 
                      px: 4,
                      py: 1.5,
                      borderRadius: 2,
                      textTransform: 'none',
                      fontSize: '1.1rem',
                      fontWeight: 600,
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
                      }
                    }}
                  >
                    Go to Dashboard
                  </Button>
                ) : (
                  <>
                    <Button 
                      variant="contained" 
                      size="large"
                      component={RouterLink}
                      to="/signup"
                      sx={{ 
                        px: 4,
                        py: 1.5,
                        borderRadius: 2,
                        textTransform: 'none',
                        fontSize: '1.1rem',
                        fontWeight: 600,
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
                        }
                      }}
                    >
                      Get Started
                    </Button>
                    <Button 
                      variant="outlined" 
                      size="large"
                      component={RouterLink}
                      to="/login"
                      sx={{ 
                        px: 4,
                        py: 1.5,
                        borderRadius: 2,
                        textTransform: 'none',
                        fontSize: '1.1rem',
                        fontWeight: 600,
                        borderColor: '#667eea',
                        color: '#667eea',
                        '&:hover': {
                          borderColor: '#5568d3',
                          backgroundColor: 'rgba(102, 126, 234, 0.04)'
                        }
                      }}
                    >
                      Sign In
                    </Button>
                  </>
                )}
              </Box>
            </Box>
          </Grid>

          {/* Features Section */}
          <Grid item xs={12} md={6}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Paper 
                  elevation={4}
                  sx={{ 
                    p: 3, 
                    borderRadius: 3,
                    textAlign: 'center',
                    transition: 'transform 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: '0 12px 24px rgba(102, 126, 234, 0.2)'
                    }
                  }}
                >
                  <RestaurantIcon sx={{ fontSize: 48, color: '#667eea', mb: 2 }} />
                  <Typography variant="h6" fontWeight="600" gutterBottom>
                    Food Tracking
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Log your meals and track calories effortlessly
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={6}>
                <Paper 
                  elevation={4}
                  sx={{ 
                    p: 3, 
                    borderRadius: 3,
                    textAlign: 'center',
                    transition: 'transform 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: '0 12px 24px rgba(102, 126, 234, 0.2)'
                    }
                  }}
                >
                  <FitnessCenterIcon sx={{ fontSize: 48, color: '#764ba2', mb: 2 }} />
                  <Typography variant="h6" fontWeight="600" gutterBottom>
                    Workout Log
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Record your exercises and calories burned
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={6}>
                <Paper 
                  elevation={4}
                  sx={{ 
                    p: 3, 
                    borderRadius: 3,
                    textAlign: 'center',
                    transition: 'transform 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: '0 12px 24px rgba(102, 126, 234, 0.2)'
                    }
                  }}
                >
                  <TrendingUpIcon sx={{ fontSize: 48, color: '#4caf50', mb: 2 }} />
                  <Typography variant="h6" fontWeight="600" gutterBottom>
                    Progress Tracking
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Monitor your weight and body changes
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={6}>
                <Paper 
                  elevation={4}
                  sx={{ 
                    p: 3, 
                    borderRadius: 3,
                    textAlign: 'center',
                    transition: 'transform 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: '0 12px 24px rgba(102, 126, 234, 0.2)'
                    }
                  }}
                >
                  <AssessmentIcon sx={{ fontSize: 48, color: '#ff9800', mb: 2 }} />
                  <Typography variant="h6" fontWeight="600" gutterBottom>
                    Detailed Reports
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Visualize your data with charts and insights
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Container>
      <Footer />
    </Box>
  );
};

export default LandingPage;