/**
 * User.model.js
 *
 * In MongoDB/Mongoose, a "model" is both your schema definition AND
 * your query interface. User.find(), User.create(), User.findById() — all from this.
 *
 * Key decisions:
 * - Password is never returned by default (select: false) — you must
 *   explicitly ask for it: User.findOne().select('+password')
 * - Timestamps: true auto-adds createdAt and updatedAt to every document
 */

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        maxlength : [100, 'Name cannot exceed 100 characters']
    },
    email:{
        type: String,
        required: [true, 'Email is required'],
        unique: true,          // creates a unique index in MongoDB
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    }, 
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [8, 'Password must be at least 8 characters'],
        select: false         // NEVER returned in queries by default — security critical
    },
    role: {
        type: String,
        trim: true
    },
    department: {
        type:String,
        trim: true
    },
    semester:{
        type: Number,
        min: 1,
        max: 8,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, {timestamps: true});

/**
 * Pre-save hook: hash the password before storing.
 * This runs automatically every time you call user.save().
 * The `this.isModified('password')` check prevents re-hashing
 * on every save (e.g. if you only update the name).
 */

userSchema.pre('save', async function () {
    if(!this.isModified('password')) return;
    this.password = await bcrypt.hash(this.password, 12)
    //next();
});

/**
 * Instance method: compares a plain text password against the stored hash.
 * Called as: await user.comparePassword('plaintext')
 */

userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
}

/**
 * toJSON transform: removes sensitive fields before sending to client.
 * Even if you accidentally include the user object in a response,
 * password and __v (mongoose version key) won't appear.
 */

userSchema.set('toJSON', {
    transform: (doc, ret) => {
        delete ret.password;
        delete ret.__v;
        return ret
    }
})

const userModel = mongoose.model('User', userSchema);

module.exports = userModel;