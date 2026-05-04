<template>
    <Dialog :open="open" @update:open="handleOpenChange">
        <DialogContent class="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>{{ t('dialog.dances.clubs_title') }}</DialogTitle>
            </DialogHeader>

            <div class="flex items-center gap-2">
                <InputGroupField
                    v-model="clubName"
                    data-testid="dance-club-name"
                    :placeholder="t('dialog.dances.club_name_placeholder')"
                    clearable
                    @keydown.enter.prevent="addClub" />
                <Button data-testid="add-dance-club" :disabled="!canAddClub || isSaving" @click="addClub">
                    <Plus class="h-4 w-4" />
                    {{ t('dialog.dances.add_club') }}
                </Button>
            </div>

            <div
                v-if="!danceClubs.length"
                class="flex min-h-24 items-center justify-center text-sm text-muted-foreground">
                {{ t('common.no_data') }}
            </div>
            <div v-else class="max-h-72 overflow-auto rounded-md border">
                <div
                    v-for="club in danceClubs"
                    :key="club.id"
                    class="flex items-center justify-between gap-2 border-b px-3 py-2 last:border-b-0">
                    <span class="min-w-0 truncate text-sm">{{ club.name }}</span>
                    <TooltipWrapper side="top" :content="t('dialog.dances.delete_club')">
                        <Button variant="ghost" size="icon-sm" @click="deleteClub(club.id)">
                            <Trash2 class="h-4 w-4 text-destructive" />
                        </Button>
                    </TooltipWrapper>
                </div>
            </div>

            <DialogFooter>
                <Button variant="secondary" @click="closeDialog">
                    {{ t('dialog.alertdialog.cancel') }}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>

<script setup>
    import { Button } from '@/components/ui/button';
    import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
    import { InputGroupField } from '@/components/ui/input-group';
    import { Plus, Trash2 } from 'lucide-vue-next';
    import { computed, ref, watch } from 'vue';
    import { storeToRefs } from 'pinia';
    import { useI18n } from 'vue-i18n';

    import { TooltipWrapper } from '../../components/ui/tooltip';
    import { useDanceStore } from '../../stores';

    const props = defineProps({
        open: { type: Boolean, default: false }
    });

    const emit = defineEmits(['update:open']);

    const { t } = useI18n();
    const danceStore = useDanceStore();
    const { danceClubs } = storeToRefs(danceStore);
    const clubName = ref('');
    const isSaving = ref(false);
    const canAddClub = computed(() => clubName.value.trim().length > 0);

    watch(
        () => props.open,
        (open) => {
            if (open) {
                danceStore.loadDanceClubs({ force: true });
            }
        },
        { immediate: true }
    );

    function handleOpenChange(open) {
        if (!open) {
            closeDialog();
            return;
        }
        emit('update:open', true);
    }

    function closeDialog() {
        emit('update:open', false);
    }

    async function addClub() {
        if (!canAddClub.value || isSaving.value) {
            return;
        }
        isSaving.value = true;
        try {
            await danceStore.addDanceClub(clubName.value);
            clubName.value = '';
        } finally {
            isSaving.value = false;
        }
    }

    function deleteClub(id) {
        danceStore.deleteDanceClub(id);
    }
</script>
