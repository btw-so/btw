var express = require("express");
var router = express.Router();
var { cacheUsers, cacheNotes } = require("../logic/notes");

router.post("/cache/refresh/user", async (req, res, next) => {
  const { user_id } = req.body || {};

  if (!user_id) {
    res.json({
      success: false,
      error: "Invalid or empty input",
    });
    return;
  }

  try {
    await cacheUsers({ user_id });
    res.json({
      success: true,
    });
  } catch (e) {
    res.json({
      success: false,
      error: e.message,
    });
  }
});

router.post("/cache/refresh/notes", async (req, res, next) => {
  const { user_id } = req.body || {};

  if (!user_id) {
    res.json({
      success: false,
      error: "Invalid or empty input",
    });
    return;
  }

  try {
    await cacheNotes({ user_id });
    res.json({
      success: true,
    });
  } catch (e) {
    res.json({
      success: false,
      error: e.message,
    });
  }
});

module.exports = router;
