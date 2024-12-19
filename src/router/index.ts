import express from "express";
import sites from "./sites_data_router";
import site_management_router from "./site_management_router";
import allowed_alerts_router from "./allowed_alerts_router";
const router = express.Router();

export default (): express.Router => {
  sites(router);
  site_management_router(router);
  allowed_alerts_router(router);
  return router;
};
