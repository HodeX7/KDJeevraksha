const { default: mongoose } = require("mongoose");

const roles = ['admin', 'catcher', 'vet', 'caretaker'];

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    contactNumber: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String
    },

    isActive: {type: Boolean, default: false},

    role: {
        type: String,
        default: 'catcher',
        validate: {
            validator: function (value) {
                return roles.includes(value);
            },
            message: 'Invalid role. Allowed roles are admin, catcher, vet, or caretaker',
        },
    },

    accessToken: {
        type: String
    }
}, { timestamps: true, versionKey: false });

module.exports = mongoose.model('User', userSchema);