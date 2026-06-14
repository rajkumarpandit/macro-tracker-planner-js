import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  Grid,
  Typography,
  Paper
} from '@mui/material';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AssessmentIcon from '@mui/icons-material/Assessment';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useAuth } from '../Auth/AuthContext';
import Footer from '../Common/Footer';
import { appColors } from '../../theme';

const features = [
  { icon: <RestaurantIcon sx={{ fontSize: 28 }} />, title: 'Food Tracking', desc: 'Log meals, track calories and macros effortlessly', color: appColors.blue },
  { icon: <FitnessCenterIcon sx={{ fontSize: 28 }} />, title: 'Workout Log', desc: 'Record exercises and calories burned', color: appColors.protein },
  { icon: <TrendingUpIcon sx={{ fontSize: 28 }} />, title: 'Body Metrics', desc: 'Monitor weight, chest, hips and body changes', color: appColors.success },
  { icon: <AssessmentIcon sx={{ fontSize: 28 }} />, title: 'Detailed Reports', desc: 'Visualize progress with charts and insights', color: appColors.carbs },
  { icon: <TrackChangesIcon sx={{ fontSize: 28 }} />, title: 'Macro Targets', desc: 'Set and track custom macro goals', color: appColors.fat },
  { icon: <CheckCircleIcon sx={{ fontSize: 28 }} />, title: 'Smart Alerts', desc: 'Stay within protein, fat & carb limits', color: appColors.navy },
];

const LandingPage = () => {
  const { currentUser } = useAuth();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: appColors.bgPage, display: 'flex', flexDirection: 'column' }}>
      {/* Hero */}
      <Box sx={{
        background: 'linear-gradient(135deg, #1B3A6B 0%, #112649 100%)',
        py: { xs: 6, md: 10 },
        px: 2,
      }}>
        <Container maxWidth="md" sx={{ textAlign: 'center' }}>
          <Box sx={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 64, height: 64, borderRadius: '18px',
            background: 'rgba(255,255,255,0.15)',
            mb: 3,
          }}>
            <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '1.8rem' }}>M</Typography>
          </Box>
          <Typography
            variant="h2"
            component="h1"
            sx={{
              fontWeight: 800,
              mb: 2,
              fontSize: { xs: '2rem', sm: '2.75rem', md: '3.5rem' },
              color: '#fff',
              lineHeight: 1.15,
            }}
          >
            Macro Tracker
            <Box component="span" sx={{
              display: 'block',
              background: 'linear-gradient(90deg, #60A5FA, #A78BFA)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              & Planner
            </Box>
          </Typography>
          <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.75)', mb: 4, fontSize: { xs: '1rem', md: '1.2rem' }, maxWidth: 520, mx: 'auto' }}>
            Track nutrition, achieve your fitness goals, and stay within healthy macro limits.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
            {currentUser ? (
              <Button
                variant="contained" size="large"
                component={RouterLink} to="/dashboard"
                sx={{
                  px: 4, py: 1.5, borderRadius: 2,
                  textTransform: 'none', fontSize: '1rem', fontWeight: 600,
                  background: 'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)',
                  boxShadow: '0 4px 20px rgba(37,99,235,0.4)',
                  '&:hover': { background: 'linear-gradient(135deg, #1D4ED8 0%, #6D28D9 100%)' },
                }}
              >
                Go to Dashboard
              </Button>
            ) : (
              <>
                <Button
                  variant="contained" size="large"
                  component={RouterLink} to="/signup"
                  sx={{
                    px: 4, py: 1.5, borderRadius: 2,
                    textTransform: 'none', fontSize: '1rem', fontWeight: 600,
                    background: 'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)',
                    boxShadow: '0 4px 20px rgba(37,99,235,0.4)',
                    '&:hover': { background: 'linear-gradient(135deg, #1D4ED8 0%, #6D28D9 100%)' },
                  }}
                >
                  Get Started Free
                </Button>
                <Button
                  variant="outlined" size="large"
                  component={RouterLink} to="/login"
                  sx={{
                    px: 4, py: 1.5, borderRadius: 2,
                    textTransform: 'none', fontSize: '1rem', fontWeight: 600,
                    borderColor: 'rgba(255,255,255,0.4)', color: '#fff',
                    '&:hover': { borderColor: 'rgba(255,255,255,0.7)', bgcolor: 'rgba(255,255,255,0.08)' },
                  }}
                >
                  Sign In
                </Button>
              </>
            )}
          </Box>
        </Container>
      </Box>

      {/* Features grid */}
      <Container maxWidth="lg" sx={{ py: { xs: 5, md: 8 }, flex: 1 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, textAlign: 'center', mb: 1, color: appColors.textPrimary }}>
          Everything you need
        </Typography>
        <Typography variant="body1" sx={{ color: appColors.textSecondary, textAlign: 'center', mb: 5, maxWidth: 480, mx: 'auto' }}>
          A complete nutritional toolkit for achieving a lean, healthy body
        </Typography>

        <Grid container spacing={2.5}>
          {features.map((f) => (
            <Grid item xs={12} sm={6} md={4} key={f.title}>
              <Paper sx={{
                p: 3, height: '100%', borderRadius: 3,
                '&:hover': { boxShadow: '0 8px 24px rgba(0,0,0,0.08)', transform: 'translateY(-3px)' },
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              }}>
                <Box sx={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 48, height: 48, borderRadius: '12px',
                  bgcolor: f.color + '18',
                  color: f.color,
                  mb: 1.5,
                }}>
                  {f.icon}
                </Box>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom sx={{ color: appColors.textPrimary }}>
                  {f.title}
                </Typography>
                <Typography variant="body2" sx={{ color: appColors.textSecondary, lineHeight: 1.6 }}>
                  {f.desc}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Container>

      <Footer />
    </Box>
  );
};

export default LandingPage;
