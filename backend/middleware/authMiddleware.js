const jwt = require('jsonwebtoken');

async function authMiddleware(req, res, next) {
  const token = req.cookies.access_token;

  if (!token) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

async function staffMiddleware(req, res, next){
  if(req.user.userType !== "staff"){
    return res.status(403).json({ message: 'Access denied' });
  } else {
    next();
  }
}

module.exports = { authMiddleware, staffMiddleware }; 