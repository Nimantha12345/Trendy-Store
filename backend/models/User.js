const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isAdmin: { type: Boolean, default: false },
  isVerified: { type: Boolean, default: false }, // මුලින්ම false වේ
  otp: { type: String }, // තාවකාලික කෝඩ් එක සේව් කිරීමට
});

module.exports = mongoose.model("User", userSchema);
