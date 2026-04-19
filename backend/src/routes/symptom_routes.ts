import express, { Request, Response } from "express";
import User from "../models/user_models";
import { authenticateJWT, authorizeRole } from "../middleware/authMiddleware";

const router = express.Router();

// Knowledge base for keyword extraction
const keywordToSpecialty: Record<string, string[]> = {
  head: ["General Physician", "Neurologist"],
  headache: ["General Physician", "Neurologist"],
  feve: ["General Physician", "Family Medicine Specialist"],
  fever: ["General Physician", "Family Medicine Specialist"],
  chest: ["Cardiologist", "General Physician"],
  heart: ["Cardiologist"],
  skin: ["Dermatologist"],
  rash: ["Dermatologist"],
  eye: ["Ophthalmologist"],
  vision: ["Ophthalmologist"],
  tooth: ["Dentist"],
  dental: ["Dentist"],
  stomach: ["Gastroenterologist", "General Physician"],
  digestion: ["Gastroenterologist"],
  bone: ["Orthopedic Surgeon"],
  joint: ["Orthopedic Surgeon"],
  muscle: ["Orthopedic Surgeon", "Rheumatologist"],
  child: ["Pediatrician"],
  kidney: ["Nephrologist"],
  urine: ["Urologist"],
  nervous: ["Neurologist"],
  brain: ["Neurologist", "Neurosurgeon"],
  cough: ["General Physician", "Pulmonologist"],
  cold: ["General Physician"],
  throat: ["ENT Specialist", "General Physician"],
  ear: ["ENT Specialist"],
  nose: ["ENT Specialist"],
};

router.post("/analyze", async (req: Request, res: Response): Promise<void> => {
  try {
    const { symptoms } = req.body;
    
    if (!symptoms || typeof symptoms !== 'string') {
      res.status(400).json({ message: "Please provide a valid symptoms string." });
      return;
    }

    const lowerSymptoms = symptoms.toLowerCase();
    const recommendedSpecialties = new Set<string>();

    // Basic keyword parsing
    for (const [key, specialties] of Object.entries(keywordToSpecialty)) {
      if (lowerSymptoms.includes(key)) {
        specialties.forEach(sp => recommendedSpecialties.add(sp));
      }
    }

    // Default if no match
    if (recommendedSpecialties.size === 0) {
      recommendedSpecialties.add("General Physician");
    }

    const specialtiesList = Array.from(recommendedSpecialties);

    // Fetch doctors matching these specialties
    const recommendedDoctors = await User.find({
      role: "doctor",
      specialty: { $in: specialtiesList }
    }).select("name specialty department address experienceYears rating currentToken liveStatus");

    res.json({
      specialties: specialtiesList,
      doctors: recommendedDoctors
    });

  } catch (error) {
    res.status(500).json({ message: "Error analyzing symptoms", error });
  }
});

export default router;
