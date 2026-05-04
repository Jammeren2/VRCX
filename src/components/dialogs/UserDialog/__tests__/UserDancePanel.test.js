import { beforeEach, describe, expect, test, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { nextTick, ref } from 'vue';

const mocks = vi.hoisted(() => ({
    currentUser: null,
    userDialog: null,
    aggregate: null,
    danceClubs: null,
    ensureDanceDataLoaded: vi.fn(),
    ensureDanceClubsLoaded: vi.fn(),
    addDanceForUser: vi.fn(),
    saveDanceNote: vi.fn(),
    openDanceHistory: vi.fn(),
    toastSuccess: vi.fn()
}));

vi.mock('pinia', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        storeToRefs: (store) => store
    };
});

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key, params) => {
            if (key === 'dialog.user.info.dance_count') {
                return `Danced ${params.count} times`;
            }
            if (key === 'dialog.user.info.last_danced_at') {
                return `Last: ${params.date}`;
            }
            return key;
        }
    })
}));

vi.mock('vue-sonner', () => ({
    toast: {
        success: (...args) => mocks.toastSuccess(...args)
    }
}));

vi.mock('@/components/ui/button', () => ({
    Button: {
        props: ['disabled'],
        emits: ['click'],
        template:
            '<button :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>'
    }
}));

vi.mock('@/components/ui/dialog', () => ({
    Dialog: {
        props: ['open'],
        emits: ['update:open'],
        template: '<div v-if="open"><slot /></div>'
    },
    DialogContent: { template: '<div><slot /></div>' },
    DialogFooter: { template: '<div><slot /></div>' },
    DialogHeader: { template: '<div><slot /></div>' },
    DialogTitle: { template: '<div><slot /></div>' }
}));

vi.mock('@/components/ui/input-group', () => ({
    InputGroupTextareaField: {
        props: ['modelValue'],
        emits: ['update:modelValue'],
        template:
            '<textarea v-bind="$attrs" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)"></textarea>'
    }
}));

vi.mock('@/components/ui/native-select', () => ({
    NativeSelect: {
        props: ['modelValue'],
        emits: ['update:modelValue'],
        template:
            '<select v-bind="$attrs" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><slot /></select>'
    },
    NativeSelectOption: {
        template: '<option><slot /></option>'
    }
}));

vi.mock('../../../ui/tooltip', () => ({
    TooltipWrapper: { template: '<div><slot /></div>' }
}));

vi.mock('lucide-vue-next', () => ({
    ListMinus: { template: '<span />' },
    Plus: { template: '<span />' }
}));

vi.mock('../../../../shared/utils', () => ({
    formatDateFilter: (value) => `formatted:${value}`
}));

vi.mock('../../../../stores', () => ({
    useUserStore: () => ({
        currentUser: mocks.currentUser,
        userDialog: mocks.userDialog
    }),
    useDanceStore: () => ({
        danceClubs: mocks.danceClubs,
        ensureDanceDataLoaded: (...args) =>
            mocks.ensureDanceDataLoaded(...args),
        ensureDanceClubsLoaded: (...args) =>
            mocks.ensureDanceClubsLoaded(...args),
        addDanceForUser: (...args) => mocks.addDanceForUser(...args),
        saveDanceNote: (...args) => mocks.saveDanceNote(...args),
        openDanceHistory: (...args) => mocks.openDanceHistory(...args),
        getDanceAggregate: () => mocks.aggregate.value
    })
}));

import UserDancePanel from '../UserDancePanel.vue';

