const express = require("express");
const multer = require("multer");
const path = require("path");
const XLSX = require("xlsx");
const router = express.Router();

const {
  Dog,
  Catcher,
  Doctor,
  DailyMonitoring,
  CareTaker,
} = require("../models/Dog");
const Image = require("../models/Image");
const Kennel = require("../models/Kennel");

const authenticateToken = require("../middleware/authenticateToken");

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    let extArray = file.mimetype.split("/");
    let extension = extArray[extArray.length - 1];
    cb(null, file.fieldname + "-" + Date.now() + "." + extension);
  },
});
// const fileUpload = multer({ dest: "uploads/" });
const fileUpload = multer({ storage: storage });

router.post("/report/xlsx", async (req, res) => {
  try {
    const { startDate, endDate } = req.body;

    const dogs = await Dog.find({
      createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
    }).populate({
      path: "catcherDetails",
      select: "spotPhoto",
      populate: {
        path: "spotPhoto",
        model: "Image",
        select: "path",
      },
    });

    res.status(200).json(dogs);
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error generating reports : " + error.message });
  }
});

const getReportData = (dog) => {
  try {
    const BASE_URL = "http://13.235.31.125/";
    let dogDetail = {};

    dogDetail = {
      "Sr. No.": dog._id.toString(),
      "Dog's Main Color": dog.mainColor,
      "Dog Gender": dog.gender,
      Description: dog.description,
    };

    if (dog.catcherDetails) {
      dogDetail = {
        ...dogDetail,
        "Catcher ID": dog.catcherDetails.catcher._id.toString(),
        "Catcher's Name": dog.catcherDetails.catcher.name,
        "Catcher's Contact Number": dog.catcherDetails.catcher.contactNumber,
        "Catching Location": dog.catcherDetails.catchingLocation,
        "Catching Location Details": dog.catcherDetails.locationDetails,
        "Releasing Location": dog.catcherDetails.releasingLocation,
        "Catched At": dog.catcherDetails.createdAt.toString(),
        "Spot Photo": dog.dogImage ? {
          t: "s",
          v: dog.dogImage.split('/').pop(),
          l: { Target: BASE_URL + dog.dogImage },
          s: { font: { color: { rgb: "0000FFFF" }, underline: true } },
        } : "",
      };
    }

    if (dog.vetDetails) {
      let vetDetails = {
        "Vet ID": dog.vetDetails.vet._id.toString(),
        "Vet's Name": dog.vetDetails.vet.name,
        "Vet's Contact Number": dog.vetDetails.vet.contactNumber,
        "Surgery date": dog.vetDetails.surgeryDate.toString(),

        "Surgery Photo": dog.vetDetails.surgeryPhoto ? {
          t: "s",
          v: dog.vetDetails.surgeryPhoto.split('/').pop(),
          l: { Target: BASE_URL + dog.vetDetails.surgeryPhoto },
          s: { font: { color: { rgb: "0000FFFF" }, underline: true } },
        } : "",
      }

      Object.keys(dog.vetDetails._doc).map((key, i) => {
        if (
          ![
            "surgeryPhoto",
            "additionalPhotos",
            "surgeryDate",
            "createdAt",
            "updatedAt",
            "additionalNotesPhotos",
            "vet",
            "_id",
          ].includes(key)
        ) {
          vetDetails = { ...vetDetails, [key]: dog.vetDetails[key] };
        }
      });

      dogDetail = { ...dogDetail, ...vetDetails };
    }

    if (dog.careTakerDetails) {
      let careTakerDetails = {
        "Caretaker ID": dog.careTakerDetails.careTaker._id.toString(),
        "Caretaker's Name": dog.careTakerDetails.careTaker.name,
        "Caretaker's Contact Number": dog.careTakerDetails.careTaker.contactNumber,
      }

      const reportsDetails = [];
      dog.careTakerDetails.reports.map((report, idx) => {
        careTakerDetails = {
          ...careTakerDetails,
          [`Day ${idx + 1} Report ID`]: report._id.toString(),
          [`Day ${idx + 1} Food Intake`]: report.foodIntake,
          [`Day ${idx + 1} Water Intake`]: report.waterIntake,
          [`Day ${idx + 1} Stool`]: report.stool,
          [`Day ${idx + 1} Antibiotics`]: report.antibiotics,
          [`Day ${idx + 1} Painkiller`]: report.painkiller,
          [`Day ${idx + 1} Photo`]: report.photo ? {
            t: "s",
            v: report.photo.split('/').pop(),
            l: { Target: BASE_URL + report.photo },
            s: { font: { color: { rgb: "0000FFFF" }, underline: true } },
          } : "",
          Date: report.date.toString(),
        };
      });

      dogDetail = {
        ...dogDetail,
        ...careTakerDetails,
      };
    }

    return dogDetail;
  } catch (err) {
    console.log("Error generating : " + err.message);
    return {};
  }
};

