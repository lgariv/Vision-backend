import { Request, Response } from "express";
import pino from "pino";
import { SshConnection, SshConfig } from "../classes/ssh";
import { FormatSitesStringError } from "../classes/Errors";
import { Client } from "node-scp";
const logger = pino({
	transport: {
		target: "pino-pretty",
	},
});
import * as Path from "path";
import * as fs from "fs";
import * as fsP from "node:fs/promises";
import prisma from "../db";
import { FileInfo } from "../../types";
import { NiturResult } from "@prisma/client";
require("dotenv").config();

export const getLastLocation = async (amosName: string) => {		
	await insertSiteDataToDB();
	if (amosName === undefined) {
		return null;
	}
	try {
		const res = await prisma.niturResult.findFirst({
			where: {
				siteId: amosName,
			},
			orderBy: {
				niturTime:"desc"
			},
			take:1
		});
		//@ts-ignore
		return res?.data?.gpsData;
	} catch (error) {
		throw new Error(error);
	}
}

export const getAllLastData = async () => {
	const dataToReturn = [];

	// Fetch all site IDs first
	const sites = await prisma.site.findMany();

	if (sites.length === 0) {
		// console.log("No sites found.");
		return;
	}

	// Fetch the most recent entry for each site
	const latestEntries = await prisma.niturResult.findMany({
		where: {
			siteId: {
				in: sites.map((site) => site.id),
			},
		},
		orderBy: {
			niturTime: "desc",
		},
		distinct: ["siteId"],
		select: {
			siteId: true,
			niturTime: true,
		},
	});

	if (latestEntries.length === 0) {
		// console.log("No entries found in NiturResult.");
		return;
	}

	// Fetch and filter the latest two entries for each site
	for (const site of sites) {
		const siteId = site.id;
		const siteData: NiturResult[] = await prisma.$queryRaw`
			(
				WITH LatestTimes AS (
					SELECT DISTINCT "niturTime"
					FROM "NiturResult"
					WHERE "niturTime" IS NOT NULL
					ORDER BY "niturTime" DESC
					LIMIT 2
				),
				LatestEntries AS (
					SELECT *
					FROM "NiturResult"
					WHERE "niturTime" IN (SELECT "niturTime" FROM LatestTimes)
				)
				SELECT 
					id, 
					"siteId", 
					"niturTime",
					data
				FROM 
					LatestEntries
				WHERE 
					"siteId" = ${siteId}
				ORDER BY 
					"niturTime" DESC
			)
		`;
		
		// Filter out entries where the createdAt difference is too large
		const filteredSiteData = siteData;/*.filter((entry) => {
			const timeDifference =
				maxTimestamp - new Date(entry.createdAt).getTime();
			return timeDifference <= acceptableTimeDifference;
		});*/

		if (filteredSiteData.length < 1) {
			// console.log(`Site with id ${siteId} does not have entries within the acceptable time difference.`);
			const elemntToPush = {
				amosName: site.id,
				area: site.pikud,
				displayName: site.siteNameForUser,
				isPortable: site.isPortable,
				isInUse: site.isInUse,
				status: "off",
				success: false,
				defaultLocation: site.defaultLocation,
				//@ts-ignore
				data: [],
			};
			dataToReturn.push(elemntToPush);
		} else {
			// Here you can manipulate the `filteredSiteData` as needed
			const elemntToPush = {
				amosName: site.id,
				area: site.pikud,
				displayName: site.siteNameForUser,
				isPortable: site.isPortable,
				isInUse: site.isInUse,
				status: "off",
				success: false,
				defaultLocation: site.defaultLocation,
				//@ts-ignore
				data: [],
			};
			
			const lastTwoResultsOfSite = siteData.map((item, index1) => {
				const newItem = {
					id: item.id,
					index: index1 === 0 ? "current" : "previous",
					siteId: item.siteId,
					portableLocation: site.portableLocation,
					data: item.data,
				};
				const { id, index, siteId, portableLocation } = newItem;
				const jsonData = item.data.valueOf();
				if (
					jsonData instanceof Object &&
					Object.keys(jsonData).length > 0
				) {
					elemntToPush.data.push({
						id,
						index,
						siteId,
						portableLocation,
						...jsonData,
					});
					elemntToPush.success = true;
					elemntToPush.status = "on";
				}
				return newItem;
			});
			interface JsonDataValue {
				[key: string]: {
					generalInfo?: {
						status?: string;
					};
				};
			}
			const jsonDataValue = elemntToPush.data[0] as JsonDataValue;
			for (const key in jsonDataValue) {
				if (
					jsonDataValue[key].generalInfo &&
					jsonDataValue[key].generalInfo.status &&
					jsonDataValue[key].generalInfo.status === "admin"
				) {
					elemntToPush.status = "admin";
				}
			}
			for (const key in jsonDataValue) {
				if (
					jsonDataValue[key].generalInfo &&
					jsonDataValue[key].generalInfo.status &&
					jsonDataValue[key].generalInfo.status === "alert"
				) {
					elemntToPush.status = "alert";
				}
			}
			dataToReturn.push(elemntToPush);
		}
	}
	return dataToReturn;
};

