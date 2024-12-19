import { Request, Response } from "express";
import path from "path";
import { Client } from "ssh2";
import * as fs from 'fs';
export interface SshConfig {
	host: string;
	port: number; // SSH port (default is 22)
	username: string;
	password?: string; // Or use privateKey for key-based authentication
}

export class SshConnection {
	private conn: Client;
	private sshConfig: SshConfig;

	constructor(sshConfig: SshConfig) {
		this.conn = new Client();
		this.sshConfig = sshConfig;
	}

	connect() {
		this.conn.connect(this.sshConfig);
	}

	disconect() {
		this.conn.end();
	}

	async copyDir(remoteSource: string, localDest: string) {
		console.log("cp dir");
		console.log(remoteSource);
		
		try {
			this.conn.on('ready', () => {
				console.log('client ::ready');
				this.conn.sftp((err, sftp) => {
					console.log("blaaa");

					if (err) throw err;
					sftp.readdir(remoteSource, (err, list) => {
						if (err) throw err;
						console.log("list", list);
						for (const entry of list) {
							// const remotePath = path.join(remoteSource, entry.filename);
							// const localPath = path.join(localDest, entry.filename);
							// const writeStream = fs.createWriteStream(localPath);
							console.log(entry.toLocaleString());
							
							// const readStream = sftp.readFile(remotePath, (err, handle) => {
							// 		writeStream.write(handle)
							// 	});
						}
						this.conn.end();
					});
				});
				
			}).connect(this.sshConfig); // Create SFTP stream
		} catch (error) {
			console.error("Error copying directory:", error);
			throw error; // Re-throw to handle in the calling function
		}
	}

	connectAndExecuteCommands(commands: string[]): Promise<string> {
		return new Promise((resolve, reject) => {
			this.conn.on("ready", () => {
				const outputs: string[] = [];

				const executeNextCommand = (index: number) => {
					if (index >= commands.length) {
						resolve(outputs[0]);
						this.disconect();
						return;
					}

					this.conn.exec(commands[index], (err, stream) => {
						if (err) {
							console.log(err);
							reject(err);
							this.disconect();
							return;
						}

						let stdout = "";
						let stderr = "";

						stream
							.on("close", (code: any, signal: any) => {
								outputs.push(stdout || stderr);
								try {
									executeNextCommand(index + 1);
								} catch (error) {}
							})
							.on("data", (data: any) => {
								stdout += data;
							})
							.stderr.on("data", (data) => {
								stderr += data;
							});
					});
				};

				executeNextCommand(0);
			});

			this.conn.on("error", (err) => {
				reject(err);
				this.disconect();
			});

			this.connect();
		});
	}
}

