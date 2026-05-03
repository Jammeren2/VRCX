<template>
    <Dialog :open="danceHistoryDialog.visible" @update:open="handleOpenChange">
        <DialogContent class="x-dialog sm:max-w-150 translate-y-0" style="top: 10vh">
            <DialogHeader>
                <DialogTitle>
                    {{
                        t('dialog.dances.history_title', {
                            name: danceHistoryDialog.displayName || danceHistoryDialog.userId
                        })
                    }}
                </DialogTitle>
            </DialogHeader>

            <div v-if="danceHistoryDialog.loading" class="flex min-h-32 items-center justify-center">
                <Spinner />
            </div>
            <div
                v-else-if="!danceHistoryDialog.events.length"
                class="flex min-h-32 items-center justify-center text-sm text-muted-foreground">
                {{ t('common.no_data') }}
            </div>
            <div v-else class="max-h-96 overflow-auto rounded-md border">
                <table class="w-full table-fixed text-sm">
                    <thead>
                        <tr class="border-b bg-background">
                            <th class="sticky top-0 z-10 bg-background px-3 py-2 text-left font-medium">
                                {{ t('table.dances.date') }}
                            </th>
                            <th class="sticky top-0 z-10 bg-background px-3 py-2 text-left font-medium">
                                {{ t('table.dances.user') }}
                            </th>
                            <th class="sticky top-0 z-10 bg-background px-3 py-2 text-right font-medium">
                                {{ t('table.dances.action') }}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="event in danceHistoryDialog.events" :key="event.id" class="border-b last:border-b-0">
                            <td class="px-3 py-2">{{ formatDateFilter(event.dancedAt, 'long') }}</td>
                            <td class="truncate px-3 py-2">
                                {{ event.displayName || danceHistoryDialog.displayName }}
                            </td>
                            <td class="px-3 py-2 text-right">
                                <TooltipWrapper side="top" :content="t('dialog.dances.delete_event')">
                                    <Button variant="ghost" size="icon-sm" @click="deleteEvent(event.id)">
                                        <Trash2 class="h-4 w-4 text-destructive" />
                                    </Button>
                                </TooltipWrapper>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <DialogFooter>
                <Button variant="secondary" @click="danceStore.closeDanceHistory">
                    {{ t('dialog.alertdialog.cancel') }}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>

<script setup>
    import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
    import { Button } from '@/components/ui/button';
    import { Spinner } from '@/components/ui/spinner';
    import { TooltipWrapper } from '@/components/ui/tooltip';
    import { Trash2 } from 'lucide-vue-next';
    import { storeToRefs } from 'pinia';
    import { useI18n } from 'vue-i18n';

    import { formatDateFilter } from '../../shared/utils';
    import { useDanceStore } from '../../stores';

    const { t } = useI18n();
    const danceStore = useDanceStore();
    const { danceHistoryDialog } = storeToRefs(danceStore);

    function handleOpenChange(open) {
        if (!open) {
            danceStore.closeDanceHistory();
        }
    }

    function deleteEvent(id) {
        danceStore.deleteDanceEvent(id);
    }
</script>