describe('UserDancePanel.vue', () => {
    beforeEach(() => {
        mocks.currentUser = ref({ id: 'usr_me' });
        mocks.userDialog = ref({
            id: 'usr_1',
            ref: {
                id: 'usr_1',
                displayName: 'Alice'
            }
        });
        mocks.aggregate = ref({
            userId: 'usr_1',
            displayName: 'Alice',
            count: 2,
            lastDancedAt: '2026-05-04T01:02:03.000Z',
            note: 'great musicality',
            lastClubId: 7,
            lastClubName: 'Shelter'
        });
        mocks.danceClubs = ref([
            {
                id: 7,
                name: 'Shelter'
            }
        ]);

        mocks.ensureDanceDataLoaded.mockReset();
        mocks.ensureDanceClubsLoaded.mockReset();
        mocks.addDanceForUser.mockReset();
        mocks.saveDanceNote.mockReset();
        mocks.openDanceHistory.mockReset();
        mocks.toastSuccess.mockReset();
        mocks.addDanceForUser.mockResolvedValue(mocks.aggregate.value);
        mocks.saveDanceNote.mockResolvedValue(mocks.aggregate.value);
    });

    test('loads dance data and shows aggregate for another user', () => {
        const wrapper = mount(UserDancePanel);

        expect(mocks.ensureDanceDataLoaded).toHaveBeenCalledTimes(1);
        expect(mocks.ensureDanceClubsLoaded).toHaveBeenCalledTimes(1);
        expect(wrapper.text()).toContain('Danced 2 times');
        expect(wrapper.text()).toContain(
            'Last: formatted:2026-05-04T01:02:03.000Z'
        );
        expect(wrapper.text()).toContain('dialog.user.info.last_dance_club');
        expect(wrapper.text()).toContain('great musicality');
    });

    test('hides panel for own profile', () => {
        mocks.userDialog.value.id = 'usr_me';

        const wrapper = mount(UserDancePanel);

        expect(wrapper.find('[data-testid="user-dance-panel"]').exists()).toBe(
            false
        );
    });

    test('add button opens the dance entry dialog', async () => {
        const wrapper = mount(UserDancePanel);

        await wrapper.get('[data-testid="add-dance"]').trigger('click');
        await flushPromises();
        await nextTick();

        expect(mocks.addDanceForUser).not.toHaveBeenCalled();
        expect(wrapper.text()).toContain('dialog.user.info.dance_entry_title');
    });

    test('apply button records a dance with the selected club and note', async () => {
        const wrapper = mount(UserDancePanel);

        await wrapper.get('[data-testid="add-dance"]').trigger('click');
        await flushPromises();
        await wrapper.get('[data-testid="dance-club-select"]').setValue('7');
        await wrapper
            .get('[data-testid="dance-note-input"]')
            .setValue('new dance note');
        await wrapper.get('[data-testid="apply-dance-note"]').trigger('click');
        await flushPromises();

        expect(mocks.addDanceForUser).toHaveBeenCalledWith(
            mocks.userDialog.value.ref,
            {
                clubId: 7
            }
        );
        expect(mocks.saveDanceNote).toHaveBeenCalledWith(
            'usr_1',
            'new dance note'
        );
        expect(mocks.toastSuccess).toHaveBeenCalledWith('message.dances.added');
    });

    test('apply button allows an empty club and note', async () => {
        mocks.aggregate.value.note = '';
        mocks.addDanceForUser.mockResolvedValue({
            ...mocks.aggregate.value,
            note: ''
        });
        const wrapper = mount(UserDancePanel);

        await wrapper.get('[data-testid="add-dance"]').trigger('click');
        await flushPromises();
        await wrapper.get('[data-testid="dance-club-select"]').setValue('');
        await wrapper.get('[data-testid="apply-dance-note"]').trigger('click');
        await flushPromises();

        expect(mocks.addDanceForUser).toHaveBeenCalledWith(
            mocks.userDialog.value.ref,
            {
                clubId: null
            }
        );
        expect(mocks.saveDanceNote).toHaveBeenCalledWith('usr_1', '');
    });

    test('remove button opens dance history', async () => {
        const wrapper = mount(UserDancePanel);

        await wrapper.get('[data-testid="remove-dance"]').trigger('click');

        expect(mocks.openDanceHistory).toHaveBeenCalledWith(
            mocks.userDialog.value.ref
        );
    });
});
