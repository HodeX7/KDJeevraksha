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

// List Dogs
router.get("/", authenticateToken, async (req, res) => {
  try {
    const dogs = await Dog.find()
      .populate({
        path: "catcherDetails",
        populate: {
          path: "catcher",
          select: "_id name contactNumber role",
        },
      })
      .populate({
        path: "vetDetails",
        populate: {
          path: "vet",
          select: "_id name contactNumber role",
        },
      })
      .populate({
        path: "careTakerDetails",
        populate: {
          path: "careTaker",
          select: "_id name contactNumber role",
        },
      })
      .populate("kennel");

    res.status(200).json(dogs);
  } catch (error) {
    res.status(500).json({ error: "Error retrieving dogs" });
  }
});

// Retrieve Dog
router.get("/:id/retrieve", authenticateToken, async (req, res) => {
  try {
    const dogId = req.params.id;
    const dog = await Dog.findById(dogId)
      .populate({
        path: "catcherDetails",
        populate: {
          path: "catcher",
          select: "_id name contactNumber role",
        },
      })
      .populate({
        path: "catcherDetails",
        populate: {
          path: "catcher",
          select: "_id name contactNumber role",
        },
      })
      .populate({
        path: "vetDetails",
        populate: {
          path: "vet",
          select: "_id name contactNumber role",
        },
      })
      .populate({
        path: "careTakerDetails",
        populate: {
          path: "careTaker",
          select: "_id name contactNumber role",
        },
      })
      .populate("kennel");

    if (!dog) {
      return res.status(404).json({ error: "Dog not found" });
    }

    res.status(200).json(dog);
  } catch (error) {
    res.status(500).json({ error: "Error retrieving dog" });
  }
});

// Retreieve dog by kennel id
router.get("/kennel/:id", authenticateToken, async (req, res) => {
  const kennelId = req.params.id;

  try {
    const kennel = await Kennel.findOne({ kennelId: kennelId });

    if (!kennel) {
      return res.status(404).json({ message: "Kennel not found" });
    }

    const dog = await Dog.findOne({ kennel: kennel._id, isReleased: false })
      .populate({
        path: "catcherDetails",
        populate: [{
          path: "catcher",
          select: "_id name contactNumber role",
        }, {
          path: "spotPhoto",
          model: "Image",
        },],
      })
      .populate({
        path: "vetDetails",
        populate: {
          path: "vet",
          select: "_id name contactNumber role",
        },
      })
      .populate({
        path: "careTakerDetails",
        populate: {
          path: "careTaker",
          select: "_id name contactNumber role",
        },
      })
      .populate("kennel");

    if (!dog) {
      return res.status(400).json({error: "Kennel is Empty"})
    }

    res.status(200).json(dog);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Error retrieving dogs by kennel ID : " + error.message });
  }
});

// Delete Dog
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const dogId = req.params.id;
    const deletedDog = await Dog.findByIdAndRemove(dogId);

    if (!deletedDog) {
      return res.status(404).json({ error: "Dog not found" });
    }

    res.status(200).json({ message: "Dog deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Error deleting dog" });
  }
});

// Create Dog - just update the details in dog, no updation in foriegn keys
router.post(
  "/",
  authenticateToken,
  fileUpload.fields([
    { name: "spotPhoto", maxCount: 1 },
    { name: "additionalPhotos[]", maxCount: 4 },
  ]),
  async (req, res, next) => {
    try {
      // Extract catcher data from the request
      const { catchingLocation, locationDetails, catchingDate } = req.body;

      const imageRefs = [];

      // Save the spotPhoto to the database
      if (req.files["spotPhoto"] && req.files["spotPhoto"].length > 0) {
        const spotPhoto = req.files["spotPhoto"][0];

        // const image = new Image({
        //   name: spotPhoto.originalname,
        //   filename: spotPhoto.filename,
        //   path: spotPhoto.path,
        // });
        // await image.save();
        imageRefs.push(spotPhoto.path);
      }

      // Save the additionalPhotos to the database
      if (
        req.files["additionalPhotos[]"] &&
        req.files["additionalPhotos[]"].length > 0
      ) {
        const additionalPhotos = req.files["additionalPhotos[]"];
        for (const photo of additionalPhotos) {
          // Create and save each additional photo to the Image model
          // const image = new Image({
          //   name: photo.originalname,
          //   filename: photo.filename,
          //   path: photo.path,
          // });
          // await image.save();
          imageRefs.push(photo.path);
        }
      }

      // Create a new Catcher model | !!! If catcher exists then go ahead wihtpout creating
      const catcher = new Catcher({
        catcher: req.user.userId, // Assuming userId is accessible through req.user
        catchingLocation,
        locationDetails,
        catchingDate,
        // spotPhoto: imageRefs[0], // Assign the first image as the spotPhoto
      });

      // for (let i of imageRefs.slice(1)) {
      //   catcher.additionalPhotos.push(i);
      // }
      await catcher.save();

      // Create a new Dog model and link it to the catcher
      const dog = new Dog({
        catcherDetails: catcher._id,
        dogImage: imageRefs[0],
        dogAdditionalImages: imageRefs.slice(1),
        status: 'Adopted'
      });

      dog.caseNumber = await Dog.generateCaseNumber();
      await dog.save();

      res.status(201).json({ message: "Case generated successfully" });
    } catch (error) {
      res
        .status(400)
        .json({ error: "Error creating a dog case : " + error.message });
    }
  }
);