export const getSiteDataByParams = async (
	site: string,
	commandsArray: string[]
) => {
	const isSiteExist = await prisma.site.findFirst({
		where: {
			id: site,
		},
	});

	//if site not exist return
	const siteData = await prisma.niturResult.findMany({
		where: {
			siteId: site,
		},
		orderBy: {
			niturTime: "desc",
		},
		take: 2,
	});
	const lastTwoResultsOfSite = siteData.map((item, index) => {
		const siteDataAsJSON = item.data as object;
		const newItem = {
			id: item.id,
			index: index === 0 ? "current" : "previous",
			siteId: item.siteId,
			portableLocation: isSiteExist.portableLocation,
			data: {},
		};
		for (const key of commandsArray) {
			if (key in siteDataAsJSON) {
				//@ts-ignore
				newItem.data[key] = siteDataAsJSON[key];
			}
		}
		return newItem;
	});
	return lastTwoResultsOfSite;
};

const readLastLine = async (filePath: string): Promise<Date | undefined> => {
	const fileStream = fs.createReadStream(filePath);
	let lastLine: string | undefined;

	return new Promise((resolve, reject) => {
		fileStream.on("data", (chunk) => {
			const lines = chunk.toString().split("\n").filter(cell=>cell!=="");
			
			if (lines.length > 1) {
				lastLine = lines[lines.length - 1]; // Exclude the last empty line
			} else {
				lastLine = lines[0];
			}
		});

		fileStream.on("end", () => {
			const date = new Date(lastLine);		
			
			date.setUTCHours(date.getUTCHours());
			resolve(new Date(date));
		});

		fileStream.on("error", (error) => {
			reject(error);
		});
	});
};

/**
 * TODO check if theres a row in db that the name and date equals to the ones from the enm server.
 * if theres a match dont insert otherwise insert
 */
export const insertSiteDataToDB = async () => {
	try {
		const niturDate = await readLastLine("./logs/mobatch_result.txt");
		const enteries = fs.readdirSync("./logs");
		for (const entry of enteries) {
			const data = await fsP.readFile(`./logs/${entry}`, "utf-8");
			try {
				await formatSiteDataToJson(data, entry.split(".")[0],niturDate);
			} catch (error) {}
		}
	} catch (error) {
		console.log(error);
	} finally {
		// deleteFolderRecursive("./logs");
	}
};

/**
 *
 * @param siteData Result lines from site.log file
 * @param site Site name (id in table Site)
 * @param niturDate date of the nitur
 * @returns amos batch result for site as json object
 */
const formatSiteDataToJson = async (siteData: string, site: string, niturDate:Date) => {
	try {
		const data = splitSiteDataByCommands(siteData);
		const stCellData = formatStCellDataToObject(data[1]);
		const stRruData = formatStRruToObject(data[2]);
		const stMmeData = formatStMmeToObject(data[3]);
		const stIkeData = formatStIkeToObject(data[4]);
		const RRData = await formatRRToObject(data[5]);
		const uePrintAdmittedData = formatUePrintAdmittedDataToObject(data[6]);
		const invxrfData = await formatInvxrfDataToObject(data[8]);
		const configuredMaxTxPowerData = formatGetConfiguredMaxTxPowerToObject(
			data[9]
		);
		const altData = await formatAltToObject(data[10]);
		const gpsData = formatGetGpsToObject(data[11]);
		const gnssData = formatGetGnssToObject(data[12]);

		const dataObject = {
			date: niturDate,
			st_cell: stCellData,
			st_rru: stRruData,
			st_mme: stMmeData,
			st_ike: stIkeData,
			rr: RRData,
			ue_print_admitted: uePrintAdmittedData,
			invxrf: invxrfData,
			configuredMaxTxPowerData: configuredMaxTxPowerData,
			alt: altData,
			gpsData: gpsData.generalInfo.totalRows === 0 ? gnssData : gpsData,
		};

		const siteRowData = await prisma.site.findFirst({
			where: {
				id: site,
			},
		});
		const isDataAlreadyExist = await prisma.niturResult.findFirst({
			where: {
				site: siteRowData,
				createdAt: formatLtAllDataToObject(data[0]),
			},
		});
		if (!isDataAlreadyExist) {
			await prisma.niturResult.create({
				data: {
					siteId: siteRowData.id,
					data: dataObject,
					createdAt: formatLtAllDataToObject(data[0]),
					niturTime: niturDate,
				},
			});
		}
		return dataObject;
	} catch (error) {
		console.log("error with site:", site);
		console.log("error ::", error);
		// console.log("site:", site);

		throw new Error("error formatting site data");
	}
};

