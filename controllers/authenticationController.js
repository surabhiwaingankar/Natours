const util = require('util');
const crypto = require('crypto');
const User = require('./../models/userModels');
const  catchAsync = require('./../utils/catchAsync');
const jwt = require('jsonwebtoken');
const AppError = require('./../utils/appError');
const Email = require('./../utils/email');

exports.signup = catchAsync(async(req, res, next) =>{
    const newUser = await User.create({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        passwordConfirm: req.body.passwordConfirm,
       // passwordChangedAt: req.body.passwordChangedAt,
        role: req.body.role
    });

    const url = `${req.protocol}://${req.get('host')}/me`; //protocol- http or https, host-local host etc
    console.log(url);
    await new Email(newUser, url).sendWelcome();

    const token = jwt.sign({ id: newUser._id},process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN
    })
    const cookieOptions = {
        expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN*24*60*60*1000),
        httpOnly: true
    }

     if(process.env.NODE_ENV==='production')
    cookieOptions.secure= true;

    res.cookie('jwt', token, cookieOptions)
    newUser.password= undefined;

    res.status(201).json({
        status: "success",
        token: token,  
        data: {
            user: newUser
        }
    })
});

exports.login = catchAsync(async (req, res, next) => {
    const password = req.body.password;
    const email = req.body.email;

    //1) check if email and password exists
    if(!email || !password)
    {
        next(new AppError("Please provide email and password", 400));
    }

    //2) check if user exists and password is correct

    const user = await User.findOne({email: req.body.email}).select('+password');
   // console.log(user);

    if(!user || !(await user.correctPassword(password, user.password)))
    {
        return next(new AppError("Incorrect username or password", 401));
    }

    //3) if everything is ok send jwt back to client
    const token = jwt.sign({id: user._id}, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN
    });

    const cookieOptions = {
        expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN*24*60*60*1000),
        httpOnly: true
    }

    if(process.env.NODE_ENV==='production')
    cookieOptions.secure= true;

    res.cookie('jwt', token, cookieOptions)
    user.password=undefined;

    res.status(200).json({
        status: "success",
        token: token
    })

})

exports.logout= (req,res) =>{
    res.cookie('jwt', 'loggedout', {
        expires: new Date(Date.now()+ 10*1000),
        httpOnly: true
        //can include secure: true as well
    });
    res.status(200).json({
        status: "success"
    });
}

exports.protect = catchAsync( async (req,res,next)=> {
    let token;
    //1) Get token and check if it exists
    if(req.headers.authorization && req.headers.authorization.startsWith('Bearer'))
    {
        token = req.headers.authorization.split(' ')[1];
    }
    else if(req.cookies.jwt)
    {
        token = req.cookies.jwt;
    }

    if(!token)
    {
        return next(new AppError("You have not logged in! Please login to view this", 401));
    }
    //verification step

   const decoded = await util.promisify(jwt.verify)(token, process.env.JWT_SECRET);

   //check if user still exists

   const checkUser = await User.findById(decoded.id);
   if(!checkUser)
   return next(new AppError("The user belonging to this token no longer exists.", 401));

   //check if user changed the password after the token was issued
   if(checkUser.changedPasswordAfter(decoded.iat)){
    return next(new AppError("User recently changed password! Please login again", 401));
   }

    req.user = checkUser;
    res.locals.user = checkUser; // for pug
    next(); //gets access to protected route
})


//ONLY FOR RENDERED PAGES WITH NO ERRORS
exports.isLoggedIn = async (req,res,next)=> {
    if(req.cookies.jwt)
    {
        try{
        //1) Verify the token
        const decoded = await util.promisify(jwt.verify)(req.cookies.jwt, process.env.JWT_SECRET);

        //check if user still exists

        const checkUser = await User.findById(decoded.id);
        if(!checkUser)
        return next();

        //check if user changed the password after the token was issued
        if(checkUser.changedPasswordAfter(decoded.iat)){
            return next();
        }
        // THERE IS A LOGGED IN USER
        res.locals.user = checkUser;
        return next(); //gets access to protected route
    }
    catch(err){
        return next(err);
    }
}
    next();
}


exports.restrictTo = (...roles) =>{
    return (req, res, next) => {
        if(!roles.includes(req.user.role))
        return next(new AppError("You do not have permission to do this",403))

        next();
    }
}

exports.forgotPassword = catchAsync(async (req, res, next) =>{
    //1) Get user based on email
    const user = await User.findOne({email: req.body.email});

    if(!user)
    return next(new AppError("There is no user with that email address",404));
    //2) Generate random reset token 
    const resetToken = user.createPasswordResetToken(); //instance method on doc in schema
    await user.save({ validateBeforeSave: false});

    //3) Send token back to email
    //const message = `Forgot your password?  Submit a PATCH request with your new password and passwordConfirm to: ${resetURL}. \nIf you didn't forget your password, then please ignore this message!`
    
    try {
        const resetURL = `${req.protocol}://${req.get(
        'host'
      )}/api/v1/users/resetPassword/${resetToken}`;

        await new Email(user, resetURL).sendPasswordReset();
    
        res.status(200).json({
          status: 'success',
          message: 'Token sent to email!'
        });
      } catch (err) {
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({ validateBeforeSave: false });
        return next(new AppError("There was an error sending the email. Try again later!",500));
    }
})

exports.resetPassword = catchAsync( async (req, res, next) =>{
    //1) get user based on token

    const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

    const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() }
      });
    

    //2) if token hasn't expired and there is a user, set the new password

    if(!user){
    return next(new AppError("Token is invalid or has expired", 400));
    }

    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
    //3) update the changedPasswordAt property for the client



    //4) log the user in and send jwt
    const token = jwt.sign({id: user._id}, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN
    });

    const cookieOptions = {
        expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN*24*60*60*1000),
        httpOnly: true
    }

    if(process.env.NODE_ENV==='production')
    cookieOptions.secure= true;

    res.cookie('jwt', token, cookieOptions);
    user.password=undefined;

    res.status(200).json({
        status: "success",
        token: token
    })
})

exports.updatePassword = catchAsync( async (req,res,next) =>{
    //1) get user 
    const user = await User.findById(req.user._id).select('+password');

    //2) check if POSTed password is correct
    if(!user.correctPassword(req.body.passwordCurrent, user.password))
    return next(new AppError("Your current password is wrong",401));

    //3) Update password
    user.password = req.body.password;
    user.passwordConfirm= req.body.password
    await user.save();

    //4) log the user in, send the JWT
    const token = jwt.sign({id: user._id}, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN
    });

    const cookieOptions = {
        expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN*24*60*60*1000),
        httpOnly: true
    }

    if(process.env.NODE_ENV==='production')
    cookieOptions.secure= true;

    res.cookie('jwt', token, cookieOptions);
    user.password=undefined;

    res.status(200).json({
        status: "success",
        token: token
    })


})