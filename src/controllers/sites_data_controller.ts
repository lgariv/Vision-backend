import { Request, Response } from "express";
import pino from "pino";
import {
	getSiteDataByParams,
	insertSiteDataToDB,
	getAllLastData,
	getLastLocation
} from "../services/sites_data_service";
const logger = pino({
  transport: {
    target: "pino-pretty",
  },
});
export const getSitesLastLocation = async (
	req: Request,
	res: Response
): Promise<void> => {
	logger.info(
		"[controllers/site_data_controller.ts] execute function getSitesLastLocation"
	);

	try {
		const results = await getLastLocation(req.body.id);
		res.json(results);
	} catch (error) {
		logger.error(
			`[controllers/site_data_controller.ts] Error executing function getSitesLastLocation. message:${error}`
		);

		res.status(404).json({
			success: false,
		});
	}
};


export const getLastResults = async (req: Request, res: Response): Promise<void> => {
	logger.info(
		"[controllers/site_data_controller.ts] execute function getLastResults"
	);

	try {
		const results = await getAllLastData();
		res.json(results);
	} catch (error) {
		logger.error(
			`[controllers/site_data_controller.ts] Error executing function getLastResults. message:${error}`
		);

		res.status(404).json({
			success: false,
		});
	}
};

export const cronParse = async (req: Request, res: Response): Promise<void> => {
	logger.info(
		"[controllers/site_data_controller.ts] execute function cronParse"
	);

	try {
		const results = await insertSiteDataToDB();
		res.json({ success: true });
	} catch (error) {
		logger.error(
			`[controllers/site_data_controller.ts] Error executing function cronParse. message:${error}`
		);
		res.status(404).json({
			success: false,
		});
	}
};

export const siteDataByParams = async (req: Request, res: Response): Promise<void> => {
	logger.info("[controllers/sites_data_controller.ts] execute function siteDataByParams");

	const amosSiteName: string = req.body.amosSiteName;
	const siteType: string = req.body.commands;
  const commandsString:string[] = siteType.includes(",")? siteType.split(","): [siteType];

	try {
		const results = await getSiteDataByParams(amosSiteName, commandsString);
		logger.info(
			"[controllers/sites_data_controller.ts] siteDataByParams was executed successfully"
		);
		res.json({ success: true, data: results });
	} catch (error) {
		logger.error(
			`[controllers/sites_data_controller.ts] Error executing function siteDataByParams. message:${error.message}`
		);

		res.status(404).json({
			success: false,
			data: error.message,
		});
	}
};
