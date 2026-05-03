import { beforeEach, describe, expect, test, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick, ref } from 'vue';

const mocks = vi.hoisted(() => ({
    currentUser: null,
    userDialog: null,
    aggregate: null,
    ensureDanceDataLoaded: vi.fn(),
    addDanceForUser: vi.fn(),
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
        ensureDanceDataLoaded: (...args) =>
            mocks.ensureDanceDataLoaded(...args),
        addDanceForUser: (...args) => mocks.addDanceForUser(...args),
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
            note: 'great musicality'
        });

        mocks.ensureDanceDataLoaded.mockReset();
        mocks.addDanceForUser.mockReset();
        mocks.openDanceHistory.mockReset();
        mocks.toastSuccess.mockReset();
        mocks.addDanceForUser.mockResolvedValue(mocks.aggregate.value);
    });

    test('loads dance data and shows aggregate for another user', () => {
        const wrapper = mount(UserDancePanel);

        expect(mocks.ensureDanceDataLoaded).toHaveBeenCalledTimes(1);
        expect(wrapper.text()).toContain('Danced 2 times');
        expect(wrapper.text()).toContain(
            'Last: formatted:2026-05-04T01:02:03.000Z'
        );
        expect(wrapper.text()).toContain('great musicality');
    });

    test('hides panel for own profile', () => {
        mocks.userDialog.value.id = 'usr_me';

        const wrapper = mount(UserDancePanel);

        expect(wrapper.find('[data-testid="user-dance-panel"]').exists()).toBe(
            false
        );
    });

    test('add button records a dance for the dialog user', async () => {
        const wrapper = mount(UserDancePanel);

        await wrapper.get('[data-testid="add-dance"]').trigger('click');
        await nextTick();

        expect(mocks.addDanceForUser).toHaveBeenCalledWith(
            mocks.userDialog.value.ref
        );
        expect(mocks.toastSuccess).toHaveBeenCalledWith('message.dances.added');
    });

    test('remove button opens dance history', async () => {
        const wrapper = mount(UserDancePanel);

        await wrapper.get('[data-testid="remove-dance"]').trigger('click');

        expect(mocks.openDanceHistory).toHaveBeenCalledWith(
            mocks.userDialog.value.ref
        );
    });
});
