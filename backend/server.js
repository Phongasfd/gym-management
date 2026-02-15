const app = require('./app'); 

const passport = require('passport');
const { google } = require('./config/passport');
google(passport);
app.use(passport.initialize()); 


const PORT = process.env.PORT || 3000; // for deployment
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});


