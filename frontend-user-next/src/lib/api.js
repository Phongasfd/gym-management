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

export const createBooking = async (classId) => {
  try {
    const response = await axiosClient.post('/bookings', {
      class_id: classId,
      status: 'active'
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// AI advice API (chatbot)
export const getAIAdvice = async (payload) => {
  try {
    const response = await axiosClient.post('/ai/advice', payload);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};