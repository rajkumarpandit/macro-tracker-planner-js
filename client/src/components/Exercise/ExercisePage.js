import React, { useState } from 'react';
import { Box, Tabs, Tab, Typography } from '@mui/material';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import { appColors } from '../../theme';
import Footer from '../Common/Footer';
import PlanBuilder from './PlanBuilder';
import WorkoutTracker from './WorkoutTracker';

function TabPanel({ children, value, index }) {
  return (
    <div hidden={value !== index} style={{ width: '100%' }}>
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

function ExercisePage() {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: appColors.bgPage, pb: 2 }}>
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
          <FitnessCenterIcon sx={{ fontSize: { xs: 28, sm: 36 }, color: appColors.blue }} />
          <Typography variant="h5" component="h1" sx={{ color: appColors.textPrimary, fontWeight: 600, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
            Exercise Module
          </Typography>
        </Box>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: appColors.border, mb: 3 }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange}
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 500,
                fontSize: { xs: '0.9rem', sm: '1rem' },
                minWidth: { xs: 120, sm: 160 },
              },
              '& .Mui-selected': {
                color: appColors.blue,
                fontWeight: 600,
              },
              '& .MuiTabs-indicator': {
                backgroundColor: appColors.blue,
                height: 3,
              },
            }}
          >
            <Tab label="Plan Builder" />
            <Tab label="Workout Tracker" />
          </Tabs>
        </Box>

        {/* Tab Panels */}
        <TabPanel value={tabValue} index={0}>
          <PlanBuilder />
        </TabPanel>
        <TabPanel value={tabValue} index={1}>
          <WorkoutTracker />
        </TabPanel>
      </Box>
      <Footer />
    </Box>
  );
}

export default ExercisePage;
