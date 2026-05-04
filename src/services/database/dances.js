import { dbVars } from '../database';

import sqliteService from '../sqlite.js';

function getDanceEventsTable() {
    return `${dbVars.userPrefix}_dance_events`;
}

function getDanceNotesTable() {
    return `${dbVars.userPrefix}_dance_notes`;
}

function getDanceClubsTable() {
    return `${dbVars.userPrefix}_dance_clubs`;
}

function normalizeDanceAggregate(row) {
    return {
        userId: row[0] || '',
        displayName: row[1] || '',
        count: Number(row[2] || 0),
        lastDancedAt: row[3] || '',
        note: row[4] || '',
        noteUpdatedAt: row[5] || '',
        lastDanceEventId: row[6] || null,
        lastClubId: row[7] || null,
        lastClubName: row[8] || ''
    };
}

function normalizeDanceClub(row) {
    return {
        id: Number(row[0] || 0),
        name: row[1] || '',
        createdAt: row[2] || '',
        updatedAt: row[3] || ''
    };
}

const dances = {
    async initDanceTables() {
        const eventsTable = getDanceEventsTable();
        const notesTable = getDanceNotesTable();
        const clubsTable = getDanceClubsTable();

        await sqliteService.executeNonQuery(
            `CREATE TABLE IF NOT EXISTS ${eventsTable} (
                id INTEGER PRIMARY KEY,
                user_id TEXT NOT NULL,
                display_name TEXT,
                danced_at TEXT NOT NULL,
                club_id INTEGER DEFAULT NULL
            )`
        );
        try {
            await sqliteService.executeNonQuery(
                `ALTER TABLE ${eventsTable} ADD club_id INTEGER DEFAULT NULL`
            );
        } catch (e) {
            const message = e.toString();
            if (message.indexOf('duplicate column name') === -1) {
                console.error(message);
            }
        }
        await sqliteService.executeNonQuery(
            `CREATE INDEX IF NOT EXISTS ${eventsTable}_user_danced_idx ON ${eventsTable} (user_id, danced_at)`
        );
        await sqliteService.executeNonQuery(
            `CREATE TABLE IF NOT EXISTS ${clubsTable} (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )`
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
            `INSERT INTO ${getDanceEventsTable()} (user_id, display_name, danced_at, club_id)
            VALUES (@user_id, @display_name, @danced_at, @club_id)`,
            {
                '@user_id': entry.userId,
                '@display_name': entry.displayName || '',
                '@danced_at': entry.dancedAt,
                '@club_id': entry.clubId || null
            }
        );
    },

    async getDanceAggregates() {
        const rows = [];
        const eventsTable = getDanceEventsTable();
        const notesTable = getDanceNotesTable();
        const clubsTable = getDanceClubsTable();

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
                COALESCE(n.updated_at, '') AS note_updated_at,
                (
                    SELECT e3.id
                    FROM ${eventsTable} e3
                    WHERE e3.user_id = e.user_id
                    ORDER BY e3.danced_at DESC, e3.id DESC
                    LIMIT 1
                ) AS last_dance_event_id,
                lc.id AS last_club_id,
                COALESCE(lc.name, '') AS last_club_name
            FROM ${eventsTable} e
            LEFT JOIN ${notesTable} n ON n.user_id = e.user_id
            LEFT JOIN ${clubsTable} lc ON lc.id = (
                SELECT e4.club_id
                FROM ${eventsTable} e4
                WHERE e4.user_id = e.user_id
                ORDER BY e4.danced_at DESC, e4.id DESC
                LIMIT 1
            )
            GROUP BY e.user_id
            ORDER BY MAX(e.danced_at) DESC, display_name ASC`
        );

        return rows;
    },

    async getDanceAggregate(userId) {
        let aggregate = null;
        const eventsTable = getDanceEventsTable();
        const notesTable = getDanceNotesTable();
        const clubsTable = getDanceClubsTable();

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
                COALESCE(n.updated_at, '') AS note_updated_at,
                (
                    SELECT e3.id
                    FROM ${eventsTable} e3
                    WHERE e3.user_id = e.user_id
                    ORDER BY e3.danced_at DESC, e3.id DESC
                    LIMIT 1
                ) AS last_dance_event_id,
                lc.id AS last_club_id,
                COALESCE(lc.name, '') AS last_club_name
            FROM ${eventsTable} e
            LEFT JOIN ${notesTable} n ON n.user_id = e.user_id
            LEFT JOIN ${clubsTable} lc ON lc.id = (
                SELECT e4.club_id
                FROM ${eventsTable} e4
                WHERE e4.user_id = e.user_id
                ORDER BY e4.danced_at DESC, e4.id DESC
                LIMIT 1
            )
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
                    noteUpdatedAt: dbRow[1] || '',
                    lastDanceEventId: null,
                    lastClubId: null,
                    lastClubName: ''
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
                noteUpdatedAt: '',
                lastDanceEventId: null,
                lastClubId: null,
                lastClubName: ''
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
                    dancedAt: dbRow[3] || '',
                    clubId: dbRow[4] || null,
                    clubName: dbRow[5] || ''
                });
            },
            `SELECT e.id, e.user_id, e.display_name, e.danced_at, e.club_id, COALESCE(c.name, '')
            FROM ${getDanceEventsTable()} e
            LEFT JOIN ${getDanceClubsTable()} c ON c.id = e.club_id
            WHERE e.user_id = @user_id
            ORDER BY e.danced_at DESC, e.id DESC`,
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

    async setDanceEventClub(id, clubId) {
        await sqliteService.executeNonQuery(
            `UPDATE ${getDanceEventsTable()} SET club_id = @club_id WHERE id = @id`,
            {
                '@id': id,
                '@club_id': clubId || null
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
    },

    async getDanceClubs() {
        const rows = [];
        await sqliteService.execute((dbRow) => {
            rows.push(normalizeDanceClub(dbRow));
        }, `SELECT id, name, created_at, updated_at FROM ${getDanceClubsTable()} ORDER BY name COLLATE NOCASE ASC`);
        return rows;
    },

    async addDanceClub(entry) {
        const name = String(entry.name || '').trim();
        if (!name) {
            return null;
        }

        await sqliteService.executeNonQuery(
            `INSERT OR IGNORE INTO ${getDanceClubsTable()} (name, created_at, updated_at)
            VALUES (@name, @created_at, @updated_at)`,
            {
                '@name': name,
                '@created_at': entry.createdAt,
                '@updated_at': entry.updatedAt
            }
        );

        let club = null;
        await sqliteService.execute(
            (dbRow) => {
                club = normalizeDanceClub(dbRow);
            },
            `SELECT id, name, created_at, updated_at
            FROM ${getDanceClubsTable()}
            WHERE name = @name`,
            {
                '@name': name
            }
        );
        return club;
    },

    async deleteDanceClub(id) {
        await sqliteService.executeNonQuery(
            `UPDATE ${getDanceEventsTable()} SET club_id = NULL WHERE club_id = @id`,
            {
                '@id': id
            }
        );
        await sqliteService.executeNonQuery(
            `DELETE FROM ${getDanceClubsTable()} WHERE id = @id`,
            {
                '@id': id
            }
        );
    }
};

export { dances };
