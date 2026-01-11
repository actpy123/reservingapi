import './extensions/string.extension';

import express from 'express';
// Import necessary modules
import cors from 'cors'; // CORS middleware to allow cross-origin requests
import bodyParser from 'body-parser'; // Body parser to parse incoming JSON request bodies
import compression from 'compression'; // Compression middleware to reduce the size of responses
import { loadRoutes } from '@loaders/route.loader';
import mongoConnect from '@configs/db';
import { customResponseMiddleware } from '@middlewares/custome-response.middleware';
import loadAssumptions from '@loaders/Initial-data.loader';
import path from 'path';

// Initialize Express app
const app = express();

// Middleware setup
app.use(compression({ level: 1 })); // Compress all responses with a compression level of 1 (lightweight compression)
app.use(bodyParser.json({ limit: '50mb' })); // Parse incoming JSON request bodies
const port = process.env.PORT || 5000; // Set port from environment variable or default to 5000

// Enable CORS (Cross-Origin Resource Sharing)
app.use(cors());

// Custom middleware for handling responses
app.use(customResponseMiddleware);

// Loading Routes
loadRoutes(app, path.join(__dirname, '/routes'));

app.use(express.static(path.join(__dirname, '/public')));

if (process.env.NODE_ENV !== 'local') {
  app.get(/^(?!.*\/api\/).*/, (req, res) => {
    res.sendFile(path.join(__dirname, '/public', 'index.html'));
  });
}
// Start server only after DB connects
const startServer = async () => {
  await mongoConnect(); // make sure DB connection is established
  app.listen(3000, () => {
    console.log('Server running at http://localhost:3000');
  });
};

startServer();
