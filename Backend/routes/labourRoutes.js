const express = require("express");
const router = express.Router();

const {
  createProfile,
  getQuestions,
  submitAnswers,
  searchLabour,
} = require("../controllers/labourController");

router.post("/create", createProfile);
router.post("/:id/questions", getQuestions);
router.post("/:id/answers", submitAnswers);
router.get("/search", searchLabour);

module.exports = router;