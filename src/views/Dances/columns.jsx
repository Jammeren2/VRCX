import { ArrowUpDown, History } from 'lucide-vue-next';

import { Button } from '../../components/ui/button';
import { InputGroupField } from '../../components/ui/input-group';
import { TooltipWrapper } from '../../components/ui/tooltip';
import { formatDateFilter } from '../../shared/utils';
import { i18n } from '../../plugins';

const { t } = i18n.global;

const sortButton = ({ column, label, descFirst = false }) => {
    const resolvedLabel = typeof label === 'function' ? label() : label;
    return (
        <Button
            variant="ghost"
            size="sm"
            class="-ml-2 h-8 px-2"
            onClick={() => {
                const sorted = column.getIsSorted();
                if (!sorted && descFirst) {
                    column.toggleSorting(true);
                    return;
                }
                column.toggleSorting(sorted === 'asc');
            }}
        >
            {resolvedLabel}
            <ArrowUpDown class="ml-1 h-4 w-4" />
        </Button>
    );
};

const sortText = (a, b) =>
    String(a || '')
        .toLowerCase()
        .localeCompare(String(b || '').toLowerCase());

export const createColumns = ({ onSaveNote, onShowUser, onShowHistory }) => [
    {
        id: 'displayName',
        accessorFn: (row) => row?.displayName,
        header: ({ column }) =>
            sortButton({
                column,
                label: () => t('table.dances.user')
            }),
        size: 220,
        meta: {
            label: () => t('table.dances.user')
        },
        sortingFn: (rowA, rowB) =>
            sortText(rowA.original?.displayName, rowB.original?.displayName),
        cell: ({ row }) => {
            const userId = row.original?.userId || '';
            const label = row.original?.displayName || userId;
            return (
                <button
                    type="button"
                    class="block min-w-0 max-w-full truncate text-left underline-offset-2 hover:underline"
                    onClick={(event) => {
                        event.stopPropagation();
                        if (userId) {
                            onShowUser?.(userId);
                        }
                    }}
                >
                    {label}
                </button>
            );
        }
    },
    {
        id: 'count',
        accessorFn: (row) => row?.count,
        header: ({ column }) =>
            sortButton({
                column,
                label: () => t('table.dances.count'),
                descFirst: true
            }),
        size: 130,
        meta: {
            class: 'text-right',
            label: () => t('table.dances.count')
        },
        sortingFn: (rowA, rowB) =>
            (rowA.original?.count ?? 0) - (rowB.original?.count ?? 0)
    },
    {
        id: 'lastDancedAt',
        accessorFn: (row) => row?.lastDancedAt,
        header: ({ column }) =>
            sortButton({
                column,
                label: () => t('table.dances.lastDancedAt'),
                descFirst: true
            }),
        size: 190,
        meta: {
            label: () => t('table.dances.lastDancedAt')
        },
        sortingFn: (rowA, rowB) =>
            sortText(rowA.original?.lastDancedAt, rowB.original?.lastDancedAt),
        cell: ({ row }) => (
            <span>{formatDateFilter(row.original?.lastDancedAt, 'long')}</span>
        )
    },
    {
        id: 'lastClubName',
        accessorFn: (row) => row?.lastClubName,
        header: ({ column }) =>
            sortButton({
                column,
                label: () => t('table.dances.club')
            }),
        size: 180,
        meta: {
            label: () => t('table.dances.club')
        },
        sortingFn: (rowA, rowB) =>
            sortText(rowA.original?.lastClubName, rowB.original?.lastClubName),
        cell: ({ row }) => (
            <span class="block min-w-0 truncate">
                {row.original?.lastClubName ||
                    t('dialog.user.info.dance_club_none')}
            </span>
        )
    },
    {
        id: 'note',
        accessorFn: (row) => row?.note,
        header: () => t('table.dances.note'),
        size: 260,
        minSize: 160,
        enableSorting: false,
        meta: {
            stretch: true,
            label: () => t('table.dances.note')
        },
        cell: ({ row }) => (
            <InputGroupField
                modelValue={row.original?.note || ''}
                placeholder={t('view.dances.note_placeholder')}
                clearable
                onClick={(event) => event.stopPropagation()}
                onChange={(value) =>
                    onSaveNote?.(row.original?.userId, String(value || ''))
                }
            />
        )
    },
    {
        id: 'action',
        header: () => t('table.dances.action'),
        size: 100,
        enableSorting: false,
        meta: {
            class: 'text-right',
            label: () => t('table.dances.action')
        },
        cell: ({ row }) => (
            <TooltipWrapper side="top" content={t('view.dances.history')}>
                <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={(event) => {
                        event.stopPropagation();
                        onShowHistory?.(row.original);
                    }}
                >
                    <History class="h-4 w-4" />
                </Button>
            </TooltipWrapper>
        )
    }
];
