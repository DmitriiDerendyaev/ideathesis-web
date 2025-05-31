import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  CircularProgress,
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { usersService } from '../../services/users.service';
import { topicsService } from '../../services/topics.service';
import type { Topic, User } from '../../types';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pendingTopics, setPendingTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!user?.guid) return;
        
        const [userData, topics] = await Promise.all([
          user?.role === 'Employee' 
            ? usersService.getEmployeeByGuid(user.guid)
            : usersService.getStudentByGuid(user.guid),
          topicsService.getPendingTopics(user.guid)
        ]);

        setPendingTopics(topics);
      } catch (err) {
        setError('Failed to load dashboard data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.guid]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
        {/* Profile Section */}
        <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 30%' } }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Profile
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Typography variant="body1">
                <strong>Name:</strong> {user?.fullName}
              </Typography>
              <Typography variant="body1">
                <strong>Email:</strong> {user?.email}
              </Typography>
              <Typography variant="body1">
                <strong>Role:</strong> {user?.role}
              </Typography>
            </Box>
          </Paper>
        </Box>

        {/* Main Content */}
        <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 70%' } }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Pending Topics
            </Typography>
            <Box sx={{ mt: 2 }}>
              {pendingTopics.length === 0 ? (
                <Typography>No pending topics</Typography>
              ) : (
                pendingTopics.map((topic) => (
                  <Card key={topic.id} sx={{ mb: 2 }}>
                    <CardContent>
                      <Typography variant="h6">{topic.title}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {topic.description}
                      </Typography>
                    </CardContent>
                    <CardActions>
                      <Button size="small" onClick={() => navigate(`/topics/${topic.id}`)}>
                        View Details
                      </Button>
                    </CardActions>
                  </Card>
                ))
              )}
            </Box>
          </Paper>
        </Box>
      </Box>
    </Container>
  );
};

export default Dashboard; 