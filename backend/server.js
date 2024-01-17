const express = require("express");
const app = express();
// const multer = require('multer');
const path = require("path");
const PORT = process.env.PORT || 3500;
const { logger } = require("./middleware/logger");
const errorHandler = require("./middleware/errorHandler");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const corsOptions = require("./config/corsOptions");
const { default: mongoose } = require("mongoose");
require("dotenv").config();

app.use(logger);
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.use("/public", express.static(path.join(__dirname, "/public")));
app.use("/uploads", express.static(path.join(__dirname, "/uploads")));

app.use("/", require("./routes/root"));
app.use("/user", require("./routes/UserRoutes"));
app.use("/dog", require("./routes/DogRoutes"));
app.use("/dog", require("./routes/DogMiscRoutes"));
const encodedPassword = encodeURIComponent(process.env.DB_PASS);

app.all("*", (req, res) => {
  res.status(404);
  if (req.accepts("html")) {
    res.sendFile(path.join(__dirname, "views", "404.html"));
  } else if (req.accepts("json")) {
    res.json({ message: "404 Not Found" });
  } else {
    res.type("txt").send("404 Not Found");
  }
});

app.use(errorHandler);

// mongo pass for my db : ol0pSSmYqa6KTbiU
const connectionString = `mongodb+srv://manojcaselaws:${encodedPassword}@kdjeevraksha.ptigerb.mongodb.net/?retryWrites=true&w=majority`;

mongoose.set("strictQuery", false);
mongoose
  .connect(connectionString)
  .then(() => {
    console.log("MongoDB Connected");
    app.listen(PORT, "127.0.0.1", () =>
      console.log(`Server running on port ${PORT}`)
    );
  })
  .catch((err) => {
    console.log(err);
  });
