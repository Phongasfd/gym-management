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

const FacebookStrategy = require('passport-facebook').Strategy;
const facebook = (passport) => {
  passport.use(
    new FacebookStrategy(
      {
        clientID: process.env.FACEBOOK_APP_ID,
        clientSecret: process.env.FACEBOOK_APP_SECRET,
        callbackURL: "http://localhost:3000/api/auth/facebook/callback",
        profileFields: ["id", "displayName"]
      },
      (accessToken, refreshToken, profile, done) => {
        return done(null, profile);
      }
    )
  );
};

module.exports = {
  google,
  facebook
}; 