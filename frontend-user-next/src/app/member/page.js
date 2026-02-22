"use client";

import { useState, useEffect } from 'react';
import { fetchTodayClasses, fetchMySubscriptions, getCurrentMember, getMyBookings, createBooking } from '@/lib/api';
import styles from './page.module.css';

export default function MemberPage() {
  const [memberInfo, setMemberInfo] = useState(null);
  const [classes, setClasses] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [memberData, classesData, bookingsData, packageData] = await Promise.all([
          getCurrentMember(),
          fetchTodayClasses(),
          getMyBookings(),
          fetchMySubscriptions()
        ]);

        setMemberInfo(memberData);
        setClasses(classesData);
        setBookings(bookingsData);
        setPackages(packageData);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleBookClass = async (classId) => {
    try {
      await createBooking(classId);
      alert('Booking request submitted successfully!');
      // Refresh bookings
      const bookingsData = await getMyBookings();
      setBookings(bookingsData);
    } catch (error) {
      alert('Failed to book class. Please try again.');
      console.error(error);
    }
  };

  if (loading) return <div className={styles.container}>Loading...</div>;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Member Dashboard</h1>

      <div className={styles.tabs}>
        <button
          onClick={() => setActiveTab('info')}
          className={`${styles.tabButton} ${activeTab === 'info' ? styles.active : ''}`}
        >
          My Info
        </button>
        <button
          onClick={() => setActiveTab('bookings')}
          className={`${styles.tabButton} ${activeTab === 'bookings' ? styles.active : ''}`}
        >
          My Bookings
        </button>
        <button
          onClick={() => setActiveTab('classes')}
          className={`${styles.tabButton} ${activeTab === 'classes' ? styles.active : ''}`}
        >
          Book Classes
        </button>
        <button
          onClick={() => setActiveTab('packages')}
          className={`${styles.tabButton} ${activeTab === 'packages' ? styles.active : ''}`}
        >
          Packages
        </button>
      </div>

      {activeTab === 'info' && memberInfo && (
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>My Information</h2>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <strong>Name:</strong> {memberInfo.full_name}
            </div>
            <div className={styles.infoItem}>
              <strong>Email:</strong> {memberInfo.email}
            </div>
            <div className={styles.infoItem}>
              <strong>Phone:</strong> {memberInfo.phone || 'Not provided'}
            </div>
            <div className={styles.infoItem}>
              <strong>Gender:</strong> {memberInfo.gender || 'Not specified'}
            </div>
            <div className={styles.infoItem}>
              <strong>Date of Birth:</strong> {memberInfo.date_of_birth ? new Date(memberInfo.date_of_birth).toLocaleDateString() : 'Not provided'}
            </div>
            <div className={styles.infoItem}>
              <strong>Profile Complete:</strong> {memberInfo.isProfileComplete ? 'Yes' : 'No'}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'bookings' && (
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>My Bookings</h2>
          {bookings.length === 0 ? (
            <p className={styles.noData}>No bookings found.</p>
          ) : (
            <div className={styles.bookingsList}>
              {bookings.map(booking => (
                <div key={booking.id} className={styles.bookingCard}>
                  <h3 className={styles.bookingTitle}>{booking.class?.name || 'Unknown Class'}</h3>
                  <p><strong>Status:</strong> 
                    <span className={`${styles.bookingStatus} ${
                      booking.status === 'confirmed' ? styles.statusConfirmed :
                      booking.status === 'pending' ? styles.statusPending :
                      styles.statusCancelled
                    }`}>
                      {booking.status}
                    </span>
                  </p>
                  <p><strong>Booked on:</strong> {new Date(booking.created_at).toLocaleDateString()}</p>
                  {booking.class && (
                    <p><strong>Description:</strong> {booking.class.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'classes' && (
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Available Classes</h2>
          {classes.length === 0 ? (
            <p className={styles.noData}>No classes available.</p>
          ) : (
            <div className={styles.classesGrid}>
              {classes.map(cls => (
                <div key={cls.id} className={styles.classCard}>
                  <h3 className={styles.classTitle}>{cls.name}</h3>
                  <p className={styles.classInfo}><strong>Coach:</strong> {cls.coach_name || 'TBD'}</p>
                  <p className={styles.classInfo}><strong>Schedule:</strong> {cls.schedule_time ? new Date(cls.schedule_time).toLocaleString() : 'TBD'}</p>
                  {cls.end_time && <p className={styles.classInfo}><strong>End Time:</strong> {new Date(cls.end_time).toLocaleString()}</p>}
                  <p className={styles.classInfo}><strong>Capacity:</strong> {cls.capacity}</p>
                  <p className={styles.classInfo}><strong>Booked:</strong> {cls._count?.bookings || 0}</p>
                  <button
                    onClick={() => handleBookClass(cls.id)}
                    className={styles.bookButton}
                  >
                    Book Now
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'packages' && (
              <div className={styles.card}>
                <h2 className={styles.cardTitle}>Packages</h2>
                {packages.length === 0 ? (
                  <p className={styles.noData}>No packages available.</p>
                ) : (
                  <div className={styles.classesGrid}>
                    {packages.map(pkg => (
                      <div key={pkg.id} className={styles.classCard}>
                        <h3 className={styles.classTitle}>{pkg.name}</h3>
                        <p className={styles.classInfo}><strong>Coach:</strong> {pkg.coach_name || 'TBD'}</p>
                        <p className={styles.classInfo}><strong>Schedule:</strong> {pkg.schedule_time ? new Date(pkg.schedule_time).toLocaleString() : 'TBD'}</p>
                        {pkg.end_time && <p className={styles.classInfo}><strong>End Time:</strong> {new Date(pkg.end_time).toLocaleString()}</p>}
                        <p className={styles.classInfo}><strong>Capacity:</strong> {pkg.capacity}</p>
                        <p className={styles.classInfo}><strong>Booked:</strong> {pkg._count?.bookings || 0}</p>
      
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

    </div>
  );
}