/// <reference types="vite/client" />
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App';
import './index.css';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || '419601703152-6c32v50v1b5l32k5dat1qudl8krre865.apps.googleusercontent.com'}>
        <QueryClientProvider client={queryClient}>
            <App />
        </QueryClientProvider>
    </GoogleOAuthProvider>
);