/**
 *
 * @param siteData Result lines from site.log file
 * @returns array that each index contains the commds lines result from the corresponding cell in commands
 */
const splitSiteDataByCommands = (siteData: string) => {
	const commands = [
		"lt all",
		"st cell",
		"st rru",
		"st mme",
		"st ike",
		"pmxet . radioRecInterferencePucchPwr$",
		"ue print -admitted",
		"invxrf",
		"get . configuredMaxTxPower",
		"alt",
		"get gps",
		"get gnss",
	];
	const cells: string[] = [];

	let start = siteData.indexOf("> " + commands[0]);
	if (start === -1) {
		return cells;
	}

	for (let i = 0; i < commands.length; i++) {
		const command = commands[i];
		let end = siteData.indexOf(
			"> " + commands[i + 1],
			start + command.length + 3
		);
		if (end === -1) {
			end = siteData.length;
		}

		const cellContent = siteData.slice(start + 2, end).trim(); // +2 to skip "> "
		cells.push(cellContent);

		start = end;
	}

	return cells;
};

/**
 *
 * @param ltAllData lines of lt all command
 * @returns date of the result as string
 */
const formatLtAllDataToObject = (ltAllData: string) => {
	const lines = ltAllData.split("\n").filter((line) => line.trim() !== "");

	const fullDate = lines[1].split(" ")[0];

	return stringToDate(fullDate);
};

/**
 *
 * @param stCellData lines of st cell command
 * @returns result of command as object
 */
const formatStCellDataToObject = (stCellData: string) => {
	const lines = stCellData.split("\n").filter((line) => line.trim() !== "");
	let rowId = 1;
	const generalInfo = {
		commandName: lines[0].trim(),
		totalRows: 0,
		status: "",
	};

	const data = [];
	let counter = 0;
	for (let i = 1; i < lines.length; i++) {
		const line = lines[i].trim();
		if (line.includes("=======================================")) {
			counter++;
		} else {
			if (counter > 1 && counter < 3) {
				//data to collect
				try {
					const rowData = line
						.split("  ")
						.map((elem) => elem.trim())
						.filter((elem) => elem != "");
					const splitArrayForSector = rowData[3]
						.split(",")[1]
						.split("=")[1]
						.split("_");
					
					const sector = splitArrayForSector[splitArrayForSector.length-1].length >= 3 ? `${splitArrayForSector[splitArrayForSector.length-2]} ${splitArrayForSector[splitArrayForSector.length-1]}` : splitArrayForSector[splitArrayForSector.length-1]
					
					data.push({
						sector: sector,
						sectorId: rowData[2].includes("ENABLED") ? `${rowId++}` : ``,
						proxy: rowData[0],
						admState: rowData[1],
						opState: rowData[2],
						mo: rowData[3], // Extract MO
					});
				} catch (error) {}
			}
		}
	}
	generalInfo.totalRows = data.length;
	generalInfo.status = stCellValidation(data);
	return { generalInfo, data };
};

const stCellValidation = (
	stCellData: {
		sector: string;
		sectorId: string;
		proxy: string;
		admState: string;
		opState: string;
		mo: string;
	}[]
) => {
	for (let index in stCellData) {
		const data = stCellData[index];
		if (
			data.admState.includes("UNLOCKED") &&
			data.opState.includes("DISABLED")
		) {
			return "alert";
		}
	}
	return "on";
};

