import { dbVars } from '../database';

import sqliteService from '../sqlite.js';

function getDanceEventsTable() {
    return `${dbVars.userPrefix}_dance_events`;
}

function getDanceNotesTable() {
    return `${dbVars.userPrefix}_dance_notes`;
}

function normalizeDanceAggregate(row) {
    return {
        userId: row[0] || '',
        displayName: row[1] || '',
        count: Number(row[2] || 0),
        lastDancedAt: row[3] || '',
        note: row[4] || '',
        noteUpdatedAt: row[5] || ''
    };
}

const dances = {
    async initDanceTables() {
        const eventsTable = getDanceEventsTable();
        const notesTable = getDanceNotesTable();

        await sqliteService.executeNonQuery(
            `CREATE TABLE IF NOT EXISTS ${eventsTable} (
                id INTEGER PRIMARY KEY,
                user_id TEXT NOT NULL,
                display_name TEXT,
                danced_at TEXT NOT NULL
            )`
        );
        await sqliteService.executeNonQuery(
            `CREATE INDEX IF NOT EXISTS ${eventsTable}_user_danced_idx ON ${eventsTable} (user_id, danced_at)`
        );
        await sqliteService.executeNonQuery(
            `CREATE TABLE IF NOT EXISTS ${notesTable} (
                user_id TEXT PRIMARY KEY,
                note TEXT,
                updated_at TEXT
            )`
        );
    },

    async addDanceEvent(entry) {
        await sqliteService.executeNonQuery(
            `INSERT INTO ${getDanceEventsTable()} (user_id, display_name, danced_at)
            VALUES (@user_id, @display_name, @danced_at)`,
            {
                '@user_id': entry.userId,
                '@display_name': entry.displayName || '',
                '@danced_at': entry.dancedAt
            }
        );
    },

    async getDanceAggregates() {
        const rows = [];
        const eventsTable = getDanceEventsTable();
        const notesTable = getDanceNotesTable();

        await sqliteService.execute(
            (dbRow) => {
                rows.push(normalizeDanceAggregate(dbRow));
            },
            `SELECT
                e.user_id,
                COALESCE(
                    (
                        SELECT e2.display_name
                        FROM ${eventsTable} e2
                        WHERE e2.user_id = e.user_id AND e2.display_name != ''
                        ORDER BY e2.danced_at DESC, e2.id DESC
                        LIMIT 1
                    ),
                    ''
                ) AS display_name,
                COUNT(e.id) AS dance_count,
                MAX(e.danced_at) AS last_danced_at,
                COALESCE(n.note, '') AS note,
                COALESCE(n.updated_at, '') AS note_updated_at
            FROM ${eventsTable} e
            LEFT JOIN ${notesTable} n ON n.user_id = e.user_id
            GROUP BY e.user_id
            ORDER BY MAX(e.danced_at) DESC, display_name ASC`
        );

        return rows;
    },

    async getDanceAggregate(userId) {
        let aggregate = null;
        const eventsTable = getDanceEventsTable();
        const notesTable = getDanceNotesTable();

        await sqliteService.execute(
            (dbRow) => {
                aggregate = normalizeDanceAggregate(dbRow);
            },
            `SELECT
                e.user_id,
                COALESCE(
                    (
                        SELECT e2.display_name
                        FROM ${eventsTable} e2
                        WHERE e2.user_id = e.user_id AND e2.display_name != ''
                        ORDER BY e2.danced_at DESC, e2.id DESC
                        LIMIT 1
                    ),
                    ''
                ) AS display_name,
                COUNT(e.id) AS dance_count,
                MAX(e.danced_at) AS last_danced_at,
                COALESCE(n.note, '') AS note,
                COALESCE(n.updated_at, '') AS note_updated_at
            FROM ${eventsTable} e
            LEFT JOIN ${notesTable} n ON n.user_id = e.user_id
            WHERE e.user_id = @user_id
            GROUP BY e.user_id`,
            {
                '@user_id': userId
            }
        );

        if (aggregate) {
            return aggregate;
        }

        await sqliteService.execute(
            (dbRow) => {
                aggregate = {
                    userId,
                    displayName: '',
                    count: 0,
                    lastDancedAt: '',
                    note: dbRow[0] || '',
                    noteUpdatedAt: dbRow[1] || ''
                };
            },
            `SELECT note, updated_at FROM ${notesTable} WHERE user_id = @user_id`,
            {
                '@user_id': userId
            }
        );

        return (
            aggregate || {
                userId,
                displayName: '',
                count: 0,
                lastDancedAt: '',
                note: '',
                noteUpdatedAt: ''
            }
        );
    },

    async getDanceEvents(userId) {
        const rows = [];
        await sqliteService.execute(
            (dbRow) => {
                rows.push({
                    id: dbRow[0],
                    userId: dbRow[1],
                    displayName: dbRow[2] || '',
                    dancedAt: dbRow[3] || ''
                });
            },
            `SELECT id, user_id, display_name, danced_at
            FROM ${getDanceEventsTable()}
            WHERE user_id = @user_id
            ORDER BY danced_at DESC, id DESC`,
            {
                '@user_id': userId
            }
        );
        return rows;
    },

    async deleteDanceEvent(id) {
        await sqliteService.executeNonQuery(
            `DELETE FROM ${getDanceEventsTable()} WHERE id = @id`,
            {
                '@id': id
            }
        );
    },

    async setDanceNote(entry) {
        const note = String(entry.note || '');
        if (!note) {
            await sqliteService.executeNonQuery(
                `DELETE FROM ${getDanceNotesTable()} WHERE user_id = @user_id`,
                {
                    '@user_id': entry.userId
                }
            );
            return;
        }

        await sqliteService.executeNonQuery(
            `INSERT OR REPLACE INTO ${getDanceNotesTable()} (user_id, note, updated_at)
            VALUES (@user_id, @note, @updated_at)`,
            {
                '@user_id': entry.userId,
                '@note': note,
                '@updated_at': entry.updatedAt
            }
        );
    }
};

export { dances };
