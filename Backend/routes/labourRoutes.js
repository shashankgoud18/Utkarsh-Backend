const express = require("express");
const router = express.Router();

const {
  searchLabour,
  getSingleLabour,
} = require("../controllers/labourController");
const {
  startIntake,
  submitAnswers,
  submitInterview
} = require("../controllers/conversationController");


router.get("/search", searchLabour);
router.get("/:id", getSingleLabour);

router.post("/intake/start", startIntake);
//router.post("/intake/submit", submitAnswers);
router.post("/submit", submitInterview);


module.exports = router;