const express = require("express");
const multer = require("multer");
const bodyParser = require("body-parser");
const admin = require("firebase-admin");
const path = require("path");

const app = express();
const upload = multer();

// Middleware
app.use(express.static(path.join(__dirname, "public"))); // Serve static files
app.use(bodyParser.urlencoded({ extended: true }));

let firebaseInitialized = false;

// Route to upload service account file
app.post("/upload-service-file", upload.single("serviceFile"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send("No file uploaded.");
    }

    const serviceAccount = JSON.parse(req.file.buffer.toString());
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    firebaseInitialized = true;
    res.send("Firebase connected successfully! <a href='/'>Go Back</a>");
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .send("Failed to initialize Firebase. Ensure the file is valid.");
  }
});

// Route to write key-value pairs to Firebase Remote Config
app.post("/write-config", async (req, res) => {
  if (!firebaseInitialized) {
    return res
      .status(400)
      .send("Firebase not initialized. Upload service account first.");
  }

  const { key, value } = req.body;

  if (!key || !value) {
    return res.status(400).send("Key and value are required.");
  }

  try {
    const remoteConfig = admin.remoteConfig();
    const template = await remoteConfig.getTemplate();

    // Add or update the parameter
    template.parameters[key] = {
      defaultValue: { value: value },
    };

    await remoteConfig.publishTemplate(template);

    res.send(
      "Key-value pair successfully written to Firebase Remote Config! <a href='/'>Go Back</a>"
    );
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to write to Firebase Remote Config.");
  }
});

// Start server
app.listen(3000, () => {
  console.log("Server started on http://localhost:3000");
});
