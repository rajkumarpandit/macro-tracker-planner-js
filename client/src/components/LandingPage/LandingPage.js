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

import { useAuth } from '../Auth/AuthContext';
import Footer from '../Common/Footer';

const LandingPage = () => {
  const { currentUser } = useAuth();

  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Paper 
        elevation={3} 
        sx={{ 
          p: { xs: 3, sm: 5 }, 
          backgroundImage: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
          borderRadius: 2
        }}
      >
        <Grid container spacing={4} alignItems="center">
          {/* Hero Section */}
          <Grid item xs={12}>
            <Typography 
              variant="h2" 
              component="h1" 
              color="primary"
              sx={{ 
                fontWeight: 700, 
                mb: 2,
                fontSize: { xs: '2.5rem', sm: '3.5rem' }
              }}
            >
              Macro Tracker & Planner
            </Typography>
            <Typography 
              variant="h5" 
              color="text.secondary" 
              sx={{ mb: 4 }}
            >
              Track your nutrition, achieve your goals
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {currentUser ? (
                <Button 
                  variant="contained" 
                  color="primary" 
                  size="large"
                  component={RouterLink}
                  to="/dashboard"
                  sx={{ px: 4 }}
                >
                  Go to Dashboard
                </Button>
              ) : (
                <>
                  <Button 
                    variant="contained" 
                    color="primary" 
                    size="large"
                    component={RouterLink}
                    to="/login"
                    sx={{ px: 4 }}
                  >
                    Sign In
                  </Button>
                  <Button 
                    variant="outlined" 
                    color="primary" 
                    size="large"
                    component={RouterLink}
                    to="/signup"
                    sx={{ px: 4 }}
                  >
                    Sign Up
                  </Button>
                </>
              )}
            </Box>
          </Grid>
          

        </Grid>
      </Paper>
      <Footer />
    </Container>
  );
};

export default LandingPage;