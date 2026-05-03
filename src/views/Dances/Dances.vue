<template>
    <div class="x-container x-container--auto-height">
        <div class="flex-1 min-h-0 flex flex-col">
            <DataTableLayout
                class="min-w-0 w-full"
                :table="table"
                :loading="isDanceLoading"
                auto-height
                :page-sizes="pageSizes"
                :total-items="totalItems"
                table-class="min-w-max w-max [&_tbody_tr]:cursor-pointer"
                :on-page-size-change="handlePageSizeChange"
                :on-row-click="handleRowClick">
                <template #toolbar>
                    <div class="mb-2 flex items-center justify-between gap-2">
                        <InputGroupField
                            v-model="danceSearch"
                            :placeholder="t('view.dances.search_placeholder')"
                            clearable
                            class="w-[300px]"
                            @input="scheduleDanceSearchChange"
                            @change="applyDanceSearchChange" />
                        <TooltipWrapper side="bottom" :content="t('common.actions.refresh')">
                            <Button
                                class="rounded-full"
                                variant="ghost"
                                size="icon-sm"
                                :disabled="isDanceLoading"
                                @click="refreshDances">
                                <Spinner v-if="isDanceLoading" />
                                <RefreshCw v-else />
                            </Button>
                        </TooltipWrapper>
                    </div>
                </template>
            </DataTableLayout>
        </div>
    </div>
</template>

<script setup>
    import { Button } from '@/components/ui/button';
    import { DataTableLayout } from '@/components/ui/data-table';
    import { InputGroupField } from '@/components/ui/input-group';
    import { RefreshCw } from 'lucide-vue-next';
    import { Spinner } from '@/components/ui/spinner';
    import { TooltipWrapper } from '@/components/ui/tooltip';
    import { computed, nextTick, onActivated, onBeforeUnmount, onMounted, ref } from 'vue';
    import { storeToRefs } from 'pinia';
    import { useI18n } from 'vue-i18n';

    import { createColumns } from './columns.jsx';
    import { localeIncludes } from '../../shared/utils';
    import { showUserDialog } from '../../coordinators/userCoordinator';
    import { useAppearanceSettingsStore, useDanceStore, useSearchStore } from '../../stores';
    import { useVrcxVueTable } from '../../lib/table/useVrcxVueTable';

    const { t } = useI18n();
    const appearanceSettingsStore = useAppearanceSettingsStore();
    const danceStore = useDanceStore();
    const { danceAggregates, isDanceLoading } = storeToRefs(danceStore);
    const { stringComparer } = storeToRefs(useSearchStore());

    const danceSearch = ref('');
    const filteredDanceRows = ref([]);
    const pageSizes = computed(() => appearanceSettingsStore.tablePageSizes);
    const DANCE_SEARCH_DEBOUNCE_MS = 150;
    let danceSearchTimer = 0;

    const columns = computed(() =>
        createColumns({
            onSaveNote: saveDanceNote,
            onShowHistory: danceStore.openDanceHistory
        })
    );

    const { table, pagination } = useVrcxVueTable({
        persistKey: 'dances',
        get data() {
            return filteredDanceRows.value;
        },
        columns,
        getRowId: (row) => row?.userId ?? row?.displayName ?? '',
        initialSorting: [{ id: 'lastDancedAt', desc: true }],
        initialPagination: {
            pageIndex: 0,
            pageSize: appearanceSettingsStore.tablePageSize
        }
    });

    const totalItems = computed(() => table.getFilteredRowModel().rows.length);

    onMounted(async () => {
        await refreshDances();
    });

    onActivated(async () => {
        await refreshDances();
    });

    onBeforeUnmount(() => {
        if (danceSearchTimer) {
            clearTimeout(danceSearchTimer);
        }
    });

    function handlePageSizeChange(size) {
        pagination.value = {
            ...pagination.value,
            pageIndex: 0,
            pageSize: size
        };
    }

    async function refreshDances() {
        await danceStore.loadDanceAggregates({ force: true });
        applyDanceSearchChange();
    }

    function scheduleDanceSearchChange() {
        if (danceSearchTimer) {
            clearTimeout(danceSearchTimer);
        }
        danceSearchTimer = setTimeout(() => {
            danceSearchTimer = 0;
            applyDanceSearchChange();
        }, DANCE_SEARCH_DEBOUNCE_MS);
    }

    function applyDanceSearchChange() {
        if (danceSearchTimer) {
            clearTimeout(danceSearchTimer);
            danceSearchTimer = 0;
        }
        const query = danceSearch.value.trim();
        const rows = danceAggregates.value.filter((row) => {
            if (!row.count) {
                return false;
            }
            if (!query) {
                return true;
            }
            return (
                localeIncludes(row.displayName || '', query, stringComparer.value) ||
                localeIncludes(row.userId || '', query, stringComparer.value) ||
                localeIncludes(row.note || '', query, stringComparer.value)
            );
        });
        filteredDanceRows.value = rows;
        table.setPageIndex(0);
        nextTick(() => {
            table.setSorting([{ id: 'lastDancedAt', desc: true }]);
        });
    }

    async function saveDanceNote(userId, note) {
        await danceStore.saveDanceNote(userId, note);
        applyDanceSearchChange();
    }

    function handleRowClick(row) {
        const userId = row?.original?.userId;
        if (userId) {
            showUserDialog(userId);
        }
    }
</script>
