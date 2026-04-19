require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const PREDEFINED_HOSPITALS = [
  "AIIMS Mangalagiri",
  "NRI General Hospital",
  "Manipal Hospitals",
  "Vedanata Hospital",
  "Aster Ramesh Guntur",
  "Kamineni Hospital",
  "LV Prasad Eye Institute"
];

async function seedPharmacists() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const User = mongoose.model('User', new mongoose.Schema({}, {strict: false}));
    const hash = await bcrypt.hash('pharmacy123', 10);
    
    for (const hospital of PREDEFINED_HOSPITALS) {
       const shortName = hospital.split(' ')[0].toLowerCase();
       const email = `pharm_${shortName}@medflow.com`;
       await User.updateOne({ email }, {
         $set: {
           name: `Pharmacist - ${shortName.toUpperCase()}`,
           email,
           password: hash,
           role: 'pharmacist',
           address: hospital,
           isApproved: true,
           isEmailVerified: true
         }
       }, { upsert: true });
       console.log(`Created pharmacist for ${hospital}: ${email}`);
    }
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

seedPharmacists();