/**
 *
 * @param stRruData lines of st rru command
 * @returns result of command as object
 */
const formatStRruToObject = (stRruData: string) => {
	const lines = stRruData.split("\n").filter((line) => line.trim() !== "");

	const generalInfo = {
		commandName: lines[0].trim(),
		totalRows: 0,
	};
	if (stRruData.includes("Total: 0 MOs")) {
		const data: string[] = [];
		return { generalInfo, data };
	} else {
		const data = [];
		let counter = 0;
		for (let i = 1; i < lines.length; i++) {
			const line = lines[i].trim();
			if (line.includes("=======================================")) {
				counter++;
			} else {
				if (counter > 1 && counter < 3) {
					//data to collect
					try {
						const rowData = line
							.split("  ")
							.map((elem) => elem.trim());
						const splitArrayForSector = rowData[3]
							.split(",")[1]
							.split("=")[1]
							.split("-");

						data.push({
							sector: splitArrayForSector[
								splitArrayForSector.length - 1
							],
							proxy: rowData[0],
							admState: rowData[1],
							opState: rowData[2],
							mo: rowData[3], // Extract MO
						});
					} catch (error) {}
				}
			}
		}
		generalInfo.totalRows = data.length;
		return { generalInfo, data };
	}
};
/**
 *
 * @param stMmeData lines of st mme command
 * @returns result of command as object
 */
const formatStMmeToObject = (stMmeData: string) => {
	const lines = stMmeData.split("\n").filter((line) => line.trim() !== "");

	const generalInfo = {
		commandName: lines[0].trim(),
		totalRows: 0,
		status: "",
	};
	if (stMmeData.includes("Total: 0 MOs")) {
		const data: string[] = [];
		return { generalInfo, data };
	} else {
		const data = [];
		let counter = 0;
		for (let i = 1; i < lines.length; i++) {
			const line = lines[i].trim();
			if (line.includes("=======================================")) {
				counter++;
			} else {
				if (counter > 1 && counter < 3) {
					//data to collect
					const rowData = line
						.split("  ")
						.map((elem) => elem.trim())
						.filter((elem) => elem != "");
					data.push({
						mmeName: rowData[3].split(",")[1].split("=")[1],
						proxy: rowData[0],
						admState: rowData[1],
						opState: rowData[2],
						mo: rowData[3], // Extract MO
					});
				}
			}
		}
		generalInfo.totalRows = data.length;
		generalInfo.status = validateMmeData(data);
		return { generalInfo, data };
	}
};

const validateMmeData = (
	mmeData: {
		mmeName: string;
		proxy: string;
		admState: string;
		opState: string;
		mo: string;
	}[]
) => {
	let statusToReturn = "on";
	for (let index in mmeData) {
		const data = mmeData[index];
		if (
			data.admState.includes("UNLOCKED") &&
			data.opState.includes("DISABLED")
		) {
			return "alert";
		}
		if (
			data.admState.includes("LOCKED") &&
			data.opState.includes("DISABLED")
		) {
			statusToReturn = "admin";
		}
	}
	return statusToReturn;
};

/**
 *
 * @param stIkeData lines of st ike command
 * @returns result of command as object
 */
const formatStIkeToObject = (stIkeData: string) => {
	const lines = stIkeData.split("\n").filter((line) => line.trim() !== "");

	const generalInfo = {
		commandName: lines[0].trim(),
		totalRows: 0,
		status: "",
	};
	if (stIkeData.includes("Total: 0 MOs")) {
		const data: string[] = [];
		return { generalInfo, data };
	} else {
		const data = [];
		let counter = 0;
		for (let i = 1; i < lines.length; i++) {
			const line = lines[i].trim();
			if (line.includes("=======================================")) {
				counter++;
			} else {
				if (counter > 1 && counter < 3) {
					//data to collect
					const rowData = line
						.split("   ")
						.map((elem) => elem.trim())
						.filter((line) => line.trim() !== "");
					const ipSecTunnelArray = rowData[2].split(",");
					data.push({
						ipsecTunnel: ipSecTunnelArray[2].split("=")[1],
						proxy: rowData[0],
						admState: "",
						opState: rowData[1],
						mo: rowData[2], // Extract MO
					});
				}
			}
		}
		generalInfo.totalRows = data.length;
		generalInfo.status = validateIkeData(data);
		return { generalInfo, data };
	}
};
const validateIkeData = (
	ikeData: {
		ipsecTunnel: string;
		proxy: string;
		admState: string;
		opState: string;
		mo: string;
	}[]
) => {
	for (let index in ikeData) {
		const data = ikeData[index];
		if (data.opState.includes("DISABLED")) {
			return "alert";
		}
	}
	return "on";
};

