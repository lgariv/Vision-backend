// Load environment variables
require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const fs = require("fs");

// Create an instance of PrismaClient, using the database URL from environment variables
const prisma = new PrismaClient();

// Define async function to save sitelist from the database
const saveSitelistFromDB = async () => {
	try {
		// Fetch sites from the database
		const sites = await prisma.site.findMany();

		// Extract IDs and join them into a string
		const idList = sites.map((obj) => obj.id);
		const idString = idList.join("\n");

		// Write the site list to a file
		fs.writeFile("/app/sitelist-tmp.txt", idString, (err) => {
			if (err) {
				console.error("Error writing to file:", err);
			} else {
				console.log("Successfully wrote sites to sitelist-tmp.txt");
			}
		});

		return idString;
	} catch (error) {
		console.error("Error fetching sites from the database:", error);
	} finally {
		// Disconnect the Prisma Client to free up connections
		await prisma.$disconnect();
	}
};

// Execute the function
saveSitelistFromDB();
