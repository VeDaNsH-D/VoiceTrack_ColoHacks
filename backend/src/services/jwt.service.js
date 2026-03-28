const jwt = require("jsonwebtoken");

const generateToken = (user) => {
    return jwt.sign(
        {
            userId: user._id.toString(),
            phone: user.phone || null,
            email: user.email || null
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "7d"
        }
    );
};

const verifyToken = (token) => {
    return jwt.verify(token, process.env.JWT_SECRET);
};

module.exports = {
    generateToken,
    verifyToken
};
