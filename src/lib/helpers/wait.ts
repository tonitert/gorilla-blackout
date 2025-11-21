export function wait(ms: number): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

/**
 * Returns a random number between the specified minimum (inclusive)
 * and maximum (exclusive) values.
 *
 * @param min - The minimum number (inclusive).
 * @param max - The maximum number (exclusive).
 * @returns A random number between `min` (inclusive) and `max` (exclusive).
 *
 * @example
 * ```ts
 * const num = getRandomNumber(5, 10);
 * console.log(num); // e.g., 7.23
 * ```
 */
export function getRandomNumber(min: number, max: number): number {
	if (min >= max) {
		throw new Error('Minimum value must be less than maximum value.');
	}
	return Math.random() * (max - min) + min;
}

/**
 * Returns a random integer between the specified minimum (inclusive)
 * and maximum (exclusive) values.
 *
 * @param min - The minimum integer (inclusive).
 * @param max - The maximum integer (exclusive).
 * @returns A random integer between `min` (inclusive) and `max` (exclusive).
 *
 * @example
 * ```ts
 * const num = getRandomInt(1, 5);
 * console.log(num); // e.g., 3
 * ```
 */
export function getRandomInt(min: number, max: number): number {
	if (!Number.isInteger(min) || !Number.isInteger(max)) {
		throw new Error('Both min and max must be integers.');
	}
	if (min >= max) {
		throw new Error('Minimum value must be less than maximum value.');
	}
	return Math.floor(Math.random() * (max - min)) + min;
}

export function getRandomIntExcluding(min: number, max: number, exclude: number): number {
	let result: number;
	do {
		result = getRandomInt(min, max);
	} while (result === exclude);
	return result;
}
