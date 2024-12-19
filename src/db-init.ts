import * as fs from "fs";
import prisma from "./db";
import { SiteType } from "@prisma/client";

const insertSitesToDB = async () => {
	const fileName = "sites.txt";
	try {
		const data = fs.readFileSync(fileName, "utf-8");
		const lines = data.split("\n").map((str) => str.slice(0, -1));
		console.log(lines);
		for (const site of lines) {
			const isAlreadyExist = await prisma.site.findFirst({
				where: {
					id: site,
				},
			});
			if (isAlreadyExist) {
			} else {
				//create
				const results = await prisma.site.create({
					data: {
						id: site,
						siteNameForUser: site,
						pikud: site,
						siteIP: site,
						siteType: SiteType.BBU,
						isPortable: false,
						defaultLocation: "insert",
						isInUse: true,
					},
				});
			}
		}
	} catch (error) {
		console.log(error);
	}
};
