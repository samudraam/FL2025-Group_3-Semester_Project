const express = require("express");
const router = express.Router();
const reservationController = require("../controllers/reservationController");
const { authenticateToken } = require("../middleware/auth");

router.get("/:courtId", reservationController.getReservations);
router.post("/:courtId/create", authenticateToken, reservationController.createReservation);

module.exports = router;
