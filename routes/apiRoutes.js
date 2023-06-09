const express = require("express");
const mongoose = require("mongoose");
const jwtAuth = require("../lib/jwtAuth");
const authKeys = require("../lib/authKeys");
const jwt = require("jsonwebtoken");

const User = require("../db/User");
const Candidate = require("../db/Candidate");
const Recruiter = require("../db/Recruiter");
const Job = require("../db/Job");
const Application = require("../db/Application");

const router = express.Router();

// To add new job  OK
router.post("/jobs", jwtAuth, (req, res) => {
  const user = req.user;
  if (user.type != "recruiter") {
    res.status(401).json({
      message: "You don't have permissions to add jobs",
    });
    return;
  }
  User.findById(user._id, "companyName", (err, user) => {
    const companyName = user.companyName;
    console.log(user.companyName);
    // do something with the companyName value
  });

  const data = req.body;
  console.log(data);

  let job = new Job({
    userId: user._id,
    title: data.title,
    company: data.company,
    minEducation: data.minEducation,
    minExperience: data.minExperience,
    minExperienceDuration: data.minExperienceDuration,
    location: data.location,
    maxApplicants: data.maxApplicants,
    maxPositions: data.maxPositions,
    dateOfPosting: data.dateOfPosting,
    deadline: data.deadline,
    skillsets: data.skillsets,
    jobType: data.jobType,
    salary: data.salary,
  });

  job
    .save()
    .then(() => {
      res.json({ message: "Job added successfully to the database" });
    })
    .catch((err) => {
      console.log(err);
      res.status(400).json(err);
    });
});

// to get all the jobs [pagination] [for recruiter personal and for everyone]
router.get("/jobs", (req, res) => {
  const authorizationHeader = req.headers.authorization;
  const token = authorizationHeader ? authorizationHeader.split(" ")[1] : null;
  const type = req.headers.type || null;

  if (token === null || type === null) {
    // No token or type present in the headers, send back all the jobs in the response
    Job.find()
      .then((jobs) => {
        res.status(200).json(jobs);
      })
      .catch((err) => {
        res.status(500).json({
          message: "Error retrieving jobs",
          error: error.message,
        });
      });
  } else {
    if (type == "recruiter") {
      const decoded = jwt.verify(token, authKeys.jwtSecretKey);
      const userId = decoded._id;

      Job.find({ userId: userId })
        .then((jobs) => {
          res.status(200).json(jobs);
        })
        .catch((err) => {
          res.status(500).json({
            message: "Error retrieving jobs",
            error: err,
          });
        });
    } else {
      const decoded = jwt.verify(token, authKeys.jwtSecretKey);
      const userId = decoded._id;
      console.log(userId);
      Candidate.findOne( { userId: userId } )
        .then((candidate) => {
          if (!candidate) {
            return res.status(404).json({ message: "Candidate not found" });
          }

          const candidateEducation = candidate.education.map(
            (edu) => edu.degreeCode
          );
          
          const candidateExperienceTitle = candidate.experience.map(
            (exp) => exp.positionTitle
          );
          const candidateExperienceTenure = candidate.experience.map(
            (exp) => exp.expTenure
          );
          const candidateSkills = candidate.skills;

          Job.find({
            $or: [
              { minEducation: { $in: candidateEducation } },
              { minExperience: { $in: candidateExperienceTitle } },
              { skillsets: { $in: candidateSkills } },
                
                  {minExperienceDuration: { $in: candidateExperienceTenure }} ,
                  //{minExperienceDuration: { $lt: candidateexpTenure }},
            ]
          })
            .then((jobs) => {
              res.status(200).json(jobs);
            })
            .catch((error) => {
              res.status(500).json({ message: "Error retrieving jobs", error });
            });
        })
        .catch((error) => {
          res
            .status(500)
            .json({ message: "Error retrieving candidate", error });
        });
    }
  }
});

// to get info about a particular job
router.get("/jobs/:id", jwtAuth, (req, res) => {
  Job.findOne({ _id: req.params.id })
    .then((job) => {
      if (job == null) {
        res.status(400).json({
          message: "Job does not exist",
        });
        return;
      }
      res.json(job);
    })
    .catch((err) => {
      res.status(400).json(err);
    });
});

