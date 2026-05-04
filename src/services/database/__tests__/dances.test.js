import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    execute: vi.fn(),
    executeNonQuery: vi.fn()
}));

vi.mock('../../sqlite.js', () => ({
    default: {
        execute: mocks.execute,
        executeNonQuery: mocks.executeNonQuery
    }
}));

vi.mock('../index.js', () => ({
    dbVars: {
        userPrefix: 'usrprefix'
    }
}));

import { dances } from '../dances.js';

describe('database/dances', () => {
    beforeEach(() => {
        mocks.execute.mockReset();
        mocks.executeNonQuery.mockReset();
    });

    test('creates per-user dance tables and index', async () => {
        await dances.initDanceTables();

        expect(mocks.executeNonQuery).toHaveBeenCalledTimes(5);
        expect(mocks.executeNonQuery.mock.calls[0][0]).toContain(
            'CREATE TABLE IF NOT EXISTS usrprefix_dance_events'
        );
        expect(mocks.executeNonQuery.mock.calls[1][0]).toContain(
            'ALTER TABLE usrprefix_dance_events ADD club_id'
        );
        expect(mocks.executeNonQuery.mock.calls[2][0]).toContain(
            'CREATE INDEX IF NOT EXISTS usrprefix_dance_events_user_danced_idx'
        );
        expect(mocks.executeNonQuery.mock.calls[3][0]).toContain(
            'CREATE TABLE IF NOT EXISTS usrprefix_dance_clubs'
        );
        expect(mocks.executeNonQuery.mock.calls[4][0]).toContain(
            'CREATE TABLE IF NOT EXISTS usrprefix_dance_notes'
        );
    });

    test('adds dance event with current user table placeholders', async () => {
        await dances.addDanceEvent({
            userId: 'usr_1',
            displayName: 'Alice',
            dancedAt: '2026-05-04T01:02:03.000Z',
            clubId: 7
        });

        expect(mocks.executeNonQuery).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO usrprefix_dance_events'),
            {
                '@user_id': 'usr_1',
                '@display_name': 'Alice',
                '@danced_at': '2026-05-04T01:02:03.000Z',
                '@club_id': 7
            }
        );
    });

    test('reads dance aggregates', async () => {
        mocks.execute.mockImplementation(async (callback) => {
            callback([
                'usr_1',
                'Alice',
                2,
                '2026-05-04T01:02:03.000Z',
                'smooth',
                '2026-05-04T02:00:00.000Z',
                7,
                'Shelter'
            ]);
        });

        const rows = await dances.getDanceAggregates();

        expect(rows).toEqual([
            {
                userId: 'usr_1',
                displayName: 'Alice',
                count: 2,
                lastDancedAt: '2026-05-04T01:02:03.000Z',
                note: 'smooth',
                noteUpdatedAt: '2026-05-04T02:00:00.000Z',
                lastClubId: 7,
                lastClubName: 'Shelter'
            }
        ]);
        expect(mocks.execute.mock.calls[0][1]).toContain(
            'FROM usrprefix_dance_events'
        );
        expect(mocks.execute.mock.calls[0][1]).toContain(
            'LEFT JOIN usrprefix_dance_notes'
        );
    });

    test('manages dance clubs', async () => {
        mocks.execute.mockImplementation(async (callback) => {
            callback([
                7,
                'Shelter',
                '2026-05-04T01:00:00.000Z',
                '2026-05-04T01:00:00.000Z'
            ]);
        });

        const club = await dances.addDanceClub({
            name: 'Shelter',
            createdAt: '2026-05-04T01:00:00.000Z',
            updatedAt: '2026-05-04T01:00:00.000Z'
        });

        expect(mocks.executeNonQuery.mock.calls[0][0]).toContain(
            'INSERT OR IGNORE INTO usrprefix_dance_clubs'
        );
        expect(club).toEqual({
            id: 7,
            name: 'Shelter',
            createdAt: '2026-05-04T01:00:00.000Z',
            updatedAt: '2026-05-04T01:00:00.000Z'
        });

        mocks.execute.mockReset();
        mocks.execute.mockImplementation(async (callback) => {
            callback([
                7,
                'Shelter',
                '2026-05-04T01:00:00.000Z',
                '2026-05-04T01:00:00.000Z'
            ]);
        });

        await expect(dances.getDanceClubs()).resolves.toEqual([
            {
                id: 7,
                name: 'Shelter',
                createdAt: '2026-05-04T01:00:00.000Z',
                updatedAt: '2026-05-04T01:00:00.000Z'
            }
        ]);
    });

    test('deleting a club clears references before removing it', async () => {
        await dances.deleteDanceClub(7);

        expect(mocks.executeNonQuery.mock.calls[0]).toEqual([
            'UPDATE usrprefix_dance_events SET club_id = NULL WHERE club_id = @id',
            {
                '@id': 7
            }
        ]);
        expect(mocks.executeNonQuery.mock.calls[1]).toEqual([
            'DELETE FROM usrprefix_dance_clubs WHERE id = @id',
            {
                '@id': 7
            }
        ]);
    });

    test('saves and clears dance notes', async () => {
        await dances.setDanceNote({
            userId: 'usr_1',
            note: 'great musicality',
            updatedAt: '2026-05-04T02:00:00.000Z'
        });
        await dances.setDanceNote({
            userId: 'usr_1',
            note: '',
            updatedAt: '2026-05-04T03:00:00.000Z'
        });

        expect(mocks.executeNonQuery.mock.calls[0][0]).toContain(
            'INSERT OR REPLACE INTO usrprefix_dance_notes'
        );
        expect(mocks.executeNonQuery.mock.calls[0][1]).toMatchObject({
            '@user_id': 'usr_1',
            '@note': 'great musicality'
        });
        expect(mocks.executeNonQuery.mock.calls[1][0]).toContain(
            'DELETE FROM usrprefix_dance_notes'
        );
    });

    test('deletes selected dance event', async () => {
        await dances.deleteDanceEvent(42);

        expect(mocks.executeNonQuery).toHaveBeenCalledWith(
            'DELETE FROM usrprefix_dance_events WHERE id = @id',
            {
                '@id': 42
            }
        );
    });
});
