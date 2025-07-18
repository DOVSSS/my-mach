import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Button, 
  Grid, 
  Card, 
  CardContent, 
  TextField, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemSecondaryAction, 
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Snackbar,
  Alert,
  CircularProgress
} from '@mui/material';
import { 
  Delete, 
  SportsSoccer,
  ExpandMore,
  Schedule,
  Close
} from '@mui/icons-material';
import { ref, onValue, set, update } from 'firebase/database';
import { database } from './firebase';

// Генерация уникального ID
const generateId = () => Math.random().toString(36).substr(2, 9);

// Единая функция для получения текущей даты в формате YYYY-MM-DD
const getTodayDateString = () => {
  const now = new Date();
  return now.toISOString().split('T')[0];
};

// Получение времени до следующего сброса
const getTimeUntilReset = () => {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  
  const diff = tomorrow - now;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  return `${hours}ч ${minutes}м`;
};

const App = () => {
  // Состояния приложения
  const [matches, setMatches] = useState([]);
  const [expandedMatch, setExpandedMatch] = useState(null);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [playerPhone, setPlayerPhone] = useState('');
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [openModal, setOpenModal] = useState(false);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });
  const [timeUntilReset, setTimeUntilReset] = useState('');
  const [loading, setLoading] = useState(true);
  const [lastResetDate, setLastResetDate] = useState('');
  const isInitializedRef = useRef(false);
  

  // Загрузка данных из Firebase
  // Загрузка данных из Firebase
  useEffect(() => {
    const matchesRef = ref(database, 'matches');
    const resetRef = ref(database, 'lastResetDate');
    
    // Загрузка данных о матчах
    const matchesListener = onValue(matchesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const matchesArray = Object.keys(data).map(key => ({
          ...data[key],
          id: key
        }));
        setMatches(matchesArray);
      } else {
        setMatches([]);
      }
      setLoading(false);
    }, (error) => {
      console.error("Ошибка загрузки матчей: ", error);
      setSnackbar({ open: true, message: 'Ошибка загрузки данных: ' + error.message });
      setLoading(false);
    });
    
    // Загрузка даты последнего сброса
    const resetListener = onValue(resetRef, (snapshot) => {
      const resetDate = snapshot.val();
      setLastResetDate(resetDate || '');
      
      // Проверяем необходимость сброса данных только после начальной загрузки
      if (isInitializedRef.current) {
        const today = getTodayDateString();
        if (resetDate !== today) {
          resetData(today);
        }
      }
      isInitializedRef.current = true;
    });
    
    // Обновление времени до сброса каждую минуту
    const timerId = setInterval(() => {
      setTimeUntilReset(getTimeUntilReset());
    }, 60000);
    
    // Первоначальная установка времени
    setTimeUntilReset(getTimeUntilReset());
    
    return () => {
      clearInterval(timerId);
      matchesListener();
      resetListener();
    };
  }, []);

  // Сброс данных в 00:00
  const resetData = (today) => {
    // Формируем объект для матчей
    const initialMatches = {
      match1: { time: 'NTPA-13:00', team1: [], team2: [] },
      match2: { time: 'VTPA-15:00', team1: [], team2: [] },
      match3: { time: 'VTPa-19:00', team1: [], team2: [] }
    };
    
    const updates = {
      matches: initialMatches,
      lastResetDate: today
    };
    
    set(ref(database, '/'), updates)
      .then(() => {
        setSnackbar({ open: true, message: 'Данные сброшены для нового дня!' });
      })
      .catch(error => {
        console.error("Ошибка сброса данных: ", error);
        setSnackbar({ open: true, message: 'Ошибка сброса данных: ' + error.message });
      });
  };

  // Открытие модального окна для записи
  const handleOpen = (match) => {
    setSelectedMatch(match);
    setPlayerName('');
    setPlayerPhone('');
    setSelectedTeam(null);
    setError('');
    setOpenModal(true);
  };

  // Закрытие модального окна
  const handleClose = () => {
    setOpenModal(false);
  };

  // Добавление игрока
  const addPlayer = () => {
    if (!playerName.trim()) {
      setError('Введите ФИО');
      return;
    }

    if (!playerPhone.trim()) {
      setError('Введите номер телефона');
      return;
    }

    if (!selectedTeam) {
      setError('Выберите команду');
      return;
    }

    const newPlayer = {
      id: generateId(),
      name: playerName.trim(),
      phone: playerPhone.trim()
    };

    // Обновление данных в Firebase
    const updatedTeam = [...(selectedMatch[selectedTeam] || []), newPlayer];
    const matchPath = `matches/${selectedMatch.id}/${selectedTeam}`;
    
    update(ref(database), {
      [matchPath]: updatedTeam
    })
    .then(() => {
      setSnackbar({ open: true, message: 'Вы успешно записаны!' });
      setOpenModal(false);
      setExpandedMatch(selectedMatch.id);
    })
    .catch(error => {
      setSnackbar({ open: true, message: 'Ошибка записи: ' + error.message });
    });
  };

  // Удаление игрока
  const removePlayer = (matchId, team, playerId) => {
    const match = matches.find(m => m.id === matchId);
    if (!match) return;

    const updatedTeam = (match[team] || []).filter(p => p.id !== playerId);
    const teamPath = `matches/${matchId}/${team}`;
    
    update(ref(database), {
      [teamPath]: updatedTeam
    })
    .then(() => {
      setSnackbar({ open: true, message: 'Запись удалена!' });
    })
    .catch(error => {
      setSnackbar({ open: true, message: 'Ошибка удаления: ' + error.message });
    });
  };

  // Обработчик аккордеона
  const handleAccordionChange = (matchId) => (event, isExpanded) => {
    setExpandedMatch(isExpanded ? matchId : null);
  };

  // Закрытие уведомления
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Обработка состояния загрузки
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress size={80} />
      </Box>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box textAlign="center" mb={4}>
        <SportsSoccer sx={{ fontSize: 60, color: 'success.main' }} />
        <Typography variant="h3" gutterBottom>
          Футбольный Организатор
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Запишитесь на матч в удобное время
        </Typography>
        <Box mt={1}>
          <Typography variant="caption" color="text.secondary">
            Данные обновятся через: {timeUntilReset}
          </Typography>
        </Box>
      </Box>

      {/* Доступные матчи */}
      <Grid container spacing={3} justifyContent="center">
        {matches.length > 0 ? (
          matches.map((match) => (
            <Grid item xs={12} sm={6} md={4} key={match.id}>
              <Card 
                variant="outlined" 
                sx={{ 
                  border: '2px solid',
                  borderColor: 'primary.main',
                  borderRadius: 2,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.3s',
                  '&:hover': {
                    transform: 'scale(1.03)',
                    boxShadow: 3
                  }
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box display="flex" alignItems="center" justifyContent="center" mb={1}>
                    <Schedule sx={{ mr: 1, color: 'action.active' }} />
                    <Typography variant="h5" align="center" gutterBottom>
                      {match.time}
                    </Typography>
                  </Box>
                  
                  <Grid container spacing={1} mt={2}>
                    <Grid item xs={6}>
                      <Typography variant="subtitle1" align="center">
                        Команда 1
                      </Typography>
                      <Typography variant="body2" align="center" color="text.secondary">
                        ({match.team1?.length || 0} игроков)
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="subtitle1" align="center">
                        Команда 2
                      </Typography>
                      <Typography variant="body2" align="center" color="text.secondary">
                        ({match.team2?.length || 0} игроков)
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
                
                <Box sx={{ p: 2, textAlign: 'center' }}>
                  <Button 
                    variant="contained" 
                    color="primary"
                    onClick={() => handleOpen(match)}
                    fullWidth
                    sx={{ fontWeight: 'bold' }}
                  >
                    Записаться
                  </Button>
                </Box>
              </Card>
            </Grid>
          ))
        ) : (
          <Grid item xs={12}>
            <Typography variant="h6" align="center" color="text.secondary">
              Нет доступных матчей
            </Typography>
          </Grid>
        )}
      </Grid>

      {/* Модальное окно записи */}
      <Dialog open={openModal} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle sx={{ 
          bgcolor: 'primary.main', 
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>Запись на матч: {selectedMatch?.time}</span>
          <IconButton onClick={handleClose} sx={{ color: 'white' }}>
            <Close />
          </IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ py: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                label="ФИО"
                fullWidth
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                variant="outlined"
                required
                autoFocus
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                label="Номер телефона"
                fullWidth
                value={playerPhone}
                onChange={(e) => setPlayerPhone(e.target.value)}
                variant="outlined"
                required
              />
            </Grid>
            
            <Grid item xs={6}>
              <Paper 
                elevation={selectedTeam === 'team1' ? 3 : 0}
                sx={{ 
                  p: 2, 
                  cursor: 'pointer', 
                  border: selectedTeam === 'team1' ? '2px solid #1976d2' : '1px solid #ddd',
                  borderRadius: 1,
                  bgcolor: selectedTeam === 'team1' ? '#e3f2fd' : 'inherit',
                  transition: 'all 0.3s',
                  height: '100%'
                }}
                onClick={() => setSelectedTeam('team1')}
              >
                <Typography variant="h6" align="center">
                  Команда 1
                </Typography>
                <Typography variant="body2" align="center" color="text.secondary">
                  {selectedMatch?.team1?.length || 0} игроков
                </Typography>
              </Paper>
            </Grid>
            
            <Grid item xs={6}>
              <Paper 
                elevation={selectedTeam === 'team2' ? 3 : 0}
                sx={{ 
                  p: 2, 
                  cursor: 'pointer', 
                  border: selectedTeam === 'team2' ? '2px solid #1976d2' : '1px solid #ddd',
                  borderRadius: 1,
                  bgcolor: selectedTeam === 'team2' ? '#e3f2fd' : 'inherit',
                  transition: 'all 0.3s',
                  height: '100%'
                }}
                onClick={() => setSelectedTeam('team2')}
              >
                <Typography variant="h6" align="center">
                  Команда 2
                </Typography>
                <Typography variant="body2" align="center" color="text.secondary">
                  {selectedMatch?.team2?.length || 0} игроков
                </Typography>
              </Paper>
            </Grid>
            
            {error && (
              <Grid item xs={12}>
                <Alert severity="error" sx={{ width: '100%' }}>
                  {error}
                </Alert>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleClose} variant="outlined">Отмена</Button>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={addPlayer}
            disabled={!playerName || !playerPhone || !selectedTeam}
          >
            Подтвердить запись
          </Button>
        </DialogActions>
      </Dialog>

      {/* Списки записей с аккордеоном */}
      <Box mt={6}>
        <Typography variant="h5" align="center" gutterBottom>
          Текущие записи
        </Typography>
        
        {matches.length > 0 ? (
          matches.map((match) => (
            <Accordion 
              key={match.id} 
              expanded={expandedMatch === match.id}
              onChange={handleAccordionChange(match.id)}
              sx={{ mb: 2, border: '1px solid #ddd', borderRadius: 1 }}
            >
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  <Schedule sx={{ mr: 2, color: 'action.active' }} />
                  <Typography variant="h6" sx={{ flexGrow: 1 }}>
                    {match.time}
                  </Typography>
                  <Typography variant="subtitle2" color="text.secondary">
                    {(match.team1?.length || 0) + (match.team2?.length || 0)} игроков
                  </Typography>
                </Box>
              </AccordionSummary>
              
              <AccordionDetails>
                <Grid container spacing={3}>
                  {['team1', 'team2'].map((team) => (
                    <Grid item xs={12} md={6} key={team}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography 
                            variant="subtitle1" 
                            gutterBottom 
                            sx={{ 
                              fontWeight: 'bold',
                              color: team === 'team1' ? 'primary.main' : 'secondary.main'
                            }}
                          >
                            {team === 'team1' ? 'Команда 1' : 'Команда 2'}
                            <Typography 
                              component="span" 
                              sx={{ 
                                ml: 1,
                                fontSize: '0.8rem',
                                color: 'text.secondary'
                              }}
                            >
                              ({match[team]?.length || 0} игроков)
                            </Typography>
                          </Typography>
                          
                          {!match[team] || match[team].length === 0 ? (
                            <Typography 
                              variant="body2" 
                              color="text.secondary" 
                              align="center" 
                              py={2}
                            >
                              Нет записей
                            </Typography>
                          ) : (
                            <List dense>
                              {match[team].map((player) => (
                                <ListItem 
                                  key={player.id} 
                                  sx={{ 
                                    borderBottom: '1px solid #f5f5f5',
                                    '&:hover': { backgroundColor: '#f9f9f9' }
                                  }}
                                >
                                  <ListItemText
                                    primary={player.name}
                                    secondary={player.phone}
                                  />
                                  <ListItemSecondaryAction>
                                    <IconButton
                                      edge="end"
                                      onClick={() => removePlayer(match.id, team, player.id)}
                                      size="small"
                                    >
                                      <Delete color="error" fontSize="small" />
                                    </IconButton>
                                  </ListItemSecondaryAction>
                                </ListItem>
                              ))}
                            </List>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </AccordionDetails>
            </Accordion>
          ))
        ) : (
          <Typography variant="body1" align="center" color="text.secondary">
            Нет данных о матчах
          </Typography>
        )}
      </Box>

      {/* Уведомления */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.message.includes('Ошибка') ? "error" : "success"}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default App;