import React, { useEffect, useState } from 'react';
import {
  AppBar, Toolbar, Typography, Button, Box, Container, Paper, Avatar, TextField, CircularProgress, Alert, InputBase,
  ButtonGroup, Modal, Table, TableBody, TableCell, TableContainer, TableHead, TableRow
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
import { useTheme } from '@mui/material/styles';
import { authService } from '../../services/auth.service';
import { transliterate as tr } from 'transliteration';

interface PendingTopic {
  topic: Topic;
  studentGuid: string;
  createdAt?: string;
}

interface StudentAllDto {
  guid: string;
  fullName: string;
  email: string;
  userType: string;
  course: number;
  studentGroup: { name: string };
  department: { name: string };
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
  const theme = useTheme();
  const isCommentEmpty = comment.trim() === '';
  const [commentErrorMessage, setCommentErrorMessage] = useState<string | null>(null);
  
  // Состояние для модального окна студентов
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [departmentName, setDepartmentName] = useState('');
  const [studentFullName, setStudentFullName] = useState('');
  const [studentResults, setStudentResults] = useState<StudentAllDto[]>([]);
  const [studentLoading, setStudentLoading] = useState(false);
  const [studentError, setStudentError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfileAndTopics = async () => {
      try {
        if (!user?.guid) return;
        setLoading(true);
        const profileData = await usersService.getEmployeeByGuid(user.guid);
        setProfile(profileData);
        const response = await topicsService.getPendingTopicsRaw(user.guid);
        setPendingTopics(response);
        if (response.length > 0) setSelectedTopic(response[0]);
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
    if (isCommentEmpty) {
      setCommentErrorMessage('Необходимо ввести комментарий.');
      return;
    }
    setLoading(true);
    try {
      const commentText = comment.trim() ||
        (status === TopicStatus.APPROVED ? 'Утвердить' : status === TopicStatus.REJECTED ? 'Отклонить' : 'Требуется уточнение');
      await topicsService.addComment(
        selectedTopic.topic.id,
        commentText,
        profile?.guid || ''
      );
      await topicsService.updateTopicStatusWithStudent(
        selectedTopic.topic.id,
        status,
        selectedTopic.studentGuid
      );
      setPendingTopics((prev) => prev.filter((t) => t.topic.id !== selectedTopic.topic.id));
      setSelectedTopic(null);
      setComment('');
      setCommentErrorMessage(null);
    } catch {
      setError('Ошибка при отправке решения');
    } finally {
      setLoading(false);
    }
  };

  const handleStudentSearch = async () => {
    setStudentLoading(true);
    setStudentError(null);
    try {
      const data = await usersService.searchStudents(groupName, departmentName, studentFullName);
      setStudentResults(data.content || data);
    } catch (e) {
      setStudentError('Ошибка поиска студентов');
    } finally {
      setStudentLoading(false);
    }
  };

  const handleGenerateStudentCredentials = async (student: StudentAllDto) => {
    try {
      const username = getInitialsAndSurnameLatin(student.fullName);
      const password = generateReadablePassword();
      await authService.generateCredentials(student.guid, username, password);
      // Формируем CSV
      const csv = `ФИО,Группа,Username,Password\n"${student.fullName}","${student.studentGroup?.name || ''}","${username}","${password}"\n`;
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `student_credentials_${username}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Ошибка генерации учетных данных');
    }
  };

  function getInitialsAndSurnameLatin(fullName: string) {
    const parts = fullName.trim().split(' ');
    if (parts.length < 2) return tr(fullName);
    const surname = tr(parts[0]);
    const initials = parts.slice(1).map(p => tr(p[0])).join('');
    return `${initials}${surname}`;
  }

  function generateReadablePassword() {
    const words = ['Sun', 'Book', 'Cat', 'Dog', 'Sky', 'Tree', 'Star', 'Fish', 'Moon', 'Bird', 'Fox', 'Wolf', 'Bear', 'Lion', 'Rose', 'Leaf', 'Wind', 'Rain', 'Snow', 'Fire'];
    const word = words[Math.floor(Math.random() * words.length)];
    const digits = Math.floor(10 + Math.random() * 90);
    return `${word}${digits}`;
  }

  if (loading || !profile) return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
      <CircularProgress />
    </Box>
  );
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box minHeight="100vh" display="flex" flexDirection="column" width="100%">
      {/* Header */}
      <AppBar position="static" color="primary" elevation={1}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700, color: 'common.white' }}>
            Управление темами ВКР
          </Typography>
          <Button color="inherit">Главная</Button>
          <Button color="inherit">Уведомления</Button>
          <Button color="inherit" onClick={() => setStudentModalOpen(true)}>Генерация данных студентов</Button>
          <Box sx={{ mx: 2, display: 'flex', alignItems: 'center', bgcolor: 'background.paper', borderRadius: 1, px: 1 }}>
            <SearchIcon sx={{ color: 'text.secondary' }} />
            <InputBase placeholder="Search in site" sx={{ ml: 1, flex: 1, color: 'text.primary' }} />
          </Box>
          <Button variant="outlined" color="inherit" sx={{ ml: 2 }} onClick={logout} startIcon={<LogoutIcon />}>
            Выход
          </Button>
        </Toolbar>
      </AppBar>

      {/* Модальное окно для студентов */}
      <Modal open={studentModalOpen} onClose={() => setStudentModalOpen(false)}>
        <Paper sx={{ p: 4, maxWidth: 800, mx: 'auto', mt: 10, maxHeight: '80vh', overflow: 'auto' }}>
          <Typography variant="h6" mb={2}>Поиск студента</Typography>
          <Box display="flex" gap={2} mb={2} flexWrap="wrap">
            <TextField
              label="Группа"
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              sx={{ minWidth: 150 }}
            />
            <TextField
              label="Кафедра"
              value={departmentName}
              onChange={e => setDepartmentName(e.target.value)}
              sx={{ minWidth: 150 }}
            />
            <TextField
              label="ФИО"
              value={studentFullName}
              onChange={e => setStudentFullName(e.target.value)}
              sx={{ minWidth: 150 }}
            />
            <Button variant="contained" onClick={handleStudentSearch} disabled={studentLoading}>
              {studentLoading ? <CircularProgress size={20} /> : 'Поиск'}
            </Button>
          </Box>
          {studentError && <Alert severity="error" sx={{ mb: 2 }}>{studentError}</Alert>}
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ФИО</TableCell>
                  <TableCell>Группа</TableCell>
                  <TableCell>Кафедра</TableCell>
                  <TableCell>Курс</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Действия</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {studentResults.map(student => (
                  <TableRow key={student.guid}>
                    <TableCell>{student.fullName}</TableCell>
                    <TableCell>{student.studentGroup?.name || '—'}</TableCell>
                    <TableCell>{student.department?.name || '—'}</TableCell>
                    <TableCell>{student.course || '—'}</TableCell>
                    <TableCell>{student.email || '—'}</TableCell>
                    <TableCell>
                      <Button
                        variant="outlined"
                        onClick={() => handleGenerateStudentCredentials(student)}
                      >
                        Сгенерировать
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Modal>

      {/* Profile */}
      <Container maxWidth={false} sx={{ px: { xs: 2, sm: 4, md: 6 }, py: 4 }}>
        <Paper elevation={3} sx={{ py: 4, px: { xs: 2, sm: 4 }, bgcolor: 'background.paper', width: '100%' }}>
          <Box display="flex" alignItems="center">
            <Avatar sx={{ width: 80, height: 80, bgcolor: 'primary.main', mr: 3 }}>
              {profile.fullName ? profile.fullName[0] : ''}
            </Avatar>
            <Box>
              <Typography variant="h5" fontWeight={700} color="text.primary">{profile.fullName}</Typography>
              <Button size="small" variant="contained" color="primary" sx={{ mt: 1, mb: 1 }}>
                {profile.role || 'Преподаватель'}
              </Button>
              <Typography variant="body1" color="text.secondary">Добро пожаловать! Здесь вы можете управлять заявками студентов.</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Email: {profile.email || '—'}</Typography>
            </Box>
          </Box>
        </Paper>
      </Container>

      {/* Main Content */}
      <Container maxWidth={false} sx={{ flex: 1, py: 4, px: { xs: 2, sm: 4, md: 6 } }}>
        <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} gap={{ xs: 4, md: 6 }} alignItems="flex-start" width="100%">
          {/* Список заявок 2/3 */}
          <Box flex={{ md: 2 }} width="100%">
            <Typography variant="h3" fontWeight={700} mb={1} color="text.primary">Список заявок</Typography>
            <Typography variant="subtitle1" mb={3} color="text.secondary">Последние заявки, требующие действий</Typography>
            <Box sx={{ width: '100%' }}>
              {pendingTopics.length === 0 && (
                <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 1, mb: 2, bgcolor: 'background.paper', width: '100%' }}>
                  <Typography color="text.secondary">Нет заявок</Typography>
                </Paper>
              )}
              {pendingTopics.map((pending) => {
                const isSelected = selectedTopic?.topic.id === pending.topic.id;
                return (
                  <Paper
                    key={pending.topic.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      p: 2,
                      mb: 2,
                      borderRadius: 2,
                      boxShadow: isSelected ? 4 : 1,
                      border: isSelected ? `2px solid ${theme.palette.primary.main}` : `1px solid ${theme.palette.divider}`,
                      cursor: 'pointer',
                      transition: 'box-shadow 0.2s, border 0.2s',
                      '&:hover': {
                        boxShadow: 3,
                        border: `2px solid ${theme.palette.primary.main}`,
                      },
                      width: '100%',
                    }}
                    onClick={() => handleSelectTopic(pending)}
                  >
                    <Avatar sx={{ bgcolor: 'warning.main', width: 56, height: 56, mr: 2 }}>
                      <EmojiEmotionsIcon fontSize="large" />
                    </Avatar>
                    <Box flex={1}>
                      <Typography fontWeight={700} fontSize={18} color="text.primary">{pending.topic.title}</Typography>
                      <Typography color="text.secondary" fontSize={15} mt={0.5}>
                        {studentNames[pending.studentGuid] || pending.studentGuid}
                      </Typography>
                    </Box>
                    <Box minWidth={180} textAlign="right">
                      <Typography color="text.secondary" fontSize={14}>
                        {pending.createdAt ? new Date(pending.createdAt).toLocaleString() : '—'}
                      </Typography>
                    </Box>
                  </Paper>
                );
              })}
            </Box>
          </Box>

          {/* Детали заявки 1/3 */}
          <Box flex={{ md: 1 }} width="100%">
            <Typography variant="h3" fontWeight={700} mb={1} color="text.primary">Детали заявки</Typography>
            <Typography mb={2} color="text.secondary">Здесь вы можете утвердить, отклонить или запросить уточнения по заявке.</Typography>
            <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 2, bgcolor: 'background.paper', width: '100%' }}>
              {selectedTopic ? (
                <>
                  <Typography variant="h6" fontWeight={700} mb={1} color="text.primary">{selectedTopic.topic.title}</Typography>
                  <Typography color="text.secondary" mb={1}><b>Описание:</b> {selectedTopic.topic.description}</Typography>
                  {selectedTopic.topic.actuality && (
                    <Typography color="text.secondary" mb={1}><b>Актуальность:</b> {selectedTopic.topic.actuality}</Typography>
                  )}
                  {selectedTopic.topic.problems && (
                    <Typography color="text.secondary" mb={1}><b>Проблемы:</b> {selectedTopic.topic.problems}</Typography>
                  )}
                  {selectedTopic.topic.recommendedSkills && selectedTopic.topic.recommendedSkills.length > 0 && (
                    <Typography color="text.secondary" mb={1}><b>Навыки:</b> {selectedTopic.topic.recommendedSkills.join(', ')}</Typography>
                  )}
                  <Typography color="text.secondary" mb={2}><b>Статус:</b> {selectedTopic.topic.status}</Typography>
                  <TextField
                    label="Комментарий"
                    fullWidth
                    multiline
                    rows={3}
                    value={comment}
                    onChange={e => {
                      setComment(e.target.value);
                      if (commentErrorMessage && e.target.value.trim() !== '') {
                        setCommentErrorMessage(null);
                      }
                    }}
                    sx={{ mb: 2 }}
                  />
                  {commentErrorMessage && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                      {commentErrorMessage}
                    </Alert>
                  )}
                  <Box display="flex" flexDirection="column" gap={2}>
                    <ButtonGroup fullWidth variant="outlined" aria-label="Требуется уточнение button group">
                      <Button
                        color="primary"
                        sx={{ fontWeight: 700, py: 1, borderWidth: 2 }}
                        onClick={() => handleDecision(TopicStatus.NEEDS_REVISION)}
                      >
                        Требуется уточнение
                      </Button>
                    </ButtonGroup>
                    <ButtonGroup fullWidth aria-label="Отклонить и Утвердить button group">
                      <Button
                        variant="outlined"
                        color="error"
                        sx={{ fontWeight: 700, py: 1, borderWidth: 2 }}
                        onClick={() => handleDecision(TopicStatus.REJECTED)}
                      >
                        Отклонить
                      </Button>
                      <Button
                        variant="contained"
                        color="success"
                        sx={{ fontWeight: 700, py: 1, borderRadius: 2 }}
                        onClick={() => handleDecision(TopicStatus.APPROVED)}
                      >
                        Утвердить
                      </Button>
                    </ButtonGroup>
                  </Box>
                </>
              ) : (
                <Typography color="text.secondary">Выберите заявку из списка</Typography>
              )}
            </Paper>
          </Box>
        </Box>
      </Container>

      {/* Footer */}
      <Box sx={{ bgcolor: 'grey.50', py: 3, borderTop: `1px solid ${theme.palette.divider}`, mt: 'auto' }}>
        <Container maxWidth={false} sx={{ px: { xs: 2, sm: 4, md: 6 } }}>
          <Box display="flex" justifyContent="center" gap={{ xs: 2, sm: 6 }} flexWrap="wrap">
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