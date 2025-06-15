import { App } from '@/app.js';

import { describe, expect, it } from 'vitest';
import path from 'node:path';
import pkg from '../../package.json';

describe('App.baseDir', async () => {
	it('should have the right value', () => {
		expect(new App().baseDir).toMatch(
			path.resolve(import.meta.dirname, '../..'),
		);
	});
});

describe('App.version', () => {
	it('should match package.json', () => {
		expect(new App().version).toBe(pkg.version);
	});
});

describe('App.pid', () => {
	it('should be set', () => {
		expect(new App().pid.length).toBeGreaterThan(3);
	});

	it('should be unique', () => {
		expect(new App().pid === new App().pid).toBe(false);
	});
});
