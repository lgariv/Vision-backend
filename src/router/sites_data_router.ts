import express from "express";
import {
	siteDataByParams,
  cronParse,
  getLastResults,
  getSitesLastLocation
} from "../controllers/sites_data_controller";

export default (router: express.Router) => {
  router.post("/sites/siteDataByParams", siteDataByParams);
  router.get("/cronParse", cronParse);
  router.get("/getLastResults", getLastResults);
  router.post("/getSitesLastLocation", getSitesLastLocation);
};