// Post : update the initial observations of a dog
router.post(
  "/:id/initialObservations",
  authenticateToken,
  fileUpload.fields([
    { name: "kennelPhoto", maxCount: 1 },
    { name: "additionalKennelPhotos[]", maxCount: 4 },
  ]),
  async (req, res, next) => {
    try {
      // Extract catcher data from the request
      const dogId = req.params.id;
      const {
        kennelId,
        mainColor,
        description,
        gender,
        aggression,
        dogName,
        breed,
      } = req.body;

      const kennel = await Kennel.findOne({ kennelId: kennelId });

      if (!kennel) {
        return res.status(404).json({ message: "Kennel not found" });
      }

      if (kennel.isOccupied) {
        return res.status(401).json({ message: "Kennel is already occupied" });
      }

      const imageRefs = [];

      // Save the kennelPhoto to the database
      if (req.files["kennelPhoto"] && req.files["kennelPhoto"].length > 0) {
        const spotPhoto = req.files["kennelPhoto"][0];
        // const image = new Image({
        //   name: spotPhoto.originalname,
        //   filename: spotPhoto.filename,
        //   path: spotPhoto.path,
        // });
        // await image.save();
        imageRefs.push(spotPhoto.path);
      }

      // Save the additionalPhotos to the database
      if (
        req.files["additionalKennelPhotos[]"] &&
        req.files["additionalKennelPhotos[]"].length > 0
      ) {
        const additionalPhotos = req.files["additionalKennelPhotos[]"];
        for (const photo of additionalPhotos) {
          // const image = new Image({
          //   name: photo.originalname,
          //   filename: photo.filename,
          //   path: photo.path,
          // });
          // await image.save();
          imageRefs.push(photo.path);
        }
      }

      const dog = await Dog.findByIdAndUpdate(dogId, {
        kennel: kennel._id,
        mainColor,
        description,
        gender,
        aggression,
        dogName,
        breed,
        kennelPhoto: imageRefs[0],
        additionalKennelPhotos: imageRefs.slice(1),
        status: 'Available'
      });

      // for (let i of imageRefs.slice(1)) {
      //   dog.additionalKennelPhotos.push(i);
      // }

      kennel.isOccupied = true;
      await kennel.save();

      await dog.save();

      res.status(201).json({ message: "Dog's inital observations noted!" });
    } catch (error) {
      res.status(500).json({ error: "Error updating : " + error.message });
    }
  }
);

// Update catcherDetails in dog
router.put("/:id/update/catcher", authenticateToken, async (req, res) => {
  try {
    const dogId = req.params.id;
    const catcherDetails = req.body.catcherDetails;

    const dog = await Dog.findById(dogId);
    if (!dog) {
      res.status(404).json({ error: "Dog not found" });
    }

    const updatedDog = await Catcher.findByIdAndUpdate(
      dog.catcherDetails,
      catcherDetails,
      { new: true }
    );

    res.status(200).json(updatedDog);
  } catch (error) {
    res.status(500).json({
      error: "Error updating catcherDetails in dog : " + error.message,
    });
  }
});

