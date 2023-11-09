//const sharp = require('sharp');
const AppError = require('../utils/appError');
const User = require('./../models/userModels');
const  catchAsync = require('./../utils/catchAsync');
const multer = require('multer');


const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if(file.mimetype.startsWith('image'))
  {
    cb(null, true);
  }
  else{
    cb(new AppError("Not an image! Please upload an image!", 400), false);
  }
}

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter
});

exports.uploadUserPhoto = upload.single('photo');

exports.resizeUserPhoto = catchAsync(async (req, res, next) =>{
  if(!req.file) return next();

  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;

    // await sharp(req.file.buffer)
    // .resize(500, 500)
    // .toFormat('jpeg')
    // .jpeg({ quality: 90 })
    // .toFile(`public/img/users/${req.file.filename}`);

  next();
})

const filterObj = (obj, ...allowedFields) => {
    const newObj = {};
    Object.keys(obj).forEach(el => {
      if (allowedFields.includes(el)) newObj[el] = obj[el];
    });
    return newObj;
  };

exports.getMe = (req, res, next) => {
  req.params.id = req.user._id;
  console.log(req.params.id);
  next();
}

  exports.updateMe = catchAsync(async (req, res, next) => {
    // 1) Create error if user POSTs password data
    if (req.body.password || req.body.passwordConfirm) {
      return next(
        new AppError(
          'This route is not for password updates. Please use /updateMyPassword.',
          400
        )
      );
    }
  
    // 2) Filtered out unwanted fields names that are not allowed to be updated
    const filteredBody = filterObj(req.body, 'name', 'email');
    if(req.file) filteredBody.photo = req.file.filename
  
    // 3) Update user document
    const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
      new: true,
      runValidators: true
    });
  
    res.status(200).json({
      status: 'success',
      data: {
        user: updatedUser
      }
    });
  });

exports.deleteMe = catchAsync(async (req,res,next) =>{
    //console.log(req.user);
    const user = await User.findByIdAndUpdate(req.user._id, {active: false});
    res.status(200).json({
        status: "success",
        data: null
    })
})  

exports.getAllUsers = catchAsync(async (req,res,next) =>{
   const users = await User.find();


   //SEND RESPONSE
    res.status(200).json({
        status: 'success',
        results: users.length,
        data: {
            users
        }
    });
})


exports.getUser = catchAsync(async (req,res,next) =>{
  const user = await User.findById(req.params.id);
  if(!user)
  {
      next(new AppError("No user found with that id", 404));
      return; //otherwise 2 responses sent and another programming error
  }
   res.status(200).json({
       status: 'success',
       data: {
           user: user  
          }
  }); 
})

//to be used by admin
exports.deleteUser = catchAsync (async (req,res,next) =>{

  const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return next(new AppError('No user found with that ID', 404));
    }

    res.status(204).json({
      status: 'success',
      data: null
    });
})

//to be used by admin- do not change password using this route
exports.updateUser = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  if (!user) {
    return next(new AppError('No user found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      user: user
    }
  });
});