// to update info of a particular job
router.put("/jobs/:id", jwtAuth, (req, res) => {
  const user = req.user;
  if (user.type != "recruiter") {
    res.status(401).json({
      message: "You don't have permissions to change the job details",
    });
    return;
  }
  Job.findOne({
    _id: req.params.id,
    userId: user.id,
  })
    .then((job) => {
      if (job == null) {
        res.status(404).json({
          message: "Job does not exist",
        });
        return;
      }
      const data = req.body;
      if (data.company) {
        job.company = data.company;
      }
      if (data.jobType) {
        job.jobType = data.jobType;
      }
      if (data.location) {
        job.location = data.location;
      }
      if (data.maxPositions) {
        job.maxPositions = data.maxPositions;
      }
      if (data.minEducation) {
        job.minEducation = data.minEducation;
      }
      if (data.minExperience) {
        job.minExperience = data.minExperience;
      }
      if (data.minExperienceDuration) {
        job.minExperienceDuration = data.minExperienceDuration;
      }
      if (data.salary) {
        job.salary = data.salary;
      }
      if (data.skillsets) {
        job.skillsets = data.skillsets;
      }
      if (data.title) {
        job.title = data.title;
      }
      if (data.maxPositions) {
        job.maxPositions = data.maxPositions;
      }
      if (data.deadline) {
        job.deadline = data.deadline;
      }
      job
        .save()
        .then(() => {
          res.json({
            message: "Job details updated successfully",
          });
        })
        .catch((err) => {
          res.status(400).json(err);
        });
    })
    .catch((err) => {
      res.status(400).json(err);
    });
});

// to delete a job
router.delete("/jobs/:id", jwtAuth, (req, res) => {
  const user = req.user;
  if (user.type != "recruiter") {
    res.status(401).json({
      message: "You don't have permissions to delete the job",
    });
    return;
  }
  Job.findOneAndDelete({
    _id: req.params.id,
    userId: user.id,
  })
    .then((job) => {
      if (job === null) {
        res.status(401).json({
          message: "You don't have permissions to delete the job",
        });
        return;
      }
      res.json({
        message: "Job deleted successfully",
      });
    })
    .catch((err) => {
      res.status(400).json(err);
    });
});

// get user's personal details
router.get("/user", jwtAuth, (req, res) => {
  const user = req.user;
  if (user.type === "recruiter") {
    Recruiter.findOne({ userId: user._id })
      .then((recruiter) => {
        if (recruiter == null) {
          res.status(404).json({
            message: "User does not exist",
          });
          return;
        }
        res.json(recruiter);
      })
      .catch((err) => {
        res.status(400).json(err);
      });
  } else {
    Candidate.findOne({ userId: user._id })
      .then((Candidate) => {
        if (Candidate == null) {
          res.status(404).json({
            message: "User does not exist",
          });
          return;
        }
        res.json(Candidate);
      })
      .catch((err) => {
        res.status(400).json(err);
      });
  }
});

// get user details from id
router.get("/user/:id", jwtAuth, (req, res) => {
  User.findOne({ _id: req.params.id })
    .then((userData) => {
      if (userData === null) {
        res.status(404).json({
          message: "User does not exist",
        });
        return;
      }

      if (userData.type === "recruiter") {
        Recruiter.findOne({ userId: userData._id })
          .then((recruiter) => {
            if (recruiter === null) {
              res.status(404).json({
                message: "User does not exist",
              });
              return;
            }
            res.json(recruiter);
          })
          .catch((err) => {
            res.status(400).json(err);
          });
      } else {
        Candidate.findOne({ userId: userData._id })
          .then((Candidate) => {
            if (Candidate === null) {
              res.status(404).json({
                message: "User does not exist",
              });
              return;
            }
            res.json(Candidate);
          })
          .catch((err) => {
            res.status(400).json(err);
          });
      }
    })
    .catch((err) => {
      res.status(400).json(err);
    });
});

