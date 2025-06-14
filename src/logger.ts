import { mkdir } from 'node:fs/promises';
import path from 'node:path';

import { pino, type Logger } from 'pino';
import type { SonicBoom } from 'sonic-boom';

export type { Logger };

/** Options for a logger instance. */
export interface Options {
	/** Application name for context. */
	name: string;
	/** Path to create log files. */
	logDir: string;
	/** Unique process id for context. */
	pid: string;
	/** Set to `true` for production mode. */
	isProduction?: boolean;
}

/** Base context. */
export interface Base {
	/** Application name. */
	name: string;
	/** Unique process id. */
	pid: string;
}

let logger: Logger | null = null;
let destination: SonicBoom | null = null;
let isDevelopment = false;

const createDevelopmentLogger = (base: Base): Logger => {
	const logger = pino({
		base,
		transport: {
			target: 'pino-pretty',
		},
	});
	logger.level = 'debug';
	isDevelopment = true;
	return logger;
};

const createProductionLogger = (base: Base, { logDir }: Options): Logger => {
	const dest = getFilepath(logDir);
	destination = pino.destination({ dest, mkdir: true });
	return pino({ base }, destination);
};

const getFilepath = (logDir: string) => {
	const [, year, month, day] =
		new Date().toISOString().match(/^(\d{4})-(\d\d)-(\d\d)/) ?? [];

	const filename = `${year}-${month}-${day}.log.ndjson`;
	return path.join(logDir, year, month, filename);
};

/**
 * Flush all messages to the log.
 */
export const flushLog = async (): Promise<void> => {
	return new Promise<void>((resolve, reject) => {
		if (logger === null) {
			reject(new Error('Cannot flush before the logger is created'));
			return;
		}

		logger.flush((err?: Error) => {
			if (err) {
				reject(err);
			} else {
				resolve();
			}
		});
	});
};

/**
 * Rotate the log file.
 *
 * @param logDir Base directory for logging.
 */
export const rotateLog = async (logDir: string): Promise<void> => {
	// Nothing to do in development mode.
	if (isDevelopment) return;

	if (destination === null) {
		throw new Error('Cannot rotate before the logger is created');
	}
	await flushLog();
	const dest = getFilepath(logDir);
	await mkdir(path.dirname(dest), { recursive: true });
	destination.reopen(dest);
};

/**
 * Create a logger instance.
 *
 * @param {string} options.name The name of the application for prefix.
 * @param {string} options.logDir Directory for log files.
 * @param {string} options.pid Process id of the application for prefix.
 * @param {String} options.isProduction Set to `true` in production mode.
 */
export const createLogger = (options: Options): Logger => {
	if (logger !== null) {
		throw new Error('Only one logger can be created');
	}

	// Common base for development and production.
	const { name, pid, isProduction } = options;
	const base: Base = { name, pid };

	logger = isProduction
		? createProductionLogger(base, options)
		: createDevelopmentLogger(base);

	return logger;
};
