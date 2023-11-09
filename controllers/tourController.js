const Tour = require('./../models/tourModel');
const APIFeatures = require('./../utils/apiFeatures');
const  catchAsync = require('./../utils/catchAsync');
const  AppError = require('./../utils/AppError');
const multer = require('multer');
//const sharp = require('sharp');

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

exports.uploadTourImages = upload.fields([
    { name: 'imageCover', maxCount: 1 },
    { name: 'images', maxCount: 3 }
]);

exports.resizeTourImages = catchAsync(async (req, res, next) => {
    if (!req.files.imageCover || !req.files.images) return next();
  
    // 1) Cover image
    req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;
    await sharp(req.files.imageCover[0].buffer)
      .resize(2000, 1333)
      .toFormat('jpeg')
      .jpeg({ quality: 90 })
      .toFile(`public/img/tours/${req.body.imageCover}`);
  
    // 2) Images
    req.body.images = [];
  
    await Promise.all(
      req.files.images.map(async (file, i) => {
        const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;
  
        // await sharp(file.buffer)
        //   .resize(2000, 1333)
        //   .toFormat('jpeg')
        //   .jpeg({ quality: 90 })
        //   .toFile(`public/img/tours/${filename}`);
  
        req.body.images.push(filename);
      })
    );
  
    next();
  });

// const tours = JSON.parse(fs.readFileSync(`${__dirname}/../dev-data/data/tours-simple.json`));

exports.aliasTopTours = (req,res, next) =>{
    req.query.limit='5';
    req.query.sort = '-ratingsAverage,price';
    req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
    next();
}



exports.getAllTours = catchAsync(async (req,res,next) =>{

       const features = new APIFeatures(Tour.find(), req.query).filter().sort().limitFields().paginate();
       const tours = await features.query;


       //SEND RESPONSE
        res.status(200).json({
            status: 'success',
            results: tours.length,
            data: {
                tours: tours
            }
        });
})

exports.getTour = catchAsync(async (req,res,next) =>{

    // Tour.findOne({_id: req.params.id})
   const tour = await Tour.findById(req.params.id).populate('reviews');
    if(!tour)
    {
        next(new AppError("No tour found with that id", 404));
        return; //otherwise 2 responses sent and another programming error
    }
     res.status(200).json({
         status: 'success',
         data: {
             tour: tour  
            }
    }); 
})

exports.updateTour = catchAsync(async (req,res,next) =>{
    
        const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        if(!tour)
    {
        next(new AppError("No tour found with that id", 404));
        return; //otherwise 2 responses sent and another programming error
    }

        res.status(200).json({
            status: "success",
            data: {
                tour: tour
            }
        });
    })


exports.createTour = catchAsync(async (req,res,next)=>{
    const newTour = await Tour.create(req.body);
    res.status(201).json({
        status: "success",
        data: {
            tour: newTour
        }
    }) 
})


exports.deleteTour= catchAsync(async (req,res,next) =>{   

        const tour = await Tour.findByIdAndDelete(req.params.id);
        if(!tour)
        {
            next(new AppError("No tour found with that id", 404));
            return; //otherwise 2 responses sent and another programming error
        }

        res.status(204).json({
            status: "success",
            data: null
        })
})

exports.getTourStats = catchAsync(async (req,res,next) =>{
        const stats = await Tour.aggregate([
            {
                $match: { ratingsAverage: { $gte: 4.5 }}
            },
            {
                $group: {
                    _id: '$ratingsAverage',
                    numTours: { $sum: 1},
                    numRatings: { $sum: '$ratingsQuantity'},
                    avgRating: { $avg: '$ratingsAverage'},
                    avgPrice: { $avg: '$price'},
                    minPrice: { $min: '$price'},
                    maxPrice: { $max: '$price'}
                }
            },
            {
                $sort: { avgPrice: 1}
            }
        ]);

        res.status(200).json({
            status: 'success',
            data: {
              stats
            }
          });
        })

exports.getMonthlyPlan = catchAsync(async (req,res,next) =>{

        const year = req.params.year*1; //2021

        const plan = await Tour.aggregate([
            {
                $unwind: '$startDates'
              },
              {
                $group: {
                  _id: { $month: '$startDates' },
                  numTourStarts: { $sum: 1 },
                  tours: { $push: '$name' }
                }
            },
            {
                $addFields: { month: '$_id' }
            },
            {
                $project: {
                    _id: 0
                }
            },
            {
                $sort: { numTourStarts: -1}
            }
           
        ])
        res.status(200).json({
            status: 'success',
            data: {
              plan
            }
          });
        })