// update user details
router.put("/user", jwtAuth, (req, res) => {
  const user = req.user;
  const data = req.body;
  console.log(data);
  if (user.type == "recruiter") {
    Recruiter.findOne({ userId: user._id })
      .then((recruiter) => {
        if (recruiter == null) {
          res.status(404).json({
            message: "User does not exist",
          });
          return;
        }
        if (data.name) {
          recruiter.name = data.name;
        }
        if (data.contactNumber) {
          recruiter.contactNumber = data.contactNumber;
        }
        if (data.bio) {
          recruiter.bio = data.bio;
        }
        if (data.companyName) {
          recruiter.companyName = data.companyName;
        }
        if (data.designation) {
          recruiter.designation = data.designation;
        }
        recruiter
          .save()
          .then(() => {
            res.json({
              message: "User information updated successfully",
            });
          })
          .catch((err) => {
            res.status(400).json(err);
          });
      })
      .catch((err) => {
        res.status(400).json(err);
      });
  } else {
    Candidate.findOne({ userId: user._id })
      .then((Candidate) => {
        if (Candidate == null) {
          res.status(404).json({
            message: "User does not exist",
          });
          return;
        }
        if (data.name) {
          Candidate.name = data.name;
        }
        if (data.education) {
          Candidate.education = data.education;
        }
        if (data.certificate) {
          Candidate.certificate = data.certificate;
        }
        if (data.project) {
          Candidate.project = data.project;
        }
        if (data.experience) {
          Candidate.experience = data.experience;
        }
        if (data.skills) {
          Candidate.skills = data.skills;
        }
        if (data.resume) {
          Candidate.resume = data.resume;
        }
        if (data.profile) {
          Candidate.profile = data.profile;
        }
        Candidate.save()
          .then(() => {
            res.json({
              message: "User information updated successfully",
            });
          })
          .catch((err) => {
            res.status(400).json(err);
          });
      })
      .catch((err) => {
        res.status(400).json(err);
      });
  }
});

// apply for a job [todo: test: done]
router.post("/jobs/:id/applications", jwtAuth, (req, res) => {
  const user = req.user;
  if (user.type != "candidate") {
    res.status(401).json({
      message: "You don't have permissions to apply for a job",
    });
    return;
  }
  const data = req.body;
  const jobId = req.params.id;
  // check whether applied previously
  // find job
  // check count of active applications < limit
  // check user had < 10 active applications && check if user is not having any accepted jobs (user id)
  // store the data in applications

  Application.findOne({
    userId: user._id,
    jobId: jobId,
    status: {
      $nin: ["deleted", "accepted", "cancelled"],
    },
  })
    .then((appliedApplication) => {
      console.log(appliedApplication);
      if (appliedApplication !== null) {
        res.status(400).json({
          message: "You have already applied for this job",
        });
        return;
      }

      Job.findOne({ _id: jobId })
        .then((job) => {
          if (job === null) {
            res.status(404).json({
              message: "Job does not exist",
            });
            return;
          }
          Application.countDocuments({
            jobId: jobId,
            status: {
              $nin: ["rejected", "deleted", "cancelled", "finished"],
            },
          })
            .then((activeApplicationCount) => {
              if (activeApplicationCount < job.maxPositions) {
                Application.countDocuments({
                  userId: user._id,
                  status: {
                    $nin: ["rejected", "deleted", "cancelled", "finished"],
                  },
                })
                  .then((myActiveApplicationCount) => {
                    if (myActiveApplicationCount < 10) {
                      Application.countDocuments({
                        userId: user._id,
                        status: "accepted",
                      }).then((acceptedJobs) => {
                        if (acceptedJobs === 0) {
                          const application = new Application({
                            userId: user._id,
                            recruiterId: job.userId,
                            jobId: job._id,
                            status: "applied",
                            sop: data.sop,
                          });
                          application
                            .save()
                            .then(() => {
                              job.activeApplications += 1;
                              job.save().then(() => {
                                res.json({
                                  message: "Job application successful",
                                });
                              });
                            })
                            .catch((err) => {
                              res.status(400).json(err);
                            });
                        } else {
                          res.status(400).json({
                            message:
                              "You already have an accepted job. Hence you cannot apply.",
                          });
                        }
                      });
                    } else {
                      res.status(400).json({
                        message:
                          "You have 10 active applications. Hence you cannot apply.",
                      });
                    }
                  })
                  .catch((err) => {
                    res.status(400).json(err);
                  });
              } else {
                res.status(400).json({
                  message: "Application limit reached",
                });
              }
            })
            .catch((err) => {
              res.status(400).json(err);
            });
        })
        .catch((err) => {
          res.status(400).json(err);
        });
    })
    .catch((err) => {
      res.json(400).json(err);
    });
});

