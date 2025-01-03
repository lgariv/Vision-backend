import prisma from "../db";
import { addSiteBodyType } from "../../types";
import { Limits, SiteType } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

//from env vars
const supabase = createClient(
	process.env.SUPABASE_URL,
	process.env.SUPABASE_ANON_KEY
);

/**
 * ucreateClient, pdate the limits of the command;
 * @param limitObject represent the id of the limit object and its limits
 * @returns
 */
export const updateLimits = async (limitObject: Limits) => {
	try {
		const res = await prisma.limits.update({
			where: {
				id: limitObject.id,
			},
			data: {
				lowerLimit: limitObject.lowerLimit,
				upperLimit: limitObject.upperLimit,
			},
		});
		return res;
	} catch (error) {
		throw new Error(error);
	}
};

/**
 * get the limits of the command;
 * @returns
 */
export const getLimits = async () => {
	try {
		const res = await prisma.limits.findMany();
		return res;
	} catch (error) {
		throw new Error(error);
	}
};

/**
 * get the limits of the command;
 * @returns
 */
export const updateDefLocation = async (
	amosName: string,
	lat: number,
	lon: number
) => {
	try {
		const res = await prisma.site.update({
			data: {
				defaultLocation: `${lat},${lon}`,
			},
			where: {
				id: amosName,
			},
		});
		return res;
	} catch (error) {
		throw new Error(error);
	}
};

/**
 * create new site
 *
 * @param site
 * @returns site that was created or error is something went wrong
 */
export const addNewSite = async (site: addSiteBodyType, password: string) => {
	try {
		// Authenticate with Supabase
		const { error: authError } = await supabase.auth.signInWithPassword({
			email: "admin@admin.com",
			password: password,
		});

		if (authError) {
			throw new Error("Authentication failed");
		}

		console.log(site);

		const siteId: string = site.siteName;

		const isAlreadyExist = await prisma.site.findFirst({
			where: {
				id: siteId,
			},
		});
		if (isAlreadyExist) {
			//update
			const results = await prisma.site.update({
				data: {
					siteNameForUser: site.displayName,
					pikud: site.pikud,
					siteIP: site.siteIP,
					siteType: site.type === "BBU" ? SiteType.BBU : SiteType.DUS,
					isPortable: site.isPortable,
					defaultLocation: site.defaultLocation,
					createdAt: new Date(),
					isInUse: true,
				},
				where: {
					id: siteId,
				},
			});
			return results;
		} else {
			//create
			const results = await prisma.site.create({
				data: {
					id: site.siteName,
					siteNameForUser: site.displayName,
					pikud: site.pikud,
					siteIP: site.siteIP,
					siteType: site.type === "BBU" ? SiteType.BBU : SiteType.DUS,
					isPortable: site.isPortable,
					defaultLocation: site.defaultLocation,
					isInUse: true,
				},
			});
			return results;
		}
	} catch (error: any) {
		throw new Error(error);
	}
};

/**
 * delete sites and their data
 * @param siteList string array [sitename,sitename,...]
 * @returns
 */
export const deleteSites = async (siteList: string[] | string = "all", password: string) => {
	try {
		// Authenticate with Supabase
		const { error: authError } = await supabase.auth.signInWithPassword({
			email: "admin@admin.com",
			password: password,
		});

		if (authError) {
			throw new Error("Authentication failed");
		}

		if (siteList === "all") {
			// const deletedSites = await prisma.site.deleteMany();
			const deletedSites = await prisma.site.updateMany({
				where: {}, // Empty object to match all rows
				data: {
					// Field to update and its new value
					isInUse: false,
				},
			});
			return deletedSites;
		} else {
			const deletedSites = await prisma.site.updateMany({
				where: {
					id: {
						//@ts-ignore
						in: siteList, // Filter sites where ID is in the list
					},
				},
				data: {
					isInUse: false,
				},
			});
			return deletedSites;
		}
	} catch (error: any) {
		throw new Error(error);
	}
};

/**
 *
 * @param siteName amos name(id in sites)
 * @param value true || false
 * @returns updated site object
 */
export const setIsInUse = async (siteName: string, value: boolean) => {
	try {
		const results = await prisma.site.update({
			data: {
				isInUse: value,
			},
			where: {
				id: siteName,
			},
		});
		return results;
	} catch (error: any) {
		throw new Error(error);
	}
};

/**
 * get list of all sites
 * @returns list of all sites
 */
export const getAllSites = async () => {
	try {
		const results = await prisma.site.findMany();
		return results;
	} catch (error: any) {
		throw new Error(error);
	}
};

/**
 * get list of all sites
 * @returns list of all sites
 */
export const updatePortableLocation = async (
	amosName: string,
	location: string
) => {
	try {
		const res = await prisma.site.update({
			data: {
				portableLocation: location,
			},
			where: {
				id: amosName,
			},
		});
		return location;
	} catch (error) {
		throw new Error(error);
	}
};