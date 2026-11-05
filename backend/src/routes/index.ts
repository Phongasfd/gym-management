import { Router, type NextFunction, type Request, type Response } from 'express';
import passport from 'passport';
import { env } from '../config/env';
import * as ai from '../controllers/aiControllers';
import * as auth from '../controllers/authControllers';
import * as bookings from '../controllers/bookingControllers';
import * as checkins from '../controllers/checkinControllers';
import * as classes from '../controllers/classControllers';
import * as members from '../controllers/memberControllers';
import * as packages from '../controllers/packageControllers';
import * as staff from '../controllers/staffControllers';
import * as subscriptions from '../controllers/subscriptionControllers';
import * as vnpay from '../controllers/vnpayControllers';
import { ApiRouter } from '../lib/endpoint';

// The whole API in one place. Auth level and validation are part of each endpoint's declaration
// (see lib/endpoint.ts); /api-docs is generated from the same declarations.

const authRoutes = new ApiRouter('/api/auth', 'Auth')
  .get('/csrf-token', auth.csrfToken)
  .post('/member-register', auth.memberRegister)
  .post('/member-login', auth.memberLogin)
  .patch('/complete-profile', auth.memberCompleteProfile)
  .get('/me', auth.getMe)
  .post('/logout', auth.logOut)
  .get('/refresh-token', auth.refreshToken)
  .post('/forgot-password', auth.forgotPassword)
  .post('/verify-reset-code', auth.verifyResetCode)
  .post('/reset-password', auth.resetPassword)
  .get('/staff', auth.getStaff)
  .post('/staff-login', auth.staffLogin);

// OAuth redirects are browser navigations handled by Passport, not JSON endpoints.
const oauthFailure = () => `${env.frontendUrl}/login?error=oauth`;
const wrap = (fn: (req: Request, res: Response) => Promise<void>) => (req: Request, res: Response, next: NextFunction) =>
  fn(req, res).catch(next);
authRoutes.router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));
authRoutes.router.get(
  '/google/callback',
  (req, res, next) => passport.authenticate('google', { session: false, failureRedirect: oauthFailure() })(req, res, next),
  wrap(auth.googleSuccess),
);
authRoutes.router.get('/facebook', passport.authenticate('facebook', { scope: ['public_profile'], session: false }));
authRoutes.router.get(
  '/facebook/callback',
  (req, res, next) => passport.authenticate('facebook', { session: false, failureRedirect: oauthFailure() })(req, res, next),
  wrap(auth.facebookSuccess),
);

const staffRoutes = new ApiRouter('/api/staff', 'Staff').patch('/update-password', staff.updatePassword);

const packageRoutes = new ApiRouter('/api/packages', 'Packages')
  .get('/', packages.listPackages)
  .get('/:id', packages.getPackage)
  .post('/', packages.createPackage)
  .patch('/:id', packages.updatePackage)
  .delete('/:id', packages.deletePackage);

const memberRoutes = new ApiRouter('/api/members', 'Members')
  .get('/', members.listMembers)
  .get('/active-count', members.activeMemberCount)
  .get('/overview', members.membersOverview)
  .get('/:id', members.getMember)
  .post('/', members.createMember)
  .put('/:id', members.updateMember);

const subscriptionRoutes = new ApiRouter('/api/subscriptions', 'Subscriptions')
  .get('/', subscriptions.listSubscriptions)
  .get('/me', subscriptions.mySubscriptions)
  .get('/:id', subscriptions.getSubscription)
  .post('/', subscriptions.createSubscription)
  .patch('/:id', subscriptions.updateSubscription);

const checkinRoutes = new ApiRouter('/api/checkins', 'Check-ins').get('/', checkins.listCheckins).post('/', checkins.createCheckin);

const classRoutes = new ApiRouter('/api/classes', 'Classes')
  .get('/', classes.listClasses)
  .get('/today', classes.todayClasses)
  .get('/:id/members', classes.classMembers)
  .get('/:id', classes.getClass)
  .post('/', classes.createClass)
  .patch('/:id', classes.updateClass)
  .delete('/:id', classes.deleteClass);

const bookingRoutes = new ApiRouter('/api/bookings', 'Bookings')
  .get('/', bookings.listBookings)
  .get('/me', bookings.myBookings)
  .get('/:id', bookings.getBooking)
  .post('/', bookings.createBooking)
  .post('/:id/cancel', bookings.cancelBooking)
  .delete('/:id', bookings.deleteBooking);

const vnpayRoutes = new ApiRouter('/api/vnpay', 'Payments')
  .post('/create-qr', vnpay.createPayment)
  .get('/check-payment-vnpay', vnpay.paymentReturn)
  .get('/vnpay-ipn', vnpay.paymentIpn);

const aiRoutes = new ApiRouter('/api/ai', 'AI').post('/chat', ai.chat);

export const apiRouter = Router()
  .use('/api/auth', authRoutes.router)
  .use('/api/staff', staffRoutes.router)
  .use('/api/packages', packageRoutes.router)
  .use('/api/members', memberRoutes.router)
  .use('/api/subscriptions', subscriptionRoutes.router)
  .use('/api/checkins', checkinRoutes.router)
  .use('/api/classes', classRoutes.router)
  .use('/api/bookings', bookingRoutes.router)
  .use('/api/vnpay', vnpayRoutes.router)
  .use('/api/ai', aiRoutes.router);