// recruiter gets applications for a particular job [pagination] [todo: test: done]
router.get("/jobs/:id/applications", jwtAuth, (req, res) => {
  const user = req.user;
  if (user.type != "recruiter") {
    res.status(401).json({
      message: "You don't have permissions to view job applications",
    });
    return;
  }
  const jobId = req.params.id;

  // const page = parseInt(req.query.page) ? parseInt(req.query.page) : 1;
  // const limit = parseInt(req.query.limit) ? parseInt(req.query.limit) : 10;
  // const skip = page - 1 >= 0 ? (page - 1) * limit : 0;

  let findParams = {
    jobId: jobId,
    recruiterId: user._id,
  };

  let sortParams = {};

  if (req.query.status) {
    findParams = {
      ...findParams,
      status: req.query.status,
    };
  }

  Application.find(findParams)
    .collation({ locale: "en" })
    .sort(sortParams)
    // .skip(skip)
    // .limit(limit)
    .then((applications) => {
      res.json(applications);
    })
    .catch((err) => {
      res.status(400).json(err);
    });
});

// recruiter/applicant gets all his applications [pagination]
router.get("/applications", jwtAuth, (req, res) => {
  const user = req.user;
  const userID = user._id;

  if (user.type === "candidate") {
    Candidate.findOne({ userId: userID })
      .then((candidate) => {
        Application.find({ userId: userID })
          .then((applications) => {
            const jobIDs = applications.map((application) => application.jobId);
            const applicationApplyDate = applications.map(
              (application) => application.dateOfApplication
            );
            const applicationStatus = applications.map(
              (application) => application.status
            );

            Job.find({ _id: { $in: jobIDs } })
              .then((jobs) => {
                const responseData = {
                  jobs: jobs.map((job) => ({
                    jobTitle: job.title,
                    jobCompany: job.company,
                    jobLocation: job.location,
                    jobSalary: job.salary,
                    jobSkill: job.skillsets,
                    applicationStatus: applicationStatus,
                    applicationApplyDate: applicationApplyDate,
                  })),
                };
                res.json(responseData); // Send response with candidate, applications, and jobs data
              })
              .catch((error) => {
                res.status(500).json({ error: "Error retrieving jobs" });
              });
          })
          .catch((error) => {
            res.status(500).json({ error: "Error retrieving applications" });
          });
      })
      .catch((error) => {
        res.status(500).json({ error: "Error retrieving candidate" });
      });
  } else {
    Recruiter.findOne({ userId: userID })
      .then((recruiter) => {
        Application.find({ recruiterId: recruiter.userId })
          .then((applications) => {
            const applicationIDs = applications.map((application) => application._id);
            const jobIDs = applications.map((application) => application.jobId);
            const candidateIDs = applications.map(
              (application) => application.userId
            );
            const applicationStatus = applications.map(
              (application) => application.status
            );
            const applicationApplyDate = applications.map(
              (application) => application.dateOfApplication
            );
            const sop = applications.map((application) => application.sop);
            Candidate.find({ userId: { $in: candidateIDs } })
              .then((candidates) => {
                const candidateName = candidates.map((candidates) => candidates.name);
                const candidateEdu = candidates.map((candidate) => candidate.education);
                const candidateResume = candidates.map((candidate) => candidate.resume);
                const candidateSkills = candidates.map((candidate) => candidate.skills);
                Job.find({ _id: { $in: jobIDs } })
                  .then((jobs) => {
                    const responseData = {
                      jobs: jobs.map((job) => ({
                        jobTitle: job.title,
                        jobLocation: job.location,
                        jobSalary: job.salary,
                        jobSkill: job.skillsets,
                        applicationIDs: applicationIDs,
                        candidateName: candidateName,
                        candidateEducation: candidateEdu,
                        candidateResume: candidateResume,
                        candidateSkills: candidateSkills,
                        sop : sop,
                        applicationStatus: applicationStatus,
                        applicationApplyDate: applicationApplyDate,
                      })),
                    };
                    res.json(responseData); // Send response with recruiter, applications, candidates, and jobs data
                  })
                  .catch((error) => {
                    res.status(500).json({ error: "Error retrieving jobs" });
                  });
              })
              .catch((error) => {
                res.status(500).json({ error: "Error retrieving candidates" });
              });
          })
          .catch((error) => {
            res.status(500).json({ error: "Error retrieving applications" });
          });
      })
      .catch((error) => {
        res.status(500).json({ error: "Error retrieving recruiter" });
      });
  }

  // const page = parseInt(req.query.page) ? parseInt(req.query.page) : 1;
  // const limit = parseInt(req.query.limit) ? parseInt(req.query.limit) : 10;
  // const skip = page - 1 >= 0 ? (page - 1) * limit : 0;

  // Application.aggregate([
  //   {
  //     $lookup: {
  //       from: "Candidateinfos",
  //       localField: "userId",
  //       foreignField: "userId",
  //       as: "Candidate",
  //     },
  //   },
  //   { $unwind: "$Candidate" },
  //   {
  //     $lookup: {
  //       from: "jobs",
  //       localField: "jobId",
  //       foreignField: "_id",
  //       as: "job",
  //     },
  //   },
  //   { $unwind: "$job" },
  //   {
  //     $lookup: {
  //       from: "recruiterinfos",
  //       localField: "recruiterId",
  //       foreignField: "userId",
  //       as: "recruiter",
  //     },
  //   },
  //   { $unwind: "$recruiter" },
  //   {
  //     $match: {
  //       [user.type === "recruiter" ? "recruiterId" : "userId"]: user._id,
  //     },
  //   },
  //   {
  //     $sort: {
  //       dateOfApplication: -1,
  //     },
  //   },
  // ])
  //   .then((applications) => {
  //     console.log(applications);
  //     res.json(applications);
  //   })
  //   .catch((err) => {
  //     res.status(400).json(err);
  //   });
});

