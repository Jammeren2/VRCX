<template>
    <div
        v-if="currentUser.id !== userDialog.id"
        class="box-border flex items-center p-1.5 text-[13px] cursor-default w-full"
        data-testid="user-dance-panel">
        <div class="flex-1 overflow-hidden">
            <div class="mb-1 flex items-center justify-between gap-2">
                <span class="block truncate font-medium leading-[18px]">
                    {{ t('dialog.user.info.dances') }}
                </span>
                <div class="flex items-center gap-1">
                    <TooltipWrapper side="top" :content="t('dialog.user.info.add_dance')">
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            data-testid="add-dance"
                            :disabled="isSaving"
                            @click="addDance">
                            <Plus class="h-4 w-4" />
                        </Button>
                    </TooltipWrapper>
                    <TooltipWrapper side="top" :content="t('dialog.user.info.remove_dance')">
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            data-testid="remove-dance"
                            :disabled="danceAggregate.count === 0"
                            @click="showDanceHistory">
                            <ListMinus class="h-4 w-4" />
                        </Button>
                    </TooltipWrapper>
                </div>
            </div>
            <div class="text-xs">
                <span>
                    {{
                        t('dialog.user.info.dance_count', {
                            count: danceAggregate.count
                        })
                    }}
                </span>
                <span v-if="danceAggregate.lastDancedAt" class="ml-2 text-muted-foreground">
                    {{
                        t('dialog.user.info.last_danced_at', {
                            date: formatDateFilter(danceAggregate.lastDancedAt, 'long')
                        })
                    }}
                </span>
            </div>
            <pre
                v-if="danceAggregate.note"
                class="mt-1 text-xs font-[inherit]"
                style="white-space: pre-wrap; margin-right: 0.5em; max-height: 120px; overflow-y: auto"
                >{{ danceAggregate.note }}</pre
            >
        </div>
    </div>
</template>

<script setup>
    import { Button } from '@/components/ui/button';
    import { ListMinus, Plus } from 'lucide-vue-next';
    import { computed, onMounted, ref } from 'vue';
    import { storeToRefs } from 'pinia';
    import { toast } from 'vue-sonner';
    import { useI18n } from 'vue-i18n';

    import { formatDateFilter } from '../../../shared/utils';
    import { TooltipWrapper } from '../../ui/tooltip';
    import { useDanceStore, useUserStore } from '../../../stores';

    const { t } = useI18n();
    const danceStore = useDanceStore();
    const { userDialog, currentUser } = storeToRefs(useUserStore());
    const isSaving = ref(false);

    const danceAggregate = computed(() => danceStore.getDanceAggregate(userDialog.value.id));

    onMounted(() => {
        danceStore.ensureDanceDataLoaded();
    });

    async function addDance() {
        if (isSaving.value) {
            return;
        }
        isSaving.value = true;
        try {
            await danceStore.addDanceForUser(userDialog.value.ref);
            toast.success(t('message.dances.added'));
        } finally {
            isSaving.value = false;
        }
    }

    function showDanceHistory() {
        danceStore.openDanceHistory(userDialog.value.ref);
    }
</script>
