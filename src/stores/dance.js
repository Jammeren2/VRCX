import { computed, ref } from 'vue';
import { defineStore } from 'pinia';

import { database } from '../services/database';
import { watchState } from '../services/watchState';

function createEmptyDanceAggregate(userId = '') {
    return {
        userId,
        displayName: '',
        count: 0,
        lastDancedAt: '',
        note: '',
        noteUpdatedAt: ''
    };
}

function normalizeUserRef(user) {
    return {
        userId: user?.id || user?.userId || '',
        displayName: user?.displayName || user?.name || ''
    };
}

export const useDanceStore = defineStore('Dance', () => {
    const danceAggregates = ref([]);
    const isDanceDataLoaded = ref(false);
    const isDanceLoading = ref(false);
    const danceHistoryDialog = ref({
        visible: false,
        loading: false,
        userId: '',
        displayName: '',
        events: []
    });

    const danceAggregateByUserId = computed(() => {
        const map = new Map();
        for (const aggregate of danceAggregates.value) {
            if (aggregate.userId) {
                map.set(aggregate.userId, aggregate);
            }
        }
        return map;
    });

    async function loadDanceAggregates({ force = false } = {}) {
        if (!watchState.isLoggedIn) {
            danceAggregates.value = [];
            isDanceDataLoaded.value = false;
            return [];
        }
        if (isDanceLoading.value) {
            return danceAggregates.value;
        }
        if (isDanceDataLoaded.value && !force) {
            return danceAggregates.value;
        }

        isDanceLoading.value = true;
        try {
            danceAggregates.value = await database.getDanceAggregates();
            isDanceDataLoaded.value = true;
        } finally {
            isDanceLoading.value = false;
        }
        return danceAggregates.value;
    }

    function ensureDanceDataLoaded() {
        return loadDanceAggregates();
    }

    function getDanceAggregate(userId) {
        if (!userId) {
            return createEmptyDanceAggregate();
        }
        return (
            danceAggregateByUserId.value.get(userId) ||
            createEmptyDanceAggregate(userId)
        );
    }

    function getDanceCount(userId) {
        return getDanceAggregate(userId).count;
    }

    function upsertDanceAggregate(aggregate) {
        const index = danceAggregates.value.findIndex(
            (item) => item.userId === aggregate.userId
        );
        if (!aggregate.count && !aggregate.note) {
            if (index !== -1) {
                danceAggregates.value.splice(index, 1);
            }
            return;
        }
        if (index === -1) {
            danceAggregates.value.unshift(aggregate);
        } else {
            danceAggregates.value.splice(index, 1, aggregate);
        }
    }

    async function refreshDanceAggregate(userId) {
        if (!userId) {
            return createEmptyDanceAggregate();
        }
        const aggregate = await database.getDanceAggregate(userId);
        upsertDanceAggregate(aggregate);
        return aggregate;
    }

    async function addDanceForUser(user) {
        const { userId, displayName } = normalizeUserRef(user);
        if (!userId) {
            return createEmptyDanceAggregate();
        }

        await database.addDanceEvent({
            userId,
            displayName,
            dancedAt: new Date().toJSON()
        });
        const aggregate = await refreshDanceAggregate(userId);
        if (
            danceHistoryDialog.value.visible &&
            danceHistoryDialog.value.userId === userId
        ) {
            await loadDanceHistory(userId);
        }
        return aggregate;
    }

    async function saveDanceNote(userId, note) {
        if (!userId) {
            return createEmptyDanceAggregate();
        }
        await database.setDanceNote({
            userId,
            note,
            updatedAt: new Date().toJSON()
        });
        return refreshDanceAggregate(userId);
    }

    async function loadDanceHistory(userId) {
        if (!userId) {
            danceHistoryDialog.value.events = [];
            return [];
        }
        danceHistoryDialog.value.loading = true;
        try {
            danceHistoryDialog.value.events =
                await database.getDanceEvents(userId);
        } finally {
            danceHistoryDialog.value.loading = false;
        }
        return danceHistoryDialog.value.events;
    }

    async function openDanceHistory(user) {
        const { userId, displayName } = normalizeUserRef(user);
        if (!userId) {
            return;
        }
        danceHistoryDialog.value.userId = userId;
        danceHistoryDialog.value.displayName = displayName || userId;
        danceHistoryDialog.value.visible = true;
        await loadDanceHistory(userId);
    }

    function closeDanceHistory() {
        danceHistoryDialog.value.visible = false;
    }

    async function deleteDanceEvent(id) {
        if (!id) {
            return;
        }
        const userId = danceHistoryDialog.value.userId;
        await database.deleteDanceEvent(id);
        if (userId) {
            await loadDanceHistory(userId);
            await refreshDanceAggregate(userId);
        }
    }

    return {
        danceAggregates,
        danceAggregateByUserId,
        danceHistoryDialog,
        isDanceDataLoaded,
        isDanceLoading,
        loadDanceAggregates,
        ensureDanceDataLoaded,
        getDanceAggregate,
        getDanceCount,
        refreshDanceAggregate,
        addDanceForUser,
        saveDanceNote,
        openDanceHistory,
        closeDanceHistory,
        deleteDanceEvent
    };
});
