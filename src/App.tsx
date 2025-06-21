import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Login from './components/auth/Login';
import MainPage from './components/dashboard/MainPage';
import SuperuserPage from './components/superuser/SuperuserPage';
import AllTopicsPage from './components/dashboard/AllTopicsPage';

// Временные компоненты
const TopicList = () => <div>Topic List Page</div>;
const TopicDetails = () => <div>Topic Details Page</div>;
const NotificationList = () => <div>Notification List Page</div>;

const theme = createTheme({
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 900,
      lg: 1200,
      xl: 1536,
    },
  },
  components: {
    MuiContainer: {
      styleOverrides: {
        root: {
          width: '100%',
          margin: 0,
        },
      },
    },
  },
});

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <MainPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/topics"
              element={
                <ProtectedRoute>
                  <TopicList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/topics/:id"
              element={
                <ProtectedRoute>
                  <TopicDetails />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <NotificationList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/superuser"
              element={
                <ProtectedRoute>
                  <SuperuserPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/all-topics"
              element={
                <ProtectedRoute>
                  <AllTopicsPage />
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Navigate to="/dashboard" />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;