const jwt = require("jsonwebtoken");
const jwtConfig = require("../config/jwtConfig");

const generateToken = (payload, token) => {
    /*
    payload: {
        id: int
        name: String
        role: String 
    }

    return: token, need_for_updation
    */
    if (isTokenExpired(token)) {
        const new_token = jwt.sign(payload, jwtConfig.secretKey, { expiresIn: jwtConfig.expiration });
        return {token: new_token, updation: true};
    } else {
        return {token: token, updation: false};
    }
}

const isTokenExpired = (token) => {
    try {
        const decoded = jwt.verify(token, jwtConfig.secretKey);
        return false;
    } catch (error) {
        return true;
    }
}

module.exports = generateToken