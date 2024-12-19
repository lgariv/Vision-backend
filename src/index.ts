import express from "express";
import http from "http";
import bodyParser from "body-parser";
import cors from "cors";
import router from "./router";

const app: express.Application = express();
require("dotenv").config();
app.use(
  cors({
    origin: "*", // Update with your frontend URL
    credentials: true, // Allow cookies to be sent with CORS requests
  })
);

app.use(bodyParser.json());
const server = http.createServer(app);
app.use("/", router());

server.listen(process.env.SERVER_PORT, () => {
  console.log(`Server running on http://localhost:6001/`);
});
