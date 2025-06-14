import { getStorage } from '@/storage/index.js';

import { describe, expect, it } from 'vitest';

describe('File storage', async () => {
	it('should throw when list is truncated', async () => {
		const storage = getStorage();

		expect(storage.listObjects({ params: { MaxKeys: 10 } })).rejects.toThrow(
			'Response data is truncated at 10 items',
		);
	});

	it('should list video files for this month', async () => {
		const date = new Date().toISOString().substring(0, 7);
		const storage = getStorage();

		const ignoreTruncate = true;
		const Prefix = `video-files/${date.replaceAll('-', '/')}`;
		const params = { MaxKeys: 10, Prefix };
		const files = await storage.listObjects({ ignoreTruncate, params });

		expect(files.length).toBe(10);
		const regex = new RegExp(`^${Prefix}`);
		for (const file of files) {
			expect(file.LastModified).toBeInstanceOf(Date);
			expect(file.Key).toMatch(regex);
		}
	});
});
