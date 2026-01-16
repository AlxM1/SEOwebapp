import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:5000/api';

// Auth API calls
export async function registerUser(email: string, password: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    if (response.ok) {
      await AsyncStorage.setItem('authToken', data.token);
      await AsyncStorage.setItem('user', JSON.stringify(data.user));
    }
    return data;
  } catch (error) {
    console.error('Register error:', error);
    throw error;
  }
}

export async function loginUser(email: string, password: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    if (response.ok) {
      await AsyncStorage.setItem('authToken', data.token);
      await AsyncStorage.setItem('user', JSON.stringify(data.user));
    }
    return data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

export async function logoutUser() {
  try {
    await AsyncStorage.removeItem('authToken');
    await AsyncStorage.removeItem('user');
  } catch (error) {
    console.error('Logout error:', error);
  }
}

export async function getStoredToken() {
  try {
    return await AsyncStorage.getItem('authToken');
  } catch (error) {
    console.error('Error getting token:', error);
    return null;
  }
}

// Analysis API calls
export async function saveAnalysis(analysisData: any) {
  try {
    const token = await getStoredToken();
    if (!token) throw new Error('Not authenticated');

    const response = await fetch(`${API_BASE_URL}/analysis/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(analysisData),
    });

    return await response.json();
  } catch (error) {
    console.error('Save analysis error:', error);
    throw error;
  }
}

export async function getAnalysisHistory() {
  try {
    const token = await getStoredToken();
    if (!token) throw new Error('Not authenticated');

    const response = await fetch(`${API_BASE_URL}/analysis/history`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    return await response.json();
  } catch (error) {
    console.error('Get history error:', error);
    throw error;
  }
}

export async function deleteAnalysis(id: number) {
  try {
    const token = await getStoredToken();
    if (!token) throw new Error('Not authenticated');

    const response = await fetch(`${API_BASE_URL}/analysis/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    return await response.json();
  } catch (error) {
    console.error('Delete analysis error:', error);
    throw error;
  }
}

// Analytics API calls
export async function trackEvent(eventType: string, eventData: any) {
  try {
    const token = await getStoredToken();
    if (!token) return; // Don't require auth for analytics

    await fetch(`${API_BASE_URL}/analytics/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ eventType, eventData }),
    });
  } catch (error) {
    console.error('Track event error:', error);
  }
}

export async function getAnalyticsSummary() {
  try {
    const token = await getStoredToken();
    if (!token) throw new Error('Not authenticated');

    const response = await fetch(`${API_BASE_URL}/analytics/summary`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    return await response.json();
  } catch (error) {
    console.error('Get analytics summary error:', error);
    throw error;
  }
}