/**
 *
 * @param RRData lines of noise floor XD MIEW command
 * @returns result of command as object
 */
const formatRRToObject = async (RRData: string) => {
	const lines = RRData.split("\n").filter((line) => line.trim() !== "");

	const generalInfo = {
		commandName: lines[0].trim(),
		totalRows: 0,
		status: "",
	};
	const data = [];
	let counter = 0;
	let rowId = 1;
	for (let i = 1; i < lines.length; i++) {
		const line = lines[i].trim();		
		if (line.includes("EUtranCellFDD")) {
			//data row so handle and append
			const rowData = line.split(" ").map((elem) => elem.trim()).filter((obj) => {return obj.length});
			const splitArrayForSector = rowData[0].split("=")[1].split("_");
			data.push({
				sectorId: `${rowId++}`,
				sector: splitArrayForSector[splitArrayForSector.length - 1],
				counter: rowData[1],
				value: rowData[2],
			});
		}
	}
	generalInfo.totalRows = data.length;
	generalInfo.status = await validateRRData(data);
	return { generalInfo, data };
};
const validateRRData = async (
	rrData: {
		sectorId: string;
		sector: string;
		counter: string;
		value: string;
	}[]
) => {
	try {
		const data = await prisma.limits.findFirst({
			where: {
				id: "rr",
			},
		});
		const lowerLimit = data.lowerLimit;
		for (const data of rrData) {
			if (parseFloat(data.value) > lowerLimit) {
				return "alert";
			}
		}

		return "on";
	} catch (error) {}
};

/**
 *
 * @param stCellData lines of st cell command
 * @returns result of command as object
 */
const formatUePrintAdmittedDataToObject = (stCellData: string) => {
	const lines = stCellData.split("\n").filter((line) => line.trim() !== "");

	const generalInfo = {
		commandName: lines[0].trim(),
		totalRows: 0,
	};

	const data = [];
	let counter = 0;
	let rowId = 1;
	for (let i = 1; i < lines.length; i++) {
		const line = lines[i].trim();

		if (line.includes("CellId  #UE:s  #Bearers")) {
			counter++;
		} else {
			if (counter >= 1) {
				//data to collect
				if (line.includes("$")) {
					break;
				}
				const rowData = line
					.split(" ")
					.filter((line) => line.trim() !== "")
					.map((elem) => elem.trim());
				if (rowData.length < 3) {
					continue;
				}
				data.push({
					sectorId: `${rowId++}`,
					cellId: rowData[0],
					"ue's": rowData[1],
					bearers: rowData[2],
				});
			}
		}
	}
	generalInfo.totalRows = data.length;
	return { generalInfo, data };
};

/**
 *
 * @param invxrfData lines of invxrf command
 * @returns result of command as object
 */
const formatInvxrfDataToObject = async (invxrfData: string) => {
	const lines = invxrfData.split("\n").filter((line) => line.trim() !== "");

	const generalInfo = {
		commandName: lines[0].trim(),
		totalRows: 0,
		status: "",
	};

	const data = [];
	let counter = 0;
	let firstRowAfterAuxPiu = true;
	for (let i = 1; i < lines.length; i++) {
		const line = lines[i].trim();

		if (line.includes("Sector/AntennaGroup/Cells")) {
			counter++;
		} else {
			if (counter >= 1) {
				try {
					//data to collect
					if (firstRowAfterAuxPiu === true) {
						firstRowAfterAuxPiu = false;
						continue;
					}
					if (line.includes("------------------------------------")) {
						break;
					}
					const rowData = line
						.split(" ")
						.filter((line) => line.trim() !== "")
						.map((elem) => elem.trim());
					const pci = rowData[14].slice(1, -1).split(":");
					data.push({
						auxPiu: rowData[0],
						lnh: rowData[1],
						board: rowData[2],
						rf: rowData[3],
						bp: rowData[4],
						tx: rowData[5],
						tx_w_dbm: rowData[6],
						vswr: rowData[7],
						vswr_rl: rowData[8],
						rx_dbm: rowData[9],
						ues: rowData[10],
						sector: rowData[11],
						antennaGroup: rowData[12],
						cells: rowData[13],
						pci: pci[pci.length - 1],
					});
				} catch (error) {}
			}
		}
	}
	generalInfo.totalRows = data.length;
	generalInfo.status = await validateInvxrfData(data);

	return { generalInfo, data };
};
const validateInvxrfData = async (
	invxrfData: {
		auxPiu: string;
		lnh: string;
		board: string;
		rf: string;
		bp: string;
		tx: string;
		tx_w_dbm: string;
		vswr: string;
		rx_dbm: string;
		ues: string;
		sector: string;
		antennaGroup: string;
		cells: string;
		pci: string;
	}[]
) => {
	try {
		const data = await prisma.limits.findFirst({
			where: {
				id: "invxrf",
			},
		});
		const lowerLimit = data.lowerLimit;
		const upperLimit = data.upperLimit;
		for (const data of invxrfData) {
			if (
				parseFloat(data.vswr) > upperLimit ||
				parseFloat(data.vswr) < lowerLimit
			) {
				return "alert";
			}
		}
		return "on";
	} catch (error) {}
};

