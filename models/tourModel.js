const mongoose = require ('mongoose');
const slugify = require('slugify');
const validator = require('validator');
const User = require('./userModels');

const tourSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "A tour must have a name"],
        unique: true,
        maxlength: [40, "A tour name must have less than or equal to 40 characters"],
        minlength: [10, "A tour name must have more than or equal to 10 characters"],
       // validate: {
       //     validator: validator.isAlpha,
       //     message: "Tour name must only contain characters"
       // }
    },

    slug: String,

    duration: {
        type: Number,
        required: [true, "A tour must have a "]
    },

    maxGroupSize: {
        type: Number,
        required: [true, "A tour must have a group size"]
    },

    difficulty: {
        type: String,
        required: [true, "A tour must have a difficulty"],
        enum: {
            values: ["easy", "medium", "difficult"],
            message: "Dificulty can only be easy medium or difficult"
        }
    },

    price: {
        type: Number,
        required: [true, "A tour must have a price"]
    },

    ratingsAverage: {
        type: Number,
        default: 4.5,
        min: [1, "Rating should be between 1.0 and 5.0"],
        max: [5, "Rating should be between 1.0 and 5.0"]
    },

    ratingsQuantity: {
        type: Number,
        default: 0
    },
    
    priceDiscount: {
        type: Number,
        validate: {
            validator: function(val){
                if(this.price<=val)
                return false;
                return true;
        },
        message: "The discount price should be lesser than the regular price"
        }
    },

    summary: {
        type: String,
        trim: true,
        required: [true, "A tour must have a description"]
    },

    description: {
        type: String,
        trim: true
    },

    imageCover: {
        type: String,
        required: [true, "A tour must have an image cover"]
    },

    images: [String],

    createdAt: {
        type: Date,
        default: Date.now(),
        select: false
    },

    startDates: [Date],

    secretTour: {
        type: Boolean,
        default: false
    },

    startLocation: {
        //GeoJSON
        type: {
            type: String,
            default: 'Point',
            enum: ['Point']
        },
        coordinates: [Number],
        address: String,
        description: String
    },

    locations: [
        {
            type: {
                type: String,
                default: 'Point',
                enum: ['Point']
            },
            coordinates: [Number],
            address: String,
            description: String,
            day: Number
        }
    ],
    guides: [
        {
            type: mongoose.Schema.ObjectId,
            ref: 'User'
        }
    ]
}, 
{
    toJSON: {virtuals: true},
    toObject: { virtuals: true}
})

tourSchema.virtual('durationWeeks').get(
    function()
    {
        return this.duration/7;
    }
)

tourSchema.virtual('reviews', {
    ref: 'Review',
    foreignField: 'tour',
    localField: '_id'
})

//tourSchema.index({price: 1});
tourSchema.index({price: 1, ratingsAverage: -1});
tourSchema.index({slug: 1});
// DOCUMENT MIDDLEWARE
tourSchema.pre('save', function(next){
    console.log(this);
    this.slug = slugify(this.name, {lower: true});
    next();
})

tourSchema.pre(/^find/, function(next){
    this.populate({
        path: 'guides',
        select: '-__v -passwordChangedAt'
    });
    next();
})
// tourSchema.pre('save', async function(next){
//     const guidesPromises = this.guides.map(async id =>
//         await User.findById(id)
//     )
//     this.guides = await Promise.all(guidesPromises);
//     next();
// })

//tourSchema.pre('save', function(next){
////    console.log("Will save doc//");
//    next();
//})

//tourSchema.post('save',function(doc,next){
//    console.log(doc);
//    next();
//})

//QUERY MIDDLEWARE

tourSchema.pre(/^find/,function(next){
    this.find({secretTour: {$ne: true}})

    this.start = Date.now();
    next();
})

tourSchema.post(/^find/,function(docs, next){
   // console.log(`The query took ${Date.now()-this.start} millisecs`)
   // console.log(docs)
    next();
})

//AGGREGATE MIDDLEWARE

tourSchema.pre('aggregate', function(next){
    this.pipeline().unshift({ $match: { secretTour: { $ne: true}} })
    next();
})

const Tour = mongoose.model('Tour', tourSchema)

module.exports = Tour