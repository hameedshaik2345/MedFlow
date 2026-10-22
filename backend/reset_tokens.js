require('dotenv').config();
const mongoose = require('mongoose');

async function resetTokens(email) {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const User = mongoose.model('User', new mongoose.Schema({ currentToken: Number, role: String }, { strict: false }));

    if (email) {
      const res = await User.updateOne({ email: email.toLowerCase() }, { $set: { currentToken: 0 } });
      console.log(`Reset token to 0 for doctor: ${email} (${res.modifiedCount} updated)`);
    } else {
      const res = await User.updateMany({ role: 'doctor' }, { $set: { currentToken: 0 } });
      console.log(`Reset token to 0 for ALL doctors (${res.modifiedCount} updated)`);
    }
  } catch (err) {
    console.error('Error resetting token:', err);
  } finally {
    process.exit(0);
  }
}

const targetEmail = process.argv[2];
resetTokens(targetEmail);
