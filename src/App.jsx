import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
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
  CircularProgress,
  AppBar,
  Toolbar,
  useMediaQuery
} from '@mui/material';
import { 
  Delete, 
  SportsSoccer,
  ExpandMore,
  Schedule,
  Close,
  WhatsApp,
  Telegram
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
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
      
      // Проверяем необходимость сброса данных
      const today = getTodayDateString();
      if (resetDate !== today) {
        resetData(today);
      }
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
      match1: { time: 'ИГРА-20:00', team1: [], team2: [] },
      match2: { time: 'ИГРА-21:00', team1: [], team2: [] },
      match3: { time: 'ИГРА-22:00', team1: [], team2: [] }
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
    //public/dffdss.jpg
    <>
<Box
      sx={{
        minHeight: '100vh',
        backgroundImage: 'url(images/dffdss.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        backgroundRepeat: 'no-repeat',
      }}
    >
       {/* AppBar с контактами */}
      <AppBar position="sticky" sx={{ mb: 2 }}>
        <Toolbar>
          <SportsSoccer sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }} color='white'>
            Футбол в Грозном
          </Typography>
          
          {/* Иконки мессенджеров */}
          <IconButton 
            color="inherit" 
            href="https://wa.me/79288384941" // Замените на свой номер
            target="_blank"
            sx={{ mx: 0.5 }}
          >
            <WhatsApp fontSize={isMobile ? "small" : "medium"} />
          </IconButton>
          <IconButton 
            color="inherit" 
            href="https://t.me/my_mach95" // Замените на свой username
            target="_blank"
            sx={{ mx: 0.5 }}
          >
            <Telegram fontSize={isMobile ? "small" : "medium"} />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 1, pb: isMobile ? 7 : 4 }}>
        {/* Информация о времени до сброса */}
        {!isMobile && (
          <Box textAlign="center" mb={3}>
            <Typography variant="subtitle1" gutterBottom color='white'>
              Наш адрес."ул. Мохаммеда Бен Зайеда Аль Нахайяна,4А"
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Данные обновятся через: {timeUntilReset}
            </Typography>
          </Box>
        )}

        {/* Карточки матчей */}
        <Grid container spacing={isMobile ? 1 : 2} justifyContent="center">
          {matches.length > 0 ? (
            matches.map((match) => (
              <Grid key={match.id} xs={12} sm={6} md={4}>
                <Card sx={{ 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  border: '2px solid',
                  borderColor: 'primary.main'
                }}>
                  <CardContent sx={{ flexGrow: 1, p: isMobile ? 1 : 2 }}>
                    <Box display="flex" alignItems="center" justifyContent="center">
                      <Schedule sx={{ mr: 1, fontSize: isMobile ? '1rem' : '1.25rem' }} />
                      <Typography variant={isMobile ? "subtitle1" : "h6"} align="center">
                        {match.time}
                      </Typography>
                    </Box>
                    
                    <Grid container spacing={0} mt={1}>
                      <Grid xs={6} sx={{ textAlign: 'center' }}>
                        <Typography variant="body2">1 Команда- - </Typography>
                        <Typography variant="caption" color="text.secondary">
                          ({match.team1?.length || 0})
                        </Typography>
                      </Grid>
                      <Grid xs={6} sx={{ textAlign: 'center' }}>
                        <Typography variant="body2">Команда 2</Typography>
                        <Typography variant="caption" color="text.secondary">
                          ({match.team2?.length || 0})
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                  
                  <Box sx={{ p: isMobile ? 1 : 2 }}>
                    <Button 
                      variant="contained" 
                      size={isMobile ? "small" : "medium"}
                      fullWidth
                      onClick={() => handleOpen(match)}
                    >
                      Записаться
                    </Button>
                  </Box>
                </Card>
              </Grid>
            ))
          ) : (
            <Grid xs={12}>
              <Typography variant="h6" align="center" color="text.secondary">
                Нет доступных матчей
              </Typography>
            </Grid>
          )}
        </Grid>

        {/* Списки записей */}
        <Box mt={isMobile ? 2 : 4}>
          <Typography variant="h6" align="center" gutterBottom>
            Текущие записи
          </Typography>
          
          {matches.length > 0 ? (
            matches.map((match) => (
              <Accordion 
                key={match.id}
                expanded={expandedMatch === match.id}
                onChange={handleAccordionChange(match.id)}
                sx={{ mb: 1 }}
              >
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Box sx={{ width: '100%' }}>
                    <Typography variant="subtitle1">
                      {match.time} <Typography component="span" color="text.secondary">({(match.team1?.length || 0) + (match.team2?.length || 0)})</Typography>
                    </Typography>
                  </Box>
                </AccordionSummary>
                
                <AccordionDetails sx={{ p: isMobile ? 0 : 2 }}>
                  <Grid container spacing={20}>
                    <Grid xs={12} sm={6}>
                      <Paper elevation={0} sx={{ p: 1 }}>
                        <Typography variant="body2" fontWeight="bold">
                          Команда 1
                        </Typography>
                        <List dense>
                          {match.team1?.map((player) => (
                            <ListItem key={player.id} sx={{ px: 0 }}>
                              <ListItemText
                                primary={player.name}
                                secondary={player.phone}
                                primaryTypographyProps={{ variant: 'body2' }}
                              />
                              <ListItemSecondaryAction>
                                <IconButton
                                  edge="end"
                                  size="small"
                                  onClick={() => removePlayer(match.id, 'team1', player.id)}
                                >
                                  <Delete fontSize="large" 
                                    sx={{ 
    color: '#ff0000', // HEX-код цвета
    marginLeft: 1,    // 8px (тема умножает на 8)
    marginRight: -7,   // 16px
    padding: 1,       // 8px со всех сторон
  }}
                                   />
                                   
                                </IconButton>
                              </ListItemSecondaryAction>
                            </ListItem>
                          ))}
                          {!match.team1 || match.team1.length === 0 && (
                            <Typography variant="body2" color="text.secondary" align="center" py={1}>
                              Нет записей
                            </Typography>
                          )}
                        </List>
                      </Paper>
                    </Grid>
                    <Grid xs={12} sm={6}>
                      <Paper elevation={0} sx={{ p: 1 }}>
                        <Typography variant="body2" fontWeight="bold">
                          Команда 2
                        </Typography>
                        <List dense>
                          {match.team2?.map((player) => (
                            <ListItem key={player.id} sx={{ px: 0 }}>
                              <ListItemText
                                primary={player.name}
                                secondary={player.phone}
                                primaryTypographyProps={{ variant: 'body2' }}
                              />
                              <ListItemSecondaryAction>
                                <IconButton
                                  edge="end"
                                  size="small"
                                  onClick={() => removePlayer(match.id, 'team2', player.id)}
                                >
                                  <Delete fontSize="large"
                                  sx={{ 
                                        color: '#ff0000',
                                         marginLeft: 1,    
                                         marginRight: -7,   
                                         padding: 1,       
                                            }} />
                                </IconButton>
                              </ListItemSecondaryAction>
                            </ListItem>
                          ))}
                          {!match.team2 || match.team2.length === 0 && (
                            <Typography variant="body2" color="text.secondary" align="center" py={1}>
                              Нет записей
                            </Typography>
                          )}
                        </List>
                      </Paper>
                    </Grid>
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

        {/* Модальное окно записи */}
        <Dialog 
          open={openModal} 
          onClose={handleClose}
          fullScreen={isMobile}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle sx={{ 
            bgcolor: 'primary.main', 
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            py: isMobile ? 1 : 2
          }}>
            <span>Запись на {selectedMatch?.time}</span>
            <IconButton onClick={handleClose} sx={{ color: 'white' }}>
              <Close />
            </IconButton>
          </DialogTitle>
          
          <DialogContent sx={{ py: 2 }}>
            <TextField
              label="ФИО"
              fullWidth
              margin="normal"
              size={isMobile ? "small" : "medium"}
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              autoFocus
            />
            
            <TextField
              label="Номер телефона"
              fullWidth
              margin="normal"
              size={isMobile ? "small" : "medium"}
              value={playerPhone}
              onChange={(e) => setPlayerPhone(e.target.value)}
            />
            
            <Typography variant="subtitle2" mt={2} mb={1}>
              Выберите команду:
            </Typography>
            
            <Grid container spacing={1}>
              <Grid xs={6}>
                <Button
                  fullWidth
                  variant={selectedTeam === 'team1' ? 'contained' : 'outlined'}
                  size={isMobile ? "small" : "medium"}
                  onClick={() => setSelectedTeam('team1')}
                  sx={{ py: 1 }}
                >
                  Команда 1
                </Button>
              </Grid>
              <Grid xs={6}>
                <Button
                  fullWidth
                  variant={selectedTeam === 'team2' ? 'contained' : 'outlined'}
                  size={isMobile ? "small" : "medium"}
                  onClick={() => setSelectedTeam('team2')}
                  sx={{ py: 1 }}
                >
                  Команда 2
                </Button>
              </Grid>
            </Grid>
            
            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </DialogContent>
          
          <DialogActions sx={{ px: isMobile ? 1 : 3, py: isMobile ? 1 : 2 }}>
            <Button 
              onClick={handleClose}
              size={isMobile ? "small" : "medium"}
              variant="outlined"
            >
              Отмена
            </Button>
            <Button 
              variant="contained"
              onClick={addPlayer}
              disabled={!playerName || !playerPhone || !selectedTeam}
              size={isMobile ? "small" : "medium"}
            >
              Подтвердить
            </Button>
          </DialogActions>
        </Dialog>

        {/* Уведомления */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={3000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ 
            vertical: isMobile ? 'bottom' : 'top', 
            horizontal: 'center' 
          }}
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
      <CssBaseline /> {/* Сбрасываем стандартные стили браузера */}
      {/* Остальной код вашего приложения */}
    </Box>
    
     
    </>
  );
};

export default App;