/**
 *
 * @param getConfiguredMaxTxPowerData lines of get ConfiguredMaxTxPower command
 * @returns result of command as object
 */
const formatGetConfiguredMaxTxPowerToObject = (
	getConfiguredMaxTxPowerData: string
) => {
	const lines = getConfiguredMaxTxPowerData
		.split("\n")
		.filter((line) => line.trim() !== "");

	const generalInfo = {
		commandName: lines[0].trim(),
		totalRows: 0,
	};
	if (getConfiguredMaxTxPowerData.includes("Total: 0 MOs")) {
		const data: string[] = [];
		return { generalInfo, data };
	} else {
		const data = [];
		for (let i = 1; i < lines.length; i++) {
			const line = lines[i].trim();
			if (line.includes("SectorCarrier")) {
				//data to collect
				const rowData = line
					.split(" ")
					.map((elem) => elem.trim())
					.filter((line) => line.trim() !== "");
				const splitArrayForSector = rowData[0].split("=")[1].split("_");
				data.push({
					sector: splitArrayForSector[splitArrayForSector.length - 1],
					mo: rowData[0],
					attribute: rowData[1],
					value: rowData[2],
				});
			}
		}
		generalInfo.totalRows = data.length;
		return { generalInfo, data };
	}
};

/**
 *
 * @param altData lines of altData command
 * @returns result of command as object
 */
const formatAltToObject = async (altData: string) => {
	const lines = altData.split("\n").filter((line) => line.trim() !== "");

	const generalInfo = {
		commandName: lines[0].trim(),
		status: "on",
		totalRows: 0,
	};
	if (altData.includes("Total: 0")) {
		const data: string[] = [];
		return { generalInfo, data };
	} else {
		const data = [];

		for (let i = 1; i < lines.length; i++) {
			const line = lines[i].trim();
			const date_pattern = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/;
			const dateRegex = new RegExp(date_pattern);
			if (dateRegex.test(line)) {
				const lineDataArray = line
					.split("    ")
					.filter((line) => line.trim() !== "");
				const { date, servicePriority, message } =
					extractInfoFromAltLineString(lineDataArray[0]);
				data.push({
					date: date,
					servicePriority: servicePriority,
					description: message + lineDataArray[1],
				});
			}
		}
		generalInfo.totalRows = data.length;
		const allowedAlerts = await prisma.allowedAlerts.findMany();
		let matches = 0;
		for (const line of data) {
			for (const allowedAlert of allowedAlerts) {
				switch (allowedAlert.modifier) {
					case "CONTAINS":
						// if (line.description.includes(allowedAlert.body)) {
						// 	matches++;
						// }
						var regex = new RegExp(`.*${allowedAlert.body}.*`);
						if (regex.test(line.description)) {
							matches++;
						}
					case "BEGINS":
						// if (line.description.startsWith(allowedAlert.body)) {
						// 	matches++;
						// }
						var regex = new RegExp(`^${allowedAlert.body}.*`);
						if (regex.test(line.description)) {
							matches++;
						}
					case "ENDS":
						// if (line.description.endsWith(allowedAlert.body)) {
						// 	matches++;
						// }
						var regex = new RegExp(`.*${allowedAlert.body}$`);
						if (regex.test(line.description)) {
							matches++;
						}
					case "REGEX":
						var regex = new RegExp(allowedAlert.body);
						if (regex.test(line.description)) {
							matches++;
						}
				}
			}
		}
		if (matches < data.length) {
			generalInfo.status = "alert";
		}
		return { generalInfo, data };
	}
};

