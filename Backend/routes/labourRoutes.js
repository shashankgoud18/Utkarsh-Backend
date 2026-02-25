const express = require("express");
const router = express.Router();

const {
  searchLabour,
  getSingleLabour,
} = require("../controllers/labourController");
const {
  startIntake,
  submitAnswers,
} = require("../controllers/conversationController");


router.get("/search", searchLabour);
router.get("/:id", getSingleLabour);

router.post("/intake/start", startIntake);
router.post("/intake/:sessionId/answers", submitAnswers);

module.exports = router;