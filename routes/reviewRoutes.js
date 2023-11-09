const express = require('express');
const reviewController = require(`./../controllers/reviewController`);
const authenticationController = require(`./../controllers/authenticationController`);

const router = express.Router({ mergeParams: true});

router.route('/').get(reviewController.getAllReviews).post(authenticationController.protect, authenticationController.restrictTo('user','admin') ,reviewController.createReview);
router.route('/:id').get(reviewController.getReview).delete(authenticationController.protect, authenticationController.restrictTo('user','admin'),reviewController.deleteReview).patch(authenticationController.protect, authenticationController.restrictTo('user'),reviewController.updateReview);
module.exports = router;
