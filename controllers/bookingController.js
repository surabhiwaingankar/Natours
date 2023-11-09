const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Tour = require('../models/tourModel');
const Booking = require('../models/bookingModel');
const catchAsync = require('../utils/catchAsync');

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  // 1) Get the currently booked tour
  const tour = await Tour.findById(req.params.tourId);
  console.log(tour);

  // 2) Create checkout session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    success_url: `${req.protocol}://${req.get('host')}/my-tours/?tour=${
      req.params.tourId
    }&user=${req.user.id}&price=${tour.price}`,
    cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`,
    customer_email: req.user.email,
    client_reference_id: req.params.tourId,
    line_items: [
      {
        name: `${tour.name} Tour`,
        description: tour.summary,
        images: [`https://www.natours.dev/img/tours/${tour.imageCover}`],
        amount: tour.price * 100,
        currency: 'usd',
        quantity: 1
      }
    ]
  });

  // 3) Create session as response
  res.status(200).json({
    status: 'success',
    session
  });
});

exports.createBookingCheckout = catchAsync(async (req, res, next) => {
  // This is only TEMPORARY, because it's UNSECURE: everyone can make bookings without paying
  const { tour, user, price } = req.query;

  if (!tour && !user && !price) return next();
  await Booking.create({ tour, user, price });

  res.redirect(req.originalUrl.split('?')[0]);
});

exports.createBooking = catchAsync (async(req,res,next) => {
  const booking = await Booking.create(req.body);
  res.status(201).json({
    status: 'success',
    data: {
      data: booking
    }
  });
})
exports.getBooking = catchAsync (async(req,res,next) => {
  
  const booking = Booking.findById(req.params.id);

    if (!booking) {
      return next(new AppError('No booking found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        data: booking
      }
    });
  
})
exports.getAllBookings = catchAsync (async(req,res,next) => {
    const bookings = await Booking.find();

    // SEND RESPONSE
    res.status(200).json({
      status: 'success',
      results: doc.length,
      data: {
        data: bookings
      }
    });
})
exports.updateBooking = catchAsync (async(req,res,next) => {
  const booking = await Booking.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  if (!booking) {
    return next(new AppError('No booking found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      data: booking
    }
  });
})
exports.deleteBooking = catchAsync (async(req,res,next) => {
  const booking = await Booking.findByIdAndDelete(req.params.id);

  if (!booking) {
    return next(new AppError('No booking found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null
  });
})
