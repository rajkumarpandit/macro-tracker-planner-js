import React, { useState } from 'react';
import { Box, Tabs, Tab, Paper, Typography } from '@mui/material';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import BuildIcon from '@mui/icons-material/Build';
import AdminManagement from './AdminManagement';
import AppMaintenance from './AppMaintenance';

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box>
          {children}
        </Box>
      )}
    </div>
  );
}

function AdminPage() {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  return (
    <Box>
      {/* Green banner with Administration title */}
      <Paper 
        sx={{ 
          mb: 2,
          background: '#4caf50',
          color: 'white',
          p: 2,
          borderRadius: 1
        }}
        elevation={3}
      >
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Administration
        </Typography>
      </Paper>

      {/* Tabs below the banner */}
      <Paper sx={{ mb: 2 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{
            '& .MuiTab-root': {
              minHeight: 60,
              fontSize: '0.9rem',
            }
          }}
        >
          <Tab 
            icon={<SupervisorAccountIcon />} 
            label="User Management" 
            iconPosition="start"
            sx={{ textTransform: 'none' }}
          />
          <Tab 
            icon={<BuildIcon />} 
            label="App Maintenance" 
            iconPosition="start"
            sx={{ textTransform: 'none' }}
          />
        </Tabs>
      </Paper>

      <TabPanel value={tabValue} index={0}>
        <AdminManagement />
      </TabPanel>
      <TabPanel value={tabValue} index={1}>
        <AppMaintenance />
      </TabPanel>
    </Box>
  );
}

export default AdminPage;


