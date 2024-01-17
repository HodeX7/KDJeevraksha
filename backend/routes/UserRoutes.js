const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");

const User = require("../models/User");
const generateToken = require("../middleware/tokenGenerator");
const authenticateToken = require("../middleware/authenticateToken");

// List Users
router.get("/", authenticateToken, async (req, res) => {
  try {
    const users = await User.find().select("-password -accessToken -__v");
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: "Error retrieving users" });
  }
});

// Retrieve User
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select(
      "-password -accessToken -__v"
    );
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: "Error retrieving user" });
  }
});

// Update User
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    }).select("-password -accessToken -__v");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: "Error updating user" });
  }
});

// Delete User
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const user = await User.findByIdAndRemove(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(204).send(); // No content
  } catch (error) {
    res.status(500).json({ error: "Error deleting user" });
  }
});

// create new user
router.post("/signup", async (req, res) => {
  try {
    const { name, contactNumber, role } = req.body;

    const existingUser = await User.findOne({ contactNumber });

    if (existingUser) {
      // User with the same contact number already exists
      return res
        .status(400)
        .json({ message: "User with this contact number already exists" });
    }

    const user = new User({
      name,
      contactNumber,
      password: "",
      role,
      isActive: false,
    });
    await user.save();
    res
      .status(201)
      .json({ message: "User created successfully, PIN Generation is needed" });
  } catch (error) {
    res.status(500).json({ error: "Error creating user : " + error.message });
  }
});

router.post("/setpin", async (req, res) => {
  try {
    const { contactNumber, password } = req.body;

    const user = await User.findOne({ contactNumber });

    if (user) {
      bcrypt.hash(password, 10, async (err, hash) => {
        if (!err) {
          user.password = hash;

          const { token, updation } = generateToken(
            { userId: user._id, name: user.name, role: user.role },
            user.accessToken
          );

          if (updation) {
            user.accessToken = token;
            await user.save();
          }

          user.isActive = true;
          await user.save();

          res
            .status(201)
            .json({
              message: "PIN created successfully",
              role: user.role,
              token: token,
            });
        } else {
          res
            .status(500)
            .json({ message: `Something went wrong : ${err.message}` });
        }
      });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  } catch (error) {
    res.status(500).json({ error: "Error logging in" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { contactNumber } = req.body;

    const user = await User.findOne({ contactNumber });

    if (user) {
      if (user.isActive) {
        res.status(200).json({
          message: "Enter PIN",
        });
      } else {
        res.status(205).json({
          message: "Pin needs to be generated",
          isActive: user.isActive,
          contactNumber: user.contactNumber,
        });
      }
    } else {
      res.status(401).json({ error: "Phone Number not registered by Admin" });
    }
  } catch (error) {
    res.status(500).json({ error: "Error logging in" });
  }
});

router.post("/enterpin", async (req, res) => {
  try {
    const { contactNumber } = req.body;

    const user = await User.findOne({ contactNumber });

    if (user) {
      if (user.isActive) {
        bcrypt.compare(
          req.body.password,
          user.password,
          async (err, isValid) => {
            if (err) {
              res.status(500).json({ message: "Something went wrong." });
            } else if (isValid) {
              const { token, updation } = generateToken(
                { userId: user._id, name: user.name, role: user.role },
                user.accessToken
              );

              if (updation) {
                user.accessToken = token;
                await user.save();
              }

              res.status(200).json({
                message: "Login successful",
                role: user.role,
                token: user.accessToken,
              });
            } else {
              res.status(401).json({ message: "Incorrect password" }); // Send a 401 Unauthorized status for incorrect password
            }
          }
        );
      } else {
        res.status(205).json({
          message: "Pin needs to be generated",
          isActive: user.isActive,
          contactNumber: user.contactNumber,
        });
      }
    } else {
      res.status(401).json({ error: "Phone Number not registered by Admin" });
    }
  } catch (error) {
    res.status(500).json({ error: "Error logging in" });
  }
});

module.exports = router;
