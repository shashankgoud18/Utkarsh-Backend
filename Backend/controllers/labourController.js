const LabourProfile = require("../models/LabourProfile");

// Search
const searchLabour = async (req, res, next) => {
  try {
    const {
      trade,
      location,
      minExperience,
      minSalary,
      maxSalary,
    } = req.query;

    let query = {
      status: "evaluated",
    };

    if (trade) {
      query.trade = { $regex: trade, $options: "i" };
    }

    if (location) {
      query.location = { $regex: location, $options: "i" };
    }

    if (minExperience) {
      query.experience = { $gte: Number(minExperience) };
    }

    if (minSalary || maxSalary) {
      query["salaryRange.min"] = {
        $lte: Number(maxSalary || 999999),
      };

      query["salaryRange.max"] = {
        $gte: Number(minSalary || 0),
      };
    }

    const results = await LabourProfile.find(query)
      .select("name trade experience location salaryRange totalScore badge")
      .sort({ totalScore: -1 });

    res.json(results);
  } catch (error) {
    next(error);
  }
};

const getSingleLabour = async (req, res) => {
  try {
    const labour = await LabourProfile.findById(req.params.id);

    if (!labour) {
      return res.status(404).json({ message: "Profile not found" });
    }

    res.status(200).json(labour);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

module.exports = {
  searchLabour,
  getSingleLabour,
  
};