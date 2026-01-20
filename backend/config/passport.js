const GoogleStrategy = require('passport-google-oauth20').Strategy;

const google = (passport) => {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "http://localhost:3000/api/auth/google/callback"
      },
      (accessToken, refreshToken, profile, done) => {
        return done(null, profile);
      }
  )
  );
};

module.exports = google; 