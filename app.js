const path = require('path');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');

//also act as middle ware
const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require(`${__dirname}/routes/tourRoutes`);
const userRouter = require(`${__dirname}/routes/userRoutes`);
const reviewRouter = require(`${__dirname}/routes/reviewRoutes`);
const viewRouter = require(`${__dirname}/routes/viewRoutes`);
const bookingRouter = require(`${__dirname}/routes/bookingRoutes`);

const app = express();

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

//Global Middlewares
//set security http headers
app.use(helmet());

console.log(process.env.NODE_ENV);
// development logging
if(process.env.NODE_ENV === 'development')
{
    app.use(morgan('dev'));
}

//limits requests from same ip
const limiter = rateLimit({
    max: 100,
    windowMs: 60*60*1000,
    message: "Too many messages from this IP! Please try again in an hour!"
})

app.use('/api', limiter)

// body parser, reading data from the body into req.body
app.use(express.json({ limit: '10kb'}));
app.use(express.urlencoded({extended: true, limit: '10kb'}));
app.use(cookieParser());

//data sanitization against NoSQL query injection
app.use(mongoSanitize());

//data sanitization against XSS
app.use(xss());

//prevent parameter pollution
app.use(hpp({
    whitelist: ['duration', 'ratingsQuantity','ratingsAverage', 'difficulty', 'maxGroupSize', 'price']
}));

//serving static files
app.use(express.static(path.join(__dirname, 'public')));

//test middleware
app.use((req,res,next) =>{
    req.requestTime = new Date().toISOString();
    //console.log(req.cookies);
    next();
});


app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

app.all('*', (req, res, next) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
  });

app.use(globalErrorHandler);

module.exports = app;
