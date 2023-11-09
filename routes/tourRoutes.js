
const express = require('express');
const tourController = require(`./../controllers/tourController`);
const authenticationController = require('./../controllers/authenticationController');
const reviewController = require(`./../controllers/reviewController`);
const reviewRouter = require('./../routes/reviewRoutes');
//const { getAllTours, getTour, createTour, updateTour, deleteTour} = tourController

const router = express.Router();

router.use('/:tourId/reviews', reviewRouter);

//checking tourID if valid beforehand
// router.param('id', tourController.checkID);

router.route('/tour-stats').get(tourController.getTourStats);
router.route('/monthly-plan/:year').get(authenticationController.protect, authenticationController.restrictTo('admin', 'lead-guide', 'guide'),tourController.getMonthlyPlan);

router.route('/top5-cheap').get(tourController.aliasTopTours, tourController.getAllTours)

router.route('/').get(tourController.getAllTours).post(authenticationController.protect, authenticationController.restrictTo('admin', 'lead-guide'),tourController.createTour);
router.route('/:id').get(tourController.getTour).patch(authenticationController.protect, authenticationController.restrictTo('admin', 'lead-guide'), tourController.uploadTourImages, tourController.resizeTourImages, tourController.updateTour).delete(authenticationController.protect, authenticationController.restrictTo('admin', 'lead-guide'), tourController.deleteTour);

//router.route('/:tourId/reviews').post(authenticationController.protect, authenticationController.restrictTo('user'), reviewController.createReview);
module.exports = router;