// update status of application: [Applicant: Can cancel, Recruiter: Can do everything] [todo: test: done]
router.put("/applications/:id", jwtAuth, (req, res) => {
  const user = req.user;
  const id = req.params.id;
  const status = req.body.status;

  // "applied", // when a applicant is applied
  // "shortlisted", // when a applicant is shortlisted
  // "accepted", // when a applicant is accepted
  // "rejected", // when a applicant is rejected
  // "deleted", // when any job is deleted
  // "cancelled", // an application is cancelled by its author or when other application is accepted
  // "finished", // when job is over

  if (user.type === "recruiter") {
    if (status === "accepted") {
      // get job id from application
      // get job info for maxPositions count
      // count applications that are already accepted
      // compare and if condition is satisfied, then save

      Application.findOne({
        _id: id,
        recruiterId: user._id,
      })
        .then((application) => {
          if (application === null) {
            res.status(404).json({
              message: "Application not found",
            });
            return;
          }

          Job.findOne({
            _id: application.jobId,
            userId: user._id,
          }).then((job) => {
            if (job === null) {
              res.status(404).json({
                message: "Job does not exist",
              });
              return;
            }

            Application.countDocuments({
              recruiterId: user._id,
              jobId: job._id,
              status: "accepted",
            }).then((activeApplicationCount) => {
              if (activeApplicationCount < job.maxPositions) {
                // accepted
                application.status = status;
                application
                  .save()
                  .then(() => {
                    Application.updateMany(
                      {
                        _id: {
                          $ne: application._id,
                        },
                        userId: application.userId,
                        status: {
                          $nin: [
                            "rejected",
                            "deleted",
                            "cancelled",
                            "accepted",
                            "finished",
                          ],
                        },
                      },
                      {
                        $set: {
                          status: "cancelled",
                        },
                      },
                      { multi: true }
                    )
                      .then(() => {
                        if (status === "accepted") {
                          Job.findOneAndUpdate(
                            {
                              _id: job._id,
                              userId: user._id,
                            },
                            {
                              $set: {
                                acceptedCandidates: activeApplicationCount + 1,
                              },
                            }
                          )
                            .then(() => {
                              res.json({
                                message: `Application ${status} successfully`,
                              });
                            })
                            .catch((err) => {
                              res.status(400).json(err);
                            });
                        } else {
                          res.json({
                            message: `Application ${status} successfully`,
                          });
                        }
                      })
                      .catch((err) => {
                        res.status(400).json(err);
                      });
                  })
                  .catch((err) => {
                    res.status(400).json(err);
                  });
              } else {
                res.status(400).json({
                  message: "All positions for this job are already filled",
                });
              }
            });
          });
        })
        .catch((err) => {
          res.status(400).json(err);
        });
    } else {
      Application.findOneAndUpdate(
        {
          _id: id,
          recruiterId: user._id,
          status: {
            $nin: ["rejected", "deleted", "cancelled"],
          },
        },
        {
          $set: {
            status: status,
          },
        }
      )
        .then((application) => {
          if (application === null) {
            res.status(400).json({
              message: "Application status cannot be updated",
            });
            return;
          }
          if (status === "finished") {
            res.json({
              message: `Job ${status} successfully`,
            });
          } else {
            res.json({
              message: `Application ${status} successfully`,
            });
          }
        })
        .catch((err) => {
          res.status(400).json(err);
        });
    }
  } else {
    if (status === "cancelled") {
      console.log(id);
      console.log(user._id);
      Application.findOneAndUpdate(
        {
          _id: id,
          userId: user._id,
        },
        {
          $set: {
            status: status,
          },
        }
      )
        .then((tmp) => {
          console.log(tmp);
          res.json({
            message: `Application ${status} successfully`,
          });
        })
        .catch((err) => {
          res.status(400).json(err);
        });
    } else {
      res.status(401).json({
        message: "You don't have permissions to update job status",
      });
    }
  }
});

