const express = require('express');
const userController = require(`./../controllers/userController`);
const authenticationController = require(`./../controllers/authenticationController`);

const router = express.Router();

router.route('/signup').post(authenticationController.signup);
router.route('/login').post(authenticationController.login);
router.route('/logout').get(authenticationController.logout);

router.route('/forgotPassword').post(authenticationController.forgotPassword);
router.route('/resetPassword/:token').patch(authenticationController.resetPassword);
router.route('/updatePassword').patch(authenticationController.protect ,authenticationController.updatePassword);

router.route('/me').get(authenticationController.protect, userController.getMe, userController.getUser);
router.route('/updateMe').patch(authenticationController.protect, userController.uploadUserPhoto, userController.resizeUserPhoto, userController.updateMe);
router.route('/deleteMe').delete(authenticationController.protect, userController.deleteMe);

router.route('/').get(authenticationController.protect,  authenticationController.restrictTo('admin'), userController.getAllUsers);
router.route('/:id').patch(authenticationController.protect,  authenticationController.restrictTo('admin'), userController.updateUser).delete(authenticationController.protect,  authenticationController.restrictTo('admin'),userController.deleteUser);


module.exports = router
