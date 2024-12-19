import { Request, Response } from "express";
import pino from "pino";
import {
	addNewAllowedAlert,
	deleteAllowedAlert,
	getAllowedAlerts,
	updateAllowedAlert,
} from "../services/allowed_aletrts_service";
import { $Enums } from "@prisma/client";

const logger = pino({
	transport: {
		target: "pino-pretty",
	},
});
export const getAllowedAlertsList = async (
	req: Request,
	res: Response
): Promise<void> => {
	logger.info(
		"[controllers/allowed_alerts_controller.ts] execute function getAllowedAlertsList"
	);

	try {
		const results = await getAllowedAlerts();
		res.json(results);
	} catch (error) {
		logger.error(
			`[controllers/allowed_alerts_controller.ts] Error executing function getAllowedAlertsList. message:${error}`
		);
		res.status(404).json({
			success: false,
		});
	}
};

export const addNewAllowedAlerts =async (
	req: Request,
	res: Response
): Promise<void> =>{
	logger.info(
		"[controllers/allowed_alerts_controller.ts] execute function addNewAllowedAlerts"
	);
	try {
		const obj: { body: string; modifier: $Enums.Modifier } = {
			body: req.body.body,
			modifier: req.body.modifier,
		};
		const results = await addNewAllowedAlert(obj);
		logger.info(
			"[controllers/allowed_alerts_controller.ts] addNewAllowedAlerts was executed successfully"
		);
		res.json({ success: true, data: results });
	} catch (error) {
		logger.error(
			`[controllers/allowed_alerts_controller.ts] Error executing function addNewAllowedAlerts. message:${error}`
		);

		res.status(404).json({
			success: false,
			data: error.message,
		});
	}
};

export const deleteAllowedAlerts = async (
	req: Request,
	res: Response
): Promise<void> => {
	logger.info(
		"[controllers/allowed_alerts_controller.ts] execute function deleteAllowedAlerts"
	);

	try {
		const allowedAlertId: number[] = req.body.allowedAlertId;
		const results = await deleteAllowedAlert(allowedAlertId);
		logger.info(
			"[controllers/allowed_alerts_controller.ts] deleteAllowedAlerts was executed successfully"
		);
		res.json({ success: true, data: results });
	} catch (error) {
		logger.error(
			`[controllers/allowed_alerts_controller.ts] Error executing function deleteAllowedAlerts. message:${error.message}`
		);
		res.status(404).json({
			success: false,
			data: error.message,
		});
	}
};

export const updateAllowedAlerts = async (
	req: Request,
	res: Response
): Promise<void> => {
	logger.info(
		"[controllers/allowed_alerts_controller.ts] execute function updateAllowedAlerts"
	);

	try {
		const dataObj: {
			id: number;
			body: string;
			modifier: $Enums.Modifier;
		} = {
			id: req.body.id,
			body: req.body.body,
			modifier: req.body.modifier,
		};

		const results = await updateAllowedAlert(dataObj);
		logger.info(
			"[controllers/allowed_alerts_controller.ts] updateAllowedAlerts was executed successfully"
		);
		res.json({ success: true, data: results });
	} catch (error) {
		logger.error(
			`[controllers/allowed_alerts_controller.ts] Error executing function updateAllowedAlerts. message:${error.message}`
		);
		res.status(404).json({
			success: false,
			data: error.message,
		});
	}
};
