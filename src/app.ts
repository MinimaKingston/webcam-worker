// src/app.ts

import path from 'node:path';
import fs from 'node:fs';

import { formatDuration } from './utils/format.js';

import Emittery from 'emittery';

import { getId64 } from './id.js';
import { createLogger, flushLog, rotateLog, type Logger } from './logger.js';
export type { Logger } from './logger.js';
import { getConfig, type Config } from './config.js';

import { Camsecure } from './camsecure/index.js';

const __dirname = import.meta.dirname;

interface Events {
	ready: App;
	loop: App;
	exit: App;
}

export type Emitter = Emittery<Events>;

class App {
	currentDate: string = new Date().toISOString().substring(0, 10);
	readonly env: NodeJS.ProcessEnv;
	readonly version: string;
	readonly pid: string;
	readonly name: string;
	readonly baseDir: string;
	readonly filesDir: string;
	readonly logDir: string;
	readonly isProduction: boolean;
	readonly startTime: number;
	readonly config: Config;
	readonly emitter: Emitter;
	/** Loop interval in milliseconds. */
	protected loopInterval = 10000; // 10 seconds.
	protected tasks: Record<string, () => unknown> = {};

	readonly logger: Logger;

	get uptime() {
		return performance.now() - this.startTime;
	}

	constructor(env: NodeJS.ProcessEnv) {
		this.startTime = performance.now();

		// Set the provided environment variables.
		this.env = env ?? {};

		// Set production mode.
		this.isProduction = env?.NODE_ENV === 'production';

		// Set base directories.
		this.baseDir = path.resolve(__dirname, '..');
		this.filesDir = path.join(this.baseDir, 'files');
		this.logDir = path.join(this.baseDir, 'log');

		// Set properties from package.json.
		const pkg = JSON.parse(
			fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'),
		);
		this.name = pkg.name;
		this.version = pkg.version;

		// Create a process id.
		this.pid = getId64();

		// Now load the config.
		this.config = getConfig(this);

		this.emitter = new Emittery<Events>();

		// Set up the logger - this is done lazily.
		this.logger = createLogger(this);

		this.emitter.on('loop', async () => {
			const rotated = await checkLogRotate(
				this.logger,
				this.logDir,
				this.currentDate,
			);
			if (rotated) this.currentDate = rotated;
		});

		// Log that we have done.
		const info = { name: this.name, version: this.version, pid: this.pid };
		this.logger.info(
			{ info },
			'Starting %s v%s %s',
			info.name,
			info.version,
			info.pid,
		);
	}

	loop() {
		setTimeout(() => this.loop(), this.loopInterval);
		this.emitter.emit('loop', this);
	}

	run() {
		// Set up exit event handling.
		process.on('SIGINT', async () => {
			await handleBeforeExit(this, 0);
			process.exit(0);
		});

		process.on('SIGTERM', async () => {
			await handleBeforeExit(this, 0);
			process.exit(0);
		});

		process.on('beforeExit', (code) => handleBeforeExit(this, code));

		process.on('uncaughtException', (err) =>
			handleUncaughtException(this, err),
		);

		this.runModules();

		this.emitter.emit('ready', this);
		this.loop();
	}

	/** Sleep for an interval in milliseconds. */
	async sleep(ms: number) {
		return new Promise<void>((resolve) => setTimeout(resolve, ms));
	}

	runModules() {
		new Camsecure(this);
	}
}

// Flag to prevent recursion of (before) exit handler.
let exitHandled = false;

const handleBeforeExit = async (app: App, code: number) => {
	if (exitHandled) return;
	try {
		exitHandled = true;

		const { name, version, pid, uptime, logger, emitter } = app;

		await emitter.emit('exit', app);

		const info = { name, version, pid, uptime, code };
		if (!logger) {
			console.log('Exiting', info);
			return;
		}

		logger.info(
			{ info },
			'Exiting %s %s with exit code %d after %s',
			info.name,
			info.pid,
			info.code,
			formatDuration(info.uptime),
		);
		return flushLog();
	} catch (err) {
		console.log('Error in exit handler', err);
		process.exit(1);
	}
};

const handleUncaughtException = async (app: App, err: Error) => {
	try {
		if (!app.logger) {
			console.log('Uncaught exception', err);
			return;
		}
		app.logger.fatal(err, 'Uncaught exception: %s', err.message);
	} catch (err) {
		console.log('Error in uncaught exception handler', err);
		process.exit(1);
	}
};

const checkLogRotate = async (
	logger: Logger,
	logDir: string,
	currentDate: string,
): Promise<false | string> => {
	const newDate = new Date().toISOString().substring(0, 10);
	if (newDate === currentDate) return false;

	logger.info('Rotating log file');
	await rotateLog(logDir);
	logger.info('Rotated new log file');
	return newDate;
};

export { App };
