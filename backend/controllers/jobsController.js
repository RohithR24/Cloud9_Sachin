const ErrorResponse = require("../utils/errorResponse");
const { v1: uuidv1, v4: uuidv4 } = require("uuid");
const Job = require("../models/jobModel");

const AWS = require("aws-sdk");
const awsConfig = {
  region: "us-east-2",
  endpoint: "http://dynamodb.us-east-2.amazonaws.com",
  accessKeyId: process.env.ACCESS_KEY_ID,
  secretAccessKey: process.env.SECRET_ACCESS_KEY,
};

AWS.config.update(awsConfig);

const dynamodb = new AWS.DynamoDB.DocumentClient();

// //create job
// exports.createJob = async (req, res, next) => {
//     try {
//         const job = await Job.create({
//             title: req.body.title,
//             description: req.body.description,
//             salary: req.body.salary,
//             location: req.body.location,
//             jobType: req.body.jobType,
//             user: req.user.id
//         });
//         res.status(201).json({
//             success: true,
//             job
//         })
//     } catch (error) {
//         next(error);
//     }
// }

exports.createJob = async (req, res, next) => {
  try {
    const docClient = new AWS.DynamoDB.DocumentClient();
    const new_job = {
      id: uuidv4(), // Unique identifier for the job
      title: req.body.title,
      description: req.body.description,
      salary: req.body.salary,
      location: req.body.location,
      jobType: req.body.jobType,
      user: req.user.id,
      available: true,
    };
    const params = {
      TableName: "jobs",
      Item: new_job,
    };

    await docClient.put(params).promise();

    res.status(201).json({
      success: true,
      new_job,
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

// //single job
// exports.singleJob = async (req, res, next) => {
//   try {
//     const job = await Job.findById(req.params.id);
//     res.status(200).json({
//       success: true,
//       job,
//     });
//   } catch (error) {
//     next(error);
//   }
// };

exports.singleJob = async (req, res, next) => {
  const params = {
    TableName: "jobs",
    Key: {
      id: req.params.id, // Assuming 'jobId' is the primary key for the 'Jobs' table
    },
  };

  try {
    const dynamoDB = new AWS.DynamoDB.DocumentClient();
    const jobData = await dynamoDB.get(params).promise();
    const job = jobData.Item;

    if (job) {
      const jobTypeParams = {
        TableName: "jobtypes",
        Key: {
          id: job.jobType, // Assuming 'jobTypeId' is the primary key for 'JobTypes' table
        },
      };
      const jobTypeData = await dynamoDB.get(jobTypeParams).promise();
      const jobType = jobTypeData.Item;

      // Combine the job and jobType data
      job.jobType = jobType;

      res.status(200).json({
        success: true,
        job,
      });
    } else {
      res.status(404).json({ success: false, message: "Job not found" });
    }
  } catch (error) {
    next(error);
  }
};
// update job by id.
exports.updateJob = async (req, res, next) => {
  try {
    const job = await Job.findByIdAndUpdate(req.params.job_id, req.body, {
      new: true,
    })
      .populate("jobType", "jobTypeName")
      .populate("user", "firstName lastName");
    res.status(200).json({
      success: true,
      job,
    });
  } catch (error) {
    next(error);
  }
};

// //update job by id.
// exports.showJobs = async (req, res, next) => {
//   res.json("zero");
//   //enable search
//   const keyword = req.query.keyword
//     ? {
//         title: {
//           $regex: req.query.keyword,
//           $options: "i",
//         },
//       }
//     : {};

//   // filter jobs by category ids
//   let ids = [];
//   const jobTypeCategory = await JobType.find({}, { _id: 1 });
//   jobTypeCategory.forEach((cat) => {
//     ids.push(cat._id);
//   });

//   let cat = req.query.cat;
//   let categ = cat !== "" ? cat : ids;

//   //jobs by location
//   let locations = [];
//   const jobByLocation = await Job.find({}, { location: 1 });
//   jobByLocation.forEach((val) => {
//     locations.push(val.location);
//   });
//   let setUniqueLocation = [...new Set(locations)];
//   let location = req.query.location;
//   let locationFilter = location !== "" ? location : setUniqueLocation;

//   //enable pagination
//   const pageSize = 5;
//   const page = Number(req.query.pageNumber) || 1;
//   //const count = await Job.find({}).estimatedDocumentCount();
//   const count = await Job.find({
//     ...keyword,
//     jobType: categ,
//     location: locationFilter,
//   }).countDocuments();

//   try {
//     const jobs = await Job.find({
//       ...keyword,
//       jobType: categ,
//       location: locationFilter,
//     })
//       .sort({ createdAt: -1 })
//       .populate("jobType", "jobTypeName")
//       .populate("user", "firstName")
//       .skip(pageSize * (page - 1))
//       .limit(pageSize);
//     res.status(200).json({
//       success: true,
//       jobs,
//       page,
//       pages: Math.ceil(count / pageSize),
//       count,
//       setUniqueLocation,
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// exports.showJobs = async (req, res, next) => {
//   const params = {
//     TableName: "jobs",
//   };

//   try {
//     const docClient = new AWS.DynamoDB.DocumentClient();
//     const jobsData = await docClient.scan(params).promise();
//     const jobs = jobsData.Items || [];
//     res.status(200).json({
//       success: true,
//       jobs,
//       count: jobs.length,
//     });
//   } catch (error) {
//     next(error);
//   }
// };

exports.showJobs = async (req, res, next) => {
  const params = {
    TableName: "jobs",
  };

  try {
    const dynamoDB = new AWS.DynamoDB.DocumentClient();

    const jobsData = await dynamoDB.scan(params).promise();
    let jobs = jobsData.Items || [];

    // Collect all unique JobType and User IDs
    const jobTypeIds = [...new Set(jobs.map((job) => job.jobType))];
    const userIds = [...new Set(jobs.map((job) => job.user))];

    // Fetch data from JobType and User tables based on the IDs
    const jobTypeData = await Promise.all(
      jobTypeIds.map((id) => {
        const jobTypeParams = {
          TableName: "jobtypes",
          Key: {
            id: id,
          },
        };
        return dynamoDB.get(jobTypeParams).promise();
      })
    );

    const userData = await Promise.all(
      userIds.map((id) => {
        const userParams = {
          TableName: "users",
          Key: {
            id: id,
          },
        };
        return dynamoDB.get(userParams).promise();
      })
    );

    // Map the fetched data to their respective Jobs
    jobs.forEach((job) => {
      const jobType = jobTypeData.find((data) => data.Item.id === job.jobType);
      const user = userData.find((data) => data.Item.id === job.user);
      job.jobType = jobType ? jobType.Item : {};
      job.user = user ? user.Item : {};
    });
    console.log("jobs", jobs);

    // Filtering based on given keywords
    const keyword = req.query.keyword;
    if (keyword) {
      jobs = jobs.filter((job) =>
        job.title.toLowerCase().includes(keyword.toLowerCase())
      );
    }
    const cat = req.query.cat;
    if (cat) {
      jobs = jobs.filter((job) => job.jobType.id === cat);
    }

    const locations = jobs.map((job) => job.location);
    let setUniqueLocation = [...new Set(locations)];

    const location = req.query.location;
    if (location) {
      jobs = jobs.filter(
        (job) => job.location.toLowerCase() === location.toLowerCase()
      );
    }
    console.log(keyword, cat, location);
    res.status(200).json({
      success: true,
      jobs,
      count: jobs.length,
      setUniqueLocation,
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
};
