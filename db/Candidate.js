const mongoose = require("mongoose");

let schema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    education: [
      {
        degreeCode: {
          type: String,
        },
        startYear: {
          type: Number,
          min: 1930,
          max: new Date().getFullYear(),
          validate: Number.isInteger,
        },
        endYear: {
          type: Number,
          max: new Date().getFullYear(),
          validate: [
            { validator: Number.isInteger, msg: "Year should be an integer" },
            {
              validator: function (value) {
                return this.startYear <= value;
              },
              msg: "End year should be greater than or equal to Start year",
            },
          ],
        },
      },
    ],
    certificate: [
      {
        certificateTitle: {
          type: String,
        },
        certificateDuration : {
          type: Number,
          validate: Number.isInteger,
        },
      },
    ],
    project: [
      {
        projectTitle: {
          type: String,
        },
        projectStack: {
          type: String,
        },
      },
    ],
    experience: [
      {
        positionTitle: {
          type: String,
        },
        expTenure: {
          type: Number,
          validate: Number.isInteger,
        },
      },
    ],
    skills: [String],
    rating: {
      type: Number,
      max: 5.0,
      default: -1.0,
      validate: {
        validator: function (v) {
          return v >= -1.0 && v <= 5.0;
        },
        msg: "Invalid rating",
      },
    },
    resume: {
      type: String,
    },
  },
  { collation: { locale: "en" } }
);

module.exports = mongoose.model("CandidateInfo", schema);
