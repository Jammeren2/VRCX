import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    formatDateFilter: vi.fn((value) => `formatted:${value}`),
    onSaveNote: vi.fn(),
    onShowUser: vi.fn(),
    onShowHistory: vi.fn()
}));

vi.mock('../../../plugins', () => ({
    i18n: {
        global: {
            t: (key) => key
        }
    }
}));

vi.mock('../../../shared/utils', () => ({
    formatDateFilter: (...args) => mocks.formatDateFilter(...args)
}));

vi.mock('../../../components/ui/button', () => ({
    Button: 'Button'
}));

vi.mock('../../../components/ui/input-group', () => ({
    InputGroupField: 'InputGroupField'
}));

vi.mock('../../../components/ui/tooltip', () => ({
    TooltipWrapper: 'TooltipWrapper'
}));

vi.mock('lucide-vue-next', () => ({
    ArrowUpDown: 'ArrowUpDown',
    History: 'History'
}));

import { createColumns } from '../columns.jsx';

function createElement(type, props, ...children) {
    return {
        type,
        props: props ?? {},
        children: children.flat()
    };
}

function findNode(node, predicate) {
    if (!node) return null;
    if (Array.isArray(node)) {
        for (const item of node) {
            const result = findNode(item, predicate);
            if (result) return result;
        }
        return null;
    }
    if (predicate(node)) return node;
    if (!node.children) return null;
    return findNode(node.children, predicate);
}

function makeColumns() {
    return createColumns({
        onSaveNote: mocks.onSaveNote,
        onShowUser: mocks.onShowUser,
        onShowHistory: mocks.onShowHistory
    });
}

describe('views/Dances/columns.jsx', () => {
    beforeEach(() => {
        globalThis.React = { createElement };
        mocks.formatDateFilter.mockClear();
        mocks.onSaveNote.mockReset();
        mocks.onShowUser.mockReset();
        mocks.onShowHistory.mockReset();
    });

    test('opens user profile only from the user name cell', () => {
        const row = {
            original: {
                userId: 'usr_1',
                displayName: 'Alice'
            }
        };
        const displayNameCol = makeColumns().find(
            (column) => column.id === 'displayName'
        );
        const stopPropagation = vi.fn();

        displayNameCol.cell({ row }).props.onClick({ stopPropagation });

        expect(stopPropagation).toHaveBeenCalledTimes(1);
        expect(mocks.onShowUser).toHaveBeenCalledWith('usr_1');
    });

    test('note cell saves note without opening profile', () => {
        const row = {
            original: {
                userId: 'usr_1',
                displayName: 'Alice',
                note: 'old'
            }
        };
        const noteCol = makeColumns().find((column) => column.id === 'note');
        const noteCell = noteCol.cell({ row });
        const stopPropagation = vi.fn();

        noteCell.props.onClick({ stopPropagation });
        noteCell.props.onChange('new');

        expect(stopPropagation).toHaveBeenCalledTimes(1);
        expect(mocks.onSaveNote).toHaveBeenCalledWith('usr_1', 'new');
        expect(mocks.onShowUser).not.toHaveBeenCalled();
    });

    test('date cell has no profile click handler', () => {
        const row = {
            original: {
                lastDancedAt: '2026-05-04T01:02:03.000Z'
            }
        };
        const dateCol = makeColumns().find(
            (column) => column.id === 'lastDancedAt'
        );
        const dateCell = dateCol.cell({ row });

        expect(
            findNode(dateCell, (node) => Boolean(node.props?.onClick))
        ).toBeNull();
        expect(mocks.formatDateFilter).toHaveBeenCalledWith(
            row.original.lastDancedAt,
            'long'
        );
    });
});
