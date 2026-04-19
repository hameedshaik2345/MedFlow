const mongoose = require("mongoose");
const xlsx = require("xlsx");
const bcrypt = require("bcrypt");
const dotenv = require("dotenv");

dotenv.config({ path: __dirname + "/.env" });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  role: { type: String, default: "user" },
  specialty: { type: String },
  department: { type: String },
  experienceYears: { type: Number },
  address: { type: String },
}, { strict: false });

const User = mongoose.model("User", userSchema);

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB.");

  const workbook = xlsx.readFile('d:\\Vishal_VScode\\Vishal_React\\jnanasethu1\\All hospitals & Doctors List.xlsx');
  const items = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

  let counter = 0;
  const hash = await bcrypt.hash("doctor123", 10);

  for (const item of items) {
    if (!item.Doctor) continue;
    
    let expYears = 0;
    const expStr = item.Experience ? String(item.Experience) : "";
    const m = expStr.match(/\d+/);
    if (m) expYears = parseInt(m[0]);
    
    // generate a safe email
    const safeName = item.Doctor.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    const email = `${safeName}@medflow.com`;

    try {
        await User.updateOne({ email }, {
          $set: {
            name: item.Doctor,
            email: email,
            password: hash,
            role: "doctor",
            specialty: item.Specilization || "General",
            department: item.Specilization || "General",
            experienceYears: expYears,
            address: item.Hospital,
            isApproved: true,
            isEmailVerified: true
          }
        }, { upsert: true });
        counter++;
    } catch(err) {
        // likely duplicate email issues with similar names, ignoring
    }
  }

  console.log(`Seeded ${counter} doctors.`);
  process.exit();
}

seed();
