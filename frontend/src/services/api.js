import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // request debug logging removed
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // suppress noisy console errors; surface via UI

    // Handle token expiration
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Redirect to login if needed
      if (window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export const authService = {
  // Login user
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  // Register user
  signup: async (userData) => {
    const response = await api.post('/auth/signup', userData);
    return response.data;
  },

  // Get current user
  getProfile: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  // Verify token
  verifyToken: async () => {
    const response = await api.post('/auth/verify');
    return response.data;
  },

  // Logout (client-side)
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  // Get stored token
  getToken: () => {
    return localStorage.getItem('token');
  },

  // Get stored user
  getUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  // Store auth data
  setAuthData: (token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  },

  // Get all users (Owner/Admin only)
  getUsers: async () => {
    const response = await api.get('/auth/users');
    return response.data;
  },

  // Create librarian (Owner only)
  createLibrarian: async (librarianData) => {
    const response = await api.post('/auth/create-librarian', librarianData);
    return response.data;
  },

  // Update user (Owner only)
  updateUser: async (id, userData) => {
    const response = await api.put(`/auth/users/${id}`, userData);
    return response.data;
  },

  // Delete user (Owner only)
  deleteUser: async (id) => {
    const response = await api.delete(`/auth/users/${id}`);
    return response.data;
  },

  // Get librarian details and history (Owner only)
  getLibrarianDetails: async (id) => {
    const response = await api.get(`/auth/librarian/${id}/details`);
    return response.data;
  },

  // Check if user is admin
  isAdmin: () => {
    const user = authService.getUser();
    return user?.role === 'ADMIN';
  }
};

export const bookService = {
  // Get all books with optional search
  getBooks: async (searchQuery = '') => {
    const params = searchQuery ? { search: searchQuery } : {};
    const response = await api.get('/books', { params });
    return response.data;
  },

  // Get book by ID
  getBook: async (id) => {
    const response = await api.get(`/books/${id}`);
    return response.data;
  },

  // Preview ISBN for new book
  previewIsbn: async (libraryId, totalCopies = 1) => {
    const response = await api.get(`/books/preview-isbn/${libraryId}`, {
      params: { totalCopies }
    });
    return response.data;
  },

  // Create new book
  createBook: async (bookData) => {
    const response = await api.post('/books', bookData);
    return response.data;
  },

  // Update book
  updateBook: async (id, bookData) => {
    const response = await api.put(`/books/${id}`, bookData);
    return response.data;
  },

  // Delete book
  deleteBook: async (id) => {
    const response = await api.delete(`/books/${id}`);
    return response.data;
  },

  // Get detailed book status for librarian's library
  getLibraryBookStatus: async (libraryId) => {
    const response = await api.get(`/books/library/${libraryId}/status`);
    return response.data;
  },
};

export const loanService = {
  // Borrow a book
  borrowBook: async (bookId) => {
    const response = await api.post('/loans/borrow', { bookId });
    return response.data;
  },

  // Return a book (admin only)
  returnBook: async (loanId) => {
    const response = await api.post(`/loans/${loanId}/return`);
    return response.data;
  },

  // Request a return (member)
  requestReturn: async (loanId, notes) => {
    const response = await api.post(`/member/loans/${loanId}/return-request`, { notes });
    return response.data;
  },

  // Get user's active loans
  getMyLoans: async () => {
    const response = await api.get('/loans/my-loans');
    return response.data;
  },

  // Get user's loan history
  getMyHistory: async () => {
    const response = await api.get('/loans/my-history');
    return response.data;
  },

  // Get all active loans (admin only)
  getActiveLoans: async () => {
    const response = await api.get('/loans/active');
    return response.data;
  },

  // Get overdue loans (admin only)
  getOverdueLoans: async () => {
    const response = await api.get('/loans/overdue');
    return response.data;
  },

  // Get loan by ID (admin only)
  getLoan: async (id) => {
    const response = await api.get(`/loans/${id}`);
    return response.data;
  },
};

export const cityService = {
  // Get all cities (Owner only)
  getCities: async () => {
    const response = await api.get('/cities');
    return response.data;
  },

  // Get city by ID (Owner only)
  getCity: async (id) => {
    const response = await api.get(`/cities/${id}`);
    return response.data;
  },

  // Create new city (Owner only)
  createCity: async (cityData) => {
    const response = await api.post('/cities', cityData);
    return response.data;
  },

  // Update city (Owner only)
  updateCity: async (id, cityData) => {
    const response = await api.put(`/cities/${id}`, cityData);
    return response.data;
  },

  // Delete city (Owner only)
  deleteCity: async (id) => {
    const response = await api.delete(`/cities/${id}`);
    return response.data;
  },

  // Get city statistics (Owner only)
  getCityStats: async (id) => {
    const response = await api.get(`/cities/${id}/stats`);
    return response.data;
  },
};

export const libraryService = {
  // Get all libraries (Owner only)
  getLibraries: async () => {
    const response = await api.get('/libraries');
    return response.data;
  },

  // Get libraries by city (Owner only)
  getLibrariesByCity: async (cityId) => {
    const response = await api.get(`/libraries/by-city/${cityId}`);
    return response.data;
  },

  // Get library by ID
  getLibrary: async (id) => {
    const response = await api.get(`/libraries/${id}`);
    return response.data;
  },

  // Create library in city (Owner only)
  createLibrary: async (libraryData) => {
    const response = await api.post('/libraries', libraryData);
    return response.data;
  },

  // Update library (Owner only)
  updateLibrary: async (id, libraryData) => {
    const response = await api.put(`/libraries/${id}`, libraryData);
    return response.data;
  },

  // Delete library (Owner only)
  deleteLibrary: async (id) => {
    const response = await api.delete(`/libraries/${id}`);
    return response.data;
  },

  // Assign librarian (Owner only)
  assignLibrarian: async (libraryId, userId) => {
    const response = await api.post(`/libraries/${libraryId}/assign-librarian`, { userId });
    return response.data;
  },

  // Remove librarian assignment (Owner only)
  removeLibrarian: async (libraryId, userId) => {
    const response = await api.delete(`/libraries/${libraryId}/librarians/${userId}`);
    return response.data;
  },

  // Get available librarians (Owner only)
  getAvailableLibrarians: async () => {
    const response = await api.get('/libraries/available-librarians/list');
    return response.data;
  },

  // Get library statistics
  getLibraryStats: async (id) => {
    const response = await api.get(`/libraries/${id}/stats`);
    return response.data;
  },
};

export default api;