import passport from 'passport';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { logger } from '../lib/logger';

// Registers only the providers that are configured, so the app starts without OAuth credentials.
// The verified provider profile becomes req.user for the callback handler.
export function configurePassport() {
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: process.env.GOOGLE_CALLBACK_URL ?? '/api/auth/google/callback',
        },
        (_accessToken, _refreshToken, profile, done) => done(null, profile),
      ),
    );
  } else {
    logger.info('Google OAuth not configured', { type: 'OAUTH' });
  }

  if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
    passport.use(
      new FacebookStrategy(
        {
          clientID: process.env.FACEBOOK_APP_ID,
          clientSecret: process.env.FACEBOOK_APP_SECRET,
          callbackURL: process.env.FACEBOOK_CALLBACK_URL ?? '/api/auth/facebook/callback',
          profileFields: ['id', 'displayName', 'emails'],
        },
        (_accessToken, _refreshToken, profile, done) => done(null, profile),
      ),
    );
  } else {
    logger.info('Facebook OAuth not configured', { type: 'OAUTH' });
  }
  return passport;
}
