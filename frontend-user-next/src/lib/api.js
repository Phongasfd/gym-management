import axiosClient from '@/lib/axios';

// Authentication APIs
export const login = async (email, password) => {
  try {
    const response = await axiosClient.post('/auth/member-login', {
      email,
      password
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const signup = async (full_name, phone, email, gender, date_of_birth, password) => {
  try {
    const response = await axiosClient.post('/auth/member-register', {full_name, phone, email, gender, date_of_birth, password });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Forgot Password APIs
export const forgotPassword = async (email) => {
  try {
    const response = await axiosClient.post('/auth/forgot-password', { email });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const verifyResetCode = async (email, resetCode) => {
  try {
    const response = await axiosClient.post('/auth/verify-reset-code', { email, resetCode });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const resetPassword = async (email, resetCode, newPassword) => {
  try {
    const response = await axiosClient.post('/auth/reset-password', { email, resetCode, newPassword });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Classes API
export const fetchTodayClasses = async () => {
  try {
    const response = await axiosClient.get('/classes/today');
    return response.data.classes;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Classes that have not started yet, soonest first (paginated: { data, nextCursor })
export const fetchUpcomingClasses = async () => {
  try {
    const from = new Date().toISOString();
    const response = await axiosClient.get(`/classes?from=${encodeURIComponent(from)}&limit=50`);
    return response.data.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Packages API
export const fetchMySubscriptions = async () => {
  try {
    
    const response = await axiosClient.get(`/subscriptions/me`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// VNPay API
export const createVNPayPayment = async (packageId) => {
  try {
    const response = await axiosClient.post('/vnpay/create-qr', {
      packageId
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Member API
export const getCurrentMember = async () => {
  try {
    const response = await axiosClient.get('/auth/me');
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Booking API
export const getMyBookings = async () => {
  try {
    const response = await axiosClient.get('/bookings/me');
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// The server decides the status. With waitlist=true a full class queues the member instead of
// answering 409 CLASS_FULL.
export const createBooking = async (classId, { waitlist = false } = {}) => {
  try {
    const response = await axiosClient.post('/bookings', { class_id: classId, waitlist });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const cancelBooking = async (bookingId) => {
  try {
    const response = await axiosClient.post(`/bookings/${bookingId}/cancel`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// AI chat API
export const chatWithAI = async (messages) => {
  try {
    const response = await axiosClient.post('/ai/chat', { messages });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};