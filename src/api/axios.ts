import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// 1. Request Interceptor: Attach Access Token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// 2. Response Interceptor: Handle Token Refreshing
api.interceptors.response.use(
    (response) => response, // If request succeeds, just return it
    async (error) => {
        const originalRequest = error.config;

        // If error is 401 and we haven't retried yet
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = localStorage.getItem('refresh_token');

                // Hit the Django SimpleJWT refresh endpoint
                const response = await axios.post(`${BASE_URL}token/refresh/`, {
                    refresh: refreshToken,
                });

                const { access } = response.data;

                // Store the new access token
                localStorage.setItem('access_token', access);

                // Update the failed request's header and retry it
                originalRequest.headers.Authorization = `Bearer ${access}`;
                return api(originalRequest);
            } catch (refreshError) {
                // If refresh fails, the user must log in again
                console.error('Refresh token expired or invalid');
                localStorage.clear();
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default api;
