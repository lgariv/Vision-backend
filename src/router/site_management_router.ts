import express from "express";
import { addSite,deleteSite,inUseStatus,getSites,updateCommandLimits,getLimitsList ,updateSiteDefLocation,updateSitePortableLocation} from "../controllers/site_management_controller";

export default (router: express.Router) => {
  router.post("/sites_management/", addSite);
  router.delete("/sites_management/", deleteSite); // TODO: does not delete sites with NidurResult populated (returns error)
  router.put("/sites_management/inUseStatus", inUseStatus);
  router.get("/sites_management/", getSites);
  router.put("/sites_management/updateSiteDefLocation/",updateSiteDefLocation);

  router.put("/sites_management/updateLimit/",updateCommandLimits); // TODO: add route to get and edit limits
  router.get("/sites_management/getLimits/", getLimitsList); // TODO: add route to get and edit limits
  router.put("/sites_management/updateSitePortableLocation/",updateSitePortableLocation);
  // TODO: add route to get and edit allowed alert matches (and add the table to prisma schema)
};
