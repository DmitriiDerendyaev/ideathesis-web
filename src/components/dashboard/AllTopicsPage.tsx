import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, List, ListItem, ListItemButton, ListItemText, Divider, CircularProgress, Alert, Table, TableBody, TableCell, TableHead, TableRow, TableContainer, Avatar, Stack, Chip, AppBar, Toolbar, Button, Container } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { topicsService } from '../../services/topics.service';
import { usersService } from '../../services/users.service';
import { useNavigate } from 'react-router-dom';
import type { TopicStatus } from '../../types';

interface PendingTopicSelectionDto {
  topic: {
    id: number;
    title: string;
    description: string;
    actuality: string;
    problems: string;
    status: TopicStatus;
    recommendedSkills?: string[];
  };
  studentGuid: string;
  createdAt?: string;
}

interface TopicChangeLogDto {
  id: number;
  topicId: number;
  studentGuid: string;
  title: string;
  description: string;
  actuality: string;
  problems: string;
  status: TopicStatus;
  changeTime: string;
  skills: string[];
}

interface TopicCommentDto {
  id: number;
  topicId: number;
  authorType: string;
  authorGuid: string;
  commentText: string;
  createdAt: string;
  parentCommentId?: number | null;
}

const AllTopicsPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [topics, setTopics] = useState<PendingTopicSelectionDto[]>([]);
  const [selected, setSelected] = useState<PendingTopicSelectionDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studentNames, setStudentNames] = useState<Record<string, string>>({});
  const [teacherNames, setTeacherNames] = useState<Record<string, string>>({});
  const [comments, setComments] = useState<TopicCommentDto[]>([]);
  const [history, setHistory] = useState<TopicChangeLogDto[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Получение всех заявок и имён студентов/преподавателей
  useEffect(() => {
    const fetchTopics = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!user?.guid) return;
        const data = await topicsService.getAllTopicsForTeacher(user.guid);
        setTopics(data);
        if (data.length > 0) setSelected(data[0]);
        // Получить имена студентов
        const uniqueStudentGuids = Array.from(new Set(data.map((item: any) => String(item.studentGuid)))) as string[];
        const names: Record<string, string> = {};
        await Promise.all(uniqueStudentGuids.map(async (guid) => {
          try {
            const student = await usersService.getStudentByGuid(guid);
            names[guid] = student.fullName;
          } catch {
            names[guid] = guid;
          }
        }));
        setStudentNames(names);
      } catch {
        setError('Ошибка загрузки заявок');
      } finally {
        setLoading(false);
      }
    };
    fetchTopics();
  }, [user?.guid]);

  // Получение деталей (комментарии, история) и имён авторов комментариев
  useEffect(() => {
    const fetchDetails = async () => {
      if (!selected) return;
      setDetailsLoading(true);
      try {
        const [commentsData, historyData] = await Promise.all([
          topicsService.getTopicComments(selected.topic.id),
          topicsService.getTopicHistory(selected.topic.id),
        ]);
        setComments(commentsData);
        setHistory(historyData);
        // Собрать всех авторов комментариев
        const teacherGuids = Array.from(new Set(commentsData.filter(c => c.authorType === 'TEACHER').map(c => c.authorGuid))) as string[];
        const studentGuids = Array.from(new Set(commentsData.filter(c => c.authorType === 'STUDENT').map(c => c.authorGuid))) as string[];
        const teacherNamesMap: Record<string, string> = {};
        const studentNamesMap: Record<string, string> = { ...studentNames };
        await Promise.all([
          ...teacherGuids.map(async (guid) => {
            try {
              const teacher = await usersService.getEmployeeByGuid(guid);
              teacherNamesMap[guid] = teacher.fullName;
            } catch {
              teacherNamesMap[guid] = guid;
            }
          }),
          ...studentGuids.filter(guid => !studentNamesMap[guid]).map(async (guid) => {
            try {
              const student = await usersService.getStudentByGuid(guid);
              studentNamesMap[guid] = student.fullName;
            } catch {
              studentNamesMap[guid] = guid;
            }
          })
        ]);
        setTeacherNames(teacherNamesMap);
        setStudentNames(prev => ({ ...prev, ...studentNamesMap }));
      } catch {
        // ignore
      } finally {
        setDetailsLoading(false);
      }
    };
    if (selected) fetchDetails();
    // eslint-disable-next-line
  }, [selected]);

  if (loading) return <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh"><CircularProgress /></Box>;
  if (error) return <Alert severity="error">{error}</Alert>;

  // Комментарии: сортировка по дате (сначала свежие)
  const sortedComments = [...comments].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <Box minHeight="100vh" minWidth="100vw" display="flex" flexDirection="column" sx={{ background: 'linear-gradient(120deg, #fafdff 0%, #f7f7fa 100%)' }}>
      {/* Header */}
      <AppBar position="static" color="primary" elevation={1} sx={{ borderRadius: 0, boxShadow: 2 }}>
        <Toolbar sx={{ minHeight: 64 }}>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700, color: 'common.white', letterSpacing: 1 }}>
            Управление темами ВКР
          </Typography>
          <Button color="inherit" onClick={() => navigate('/dashboard')}>Главная</Button>
          <Button color="inherit" onClick={() => navigate('/all-topics')}>Все заявки</Button>
          <Button color="inherit" onClick={logout}>Выход</Button>
        </Toolbar>
      </AppBar>
      <Box display="flex" flex={1} height="100%" width="100%" bgcolor="transparent" sx={{ py: 4, px: { xs: 1, md: 6 }, gap: 4 }}>
        {/* Список заявок */}
        <Box width={400} maxWidth={480} bgcolor="background.paper" borderRight={1} borderColor="divider" p={4} sx={{ boxShadow: 3, borderRadius: 4, minWidth: 320, mr: 4, display: { xs: 'none', md: 'block' } }}>
          <Typography variant="h5" fontWeight={700} mb={3} color="primary">Все заявки</Typography>
          <List sx={{ maxHeight: '80vh', overflowY: 'auto', pr: 1 }}>
            {topics.map((item) => (
              <ListItem key={item.topic.id} disablePadding sx={{ mb: 2 }}>
                <ListItemButton selected={selected?.topic.id === item.topic.id} onClick={() => setSelected(item)} sx={{ borderRadius: 3, boxShadow: selected?.topic.id === item.topic.id ? 3 : 0, bgcolor: selected?.topic.id === item.topic.id ? 'primary.50' : 'background.paper', transition: 'all 0.2s', py: 2 }}>
                  <ListItemText
                    primary={<Typography fontWeight={600}>{item.topic.title}</Typography>}
                    secondary={<>
                      <Chip label={studentNames[item.studentGuid] || item.studentGuid} size="small" color="info" sx={{ mt: 0.5 }} />
                      {item.createdAt && <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>{new Date(item.createdAt).toLocaleDateString()}</Typography>}
                    </>}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
        {/* Детали заявки */}
        <Box flex={1} minWidth={0} p={0} display="flex" flexDirection="column" gap={4}>
          {selected ? (
            <Paper sx={{ p: { xs: 2, md: 5 }, mb: 4, borderRadius: 5, boxShadow: 4, bgcolor: 'background.paper', minHeight: 220 }}>
              <Typography variant="h4" fontWeight={800} mb={2} color="primary.dark" sx={{ letterSpacing: 1 }}>{selected.topic.title}</Typography>
              <Divider sx={{ mb: 3 }} />
              <Stack direction="row" spacing={2} mb={3} alignItems="center">
                <Chip label={studentNames[selected.studentGuid] || selected.studentGuid} color="info" />
                <Chip label={selected.topic.status} color="secondary" />
              </Stack>
              <Typography color="text.secondary" mb={2} fontSize={18}><b>Описание:</b> {selected.topic.description}</Typography>
              {selected.topic.actuality && (
                <Typography color="text.secondary" mb={2} fontSize={16}><b>Актуальность:</b> {selected.topic.actuality}</Typography>
              )}
              {selected.topic.problems && (
                <Typography color="text.secondary" mb={2} fontSize={16}><b>Проблемы:</b> {selected.topic.problems}</Typography>
              )}
              {selected.topic.recommendedSkills && selected.topic.recommendedSkills.length > 0 && (
                <Typography color="text.secondary" mb={2} fontSize={16}><b>Навыки:</b> {selected.topic.recommendedSkills.join(', ')}</Typography>
              )}
            </Paper>
          ) : (
            <Typography color="text.secondary">Выберите заявку из списка</Typography>
          )}
          {/* Комментарии */}
          {selected && (
            <Paper sx={{ p: { xs: 2, md: 5 }, mb: 4, borderRadius: 5, boxShadow: 2, bgcolor: 'background.paper', minHeight: 180 }}>
              <Typography variant="h5" fontWeight={700} mb={3} color="primary">Комментарии</Typography>
              {detailsLoading ? <CircularProgress /> : (
                sortedComments.length === 0 ? <Typography color="text.secondary">Нет комментариев</Typography> :
                  <Box sx={{ maxHeight: 320, overflowY: 'auto', pr: 1 }}>
                    <Stack spacing={3}>
                      {sortedComments.map((c, idx) => {
                        const isTeacher = c.authorType === 'TEACHER';
                        const name = isTeacher ? teacherNames[c.authorGuid] || 'Преподаватель' : studentNames[c.authorGuid] || 'Студент';
                        return (
                          <Box key={c.id || idx} display="flex" alignItems="flex-start" gap={2}>
                            <Avatar sx={{ bgcolor: isTeacher ? 'primary.main' : 'info.main', width: 44, height: 44, fontWeight: 700, fontSize: 22 }}>
                              {name[0]}
                            </Avatar>
                            <Box flex={1}>
                              <Typography fontWeight={700} color={isTeacher ? 'primary.dark' : 'info.dark'} fontSize={17}>{name}</Typography>
                              <Typography color="text.secondary" sx={{ mb: 0.5 }} fontSize={16}>{c.commentText}</Typography>
                              <Typography variant="caption" color="text.disabled">{new Date(c.createdAt).toLocaleString()}</Typography>
                            </Box>
                          </Box>
                        );
                      })}
                    </Stack>
                  </Box>
              )}
            </Paper>
          )}
          {/* История изменений */}
          {selected && (
            <Paper sx={{ p: { xs: 2, md: 5 }, borderRadius: 5, boxShadow: 1, bgcolor: 'background.paper' }}>
              <Typography variant="h5" fontWeight={700} mb={3} color="primary">История изменений</Typography>
              {detailsLoading ? <CircularProgress /> : (
                history.length === 0 ? <Typography color="text.secondary">Нет истории изменений</Typography> :
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Дата</TableCell>
                          <TableCell>Статус</TableCell>
                          <TableCell>Название</TableCell>
                          <TableCell>Навыки</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {history.map(h => (
                          <TableRow key={h.id}>
                            <TableCell>{new Date(h.changeTime).toLocaleString()}</TableCell>
                            <TableCell>{h.status}</TableCell>
                            <TableCell>{h.title}</TableCell>
                            <TableCell>{h.skills?.join(', ')}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
              )}
            </Paper>
          )}
        </Box>
      </Box>
      {/* Footer */}
      <Box sx={{ bgcolor: 'grey.50', py: 3, borderTop: '1px solid #e0e0e0', mt: 'auto' }}>
        <Container maxWidth={false} sx={{ px: { xs: 2, sm: 4, md: 6 } }}>
          <Box display="flex" justifyContent="center" gap={{ xs: 2, sm: 6 }} flexWrap="wrap">
            <Button color="inherit" onClick={() => navigate('/dashboard')}>Главная</Button>
            <Button color="inherit" onClick={() => navigate('/all-topics')}>Все заявки</Button>
            <Button color="inherit" onClick={logout}>Выход</Button>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default AllTopicsPage; 