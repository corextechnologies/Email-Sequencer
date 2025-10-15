import { renderHook, act } from '@testing-library/react-hooks';
import { useOptimisticList } from './useOptimisticList';

describe('useOptimisticList', () => {
	it('insert/update/remove with rollback', () => {
		const { result } = renderHook(() => useOptimisticList<{ id: number; name: string }>([]));
		act(() => result.current.begin());
		act(() => result.current.insert({ id: 1, name: 'A' }));
		expect(result.current.items.length).toBe(1);
		act(() => result.current.update(1, { name: 'B' }));
		expect(result.current.items[0].name).toBe('B');
		act(() => result.current.rollback());
		expect(result.current.items.length).toBe(0);
	});
});


