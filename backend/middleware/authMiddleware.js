const jwt = require('jsonwebtoken');

async function authMiddleware(req, res, next) {
  const token = req.cookie.access_token;
  if(!token){
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; 
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

module.exports = authMiddleware; 