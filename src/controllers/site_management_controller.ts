import { Request, Response } from "express";
import pino from "pino";
const logger = pino({
  transport: {
    target: "pino-pretty",
  },
});
import { addNewSite,deleteSites,setIsInUse,getAllSites,updateLimits,getLimits,updateDefLocation,updatePortableLocation} from "../services/site_management_service";

import { addSiteBodyType } from "../../types";
import { Limits } from "@prisma/client";



export const updateSiteDefLocation = async (
  req: Request,
  res: Response
): Promise<void> => {
  const amosName: string = req.body.amosName;
  const lat: number = req.body.lat;
  const lon: number = req.body.lon;

  logger.info(
    `[controllers/site_management.ts] execute function updateSiteDefLocation. payload:${JSON.stringify({
      amosName,lat,lon
    })}`
  );

  try {
    const results = await updateDefLocation(amosName,lat,lon);
    logger.info(
      `[controllers/site_management.ts] updateSiteDefLocation was executed successfully. payload:${JSON.stringify(results)}`
    );
    res.json({ success: true, data: results });
  } catch (error) {
    logger.error(
      `[controllers/site_management.ts] Error executing function updateSiteDefLocation. message:${error.message}`
    );

    res.status(404).json({
      success: false,
      data: error.message,
    });
  }
};



export const updateCommandLimits = async (
  req: Request<Limits>,
  res: Response
): Promise<void> => {
  const limits: Limits = req.body;
  logger.info(
    `[controllers/site_management.ts] execute function updateCommandLimits. payload:${JSON.stringify(limits)}`
  );

  try {
    const results = await updateLimits(limits);
    logger.info(
      `[controllers/site_management.ts] updateCommandLimits was executed successfully. payload:${JSON.stringify(results)}`
    );
    res.json({ success: true, data: results });
  } catch (error) {
    logger.error(
      `[controllers/site_management.ts] Error executing function updateCommandLimits. message:${error.message}`
    );

    res.status(404).json({
      success: false,
      data: error.message,
    });
  }
};

export const getLimitsList = async (
  req: Request,
  res: Response
): Promise<void> => {
  logger.info(
    `[controllers/site_management.ts] execute function getLimitsList`
  );

  try {
    const results = await getLimits();
    logger.info(
      `[controllers/site_management.ts] getLimitsList was executed successfully`
    );
    res.json({ success: true, data: results });
  } catch (error) {
    logger.error(
      `[controllers/site_management.ts] Error executing function getLimitsList. message:${error.message}`
    );

    res.status(404).json({
      success: false,
      data: error.message,
    });
  }
};


export const addSite = async (
  req: Request<addSiteBodyType>,
  res: Response
): Promise<void> => {
  const site: addSiteBodyType = req.body;
  logger.info(
    `[controllers/site_management.ts] execute function addNewSite. payload:${JSON.stringify(site)}`
  );

  try {
    const results = await addNewSite(site, req.body.password);
    logger.info(
      `[controllers/site_management.ts] addNewSite was executed successfully. payload:${JSON.stringify(results)}`
    );
    res.json({ success: true, data: results });
  } catch (error) {
    logger.error(
      `[controllers/site_management.ts] Error executing function addNewSite. message:${error.message}`
    );

    res.status(404).json({
      success: false,
      data: error.message,
    });
  }
};


export const deleteSite = async (
  req: Request<string|string[]>,
  res: Response
): Promise<void> => {
  const siteName: string = req.body.siteName;
  console.log(siteName);
  
  logger.info(
    `[controllers/site_management.ts] execute function deleteSite. payload:${siteName}`
  );
  try {
    if(siteName==="all"){
      const results=await deleteSites("all", req.body.password);
      logger.info(
        `[controllers/site_management.ts] deleteSite was executed successfully. payload:deleted all sites`
      );
      res.json({ success: true, data: results });
    }else{
      const siteList=siteName.includes(',') ? siteName.split(',') : [siteName];
      const results=await deleteSites(siteList, req.body.password);
      logger.info(
        `[controllers/site_management.ts] deleteSite was executed successfully. payload:${JSON.stringify(results)}`
      );
      res.json({ success: true, data: results });
    }

  } catch (error) {
    logger.error(
      `[controllers/site_management.ts] Error executing function deleteSite. message:${error.message}`
    );
    res.status(404).json({
      success: false,
      data: error.message,
    });
  }
};

export const inUseStatus = async (
  req: Request<string|string[]>,
  res: Response
): Promise<void> => {
  const siteName: string = req.body.siteName;
  const value: boolean = req.body.value;  
  logger.info(
    `[controllers/site_management.ts] execute function inUseStatus. payload:${siteName} ${value}`
  );
  try {
      const results=await setIsInUse(siteName,value);
      logger.info(
        `[controllers/site_management.ts] inUseStatus was executed successfully. payload:${JSON.stringify(results)}`
      );
      res.json({ success: true, data: results });
    
  } catch (error) {
    logger.error(
      `[controllers/site_management.ts] Error executing function inUseStatus. message:${error.message}`
    );
    res.status(404).json({
      success: false,
      data: error.message,
    });
  }
};

export const getSites = async (
  req: Request<string|string[]>,
  res: Response
): Promise<void> => {
  logger.info(
    `[controllers/site_management.ts] execute function getSites.`
  );
  try {
      const results=await getAllSites();
      logger.info(
        `[controllers/site_management.ts] getSites was executed successfully. payload:${JSON.stringify(results)}`
      );
      res.json({ success: true, data: results });
    
  } catch (error) {
    logger.error(
      `[controllers/site_management.ts] Error executing function getSites. message:${error.message}`
    );
    res.status(404).json({
      success: false,
      data: error.message,
    });
  }
};

export const updateSitePortableLocation = async (
	req: Request<{
    id: string;
    location: string;
	}>,
	res: Response
): Promise<void> => {
	const data: {
		id: string;
		location: string;
	} = req.body;
	logger.info(
		`[controllers/site_management.ts] execute function updateSitePortableLocation. payload:${JSON.stringify(
			data
		)}`
  );
  console.log(data.id, data.location);
  
	try {
    const results = await updatePortableLocation(data.id, data.location);
    console.log(results);
    
		logger.info(
			`[controllers/site_management.ts] updatePortableLocation was executed successfully. payload:${JSON.stringify(
				results
			)}`
		);
		res.json({ success: true, data: results });
	} catch (error) {
		logger.error(
			`[controllers/site_management.ts] Error executing function updateCommandLimits. message:${error.message}`
		);
		res.status(404).json({
			success: false,
			data: error.message,
		});
	}
};
