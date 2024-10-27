// require("dotenv").config();
// const express = require("express");
// const mongoose = require("mongoose");
// const bodyParser = require("body-parser");
// const cors = require("cors");
// const shortid = require("shortid");

// const app = express();
// app.use(cors());
// app.use(express.json());

// // Connect to MongoDB
// mongoose.connect(process.env.MONGODB_URI, {
//   // useNewUrlParser: true,
//   // useUnifiedTopology: true,
// })
// .then(() => console.log("Connected to DB"))
// .catch((err) => console.log("Error connecting to DB", err));

// const urlSchema = new mongoose.Schema({
//   originalUrl: { type: String, required: true },
//   shortId: { type: String, unique: true, required: true }, // Ensure unique and required
//   visitorIds: { type: [String], default: [] },
// });

// const Url = mongoose.model("Url", urlSchema);

// // Shorten URL Endpoint
// app.post("/shorten", async (req, res) => {
//   const { originalUrl } = req.body;
//   const shortId = shortid.generate();
 
//     const newUrl = new Url({ shortId, originalUrl });
//     await newUrl.save();
//     res.json({ shortUrl: `https://localhost:5000/landing/${shortId}` });

  
// });


// // Serve the landing page
// app.get("/landing/:shortId", async (req, res) => {
//   const { shortId } = req.params;

//   try {
//     const urlData = await UrlModel.findOne({ shortId });
//     if (!urlData) {
//       return res.status(404).send("Short URL not found");
//     }

//     const originalUrl = urlData.originalUrl;
//     const landingPage = createLandingPage(shortId, originalUrl);
//     res.status(200).json(landingPage)
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Error serving landing page" });
//   }
// });

// // Function to create the landing page HTML
// const createLandingPage = (shortId, originalUrl) => `
// <!DOCTYPE html>
// <html>
// <head>
//     <title>Redirecting...</title>
//     <script src="https://cdn.jsdelivr.net/npm/@fingerprintjs/fingerprintjs@3/dist/fp.min.js"></script>
//     <script>
//       async function initAndTrack() {
//         try {
//           const fp = await FingerprintJS.load();
//           const result = await fp.get();
//           const visitorId = result.visitorId;

//           await fetch('/api/track-click', {
//             method: 'POST',
//             headers: {
//               'Content-Type': 'application/json'
//             },
//             body: JSON.stringify({
//               shortId: '${shortId}',
//               visitorId: visitorId
//             })
//           });

//           window.location.href = '${originalUrl}';
//         } catch (error) {
//           console.error('Error:', error);
//           window.location.href = '${originalUrl}';
//         }
//       }

//       window.onload = initAndTrack;
//     </script>
// </head>
// <body>
//     <p>Redirecting to your destination...</p>
// </body>
// </html>
// `;

// // Track click endpoint
// app.post("/api/track-click", async (req, res) => {
//   const { shortId, visitorId } = req.body;

//   try {
//     const urlData = await UrlModel.findOne({ shortId });
//     if (urlData) {
//       urlData.visitorIds.push(visitorId || "unknown");
//       await urlData.save();
//       return res.status(200).send("Click tracked successfully");
//     } else {
//       return res.status(404).send("Short URL not found");
//     }
//   } catch (error) {
//     console.error("Error tracking click:", error);
//     return res.status(500).send("Internal Server Error");
//   }
// });

// // Start your server
// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

require("dotenv").config();
const express = require("express");
const axios = require("axios");
const mongoose = require("mongoose");
const shortid = require("shortid");
const cors = require("cors");
const FingerprintJS = require("@fingerprintjs/fingerprintjs-pro");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("Connected to DB"))
.catch((err) => console.log("Error connecting to DB", err));

// Define URL schema and model
const urlSchema = new mongoose.Schema({
  originalUrl: { type: String, required: true },
  shortId: { type: String, unique: true, required: true },
  visitorIds: { type: [String], default: [] },
});

const Url = mongoose.model("Url", urlSchema);

// Initialize FingerprintJS Pro client
const fpPromise = FingerprintJS.load({ apiKey: "hqM2WbFkZDheF8d2LL0p" });

// Endpoint to generate short URL
app.post("/generate-short-url", async (req, res) => {
  const { originalUrl } = req.body;

  if (!originalUrl) {
    return res.status(400).json({ error: "Original URL is required" });
  }

  try {
    // Use fpPromise to get the visitor data
    const fp = await fpPromise;
    const visitorData = await fp.getVisitorData();
    const visitorId = visitorData.visitorId || "unknown";

    // Generate short ID
    const shortId = shortid.generate();
    const newUrl = new Url({ shortId, originalUrl });
    await newUrl.save();

    // Fetch region information based on IP (or use request IP)
    const ipResponse = await axios.get("http://ip-api.com/json/");
    const region = ipResponse.data.status === "success" ? ipResponse.data.regionName : "Region not found";

    // Respond with shortened URL and visitor info
    const shortUrl = `http://localhost:5000/${shortId}`;
    res.json({
      originalUrl,
      shortUrl,
      visitorId,
      region,
    });
  } catch (error) {
    console.error("Error retrieving visitor data:", error);
    res.status(500).json({ error: "Failed to generate short URL or retrieve visitor data" });
  }
});

// Endpoint to serve the landing page
app.get("/landing/:shortId", async (req, res) => {
  const { shortId } = req.params;

  try {
    const urlData = await Url.findOne({ shortId });
    if (!urlData) {
      return res.status(404).send("Short URL not found");
    }

    const originalUrl = urlData.originalUrl;
    const landingPage = createLandingPage(shortId, originalUrl);
    res.status(200).send(landingPage);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error serving landing page" });
  }
});

// Function to create the landing page HTML
const createLandingPage = (shortId, originalUrl) => `
<!DOCTYPE html>
<html>
<head>
    <title>Redirecting...</title>
    <script src="https://cdn.jsdelivr.net/npm/@fingerprintjs/fingerprintjs@3/dist/fp.min.js"></script>
    <script>
      async function initAndTrack() {
        try {
          const fp = await FingerprintJS.load();
          const result = await fp.get();
          const visitorId = result.visitorId;

          await fetch('/api/track-click', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              shortId: '${shortId}',
              visitorId: visitorId
            })
          });

          window.location.href = '${originalUrl}';
        } catch (error) {
          console.error('Error:', error);
          window.location.href = '${originalUrl}';
        }
      }

      window.onload = initAndTrack;
    </script>
</head>
<body>
    <p>Redirecting to your destination...</p>
</body>
</html>
`;

// Track click endpoint
app.post("/api/track-click", async (req, res) => {
  const { shortId, visitorId } = req.body;

  try {
    const urlData = await Url.findOne({ shortId });
    if (urlData) {
      urlData.visitorIds.push(visitorId || "unknown");
      await urlData.save();
      return res.status(200).send("Click tracked successfully");
    } else {
      return res.status(404).send("Short URL not found");
    }
  } catch (error) {
    console.error("Error tracking click:", error);
    return res.status(500).send("Internal Server Error");
  }
});

// Start your server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
