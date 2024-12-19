#!/bin/bash

/usr/local/bin/node /app/save-sitelist-from-db.ts
sshpass -v -p "${ENM_AMOS_PASSWORD}" ssh ${ENM_AMOS_USERNAME}@${ENM_AMOS_IP} "rm -rf /home/shared/${ENM_AMOS_USERNAME}/.Teal/sitelist.txt"
sshpass -v -p "${ENM_AMOS_PASSWORD}" scp /app/sitelist-tmp.txt ${ENM_AMOS_USERNAME}@${ENM_AMOS_IP}:/home/shared/${ENM_AMOS_USERNAME}/.Teal/sitelist.txt
sshpass -p "${ENM_AMOS_PASSWORD}" ssh ${ENM_AMOS_USERNAME}@${ENM_AMOS_IP} "amosbatch -w 1 -p 30 -t 10 \"/home/shared/${ENM_AMOS_USERNAME}/.Teal/sitelist.txt\" \"lt all;rbs;rbs;st cell;st rru;st mme;st ike;pmxet . radioRecInterferencePucchPwr$;ue print -admitted;get . earfcn;invxrf;get . configuredMaxTxPower;alt;get gps;get gnss\" \"/home/shared/${ENM_AMOS_USERNAME}/.Teal/TealLogs\""
rm -rf /app/sitelist-tmp.txt
mkdir -p /app/logs/
sshpass -p "${ENM_AMOS_PASSWORD}" scp -r ${ENM_AMOS_USERNAME}@${ENM_AMOS_IP}:/home/shared/${ENM_AMOS_USERNAME}/.Teal/TealLogs/* /app/logs/
date '+%Y-%m-%d %H:%M:%S' >> /app/logs/mobatch_result.txt
curl --location "http://${API_HOST}:6001/cronParse"
