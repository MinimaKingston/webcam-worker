import { describe, expect, it } from 'vitest';
import 'dotenv/config.js';

import {
	fetchCameraLinks,
	fetchYearLinks,
	fetchMonthLinks,
	fetchDayLinks,
	fetchFileLinks,
	downloadCameraFile,
} from '@/camsecure/index.js';

describe('Camsecure import', async () => {
	it('should find the base folder(s)', async () => {
		const url = process.env.CAMERA_URL ?? '';
		const cameras = await fetchCameraLinks(url);
		expect(cameras.length).toBe(1);

		for (const camera of cameras) {
			expect(camera.camera).toMatch(/^[A-Za-z0-9\-._~]+$/);
			expect(camera.path).toMatch(`${camera.camera}`);
		}
	});

	it('should find the years folder(s)', async () => {
		const url = process.env.CAMERA_URL ?? '';
		const cameras = await fetchCameraLinks(url);
		const camera = cameras[0];
		const years = await fetchYearLinks(camera.path, url);
		expect(years.length).toBeGreaterThan(0);
		expect(years.length).toBeLessThan(3);

		let lastYear: string | null = null;
		for (const year of years) {
			// The years should be in strictly ascending order.
			if (lastYear) {
				expect(year.year > lastYear).toBe(true);
			}
			lastYear = year.year;

			expect(year.year).toMatch(/^20[0-9]{2}$/);
			expect(year.path).toMatch(`/${year.year}&`);
		}
	});

	it('should find the months folder(s)', async () => {
		const url = process.env.CAMERA_URL ?? '';
		const cameras = await fetchCameraLinks(url);
		const camera = cameras[0];
		const years = await fetchYearLinks(camera.path, url);
		const year = years[years.length - 1];

		const months = await fetchMonthLinks(year.path, url);

		expect(months.length).toBeGreaterThan(0);
		expect(months.length).toBeLessThan(3);

		let lastMonth: string | null = null;
		for (const month of months) {
			// The days should be in strictly ascending order.
			if (lastMonth) {
				expect(month.month > lastMonth).toBe(true);
			}
			lastMonth = month.month;

			expect(month.month).toMatch(/^[0-9]{2}$/);
			expect(month.path).toMatch(`/${year.year}/${month.month}&`);
		}
	});

	it('should find the days folder(s)', async () => {
		const url = process.env.CAMERA_URL ?? '';
		const cameras = await fetchCameraLinks(url);
		const camera = cameras[0];
		const years = await fetchYearLinks(camera.path, url);
		const year = years[years.length - 1];
		const months = await fetchMonthLinks(year.path, url);
		const month = months[months.length - 1];

		const days = await fetchDayLinks(month.path, url);

		expect(days.length).toBeGreaterThan(0);
		expect(days.length).toBeLessThan(5);

		let lastDay: string | null = null;
		for (const day of days) {
			// The days should be in strictly ascending order.
			if (lastDay) {
				expect(day.day > lastDay).toBe(true);
			}
			lastDay = day.day;

			expect(day.day).toMatch(/^[0-9]{2}$/);
			expect(day.path).toMatch(`/${year.year}/${month.month}/${day.day}&`);
		}
	});

	it('should find the files for a day', async () => {
		const url = process.env.CAMERA_URL ?? '';
		const cameras = await fetchCameraLinks(url);
		const camera = cameras[0];
		const years = await fetchYearLinks(camera.path, url);
		const year = years[years.length - 1];
		const months = await fetchMonthLinks(year.path, url);
		const month = months[months.length - 1];
		const days = await fetchDayLinks(month.path, url);
		const day = days[days.length - 1];

		const files = await fetchFileLinks(day.path, url);
		expect(files.length).toBeGreaterThan(0);

		let lastFilename: string | null = null;

		for (const file of files) {
			// The files should be in strictly ascending order.
			if (lastFilename) {
				expect(file.filename > lastFilename).toBe(true);
			}
			lastFilename = file.filename;

			// filename: 'minimayc_2025-02-11_08-17-50.mp4',
			expect(file.filename).toMatch(
				/^[^/]+_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.mp4$/,
			);

			// directPath: 'minimayc/2025/02/11/minimayc_2025-02-11_08-17-50.mp4'
			expect(file.directPath).toMatch(
				new RegExp(`^[^/]+\\/\\d{4}\\/\\d{2}\\/\\d{2}\\/${file.filename}$`),
			);

			// path: 'download.php?fname=./minimayc/2025/02/11/minimayc_2025-02-11_08-17-50.mp4',
			expect(file.path).toMatch(
				new RegExp(`^download.php\\?fname=\\.\\/${file.directPath}$`),
			);
		}
	});
});

describe('Camsecure downloadFile()', async () => {
	it('should download a file that exists', async () => {
		const url = process.env.CAMERA_URL ?? '';
		const cameras = await fetchCameraLinks(url);
		const camera = cameras[0];
		const years = await fetchYearLinks(camera.path, url);
		const year = years[0];
		const months = await fetchMonthLinks(year.path, url);
		const month = months[0];
		const days = await fetchDayLinks(month.path, url);
		const day = days[0];

		const [, , , fileLink] = await fetchFileLinks(day.path, url);
		console.log({ fileLink });
		const res = await downloadCameraFile(fileLink.directPath, '', url);
		console.log(res);
		expect(res.contentLength).toBeGreaterThan(100000000);
		return res;
	});
});