router.get("/generate/report/:dogIDS/xlsx", async (req, res) => {
  try {
    if (req) {
      const dogIDS = req.params.dogIDS.split(",");
      const workBook = XLSX.utils.book_new();

      const dogPromises = dogIDS.map(async (dogId) => {
        let dog = await Dog.findById(dogId).populate([
          {
            path: "catcherDetails",
            populate: [
              {
                path: "catcher",
                select: "_id name contactNumber role",
              },
              {
                path: "spotPhoto",
                select: "path",
              },
            ],
          },
          {
            path: "vetDetails",
            populate: [
              {
                path: "vet",
                select: "_id name contactNumber role",
              },
              {
                path: "surgeryPhoto",
                select: "path",
              },
            ],
          },
          {
            path: "careTakerDetails",
            populate: [
              {
                path: "careTaker",
                select: "_id name contactNumber role",
              },
              {
                path: "reports",
                populate: {
                  path: "photo",
                  select: "path",
                },
              },
            ],
          },
          {
            path: "kennel",
          },
        ]);

        if (!dog) {
          return res.status(404).json({ error: "Dog not found" });
        }

        return getReportData(dog);
      });

      Promise.all(dogPromises)
        .then((reportDataArray) => {
          let dogsSheet = XLSX.utils.json_to_sheet(reportDataArray);
          XLSX.utils.book_append_sheet(workBook, dogsSheet, "Dogs Report");

          const filePath = path.join(
            __dirname,
            "../public",
            `dog_details.xlsx`
          );
          XLSX.writeFile(workBook, filePath);

          res.setHeader(
            "Content-Disposition",
            `attachment; filename=Dogs Report (${new Date().toString()}).xlsx`
          );
          res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          );

          res.download(filePath, (err) => {
            if (err) {
              console.error("Error sending file:", err);
              res.status(500).json({ error: "Error sending file" });
            }
          });

          // res.status(200).json({ message: "Report generated successfully", data: reportDataArray })
        })
        .catch((error) => {
          res.status(404).json({ error: error.message });
        });
    } else {
      res.status(403).json({ message: "Unauthorized Access" });
    }
  } catch (error) {
    console.log("[report error] : " + error.message);
    res
      .status(500)
      .json({ error: "Error generating a report : " + error.message });
  }
});

// Get : dogs for inital observations (dogs with no kennel)
router.get("/observable", authenticateToken, async (req, res) => {
  try {
    const dogs = await Dog.find({ kennel: { $exists: false }, isReleased: false, isDispatched: false }).populate({
      path: "catcherDetails",
      select: "catchingLocation",
      populate: {
        path: "spotPhoto",
        model: "Image",
      },
    });

    res.status(200).json(dogs);
  } catch (error) {
    res.status(400).json({ error: "Error retrieving dogs : " + error.message });
  }
});

// Get : dogs whose surgery date has past 3 days
router.get("/dispatchable", async (req, res) => {
  try {
    const past3Days = new Date()
    past3Days.setDate(past3Days.getDate() - 3);


    const vetDetailsArray = await Doctor.find(
      { surgeryDate: { $lte: past3Days } }
    );

    const vetDetailsIds = vetDetailsArray.map((vetDetails) => vetDetails._id);

    const dogs = await Dog.find({ vetDetails: { $in: vetDetailsIds }, isReleased: false, isDispatched: false })
      .populate({
        path: "catcherDetails",
        select: "catchingLocation",
        populate: {
          path: "spotPhoto",
          model: "Image",
        },
      })
      .populate("kennel")
      .populate({
        path: "vetDetails",
        populate: [
          { path: "surgeryPhoto", model: "Image" },
          { path: "additionalPhotos", model: "Image" },
          { path: "surgeryNotesPhoto", model: "Image" },
          { path: "additionalNotesPhotos", model: "Image" },
        ],
      });

    res.status(200).json(dogs);
  } catch (error) {
    res.status(500).json({ error: "Error retrieving dogs : " + error.message });
  }
});

// Get : dogs whose isDispatched status is true
router.get("/releasable", authenticateToken, async (req, res) => {
  try {
    const dogs = await Dog.find({ isDispatched: true, isReleased: false }).populate([
      {
        path: "catcherDetails",
        select: "catchingLocation",
        populate: {
          path: "spotPhoto",
          model: "Image",
        },
      },
      {
        path: "careTakerDetails",
        select: "_id name contactNumber",
      },
      {
        path: "kennel",
      },
    ]);

    res.status(200).json(dogs);
  } catch (error) {
    res.status(500).json({ error: "Error retrieving dogs" });
  }
});

// Post : dog id sent in post, should be marked as dispatched
router.post("/:id/dispatch", authenticateToken, async (req, res) => {
  try {
    const dogId = req.params.id;

    const dog = await Dog.findById(dogId);
    if (!dog) {
      res.status(404).json({ error: "Dog not found" });
    }

    dog.isDispatched = true;
    dog.status = "Dispatched";
    await dog.save();

    res.status(200).json({ message: "Dog was dispatched" });
  } catch (error) {
    res.status(500).json({
      error: "Error dispatching dog : " + error.message,
    });
  }
});

// Post : dog id sent in post, should be marked as released
router.post("/:id/release", authenticateToken, async (req, res) => {
  try {
    const dogId = req.params.id;
    const { releaseLocation } = req.body;

    const dog = await Dog.findById(dogId);
    if (!dog) {
      res.status(404).json({ error: "Dog not found" });
    }

    dog.isReleased = true;
    dog.status = "Released"
    dog.releaseDate = new Date(); // set current date
    dog.releaseLocation = releaseLocation;
    await dog.save();

    const kennel = await Kennel.findById(dog.kennel._id);
    kennel.isOccupied = false;
    await kennel.save();

    res.status(200).json({ message: "Dog was released" });
  } catch (error) {
    res.status(500).json({
      error: "Error dispatching dog : " + error.message,
    });
  }
});

module.exports = router;
