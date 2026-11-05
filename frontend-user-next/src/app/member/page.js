"use client";

import { useState, useEffect, useCallback } from 'react';
import {
  fetchUpcomingClasses,
  fetchMySubscriptions,
  getCurrentMember,
  getMyBookings,
  createBooking,
  cancelBooking,
} from '@/lib/api';
import styles from './page.module.css';

const STATUS_STYLE = {
  active: styles.statusConfirmed,
  waitlisted: styles.statusPending,
  pending: styles.statusPending,
  cancelled: styles.statusCancelled,
  failed: styles.statusCancelled,
  expired: styles.statusCancelled,
};

function bookingLabel(booking) {
  if (booking.status === 'active') return 'Booked';
  if (booking.status === 'waitlisted') return `Waitlist #${booking.waitlistPosition}`;
  return 'Cancelled';
}

export default function MemberPage() {
  const [memberInfo, setMemberInfo] = useState(null);
  const [classes, setClasses] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info');
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(null);

  const refresh = useCallback(async () => {
    const [classesData, bookingsData] = await Promise.all([fetchUpcomingClasses(), getMyBookings()]);
    setClasses(classesData);
    setBookings(bookingsData);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [memberData, subscriptionData] = await Promise.all([getCurrentMember(), fetchMySubscriptions()]);
        setMemberInfo(memberData);
        setSubscriptions(subscriptionData);
        await refresh();
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [refresh]);

  const myBookingFor = (classId) => bookings.find((b) => b.class_id === classId && b.status !== 'cancelled');

  const handleBook = async (cls, waitlist) => {
    setBusy(cls.id);
    setNotice(null);
    try {
      const result = await createBooking(cls.id, { waitlist });
      setNotice(
        result.outcome === 'waitlisted'
          ? { type: 'info', text: `${cls.name} is full. You are #${result.waitlistPosition} on the waitlist; we will e-mail you if a seat opens.` }
          : { type: 'success', text: `Booked ${cls.name}.` },
      );
    } catch (error) {
      setNotice({ type: 'error', text: error?.message || 'Failed to book class. Please try again.' });
    } finally {
      await refresh();
      setBusy(null);
    }
  };

  const handleCancel = async (booking) => {
    setBusy(booking.id);
    setNotice(null);
    try {
      await cancelBooking(booking.id);
      setNotice({ type: 'success', text: booking.status === 'waitlisted' ? 'You left the waitlist.' : 'Booking cancelled.' });
    } catch (error) {
      setNotice({ type: 'error', text: error?.message || 'Failed to cancel. Please try again.' });
    } finally {
      await refresh();
      setBusy(null);
    }
  };

  if (loading) return <div className={styles.container}>Loading...</div>;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Member Dashboard</h1>

      <div className={styles.tabs}>
        {[
          ['info', 'My Info'],
          ['bookings', 'My Bookings'],
          ['classes', 'Book Classes'],
          ['packages', 'Memberships'],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`${styles.tabButton} ${activeTab === key ? styles.active : ''}`}
          >
            {label}
          </button>
        ))}
      </div>

      {notice && (
        <p role="status" data-testid="notice" className={styles.card}>
          {notice.text}
        </p>
      )}

      {activeTab === 'info' && memberInfo && (
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>My Information</h2>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}><strong>Name:</strong> {memberInfo.full_name}</div>
            <div className={styles.infoItem}><strong>Email:</strong> {memberInfo.email}</div>
            <div className={styles.infoItem}><strong>Phone:</strong> {memberInfo.phone || 'Not provided'}</div>
            <div className={styles.infoItem}><strong>Gender:</strong> {memberInfo.gender || 'Not specified'}</div>
            <div className={styles.infoItem}>
              <strong>Date of Birth:</strong>{' '}
              {memberInfo.date_of_birth ? new Date(memberInfo.date_of_birth).toLocaleDateString() : 'Not provided'}
            </div>
            <div className={styles.infoItem}><strong>Profile Complete:</strong> {memberInfo.isProfileComplete ? 'Yes' : 'No'}</div>
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
              {bookings.map((booking) => (
                <div key={booking.id} className={styles.bookingCard} data-testid={`booking-${booking.class?.name}`}>
                  <h3 className={styles.bookingTitle}>{booking.class?.name || 'Unknown Class'}</h3>
                  <p>
                    <strong>Status:</strong>{' '}
                    <span className={`${styles.bookingStatus} ${STATUS_STYLE[booking.status] ?? ''}`} data-testid="booking-status">
                      {bookingLabel(booking)}
                    </span>
                  </p>
                  {booking.class?.schedule_time && (
                    <p><strong>Starts:</strong> {new Date(booking.class.schedule_time).toLocaleString()}</p>
                  )}
                  {booking.status !== 'cancelled' && (
                    <button
                      className={styles.bookButton}
                      disabled={busy === booking.id}
                      onClick={() => handleCancel(booking)}
                    >
                      {booking.status === 'waitlisted' ? 'Leave waitlist' : 'Cancel booking'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'classes' && (
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Upcoming Classes</h2>
          {classes.length === 0 ? (
            <p className={styles.noData}>No classes available.</p>
          ) : (
            <div className={styles.classesGrid}>
              {classes.map((cls) => {
                const mine = myBookingFor(cls.id);
                const full = cls.bookedSlots >= cls.capacity;
                return (
                  <div key={cls.id} className={styles.classCard} data-testid={`class-${cls.name}`}>
                    <h3 className={styles.classTitle}>{cls.name}</h3>
                    <p className={styles.classInfo}><strong>Coach:</strong> {cls.coach_name || 'TBD'}</p>
                    <p className={styles.classInfo}>
                      <strong>Schedule:</strong> {cls.schedule_time ? new Date(cls.schedule_time).toLocaleString() : 'TBD'}
                    </p>
                    {cls.end_time && (
                      <p className={styles.classInfo}><strong>End Time:</strong> {new Date(cls.end_time).toLocaleString()}</p>
                    )}
                    <p className={styles.classInfo}>
                      <strong>Seats:</strong> {cls.bookedSlots}/{cls.capacity}
                      {cls.waitlistCount > 0 && ` (${cls.waitlistCount} waiting)`}
                    </p>
                    {mine ? (
                      <p className={styles.classInfo} data-testid="my-status">{bookingLabel(mine)}</p>
                    ) : (
                      <button
                        onClick={() => handleBook(cls, full)}
                        disabled={busy === cls.id}
                        className={styles.bookButton}
                      >
                        {full ? 'Join waitlist' : 'Book Now'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'packages' && (
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>My Memberships</h2>
          {subscriptions.length === 0 ? (
            <p className={styles.noData}>No memberships yet.</p>
          ) : (
            <div className={styles.classesGrid}>
              {subscriptions.map((sub) => (
                <div key={sub.id} className={styles.classCard} data-testid="subscription">
                  <h3 className={styles.classTitle}>{sub.package?.name ?? 'Membership'}</h3>
                  <p className={styles.classInfo}>
                    <strong>Status:</strong>{' '}
                    <span className={`${styles.bookingStatus} ${STATUS_STYLE[sub.status] ?? ''}`} data-testid="subscription-status">
                      {sub.status}
                    </span>
                  </p>
                  {sub.start_date && <p className={styles.classInfo}><strong>From:</strong> {new Date(sub.start_date).toLocaleDateString()}</p>}
                  {sub.end_date && <p className={styles.classInfo}><strong>Until:</strong> {new Date(sub.end_date).toLocaleDateString()}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
