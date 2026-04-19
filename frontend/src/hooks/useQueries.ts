import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';

// --- Types ---


const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const API_BASE_URL = rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl}/api`;

const fetchWithAuth = async (url: string, token: string | null, options: RequestInit = {}) => {
  const actualToken = token || localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(actualToken ? { Authorization: `Bearer ${actualToken}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${url}`, { ...options, headers });
  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      sessionStorage.clear();
      document.cookie = "token=; Max-Age=0; path=/;";
      window.location.href = '/login';
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'An error occurred while fetching data');
  }
  return response.json();
};



// ---- Users/Profile ----

export function useGetCallerUserProfile() {
  const { token } = useAuth();
  return useQuery({
    queryKey: ['currentUserProfile'],
    queryFn: () => fetchWithAuth('/users/profile', token),
    enabled: !!token,
    retry: false,
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) =>
      fetchWithAuth('/users/forgot-password', null, {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),
  });
}

export function useVerifyResetOtp() {
  return useMutation({
    mutationFn: (data: { email: string; otp: string }) =>
      fetchWithAuth('/users/verify-reset-otp', null, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (data: any) =>
      fetchWithAuth('/users/reset-password', null, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  });
}

export function useGetAllUsers() {
  const { token } = useAuth();
  return useQuery({
    queryKey: ['users'],
    queryFn: () => fetchWithAuth('/users', token),
    enabled: !!token,
  });
}

// Admin only routes for User
export function useIsCallerAdmin() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['isAdmin', user?._id],
    queryFn: async () => user?.role === 'admin',
    enabled: !!user,
  });
}

export function useApproveUser() {
  const queryClient = useQueryClient();
  const { token } = useAuth();

  return useMutation({
    mutationFn: ({ userId, isApproved }: { userId: string; isApproved: boolean }) =>
      fetchWithAuth(`/users/${userId}/approve`, token, {
        method: 'PATCH',
        body: JSON.stringify({ isApproved }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  const { token } = useAuth();

  return useMutation({
    mutationFn: (userId: string) =>
      fetchWithAuth(`/users/${userId}`, token, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}


