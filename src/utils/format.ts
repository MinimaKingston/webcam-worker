import prettyBytes from 'pretty-bytes';
import prettyMilliseconds from 'pretty-ms';
import type { Options as PrettyMillisecondsOptions } from 'pretty-ms';

/**
 * Format bytes as KBo, MBo etc.
 * @param bytes Number of bytes.
 */
export const formatBytes = (bytes: number): string => {
	return prettyBytes(bytes, { binary: true });
};

/**
 * Format a duration as days, hours, minutes etc.
 *
 * @param milliseconds Duration in milliseconds.
 */
export const formatDuration = (
	milliseconds: number,
	options: PrettyMillisecondsOptions = {},
): string => {
	return prettyMilliseconds(milliseconds, options);
};