/**
 *
 * @param gpsData lines of gps command
 * @param siteType Dus or BBU (siteType in table Site)
 * @returns result of command as object
 */
const formatGps = (gpsData: any, siteType: string) => {
	if (siteType === "DUS") {
		//get gps data
		return formatGetGpsToObject(gpsData);
	} else {
		//get gnss data
		return formatGetGnssToObject(gpsData);
	}
};
/**
 *
 * @param gpsData lines of gps command
 * @returns result of command as object
 */
const formatGetGpsToObject = (gpsData: string) => {
	const lines = gpsData.split("\n").filter((line) => line.trim() !== "");
	// console.log(lines);

	const generalInfo = {
		commandName: lines[0].trim(),
		totalRows: 0,
	};
	if (gpsData.includes("Total: 0")) {
		const data: string[] = [];
		return { generalInfo, data };
	} else {
		const data: any = [];
		let latitude = "";
		let longitude = "";
		let noOfSatellitesInView = "";
		let noOfSatellitesInUse = "";

		for (let i = 1; i < lines.length; i++) {
			const line = lines[i].trim();
			if (line.includes("latitude")) {
				const latitudeData = line
					.split("  ")
					.filter((line) => line.trim() !== "");
				latitude = dmsToDecimal(latitudeData[1].trim(), false);
			}
			if (line.includes("longitude")) {
				const longitudeData = line
					.split("  ")
					.filter((line) => line.trim() !== "");
				longitude = dmsToDecimal(longitudeData[1].trim(), false);
			}
			if (line.includes("noOfSatellitesInUse")) {
				noOfSatellitesInUse = line
					.split("  ")
					.filter((line) => line.trim() !== "")[1];
			}
			if (line.includes("noOfSatellitesInView")) {
				noOfSatellitesInView = line
					.split("  ")
					.filter((line) => line.trim() !== "")[1];
				data.push({
					latitude: latitude,
					longitude: longitude,
					noOfSatellitesInView: noOfSatellitesInView,
					noOfSatellitesInUse: noOfSatellitesInUse,
				});
				break;
			}
		}
		generalInfo.totalRows = data.length;
		return { generalInfo, data };
	}
};
/**
 *
 * @param gnssData lines of gps command
 * @returns result of command as object
 */
const formatGetGnssToObject = (gnssData: string) => {
	const lines = gnssData.split("\n").filter((line) => line.trim() !== "");
	// console.log(lines);

	const generalInfo = {
		commandName: lines[0].trim(),
		totalRows: 0,
	};
	if (gnssData.includes("Total: 0")) {
		const data: string[] = [];
		return { generalInfo, data };
	} else {
		const data: any = [];
		let latitude = "";
		let longitude = "";
		let noOfSatellitesInView = "";
		let noOfSatellitesInUse = "";

		for (let i = 1; i < lines.length; i++) {
			const line = lines[i].trim();
			if (line.includes("latitude")) {
				const latitudeData = line
					.split("  ")
					.filter((line) => line.trim() !== "");
				latitude = dmsToDecimal(latitudeData[1].trim(), true);
			}
			if (line.includes("longitude")) {
				const longitudeData = line
					.split("  ")
					.filter((line) => line.trim() !== "");
				longitude = dmsToDecimal(longitudeData[1].trim(), true);
			}
			if (line.includes("noOfSatellitesInUse")) {
				noOfSatellitesInUse = line
					.split("  ")
					.filter((line) => line.trim() !== "")[1];
			}
			if (line.includes("noOfSatellitesInView")) {
				noOfSatellitesInView = line
					.split("  ")
					.filter((line) => line.trim() !== "")[1];
				data.push({
					latitude: latitude,
					longitude: longitude,
					noOfSatellitesInUse: noOfSatellitesInUse,
					noOfSatellitesInView: noOfSatellitesInView,
				});
				break;
			}
		}
		generalInfo.totalRows = data.length;
		return { generalInfo, data };
	}
};

/**
 *
 * @param text alt log line
 * @returns object that contains the date, servicePriority, message
 */