// Update vetDetails in dog
router.put(
  "/:id/update/vet",
  authenticateToken,
  fileUpload.fields([
    { name: "surgeryPhoto", maxCount: 1 },
    { name: "additionalPhotos[]", maxCount: 4 },
    { name: "surgeryNotesPhoto", maxCount: 1 },
    { name: "additionalNotesPhotos[]", maxCount: 4 },
  ]),
  async (req, res) => {
    try {
      const dogId = req.params.id;
      const vetDetailsData = JSON.parse(req.body.vetDetails);

      if (["vet", "admin"].includes(req.user.role)) {
        // Check if the dog has an existing vetDetails
        const dog = await Dog.findById(dogId);
        if (!dog) {
          return res.status(404).json({ error: "Dog not found" });
        }

        const imageRefs = [];

        // Save the kennelPhoto to the database
        if (req.files["surgeryPhoto"] && req.files["surgeryPhoto"].length > 0) {
          const spotPhoto = req.files["surgeryPhoto"][0];

          // const image = new Image({
          //   name: spotPhoto.originalname,
          //   filename: spotPhoto.filename,
          //   path: spotPhoto.path,
          // });
          // await image.save();
          imageRefs.push(spotPhoto.path);
        }

        if (
          req.files["surgeryNotesPhoto"] &&
          req.files["surgeryNotesPhoto"].length > 0
        ) {
          const spotPhoto = req.files["surgeryNotesPhoto"][0];
          
          // const image = new Image({
          //   name: spotPhoto.originalname,
          //   filename: spotPhoto.filename,
          //   path: spotPhoto.path,
          // });
          // await image.save();
          imageRefs.push(spotPhoto.path);
        }

        // Save the additionalPhotos to the database
        if (
          req.files["additionalPhotos[]"] &&
          req.files["additionalPhotos[]"].length > 0
        ) {
          const additionalPhotos = req.files["additionalPhotos[]"];
          for (const photo of additionalPhotos) {
            
            // const image = new Image({
            //   name: photo.originalname,
            //   filename: photo.filename,
            //   path: photo.path,
            // });
            // await image.save();
            imageRefs.push(photo.path);
          }
        }

        if (
          req.files["additionalNotesPhotos[]"] &&
          req.files["additionalNotesPhotos[]"].length > 0
        ) {
          const additionalPhotos = req.files["additionalNotesPhotos[]"];
          for (const photo of additionalPhotos) {
            
            // const image = new Image({
            //   name: photo.originalname,
            //   filename: photo.filename,
            //   path: photo.path,
            // });
            // await image.save();
            imageRefs.push(photo.path);
          }
        }

        let vetDetails = null;

        if (!dog.vetDetails) {
          // Create a new vetDetails document and link it to the dog
          vetDetails = new Doctor({
            vet: req.user.userId,
            ...vetDetailsData,
          });
          await vetDetails.save();

          dog.vetDetails = vetDetails._id;
          dog.status = "UnderTreatment"

        } else {
          // Update the existing vetDetails
          vetDetails = await Doctor.findByIdAndUpdate(
            dog.vetDetails,
            vetDetailsData,
            { new: true }
          );

          dog.status = "Operated"
        }

        if (imageRefs && imageRefs.length > 0) {
          if (req.files["surgeryPhoto"] || req.files["additionalPhotos[]"]) {
            vetDetails.surgeryPhoto = imageRefs[0];
            vetDetails.additionalPhotos = imageRefs.slice(1)

            // for (let i of imageRefs.slice(1)) {
            //   vetDetails.additionalPhotos.push(i);
            // }
          } else if (req.files["surgeryNotesPhoto"] || req.files["additionalNotesPhotos"]) {
            vetDetails.surgeryNotesPhoto = imageRefs[0];
            vetDetails.additionalNotesPhotos = imageRefs.slice(1)
            // for (let i of imageRefs.slice(1)) {
            //   vetDetails.additionalNotesPhotos.push(i);
            // }
          }
        }

        await vetDetails.save();
        await dog.save();
        res.status(200).json({ message: "Updated the details successfully" });
      } else {
        return res
          .status(403)
          .json({ message: "Unauthorized Access Requested." });
      }
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Error updating vet details : " + error.message });
    }
  }
);

// Add or Update caretaker reports in dog and add to caretakerDetails's reports
router.post(
  "/:id/caretaker/report",
  authenticateToken,
  fileUpload.fields([{ name: "photo", maxCount: 1 }]),
  async (req, res) => {
    try {
      const dogId = req.params.id;

      const {
        foodIntake,
        waterIntake,
        antibiotics,
        painkiller,
        // observations,
        date,
      } = req.body;

      if (["caretaker", "admin"].includes(req.user.role)) {
        let dog = await Dog.findById(dogId);

        if (!dog) {
          return res.status(404).json({ error: "Dog not found" });
        }

        if (!dog.careTakerDetails) {
          // Create a new caretaker document and link it to the dog
          const careTakerDetails = new CareTaker({
            careTaker: req.user.userId,
          });
          await careTakerDetails.save();

          dog.careTakerDetails = careTakerDetails._id;
        }

        let reportImage = null;

        // Save the kennelPhoto to the database
        if (req.files["photo"] && req.files["photo"].length > 0) {
          const spotPhoto = req.files["photo"][0];
          // Assuming you have an Image model to save image details, create and save it
          // const image = new Image({
          //   name: spotPhoto.originalname,
          //   filename: spotPhoto.filename,
          //   path: spotPhoto.path,
          // });
          // await image.save();

          reportImage = spotPhoto.path;
        }

        const dailyReport = new DailyMonitoring({
          foodIntake,
          waterIntake,
          antibiotics,
          painkiller,
          date,
        });
        if (reportImage) {
          dailyReport.photo = reportImage;
        }

        await dailyReport.save();

        dog = await dog.populate("careTakerDetails");
        dog.careTakerDetails.reports.push(dailyReport._id);

        if (dog.careTakerDetails.reports.length >= 2) {
          dog.status = "FitForRelease"
        }

        await dog.careTakerDetails.save();
        await dog.save();
        res.status(200).json({ message: "New report created" });
      } else {
        res.status(403).json({ message: "Unauthorized Access" });
      }
    } catch (error) {
      return res.status(500).json({
        error: "Error updating careTakerDetails :" + error.message,
      });
    }
  }
);

module.exports = router;
