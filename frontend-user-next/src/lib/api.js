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
export const createVNPayPayment = async (amount, orderInfo) => {
  try {
    const response = await axiosClient.post('/vnpay/create-qr', {
      amount,
      orderInfo
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
      status: 'pending'
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};