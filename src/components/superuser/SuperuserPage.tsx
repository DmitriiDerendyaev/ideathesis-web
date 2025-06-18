import React, { useState } from 'react';
import {
  Box, Button, Typography, Modal, TextField, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, CircularProgress, Alert
} from '@mui/material';
import { usersService } from '../../services/users.service';
import { authService } from '../../services/auth.service';
import { useAuth } from '../../contexts/AuthContext';
import { transliterate as tr } from 'transliteration';

interface EmployeeEmploymentAllDto {
  id: number;
  employeeGuid: string;
  jobTitle: { name: string };
  staffCategory: { name: string };
  employmentType: { name: string };
  subdivision: { name: string };
  jobState: string;
}

interface EmployeeAllDto {
  guid: string;
  fullName: string;
  email: string;
  userType: string;
  employeeEmployments: EmployeeEmploymentAllDto[];
}

function getInitialsAndSurname(fullName: string) {
  // fullName: Иванов Иван Иванович => username: IIvanov
  const parts = fullName.trim().split(' ');
  if (parts.length < 2) return fullName;
  const surname = parts[0];
  const initials = parts.slice(1).map(p => p[0]).join('');
  return `${initials}${surname}`;
}

function getInitialsAndSurnameLatin(fullName: string) {
  // fullName: Иванов Иван Иванович => username: IIvanov (латиницей)
  const parts = fullName.trim().split(' ');
  if (parts.length < 2) return tr(fullName);
  const surname = tr(parts[0]);
  const initials = parts.slice(1).map(p => tr(p[0])).join('');
  return `${initials}${surname}`;
}

function generateSimplePassword() {
  // Простой пароль: 2 буквы + 4 цифры, например: ab1234
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  const getRandom = (arr: string, n: number) => Array.from({length: n}, () => arr[Math.floor(Math.random() * arr.length)]).join('');
  return getRandom(letters, 2) + getRandom('0123456789', 4);
}

function generateReadablePassword() {
  // Пароль: слово + 2 цифры, например: Sun45, Book12, Cat99
  const words = ['Sun', 'Book', 'Cat', 'Dog', 'Sky', 'Tree', 'Star', 'Fish', 'Moon', 'Bird', 'Fox', 'Wolf', 'Bear', 'Lion', 'Rose', 'Leaf', 'Wind', 'Rain', 'Snow', 'Fire'];
  const word = words[Math.floor(Math.random() * words.length)];
  const digits = Math.floor(10 + Math.random() * 90); // 2 цифры
  return `${word}${digits}`;
}

const SuperuserPage: React.FC = () => {
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [subdivision, setSubdivision] = useState('');
  const [fullName, setFullName] = useState('');
  const [results, setResults] = useState<EmployeeAllDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await usersService.searchEmployeesBySubdivision(subdivision, fullName);
      setResults(data.content || data);
    } catch (e) {
      setError('Ошибка поиска сотрудников');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCredentials = async (employee: EmployeeAllDto) => {
    try {
      const username = getInitialsAndSurnameLatin(employee.fullName);
      const password = generateReadablePassword();
      await authService.generateCredentials(employee.guid, username, password);
      // Формируем CSV
      const csv = `ФИО,Username,Password\n"${employee.fullName}","${username}","${password}"\n`;
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `credentials_${username}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Ошибка генерации учетных данных');
    }
  };

  return (
    <Box p={4} display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="100vh">
      <Box display="flex" justifyContent="flex-end" width="100%" mb={2}>
        <Button variant="outlined" color="error" onClick={logout}>Выйти</Button>
      </Box>
      <Typography variant="h4" fontWeight={700} mb={3} align="center">Панель суперпользователя</Typography>
      <Button variant="contained" onClick={() => setOpen(true)} sx={{ mb: 2 }}>Создать учетные данные сотрудника</Button>
      <Modal open={open} onClose={() => setOpen(false)}>
        <Paper sx={{ p: 4, maxWidth: 600, mx: 'auto', mt: 10 }}>
          <Typography variant="h6" mb={2}>Поиск сотрудника</Typography>
          <Box display="flex" gap={2} mb={2}>
            <TextField
              label="Кафедра"
              value={subdivision}
              onChange={e => setSubdivision(e.target.value)}
              fullWidth
            />
            <TextField
              label="ФИО"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              fullWidth
            />
            <Button variant="contained" onClick={handleSearch} disabled={loading}>
              {loading ? <CircularProgress size={20} /> : 'Поиск'}
            </Button>
          </Box>
          {error && <Alert severity="error">{error}</Alert>}
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ФИО</TableCell>
                  <TableCell>Кафедра</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Действия</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {results.map(emp => (
                  <TableRow key={emp.guid}>
                    <TableCell>{emp.fullName}</TableCell>
                    <TableCell>
                      {emp.employeeEmployments?.[0]?.subdivision?.name || ''}
                    </TableCell>
                    <TableCell>{emp.email || '—'}</TableCell>
                    <TableCell>
                      <Button
                        variant="outlined"
                        onClick={() => handleGenerateCredentials(emp)}
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
    </Box>
  );
};

export default SuperuserPage; 