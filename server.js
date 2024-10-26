require("dotenv").config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const UrlModel = require('./models/Url'); // Your model will be created in the next step
const shortid = require('shortid');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

// Route for shortening URLs
app.post('/shorten', async (req, res) => {
  const { originalUrl } = req.body;

  try {
    const shortId = shortid.generate();
    let urlData = await UrlModel.findOne({ originalUrl });

    if (urlData) {
      return res.status(200).json({ shortUrl: `http://localhost:${PORT}/${urlData.shortId}` });
    }

    urlData = new UrlModel({
      originalUrl,
      shortId,
      clickCount: 0,
      visitorIds: [],
    });

    await urlData.save();
    res.status(201).json({ shortUrl: `http://localhost:${PORT}/${shortId}` });
  } catch (error) {
    console.error("Error creating short URL:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Redirect route
app.get('/:shortId', async (req, res) => {
  const { shortId } = req.params;

  try {
    const urlData = await UrlModel.findOne({ shortId });
    if (urlData) {
      urlData.clickCount++;
      urlData.visitorIds.push(req.query.visitorId || 'unknown'); // Append visitorId if available
      console.log(urlData);
      await urlData.save();
      return res.redirect(urlData.originalUrl);
    }
    res.status(404).json({ error: "URL not found" });
  } catch (error) {
    console.error("Error redirecting:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
