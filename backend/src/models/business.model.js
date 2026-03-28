const mongoose = require("mongoose");

const businessSchema = new mongoose.Schema(
    {
        businessCode: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
            trim: true,
            index: true
        },
        accessPasswordHash: {
            type: String,
            required: true,
            select: false
        },
        accessPasswordSalt: {
            type: String,
            required: true,
            select: false
        },
        name: {
            type: String,
            required: true,
            trim: true
        },
        category: {
            type: String,
            trim: true,
            default: "general"
        },
        currency: {
            type: String,
            trim: true,
            uppercase: true,
            default: "INR"
        },
        language: {
            type: String,
            trim: true,
            default: "hinglish"
        },
        isActive: {
            type: Boolean,
            default: true
        },
        type: {
            type: String,
            required: true,
            trim: true
        },
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        members: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            }
        ]
    },
    {
        timestamps: true
    }
);

businessSchema.set("toJSON", {
    transform: (doc, ret) => {
        delete ret.accessPasswordHash;
        delete ret.accessPasswordSalt;
        delete ret.__v;
        return ret;
    }
});

module.exports =
    mongoose.models.Business || mongoose.model("Business", businessSchema);
