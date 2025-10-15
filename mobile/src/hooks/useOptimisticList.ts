import { useCallback, useRef, useState } from 'react';

export function useOptimisticList<T extends { id: number }>(initial: T[] = []) {
	const [items, setItems] = useState<T[]>(initial);
	const prevRef = useRef<T[] | null>(null);

	const begin = useCallback(() => {
		if (!prevRef.current) prevRef.current = items;
	}, [items]);

	const commit = useCallback(() => {
		prevRef.current = null;
	}, []);

	const rollback = useCallback(() => {
		if (prevRef.current) setItems(prevRef.current);
		prevRef.current = null;
	}, []);

	const insert = useCallback((item: T) => {
		setItems((cur) => [item, ...cur]);
	}, []);

	const update = useCallback((id: number, patch: Partial<T>) => {
		setItems((cur) => cur.map((x) => (x.id === id ? ({ ...x, ...patch }) as T : x)));
	}, []);

	const remove = useCallback((id: number) => {
		setItems((cur) => cur.filter((x) => x.id !== id));
	}, []);

	return { items, setItems, begin, commit, rollback, insert, update, remove };
}


