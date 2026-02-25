const express = require("express");
const router = express.Router();

const {
  createProfile,
  getQuestions,
  submitAnswers,
  searchLabour,
  getSingleLabour,
  updateLabour
} = require("../controllers/labourController");

router.post("/create", createProfile);
router.post("/:id/questions", getQuestions);
router.post("/:id/answers", submitAnswers);
router.get("/search", searchLabour);
router.get("/:id", getSingleLabour);
router.put("/:id", updateLabour);

module.exports = router;