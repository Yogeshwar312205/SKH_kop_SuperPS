const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const { connectDB, getIsConnected } = require('./config/db');
const logger = require('./utils/logger');
const journal = require('./services/journal'); // Resilience system
const snapshot = require('./services/snapshot'); // Resilience system
const authRoutes = require('./routes/authRoutes');
const systemRoutes = require('./routes/systemRoutes'); // Resilience system
const apiRoutes = require('./routes/apiRoutes');
const apiV2Routes = require('./routes/apiV2Routes');
const droneRoutes = require('./routes/droneRoutes'); // Drone logistics
const trustRoutes = require('./routes/trustRoutes'); // Data integrity
const { initSockets } = require('./sockets/trackingSocket');
const { initBusSockets } = require('./sockets/busSocket');
const { initDroneSockets } = require('./sockets/droneSocket'); // Drone telemetry
const { checkAiEngineHealth } = require('./services/aiEngineService');

const app = express();
const server = http.createServer(app);

// Security & Middleware Stack
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

// Connect Database
connectDB();

// Initialize Resilience System (Event Journal)
journal.initialize().catch(err => {
  logger.error(`Journal initialization failed: ${err.message}`);
});

// Initialize Snapshot Service
snapshot.initialize().catch(err => {
  logger.error(`Snapshot initialization failed: ${err.message}`);
});

// Routes
app.use('/api/system', systemRoutes); // Resilience system (unauthenticated)
app.use('/api/trust', trustRoutes); // Data integrity (unauthenticated base)
app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);
app.use('/api/v2', apiV2Routes);
app.use('/api/v2/drone', droneRoutes); // Drone logistics API

// Microservices Health & Status Route
app.get('/health', async (req, res) => {
  const pythonStatus = await checkAiEngineHealth();

  res.json({
    status: 'online',
    service: 'KrishiFlow Backend Orchestrator Core',
    timestamp: new Date().toISOString(),
    dbConnected: getIsConnected(),
    aiEngineStatus: pythonStatus.status || 'offline',
    pythonDetails: pythonStatus
  });
});

// Socket.io Setup
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});
initSockets(io);
initBusSockets(io);
initDroneSockets(io); // Drone real-time telemetry

const indexer = require('./rag/ingestion/indexer');

const PORT = process.env.PORT || 5000;
server.listen(PORT, async () => {
  logger.info(`🚀 KrishiFlow Production Backend Core running on http://localhost:${PORT}`);
  // Index RAG Knowledge Base on startup
  try {
    await indexer.indexKnowledgeBase();
  } catch (err) {
    logger.warn(`Startup Knowledge Base indexing notice: ${err.message}`);
  }
});
