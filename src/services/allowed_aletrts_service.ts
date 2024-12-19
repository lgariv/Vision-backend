import prisma from "../db";
import { AllowedAlerts, $Enums } from "@prisma/client";

/**
 * update the coresspond allowedAlert;
 * @param allowedAlertObject represent allowedAlert object with new values
 * @returns
 */
export const updateAllowedAlert = async (allowedAlertObject: AllowedAlerts) => {
	try {
		const res = await prisma.allowedAlerts.update({
			where: {
				id: allowedAlertObject.id,
			},
			data: {
				body: allowedAlertObject.body,
				modifier: allowedAlertObject.modifier,
			},
		});
		return res;
	} catch (error) {
		throw new Error(error);
	}
};

/**
 * get the allowedAlerts List;
 * @returns
 */
export const getAllowedAlerts = async () => {
	try {
		const res = await prisma.allowedAlerts.findMany();
		return res;
	} catch (error) {
		throw new Error(error);
	}
};

/**
 * create new allowedAlert
 *
 * @param allowedAlertObject {body: string;modifier: $Enums.Modifier;}
 * @returns allowedAlert that was created or error is something went wrong
 */
export const addNewAllowedAlert = async (allowedAlertObject: {
	body: string;
	modifier: $Enums.Modifier;
}) => {
	try {
		//create
		const results = await prisma.allowedAlerts.create({
			data: {
				body: allowedAlertObject.body,
				modifier: allowedAlertObject.modifier,
			},
		});
		return results;
	} catch (error: any) {
		throw new Error(error);
	}
};

/**
 * delete allowedAlert from db
 * @param allowedAlertId allowedAlert ID
 * @returns
 */
export const deleteAllowedAlert = async (allowedAlertId: number[]) => {
	try {
		const response: {
			id: number;
			body: string;
			modifier: string;
		}[] = [];

		for (const id of allowedAlertId) {
			let deletedAllowedAlert = await prisma.allowedAlerts.delete({
				where: {
					id: id,
				},
			});
			response.push(deletedAllowedAlert);
		}

		return response;
	} catch (error: any) {
		throw new Error(error);
	}
};
