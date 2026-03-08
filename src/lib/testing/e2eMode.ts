export function isE2EMode(search: string | URLSearchParams): boolean {
	const params = typeof search === 'string' ? new URLSearchParams(search) : search;
	return params.get('e2e') === '1';
}
