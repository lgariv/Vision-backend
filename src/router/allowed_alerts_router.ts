import express from "express";
import {
    addNewAllowedAlerts,
    deleteAllowedAlerts,
    getAllowedAlertsList,
    updateAllowedAlerts
} from "../controllers/allowed_alerts_controller";

export default (router: express.Router) => {
	router.post("/allowed_alerts", addNewAllowedAlerts);
	router.delete("/allowed_alerts", deleteAllowedAlerts);
	router.get("/allowed_alerts", getAllowedAlertsList);
	router.put("/allowed_alerts", updateAllowedAlerts);
};
