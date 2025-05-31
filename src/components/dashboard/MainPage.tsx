import React, { useEffect, useState } from 'react';
import {
  AppBar, Toolbar, Typography, Button, Box, Container, Paper, Avatar, TextField, List, ListItem, ListItemAvatar, ListItemText, ListItemSecondaryAction, CircularProgress, Alert, InputBase
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import LogoutIcon from '@mui/icons-material/Logout';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import { useAuth } from '../../contexts/AuthContext';
import { usersService } from '../../services/users.service';
import { topicsService } from '../../services/topics.service';
import { useNavigate } from 'react-router-dom';
import type { Topic, User } from '../../types';
import { TopicStatus } from '../../types';

interface PendingTopic {
  topic: Topic;
  studentGuid: string;
  createdAt?: string;
}

const MainPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<User | null>(null);
  const [pendingTopics, setPendingTopics] = useState<PendingTopic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<PendingTopic | null>(null);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studentNames, setStudentNames] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchProfileAndTopics = async () => {
      try {
        if (!user?.guid) return;
        setLoading(true);
        const profileData = await usersService.getEmployeeByGuid(user.guid);
        setProfile(profileData);
        // Получаем заявки (с studentGuid)
        const response = await topicsService.getPendingTopicsRaw(user.guid);
        setPendingTopics(response);
        if (response.length > 0) setSelectedTopic(response[0]);
        // Получаем ФИО студентов
        const uniqueGuids = Array.from(new Set(response.map((item: any) => item.studentGuid)));
        const names: Record<string, string> = {};
        await Promise.all(uniqueGuids.map(async (guid) => {
          try {
            const student = await usersService.getStudentByGuid(guid);
            names[guid] = student.fullName;
          } catch {
            names[guid] = guid;
          }
        }));
        setStudentNames(names);
      } catch (err) {
        setError('Ошибка загрузки данных');
      } finally {
        setLoading(false);
      }
    };
    if (user?.guid) {
      fetchProfileAndTopics();
    }
  }, [user?.guid]);

  const handleSelectTopic = (pending: PendingTopic) => setSelectedTopic(pending);
  const handleDecision = async (status: TopicStatus) => {
    if (!selectedTopic) return;
    setLoading(true);
    try {
      // 1. Отправить комментарий
      const commentText = comment.trim() ||
        (status === TopicStatus.APPROVED ? 'Утвердить' : status === TopicStatus.REJECTED ? 'Отклонить' : 'Требуется уточнение');
      await topicsService.addComment(
        selectedTopic.topic.id,
        commentText,
        profile?.guid || '' // X-Teacher-Guid (если потребуется)
      );
      // 2. Изменить статус заявки с X-Student-Guid
      await topicsService.updateTopicStatusWithStudent(
        selectedTopic.topic.id,
        status,
        selectedTopic.studentGuid
      );
      setPendingTopics((prev) => prev.filter((t) => t.topic.id !== selectedTopic.topic.id));
      setSelectedTopic(null);
      setComment('');
    } catch {
      setError('Ошибка при отправке решения');
    } finally {
      setLoading(false);
    }
  };

  if (loading || !profile) return <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh"><CircularProgress /></Box>;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box minHeight="100vh" display="flex" flexDirection="column">
      {/* Header */}
      <AppBar position="static" color="default" elevation={0} sx={{ bgcolor: '#eee' }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
            Управление темами ВКР
          </Typography>
          <Button color="inherit">Главная</Button>
          <Button color="inherit">Уведомления</Button>
          <Box sx={{ mx: 2, display: 'flex', alignItems: 'center', bgcolor: '#fff', borderRadius: 1, px: 1 }}>
            <SearchIcon sx={{ color: '#888' }} />
            <InputBase placeholder="Search in site" sx={{ ml: 1, flex: 1 }} />
          </Box>
          <Button variant="contained" color="inherit" sx={{ ml: 2, bgcolor: '#222', color: '#fff', '&:hover': { bgcolor: '#000' } }} onClick={logout} startIcon={<LogoutIcon />}>Выход</Button>
        </Toolbar>
      </AppBar>

      {/* Profile */}
      <Box sx={{ bgcolor: '#555', color: '#fff', py: 4, px: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box display="flex" alignItems="center">
          <Avatar sx={{ width: 80, height: 80, bgcolor: '#bbb', mr: 3 }} />
          <Box>
            <Typography variant="h5" fontWeight={700}>{profile.fullName}</Typography>
            <Button size="small" variant="contained" sx={{ mt: 1, mb: 1, bgcolor: '#888' }}>{profile.role || 'Преподаватель'}</Button>
            <Typography>Добро пожаловать! Здесь вы можете управлять заявками студентов.</Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>Email: {profile.email || '—'}</Typography>
          </Box>
        </Box>
        <Box />
      </Box>

      {/* Main Content */}
      <Container maxWidth={false} disableGutters sx={{ flex: 1, py: 4, width: '100%' }}>
        <Box display="flex" gap={6} alignItems="flex-start">
          {/* Список заявок 2/3 */}
          <Box flex={2} sx={{ pl: 6 }}>
            <Typography variant="h3" fontWeight={700} mb={1}>Список заявок</Typography>
            <Typography variant="subtitle1" mb={3} color="#444">Последние заявки, требующие действий</Typography>
            <Box>
              {pendingTopics.length === 0 && (
                <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 1, mb: 2 }}>
                  <Typography>Нет заявок</Typography>
                </Paper>
              )}
              {pendingTopics.map((pending) => (
                <Paper
                  key={pending.topic.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    p: 2,
                    mb: 2,
                    borderRadius: 2,
                    boxShadow: selectedTopic?.topic.id === pending.topic.id ? 4 : 1,
                    border: selectedTopic?.topic.id === pending.topic.id ? '2px solid #1976d2' : '1px solid #eee',
                    cursor: 'pointer',
                    transition: 'box-shadow 0.2s, border 0.2s',
                    '&:hover': { boxShadow: 3, border: '2px solid #1976d2' },
                  }}
                  onClick={() => handleSelectTopic(pending)}
                >
                  <Avatar sx={{ bgcolor: '#ffe082', width: 56, height: 56, mr: 2 }}>
                    <EmojiEmotionsIcon fontSize="large" />
                  </Avatar>
                  <Box flex={1}>
                    <Typography fontWeight={700} fontSize={18}>{pending.topic.title}</Typography>
                    <Typography color="#888" fontSize={15} mt={0.5}>
                      {studentNames[pending.studentGuid] || pending.studentGuid}
                    </Typography>
                  </Box>
                  <Box minWidth={180} textAlign="right">
                    <Typography color="#888" fontSize={14}>
                      {pending.createdAt ? new Date(pending.createdAt).toLocaleString() : '—'}
                    </Typography>
                  </Box>
                </Paper>
              ))}
            </Box>
          </Box>

          {/* Детали заявки 1/3 */}
          <Box flex={1} sx={{ pr: 6 }}>
            <Typography variant="h3" fontWeight={700} mb={1}>Детали заявки</Typography>
            <Typography mb={2} color="#444">Здесь вы можете утвердить, отклонить или запросить уточнения по заявке.</Typography>
            <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 2 }}>
              {selectedTopic ? (
                <>
                  <Typography variant="h6" fontWeight={700} mb={1}>{selectedTopic.topic.title}</Typography>
                  <Typography color="#666" mb={1}><b>Описание:</b> {selectedTopic.topic.description}</Typography>
                  {selectedTopic.topic.actuality && (
                    <Typography color="#666" mb={1}><b>Актуальность:</b> {selectedTopic.topic.actuality}</Typography>
                  )}
                  {selectedTopic.topic.problems && (
                    <Typography color="#666" mb={1}><b>Проблемы:</b> {selectedTopic.topic.problems}</Typography>
                  )}
                  {selectedTopic.topic.recommendedSkills && selectedTopic.topic.recommendedSkills.length > 0 && (
                    <Typography color="#666" mb={1}><b>Навыки:</b> {selectedTopic.topic.recommendedSkills.join(', ')}</Typography>
                  )}
                  <Typography color="#888" mb={2}><b>Статус:</b> {selectedTopic.topic.status}</Typography>
                  <TextField
                    label="Комментарий"
                    fullWidth
                    multiline
                    rows={3}
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    sx={{ mb: 2 }}
                  />
                  <Box display="flex" gap={2}>
                    <Button variant="outlined" color="error" sx={{ fontWeight: 700, px: 4, py: 1, borderWidth: 2 }} onClick={() => handleDecision(TopicStatus.REJECTED)}>Отклонить</Button>
                    <Button variant="contained" sx={{ bgcolor: '#000', color: '#fff', fontWeight: 700, px: 4, py: 1, borderRadius: 2, '&:hover': { bgcolor: '#222' } }} onClick={() => handleDecision(TopicStatus.APPROVED)}>Утвердить</Button>
                    <Button variant="outlined" color="primary" sx={{ fontWeight: 700, px: 4, py: 1, borderWidth: 2 }} onClick={() => handleDecision(TopicStatus.PENDING)}>Требуется уточнение</Button>
                  </Box>
                </>
              ) : (
                <Typography color="#888">Выберите заявку из списка</Typography>
              )}
            </Paper>
          </Box>
        </Box>
      </Container>

      {/* Footer */}
      <Box sx={{ bgcolor: '#fafafa', py: 3, borderTop: '1px solid #eee', mt: 'auto' }}>
        <Container maxWidth="lg">
          <Box display="flex" justifyContent="center" gap={6}>
            <Button color="inherit">Контакты</Button>
            <Button color="inherit">Помощь</Button>
            <Button color="inherit">О системе</Button>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default MainPage; 