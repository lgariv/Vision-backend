const fs = require('fs');
const fsP = require('node:fs/promises');
import {insertSiteDataToDB} from './src/services/sites_data_service'

const parseLogs=async()=>{
    insertSiteDataToDB()
}

parseLogs()