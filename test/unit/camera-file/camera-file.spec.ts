import { parseCameraFilename } from '@/camera-file/camera-file.js';

import { describe, expect, it } from 'vitest';

describe('parseCameraFilename()', async () => {
	it('should parse a file with a leading path', () => {
		const file = parseCameraFilename(
			'video-files/2025/01/11/minimayc_2025-01-11_23-45-14.json',
		);
		// const file = parseCameraFilename('minimayc_2025-01-11_23-45-14.json');

		expect(file.camera).toBe('minimayc');

		expect(file.year).toBe('2025');
		expect(file.month).toBe('01');
		expect(file.day).toBe('11');

		expect(file.hour).toBe('23');
		expect(file.minute).toBe('45');
		expect(file.second).toBe('14');

		expect(file.filename).toBe('minimayc_2025-01-11_23-45-14.json');

		expect(file.ext).toBe('json');
	});
});
