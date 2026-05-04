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
                <span v-if="danceAggregate.lastClubName" class="ml-2 text-muted-foreground">
                    {{
                        t('dialog.user.info.last_dance_club', {
                            club: danceAggregate.lastClubName
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

    <Dialog :open="isDanceEntryDialogVisible" @update:open="handleDanceEntryDialogOpenChange">
        <DialogContent class="sm:max-w-sm">
            <DialogHeader>
                <DialogTitle>{{ t('dialog.user.info.dance_entry_title') }}</DialogTitle>
            </DialogHeader>
            <div class="space-y-3 text-xs">
                <div>
                    {{
                        t('dialog.user.info.dance_entry_description', {
                            name: danceEntryDisplayName
                        })
                    }}
                </div>
                <label class="block">
                    <span class="mb-1 block text-muted-foreground">
                        {{ t('dialog.user.info.dance_club') }}
                    </span>
                    <NativeSelect v-model="danceEntryClubId" data-testid="dance-club-select" class="w-full">
                        <NativeSelectOption value="">
                            {{ t('dialog.user.info.dance_club_none') }}
                        </NativeSelectOption>
                        <NativeSelectOption v-for="club in danceClubs" :key="club.id" :value="String(club.id)">
                            {{ club.name }}
                        </NativeSelectOption>
                    </NativeSelect>
                </label>
                <label class="block">
                    <span class="mb-1 block text-muted-foreground">
                        {{ t('dialog.user.info.dance_note') }}
                    </span>
                    <InputGroupTextareaField
                        v-model="danceEntryNote"
                        data-testid="dance-note-input"
                        :rows="3"
                        input-class="resize-none"
                        :placeholder="t('dialog.user.info.dance_note_placeholder')"
                        clearable />
                </label>
            </div>
            <DialogFooter>
                <Button variant="secondary" class="mr-2" @click="closeDanceEntryDialog">
                    {{ t('dialog.alertdialog.cancel') }}
                </Button>
                <Button data-testid="apply-dance-note" :disabled="isSaving" @click="applyDanceEntry">
                    {{ t('dialog.user.info.apply_dance_entry') }}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>

<script setup>
    import { Button } from '@/components/ui/button';
    import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
    import { InputGroupTextareaField } from '@/components/ui/input-group';
    import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
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
    const { danceClubs } = storeToRefs(danceStore);
    const { userDialog, currentUser } = storeToRefs(useUserStore());
    const isSaving = ref(false);
    const isDanceEntryDialogVisible = ref(false);
    const danceEntryNote = ref('');
    const danceEntryClubId = ref('');
    const danceEntryUserId = ref('');
    const danceEntryDisplayName = ref('');

    const danceAggregate = computed(() => danceStore.getDanceAggregate(userDialog.value.id));

    onMounted(() => {
        danceStore.ensureDanceDataLoaded();
        danceStore.ensureDanceClubsLoaded();
    });

    function addDance() {
        if (isSaving.value) {
            return;
        }
        openDanceEntryDialog();
    }

    function openDanceEntryDialog() {
        const aggregate = danceAggregate.value;
        const user = userDialog.value.ref || {};
        danceEntryUserId.value = user.id || aggregate.userId || userDialog.value.id;
        danceEntryDisplayName.value = user.displayName || aggregate.displayName || danceEntryUserId.value;
        danceEntryNote.value = aggregate.note || '';
        danceEntryClubId.value = aggregate.lastClubId ? String(aggregate.lastClubId) : '';
        isDanceEntryDialogVisible.value = true;
    }

    function handleDanceEntryDialogOpenChange(open) {
        if (!open) {
            closeDanceEntryDialog();
            return;
        }
        isDanceEntryDialogVisible.value = true;
    }

    function closeDanceEntryDialog() {
        isDanceEntryDialogVisible.value = false;
    }

    async function applyDanceEntry() {
        if (isSaving.value || !danceEntryUserId.value) {
            return;
        }
        isSaving.value = true;
        try {
            await danceStore.addDanceForUser(userDialog.value.ref, {
                clubId: danceEntryClubId.value ? Number(danceEntryClubId.value) : null
            });
            await danceStore.saveDanceNote(danceEntryUserId.value, danceEntryNote.value);
            closeDanceEntryDialog();
            toast.success(t('message.dances.added'));
        } finally {
            isSaving.value = false;
        }
    }

    function showDanceHistory() {
        danceStore.openDanceHistory(userDialog.value.ref);
    }
</script>
