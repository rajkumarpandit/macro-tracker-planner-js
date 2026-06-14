import React, { useState, useEffect, useMemo } from 'react';
import {
  Typography,
  Box,
  Button,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Divider,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Grid,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { Link } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import { format } from 'date-fns';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import DashboardIcon from '@mui/icons-material/Dashboard';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useAuth } from '../Auth/AuthContext';
import { fetchUserMacroTargets } from '../../utils/macroTargetUtils';
import { calculateProteinBreakdown, getProteinSourceChartData, getProteinSourceWithFallback } from '../../utils/proteinSourceUtils';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { FIREBASE_COLLECTIONS } from '../../config/constants';
import Footer from '../Common/Footer';
import { appColors, cardSx, sectionTitleSx } from '../../theme';

const MACRO_TARGETS = {
  protein: { min: 25, max: 30, label: 'Protein',       color: appColors.protein, bg: appColors.proteinLight, calPerGram: 4 },
  carbs:   { min: 40, max: 55, label: 'Carbohydrates', color: appColors.carbs,   bg: appColors.carbsLight,   calPerGram: 4 },
  fat:     { min: 20, max: 30, label: 'Fat',            color: appColors.fat,     bg: appColors.fatLight,     calPerGram: 9 },
};

function MacroCalorieBreakdown({ summary }) {
  const proteinCals    = summary.protein * 4;
  const carbCals       = summary.carbs   * 4;
  const fatCals        = summary.fat     * 9;
  const totalMacroCals = proteinCals + carbCals + fatCals;

  if (totalMacroCals === 0) return null;

  const pcts = {
    protein: (proteinCals / totalMacroCals) * 100,
    carbs:   (carbCals    / totalMacroCals) * 100,
    fat:     (fatCals     / totalMacroCals) * 100,
  };

  const isInRange  = (key) => pcts[key] >= MACRO_TARGETS[key].min && pcts[key] <= MACRO_TARGETS[key].max;
  const allInRange = Object.keys(pcts).every(isInRange);

  return (
    <Box sx={{ ...cardSx, borderLeft: `4px solid ${appColors.purple}` }}>
      <Typography sx={{ ...sectionTitleSx }}>Macro Calorie Distribution</Typography>

      {/* Stacked colour bar */}
      <Box sx={{ display: 'flex', height: 14, borderRadius: 2, overflow: 'hidden', mb: 1 }}>
        {['protein', 'carbs', 'fat'].map((key) => (
          <Box key={key} sx={{ width: `${pcts[key]}%`, bgcolor: MACRO_TARGETS[key].color, opacity: 0.85 }} />
        ))}
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        {['protein', 'carbs', 'fat'].map((key) => (
          <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: MACRO_TARGETS[key].color }} />
            <Typography variant="caption" sx={{ color: appColors.textSecondary, fontSize: '0.72rem' }}>
              {MACRO_TARGETS[key].label.replace('Carbohydrates', 'Carbs')}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Per-macro rows */}
      {['protein', 'carbs', 'fat'].map((key) => {
        const t       = MACRO_TARGETS[key];
        const pct     = pcts[key];
        const cals    = key === 'protein' ? proteinCals : key === 'carbs' ? carbCals : fatCals;
        const inRange = isInRange(key);
        const isBelowTarget = pct < t.min;
        const statusColor = inRange ? appColors.success : (isBelowTarget ? appColors.warning : appColors.error);
        return (
          <Box key={key} sx={{
            mb: 1.5, p: 1.5, borderRadius: 2,
            bgcolor: appColors.bgCard,
            border: `1px solid ${appColors.border}`,
            borderLeft: `4px solid ${t.color}`,
          }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: t.color }} />
                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.85rem', color: appColors.textPrimary }}>
                  {t.label}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.9rem', color: statusColor }}>
                  {pct.toFixed(1)}% ({cals.toFixed(0)} cal)
                </Typography>
                {inRange
                  ? <CheckCircleIcon  sx={{ fontSize: 16, color: appColors.success }} />
                  : <WarningAmberIcon sx={{ fontSize: 16, color: statusColor }} />
                }
              </Box>
            </Box>
            <LinearProgress
              variant="determinate"
              value={Math.min(pct, 100)}
              sx={{
                height: 5, borderRadius: 3, mb: 0.5,
                bgcolor: statusColor + '22',
                '& .MuiLinearProgress-bar': { bgcolor: statusColor },
              }}
            />
            <Typography variant="caption" sx={{ color: appColors.textSecondary, fontSize: '0.72rem' }}>
              Target: {t.min}–{t.max}%
              {!inRange && (
                <Box component="span" sx={{ ml: 1, color: statusColor, fontWeight: 600 }}>
                  {pct < t.min
                    ? `(${(t.min - pct).toFixed(1)}% below target)`
                    : `(${(pct - t.max).toFixed(1)}% above target)`}
                </Box>
              )}
            </Typography>
          </Box>
        );
      })}

      {allInRange && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, p: 1, borderRadius: 2, bgcolor: appColors.bgCard, border: `1px solid ${appColors.success}` }}>
          <CheckCircleIcon sx={{ fontSize: 16, color: appColors.success }} />
          <Typography variant="caption" sx={{ color: appColors.success, fontWeight: 600, fontSize: '0.8rem' }}>
            All macros are within lean-body target ranges
          </Typography>
        </Box>
      )}
    </Box>
  );
}

