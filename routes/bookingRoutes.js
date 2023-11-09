const express = require('express');
const bookingController = require('./../controllers/bookingController');
const authenticationController = require('./../controllers/authenticationController');

const router = express.Router();

router.use(authenticationController.protect);

router.get('/checkout-session/:tourId', bookingController.getCheckoutSession);

router.use(authenticationController.restrictTo('admin', 'lead-guide'));

router
  .route('/')
  .get(bookingController.getAllBookings)
  .post(bookingController.createBooking);

router
  .route('/:id')
  .get(bookingController.getBooking)
  .patch(bookingController.updateBooking)
  .delete(bookingController.deleteBooking);

module.exports = router;
