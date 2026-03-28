async function getAuthStatus() {
  return {
    authenticated: false,
    message: "Auth service placeholder",
  };
}
const crypto = require("crypto");

const User = require("../models/user.model");
const Business = require("../models/business.model");

const hashPassword = (password, salt = crypto.randomBytes(16).toString("hex")) => {
    const passwordHash = crypto.scryptSync(password, salt, 64).toString("hex");
    return {
        salt,
        passwordHash
    };
};

const verifyPassword = (password, passwordHash, salt) => {
    const hashedInput = crypto.scryptSync(password, salt, 64).toString("hex");
    return crypto.timingSafeEqual(
        Buffer.from(hashedInput, "hex"),
        Buffer.from(passwordHash, "hex")
    );
};

const buildBusinessName = (name) => {
    return `${name}'s Business`;
};

const buildIdentityQuery = ({ email, phone }) => {
    if (email && phone) {
        return {
            $or: [{ email }, { phone }]
        };
    }

    if (email) {
        return { email };
    }

    return { phone };
};

const createBusinessForUser = async (user) => {
    const business = await Business.create({
        name: buildBusinessName(user.name),
        type: "vegetable",
        owner: user._id,
        members: [user._id]
    });

    user.businessId = business._id;
    await user.save();
};

const signupUser = async ({ name, email, phone, password }) => {
    const existingUser = await User.findOne(buildIdentityQuery({ email, phone }));

    if (existingUser) {
        throw new Error("User already exists with this email or phone");
    }

    const { salt, passwordHash } = hashPassword(password);

    const user = await User.create({
        name,
        email: email || undefined,
        phone: phone || undefined,
        passwordHash,
        passwordSalt: salt
    });

    await createBusinessForUser(user);

    return User.findById(user._id).populate("businessId");
};

const loginUser = async ({ identifier, password }) => {
    const query = identifier.includes("@")
        ? { email: identifier }
        : { phone: identifier };

    const user = await User.findOne(query)
        .select("+passwordHash +passwordSalt")
        .populate("businessId");

    if (!user) {
        throw new Error("Invalid credentials");
    }

    const isPasswordValid = verifyPassword(password, user.passwordHash, user.passwordSalt);

    if (!isPasswordValid) {
        throw new Error("Invalid credentials");
    }

    return user;
};

module.exports = {
    getAuthStatus,
    signupUser,
    loginUser
};
