const jwt = require('jsonwebtoken');
const jwtConfig = require("../config/jwtConfig");

const authenticateToken = (req, res, next) => {
    const token = req.header('Authorization');

    if (!token) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    jwt.verify(token, jwtConfig.secretKey, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Forbidden Request' });
        }
        req.user = user; // Store the user in the request for later use
        next();
    });
};

module.exports = authenticateToken