// get a list of final applicants for current job : recruiter
// get a list of final applicants for all his jobs : recuiter
router.get("/applicants", jwtAuth, (req, res) => {
  const user = req.user;
  if (user.type === "recruiter") {
    let findParams = {
      recruiterId: user._id,
    };
    if (req.query.jobId) {
      findParams = {
        ...findParams,
        jobId: new mongoose.Types.ObjectId(req.query.jobId),
      };
    }
    if (req.query.status) {
      if (Array.isArray(req.query.status)) {
        findParams = {
          ...findParams,
          status: { $in: req.query.status },
        };
      } else {
        findParams = {
          ...findParams,
          status: req.query.status,
        };
      }
    }
    let sortParams = {};

    if (!req.query.asc && !req.query.desc) {
      sortParams = { _id: 1 };
    }

    if (req.query.asc) {
      if (Array.isArray(req.query.asc)) {
        req.query.asc.map((key) => {
          sortParams = {
            ...sortParams,
            [key]: 1,
          };
        });
      } else {
        sortParams = {
          ...sortParams,
          [req.query.asc]: 1,
        };
      }
    }

    if (req.query.desc) {
      if (Array.isArray(req.query.desc)) {
        req.query.desc.map((key) => {
          sortParams = {
            ...sortParams,
            [key]: -1,
          };
        });
      } else {
        sortParams = {
          ...sortParams,
          [req.query.desc]: -1,
        };
      }
    }

    Application.aggregate([
      {
        $lookup: {
          from: "Candidateinfos",
          localField: "userId",
          foreignField: "userId",
          as: "Candidate",
        },
      },
      { $unwind: "$Candidate" },
      {
        $lookup: {
          from: "jobs",
          localField: "jobId",
          foreignField: "_id",
          as: "job",
        },
      },
      { $unwind: "$job" },
      { $match: findParams },
      { $sort: sortParams },
    ])
      .then((applications) => {
        if (applications.length === 0) {
          res.status(404).json({
            message: "No applicants found",
          });
          return;
        }
        res.json(applications);
      })
      .catch((err) => {
        res.status(400).json(err);
      });
  } else {
    res.status(400).json({
      message: "You are not allowed to access applicants list",
    });
  }
});


// Application.findOne({
//   _id: id,
//   userId: user._id,
// })
//   .then((application) => {
//     application.status = status;
//     application
//       .save()
//       .then(() => {
//         res.json({
//           message: `Application ${status} successfully`,
//         });
//       })
//       .catch((err) => {
//         res.status(400).json(err);
//       });
//   })
//   .catch((err) => {
//     res.status(400).json(err);
//   });

// router.get("/jobs", (req, res, next) => {
//   passport.authenticate("jwt", { session: false }, function (err, user, info) {
//     if (err) {
//       return next(err);
//     }
//     if (!user) {
//       res.status(401).json(info);
//       return;
//     }
//   })(req, res, next);
// });

module.exports = router;