function Dashboard() {
  const [loading, setLoading]                     = useState(true);
  const [dailyLogs, setDailyLogs]                 = useState([]);
  const [caloriesBurntLogs, setCaloriesBurntLogs] = useState([]);
  const [targets, setTargets]                     = useState({ calories: 2000, protein: 140, carbs: 200, fat: 100 });
  const { currentUser } = useAuth();
  const theme   = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const today   = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

  const getMealColor = (cat) =>
    appColors.meals[cat] || { bg: appColors.bgPage, text: appColors.textSecondary };

  const getProteinSourceColor = (src) =>
    appColors.proteinSources[src] || { bg: appColors.bgPage, text: appColors.textSecondary };

  useEffect(() => {
    const fetchTodayLogs = async () => {
      if (!currentUser) return;
      setLoading(true);
      try {
        const foodSnapshot = await getDocs(query(
          collection(db, FIREBASE_COLLECTIONS.DAILY_FOOD_LOG),
          where('date_eaten', '==', today),
          where('userId', '==', currentUser.uid)
        ));
        const mealOrder = { 'Pre-Breakfast': 0, 'Pre-Workout': 1, 'Breakfast': 2, 'Pre-Lunch': 3, 'Lunch': 4, 'Evening-Snacks': 5, 'Dinner': 6, 'Post-Workout': 7, 'Extra Snacks': 8, 'Snack': 9, 'Others': 10 };
        setDailyLogs(
          foodSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
            .sort((a, b) => (mealOrder[a.mealCategory] ?? 11) - (mealOrder[b.mealCategory] ?? 11))
        );

        const burntSnapshot = await getDocs(query(
          collection(db, FIREBASE_COLLECTIONS.CALORIES_BURNT_LOG),
          where('dateStr', '==', today),
          where('userId', '==', currentUser.uid)
        ));
        setCaloriesBurntLogs(burntSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error('Error fetching daily logs:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTodayLogs();
  }, [today, currentUser]);

  const dailySummary = useMemo(() => dailyLogs.reduce(
    (acc, log) => ({
      calories: acc.calories + log.calories,
      protein:  acc.protein  + log.protein,
      carbs:    acc.carbs    + log.carbs,
      fat:      acc.fat      + log.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  ), [dailyLogs]);

  const proteinBreakdown = useMemo(() => calculateProteinBreakdown(dailyLogs), [dailyLogs]);
  const proteinChartData = useMemo(() => getProteinSourceChartData(proteinBreakdown), [proteinBreakdown]);
  const totalProtein     = useMemo(() => Object.values(proteinBreakdown).reduce((s, v) => s + v, 0), [proteinBreakdown]);

  const mealCategoryBreakdown = useMemo(() => {
    const bd = {};
    dailyLogs.forEach(log => {
      const cat = log.mealCategory || 'Others';
      if (!bd[cat]) bd[cat] = { calories: 0, protein: 0, carbs: 0, fat: 0, count: 0 };
      bd[cat].calories += log.calories;
      bd[cat].protein  += log.protein;
      bd[cat].carbs    += log.carbs;
      bd[cat].fat      += log.fat;
      bd[cat].count    += 1;
    });
    const order = { 'Pre-Breakfast': 0, 'Pre-Workout': 1, 'Breakfast': 2, 'Pre-Lunch': 3, 'Lunch': 4, 'Evening-Snacks': 5, 'Dinner': 6, 'Post-Workout': 7, 'Extra Snacks': 8, 'Snack': 9, 'Others': 10 };
    return Object.entries(bd)
      .sort(([a], [b]) => (order[a] ?? 99) - (order[b] ?? 99))
      .map(([category, data]) => ({ category, ...data }));
  }, [dailyLogs]);

  const totalCaloriesBurnt = useMemo(() => caloriesBurntLogs.reduce((s, l) => s + l.caloriesBurnt, 0), [caloriesBurntLogs]);
  const netCalories        = dailySummary.calories - totalCaloriesBurnt;

  useEffect(() => {
    const loadTargets = async () => {
      if (!currentUser) return;
      setTargets(await fetchUserMacroTargets(currentUser.uid));
    };
    loadTargets();
  }, [currentUser]);

  const macroProgress = [
    { key: 'calories', label: 'Calories', value: dailySummary.calories, target: targets.calories, unit: 'kcal', color: appColors.blue,    trackBg: appColors.blueLight    },
    { key: 'protein',  label: 'Protein',  value: dailySummary.protein,  target: targets.protein,  unit: 'g',    color: appColors.protein,  trackBg: appColors.proteinLight },
    { key: 'carbs',    label: 'Carbs',    value: dailySummary.carbs,    target: targets.carbs,    unit: 'g',    color: appColors.carbs,    trackBg: appColors.carbsLight   },
    { key: 'fat',      label: 'Fat',      value: dailySummary.fat,      target: targets.fat,      unit: 'g',    color: appColors.fat,      trackBg: appColors.fatLight     },
  ];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: appColors.bgPage, pb: 2 }}>
      <Box sx={{ p: { xs: 1.5, sm: 2.5 } }}>

        {/* Page header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
          <Box sx={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 36, height: 36, borderRadius: '10px',
            background: `linear-gradient(135deg, ${appColors.blue} 0%, ${appColors.navyDark} 100%)`,
          }}>
            <DashboardIcon sx={{ fontSize: 20, color: '#fff' }} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: { xs: '1.1rem', sm: '1.25rem' }, color: appColors.textPrimary, lineHeight: 1.2 }}>
              Today's Overview
            </Typography>
            <Typography variant="caption" sx={{ color: appColors.textSecondary }}>
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </Typography>
          </Box>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 6 }}>
            <CircularProgress size={28} sx={{ color: appColors.blue }} />
          </Box>
        ) : (
          <>
            {dailyLogs.length > 0 || caloriesBurntLogs.length > 0 ? (
              <>
                {/* Calorie stat cards */}
                <Grid container spacing={1.5} sx={{ mb: 2 }}>
                  {[
                    { label: 'Consumed', value: dailySummary.calories.toFixed(0), color: appColors.blue,    bg: appColors.blueLight    },
                    { label: 'Burnt',    value: totalCaloriesBurnt.toFixed(0),     color: appColors.error,   bg: appColors.errorLight   },
                    { label: 'Net',      value: (netCalories >= 0 ? '+' : '') + netCalories.toFixed(0),
                      color: netCalories >= 0 ? appColors.success : appColors.warning,
                      bg:    netCalories >= 0 ? appColors.successLight : appColors.warningLight },
                  ].map((stat) => (
                    <Grid item xs={4} key={stat.label}>
                      <Box sx={{
                        bgcolor: stat.bg, borderRadius: 2.5, textAlign: 'center',
                        p: { xs: 1.5, sm: 2 }, border: `1px solid ${stat.color}22`,
                        borderLeft: `4px solid ${stat.color}`,
                      }}>
                        <Typography variant="caption" sx={{ color: appColors.textSecondary, fontSize: { xs: '0.68rem', sm: '0.75rem' }, display: 'block' }}>
                          {stat.label}
                        </Typography>
                        <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.15rem', sm: '1.5rem' }, color: stat.color, lineHeight: 1.2 }}>
                          {stat.value}
                        </Typography>
                        <Typography variant="caption" sx={{ color: appColors.textDisabled, fontSize: '0.65rem' }}>kcal</Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>

                {dailyLogs.length > 0 && (
                  <>
                    {/* Macro target progress */}
                    <Box sx={{ ...cardSx, borderLeft: `4px solid ${appColors.blue}` }}>
                      <Typography sx={{ ...sectionTitleSx }}>Macro Targets</Typography>
                      <Grid container spacing={1.5}>
                        {macroProgress.map((m) => (
                          <Grid item xs={6} key={m.key}>
                            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: appColors.bgCard, border: `1px solid ${appColors.border}` }}>
                              <Typography variant="caption" sx={{ color: appColors.textSecondary, fontSize: { xs: '0.7rem', sm: '0.75rem' }, display: 'block' }}>
                                {m.label}
                              </Typography>
                              <Typography sx={{ fontWeight: 700, fontSize: { xs: '1.1rem', sm: '1.2rem' }, color: m.color }}>
                                {m.value.toFixed(m.unit === 'kcal' ? 0 : 1)}{m.unit === 'g' ? 'g' : ''}
                              </Typography>
                              <LinearProgress
                                variant="determinate"
                                value={Math.min((m.value / m.target) * 100, 100)}
                                sx={{
                                  mt: 0.75, height: 5, borderRadius: 3,
                                  bgcolor: `${m.color}22`,
                                  '& .MuiLinearProgress-bar': { bgcolor: m.color, borderRadius: 3 },
                                }}
                              />
                              <Typography variant="caption" sx={{ color: appColors.textDisabled, fontSize: '0.65rem', mt: 0.25, display: 'block' }}>
                                {Math.round((m.value / m.target) * 100)}% of {m.target}{m.unit === 'g' ? 'g' : ' kcal'}
                              </Typography>
                            </Box>
                          </Grid>
                        ))}
                      </Grid>
                    </Box>

                    {/* Macro calorie distribution */}
                    <MacroCalorieBreakdown summary={dailySummary} />

                    {/* Meal-wise breakdown table */}
                    {mealCategoryBreakdown.length > 0 && (
                      <Box sx={{ ...cardSx, borderLeft: `4px solid ${appColors.orange}` }}>
                        <Typography sx={{ ...sectionTitleSx }}>Meal-wise Breakdown</Typography>
                        <TableContainer sx={{ overflowX: 'auto' }}>
                          <Table size="small" sx={{ minWidth: 260 }}>
                            <TableHead>
                              <TableRow>
                                <TableCell sx={{ py: 1 }}>Meal</TableCell>
                                <TableCell align="right" sx={{ py: 1 }}>Cal</TableCell>
                                <TableCell align="right" sx={{ py: 1 }}>Prot</TableCell>
                                <TableCell align="right" sx={{ py: 1 }}>Carbs</TableCell>
                                <TableCell align="right" sx={{ py: 1 }}>Fat</TableCell>
                                <TableCell align="right" sx={{ py: 1, display: { xs: 'none', sm: 'table-cell' } }}>Items</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {mealCategoryBreakdown.map((meal) => (
                                <TableRow key={meal.category} sx={{ '&:hover': { bgcolor: appColors.bgPage } }}>
                                  <TableCell sx={{ py: 0.75 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: getMealColor(meal.category).text, flexShrink: 0 }} />
                                      <Typography sx={{ fontSize: { xs: '0.72rem', sm: '0.82rem' }, fontWeight: 500 }}>
                                        {isMobile ? meal.category.replace('Evening-Snacks','Eve-Sk').replace('Extra Snacks','Ex-Sk').replace('Pre-Lunch','Pre-L').replace('Pre-Breakfast','Pre-Bfst').replace('Pre-Workout','Pre-WO').replace('Post-Workout','Post-WO') : meal.category}
                                      </Typography>
                                    </Box>
                                  </TableCell>
                                  <TableCell align="right" sx={{ fontSize: { xs: '0.72rem', sm: '0.82rem' }, py: 0.75 }}>{meal.calories.toFixed(0)}</TableCell>
                                  <TableCell align="right" sx={{ fontSize: { xs: '0.72rem', sm: '0.82rem' }, py: 0.75 }}>{meal.protein.toFixed(1)}</TableCell>
                                  <TableCell align="right" sx={{ fontSize: { xs: '0.72rem', sm: '0.82rem' }, py: 0.75 }}>{meal.carbs.toFixed(1)}</TableCell>
                                  <TableCell align="right" sx={{ fontSize: { xs: '0.72rem', sm: '0.82rem' }, py: 0.75 }}>{meal.fat.toFixed(1)}</TableCell>
                                  <TableCell align="right" sx={{ fontSize: { xs: '0.72rem', sm: '0.82rem' }, py: 0.75, display: { xs: 'none', sm: 'table-cell' } }}>{meal.count}</TableCell>
                                </TableRow>
                              ))}
                              <TableRow sx={{ bgcolor: appColors.bgPage }}>
                                <TableCell sx={{ fontWeight: 700, fontSize: { xs: '0.75rem', sm: '0.85rem' }, py: 0.75 }}>Total</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700, fontSize: { xs: '0.75rem', sm: '0.85rem' }, py: 0.75 }}>{dailySummary.calories.toFixed(0)}</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700, fontSize: { xs: '0.75rem', sm: '0.85rem' }, py: 0.75 }}>{dailySummary.protein.toFixed(1)}</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700, fontSize: { xs: '0.75rem', sm: '0.85rem' }, py: 0.75 }}>{dailySummary.carbs.toFixed(1)}</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700, fontSize: { xs: '0.75rem', sm: '0.85rem' }, py: 0.75 }}>{dailySummary.fat.toFixed(1)}</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700, fontSize: { xs: '0.75rem', sm: '0.85rem' }, py: 0.75, display: { xs: 'none', sm: 'table-cell' } }}>{dailyLogs.length}</TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </TableContainer>
                        <Typography variant="caption" sx={{ mt: 0.75, display: 'block', color: appColors.textDisabled, fontStyle: 'italic', fontSize: '0.68rem' }}>
                          Calories in kcal · Protein / Carbs / Fat in grams
                        </Typography>
                      </Box>
                    )}

                    {/* Protein Source Analysis */}
                    {totalProtein > 0 && (
                      <Box sx={{ ...cardSx, borderLeft: `4px solid ${appColors.protein}` }}>
                        <Typography sx={{ ...sectionTitleSx }}>Protein Source Analysis</Typography>
                        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: 'center', gap: 2 }}>
                          <Box sx={{ width: { xs: '100%', md: 200 }, height: 160 }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie data={proteinChartData} cx="50%" cy="50%" innerRadius={42} outerRadius={65} paddingAngle={2} dataKey="value" label={false} labelLine={false}>
                                  {proteinChartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                  ))}
                                </Pie>
                                <RechartsTooltip
                                  formatter={(v) => `${v.toFixed(1)}g`}
                                  contentStyle={{ backgroundColor: '#fff', border: `1px solid ${appColors.border}`, borderRadius: 8, fontSize: '0.8rem' }}
                                />
                              </PieChart>
                            </ResponsiveContainer>
                          </Box>
                          <Box sx={{ flex: 1, minWidth: 0, width: { xs: '100%', md: 'auto' } }}>
                            <Typography variant="body2" sx={{ color: appColors.textSecondary, mb: 1.5, fontSize: '0.82rem' }}>
                              Total Protein: <strong style={{ color: appColors.textPrimary }}>{totalProtein.toFixed(1)}g</strong>
                            </Typography>
                            {proteinChartData.map((item) => (
                              <Box key={item.name} sx={{ mb: 1.2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.4 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                    <Box sx={{ width: 10, height: 10, bgcolor: item.color, borderRadius: '50%' }} />
                                    <Typography variant="body2" sx={{ fontSize: '0.82rem' }}>{item.name}</Typography>
                                  </Box>
                                  <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.82rem' }}>
                                    {item.value.toFixed(1)}g ({((item.value / totalProtein) * 100).toFixed(1)}%)
                                  </Typography>
                                </Box>
                                <LinearProgress
                                  variant="determinate"
                                  value={(item.value / totalProtein) * 100}
                                  sx={{ height: 5, borderRadius: 2, bgcolor: `${item.color}22`, '& .MuiLinearProgress-bar': { bgcolor: item.color } }}
                                />
                              </Box>
                            ))}
                          </Box>
                        </Box>
                      </Box>
                    )}

                    {/* Today's food list */}
                    <Box sx={{ ...cardSx, borderLeft: `4px solid ${appColors.green}` }}>
                      <Typography sx={{ ...sectionTitleSx }}>Today's Food ({dailyLogs.length} items)</Typography>
                      <List sx={{ p: 0 }}>
                        {dailyLogs.map((log) => (
                          <React.Fragment key={log.id}>
                            <ListItem sx={{ px: 0, py: 0.75 }}>
                              <ListItemText
                                primary={
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'nowrap', overflow: 'hidden' }}>
                                    <Typography component="span" sx={{
                                      fontWeight: 600, fontSize: { xs: '0.85rem', sm: '0.92rem' },
                                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 1, minWidth: 0,
                                    }}>
                                      {log.food_name}
                                    </Typography>
                                    {log.mealCategory && (
                                      <Typography component="span" sx={{
                                        px: 0.75, py: 0.15, borderRadius: 1, fontSize: '0.68rem', fontWeight: 600,
                                        bgcolor: getMealColor(log.mealCategory).bg,
                                        color:   getMealColor(log.mealCategory).text,
                                        flexShrink: 0, whiteSpace: 'nowrap',
                                      }}>
                                        {log.mealCategory}
                                      </Typography>
                                    )}
                                    {(() => {
                                      const src = getProteinSourceWithFallback(log);
                                      if (src && src !== 'Unclassified') {
                                        return (
                                          <Typography component="span" sx={{
                                            px: 0.75, py: 0.15, borderRadius: 1, fontSize: '0.68rem', fontWeight: 600,
                                            bgcolor: getProteinSourceColor(src).bg,
                                            color:   getProteinSourceColor(src).text,
                                            flexShrink: 0, whiteSpace: 'nowrap',
                                          }}>
                                            {src}
                                          </Typography>
                                        );
                                      }
                                      return null;
                                    })()}
                                  </Box>
                                }
                                secondary={`${log.quantity} ${log.unit} · ${log.calories.toFixed(0)} kcal · P:${log.protein.toFixed(1)}g · C:${log.carbs.toFixed(1)}g · F:${log.fat.toFixed(1)}g`}
                                secondaryTypographyProps={{ sx: { fontSize: { xs: '0.72rem', sm: '0.78rem' }, color: appColors.textSecondary, mt: 0.25 } }}
                              />
                            </ListItem>
                            <Divider />
                          </React.Fragment>
                        ))}
                      </List>
                    </Box>

                    <Button
                      component={Link} to="/daily-log" variant="contained" fullWidth
                      sx={{
                        textTransform: 'none', borderRadius: 2, py: 1.4, fontWeight: 600,
                        fontSize: { xs: '0.9rem', sm: '0.95rem' },
                        background: `linear-gradient(135deg, ${appColors.blue} 0%, ${appColors.navyDark} 100%)`,
                        boxShadow: '0 4px 12px rgba(37,99,235,0.2)',
                        '&:hover': {
                          background: `linear-gradient(135deg, ${appColors.blueDark} 0%, ${appColors.navy} 100%)`,
                          boxShadow: '0 6px 16px rgba(37,99,235,0.3)',
                        },
                      }}
                    >
                      Add More Food
                    </Button>
                  </>
                )}
              </>
            ) : (
              <Box sx={{ ...cardSx, textAlign: 'center', py: { xs: 4, sm: 6 } }}>
                <Box sx={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 72, height: 72, borderRadius: '20px',
                  bgcolor: appColors.blueLight, mb: 2,
                }}>
                  <RestaurantIcon sx={{ fontSize: 36, color: appColors.blue }} />
                </Box>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, color: appColors.textPrimary }}>
                  No meals logged today
                </Typography>
                <Typography variant="body2" sx={{ color: appColors.textSecondary, mb: 3, maxWidth: 320, mx: 'auto' }}>
                  Start tracking your nutrition by adding your first meal.
                </Typography>
                <Button
                  component={Link} to="/daily-log" variant="contained"
                  sx={{
                    textTransform: 'none', borderRadius: 2, px: 4, py: 1.4, fontWeight: 600,
                    background: `linear-gradient(135deg, ${appColors.blue} 0%, ${appColors.navyDark} 100%)`,
                    boxShadow: '0 4px 12px rgba(37,99,235,0.2)',
                    '&:hover': {
                      background: `linear-gradient(135deg, ${appColors.blueDark} 0%, ${appColors.navy} 100%)`,
                    },
                  }}
                >
                  Log Your First Meal
                </Button>
              </Box>
            )}
          </>
        )}
      </Box>
      <Footer />
    </Box>
  );
}

export default React.memo(Dashboard);