function extractInfoFromAltLineString(text: string): {
	date: string;
	servicePriority: string;
	message: string;
} {
	const dateRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/;

	const match = dateRegex.exec(text);

	if (!match) {
		throw new Error("Invalid date format in the string.");
	}

	// Extract the date part
	const date = match[0];

	// Extract the service priority (first letter after date)
	const servicePriority = text[date.length + 1];

	// Extract the message (everything after the service priority)
	const message = text.substring(date.length + 2);

	return { date, servicePriority, message };
}

/**
 *
 * @param str date sting from alt command
 * @returns Date object of the given string
 */
function stringToDate(str: string): Date {
	const yearString = str.substring(0, 2);
	const year =
		parseInt(yearString) < 100
			? parseInt(yearString) + 2000
			: parseInt(yearString) + 1900;
	const month = parseInt(str.substring(2, 4)) - 1; // Months are zero-indexed in JavaScript
	const day = parseInt(str.substring(4, 6));
	const hours = parseInt(str.substring(7, 9));
	const minutes = parseInt(str.substring(10, 12));
	const seconds = parseInt(str.substring(13, 15));
	const date = new Date(year, month, day, hours, minutes, seconds);
	const newDate = new Date(date.getTime());
	newDate.setHours(newDate.getHours());
	return newDate;
}

/**
 *
 * @param dmsString
 * @param isGnss
 * @returns
 */
function dmsToDecimal(dmsString: string, isGnss: boolean): string {
	if (isGnss) {
		return gnssDmsToDecimal(dmsString);
	} else {
		return gpsDmsToDecimal(dmsString);
	}
}

/**
 *
 * @param dmsString
 * @returns
 */
function gnssDmsToDecimal(dmsString: string): string {
	const direction = dmsString.trim().charAt(0);
	const numberString = dmsString.trim().substring(2).replace(" ", ".");
	return convertDmsToDec(numberString);
}
/**
 *
 * @param dmsString
 * @returns
 */
function gpsDmsToDecimal(dmsString: string): string {
	const direction = dmsString.trim().charAt(0);
	const numberString = dmsString.trim().substring(2);
	return convertDmsToDec(numberString);
}

/**
 *
 * @param coordinate
 * @returns
 */
function convertDmsToDec(coordinate: string): string {
	const parts = coordinate.split(".");
	const degrees = parseFloat(parts[0]);
	const minutes = parseFloat(`${parts[1]}.${parts[2]}`); // Combine minutes and seconds

	const decimalDegrees = degrees + minutes / 60;
	return decimalDegrees.toFixed(7); // Round to 7 decimal places
}

/**
 * Parses the output of the `ls -l` command from a Linux terminal and returns a list of objects containing filename and modification date.
 *
 * @param lsOutput (string): The string representation of the output from the `ls -l` command.
 *
 * @returns FileInfo[]: An array of objects with properties `fileName` (string) and `date` (Date).
 */
function parseLsOutput(lsOutput: string): FileInfo[] {
	// Regular expression to capture file permissions, owner, group, size, month, day, time, and filename

	const formattedData: FileInfo[] = [];

	// Split the output by lines
	const lines = lsOutput.split("\n");

	// Skip the first line (total information)
	const data = lines.slice(1).filter((item) => !!item);

	for (const line of data) {
		// Extract information using the regular expression
		const match = line
			.trim()
			.split(" ")
			.filter((item) => !!item);
		// Extract filename, month, day, and time
		const fileName = match[8];
		const month = match[4];
		const day = match[5];
		const time = match[6];
		if (!fileName.includes(".log")) {
			continue;
		}
		// Combine date information and create a Date object
		const dateString = `${month} ${day} ${time}`;
		const date = new Date(dateString);

		// Create a FileInfo object with filename and date
		const fileData: FileInfo = {
			fileName,
			date,
		};

		// Append the object to the formatted data list
		formattedData.push(fileData);
	}

	return formattedData;
}

const deleteFolderRecursive = function (directoryPath: string) {
	if (fs.existsSync(directoryPath)) {
		fs.readdirSync(directoryPath).forEach((file, index) => {
			const curPath = Path.join(directoryPath, file);
			if (fs.lstatSync(curPath).isDirectory()) {
				// recurse
				deleteFolderRecursive(curPath);
			} else {
				// delete file
				fs.unlinkSync(curPath);
			}
		});
		fs.rmdirSync(directoryPath);
	}
};
