const db = require("../services/db");

// Book Management
async function addBook({ user_id, title, author, cover_image, status = 'currently_reading', start_date, end_date }) {
    const tasksDB = await db.getTasksDB();

    try {
        const { rows } = await tasksDB.query(
            `INSERT INTO btw.books (user_id, title, author, cover_image, status, start_date, end_date)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [user_id, title || "", author || "", cover_image || "", status || "currently_reading", start_date || null, end_date || null]
        );

        // If this is the first book, create a default world
        // TODO: (SG)
        // const worldCount = await tasksDB.query(
        //     `SELECT COUNT(*) FROM btw.reading_worlds WHERE user_id = $1`,
        //     [user_id]
        // );

        // if (worldCount.rows[0].count === '0') {
        //     await createDefaultWorld({ user_id, book_title: title });
        // }

        return rows[0];
    } finally {
    }
}

async function updateBook({ user_id, book_id, title, author, cover_image, status, start_date, end_date }) {
    const tasksDB = await db.getTasksDB();

    // get the current book details and merge them with the new data
    const { rows: [currentBook] } = await tasksDB.query(
        `SELECT * FROM btw.books WHERE id = $1 AND user_id = $2`,
        [book_id, user_id]
    );

    const updatedBook = {
        ...currentBook,
        title: title || currentBook.title,
        author: author || currentBook.author,
        cover_image: cover_image || currentBook.cover_image,
        status: status || currentBook.status,
        start_date: start_date || currentBook.start_date,
        end_date: end_date || currentBook.end_date
    };

    try {
        const { rows } = await tasksDB.query(
            `UPDATE btw.books 
             SET title = $1, 
                 author = $2, 
                 cover_image = $3, 
                 status = $4, 
                 start_date = $5, 
                 end_date = $6
             WHERE id = $7 AND user_id = $8
             RETURNING *`,
            [
                updatedBook.title,
                updatedBook.author,
                updatedBook.cover_image,
                updatedBook.status,
                updatedBook.start_date,
                updatedBook.end_date,
                book_id,
                user_id
            ]
        );

        return rows[0];
    } finally {
    }
}

async function getBooks({ user_id }) {
    const tasksDB = await db.getTasksDB();

    try {
        const { rows } = await tasksDB.query(
            `SELECT * FROM btw.books 
             WHERE user_id = $1 
             ORDER BY 
                 CASE status 
                     WHEN 'currently_reading' THEN 1
                     WHEN 'will_read' THEN 2
                     WHEN 'read' THEN 3
                 END,
                 created_at DESC`,
            [user_id]
        );
        return rows;
    } finally {
    }
}

// Reading Sessions
async function addReadingSession({ user_id, book_id, minutes_read }) {
    const tasksDB = await db.getTasksDB();

    try {
        // Add reading session
        await tasksDB.query(
            `INSERT INTO btw.reading_sessions (user_id, book_id, date, minutes_read)
             VALUES ($1, $2, CURRENT_DATE, $3)`,
            [user_id, book_id, minutes_read]
        );

        // Update book reading time
        await tasksDB.query(
            `UPDATE btw.books 
             SET reading_time_minutes = reading_time_minutes + $1
             WHERE id = $2 AND user_id = $3`,
            [minutes_read, book_id, user_id]
        );

        // Update reading streak
        await updateReadingStreak({ user_id });
    } finally {
    }
}

// World Management
async function createDefaultWorld({ user_id, book_title }) {
    const tasksDB = await db.getTasksDB();

    try {
        // Create world
        const { rows: [world] } = await tasksDB.query(
            `INSERT INTO btw.reading_worlds (user_id, name, description)
             VALUES ($1, $2, 'Your reading journey begins here')
             RETURNING *`,
            [user_id, `${book_title}'s World`]
        );

        // Create default character
        await tasksDB.query(
            `INSERT INTO btw.world_characters (world_id, user_id, name, level, description)
             VALUES ($1, $2, 'The Reader', 1, 'Begin your reading adventure')`,
            [world.id, user_id]
        );

        return world;
    } finally {
    }
}

async function updateReadingStreak({ user_id }) {
    const tasksDB = await db.getTasksDB();

    try {
        // Get last reading date
        const { rows: [streak] } = await tasksDB.query(
            `SELECT * FROM btw.reading_streaks WHERE user_id = $1`,
            [user_id]
        );

        const today = new Date();
        const lastReadingDate = streak ? new Date(streak.last_reading_date) : null;

        if (!lastReadingDate || (today - lastReadingDate) / (1000 * 60 * 60 * 24) > 1) {
            // Reset streak if more than a day has passed
            await tasksDB.query(
                `UPDATE btw.reading_streaks 
                 SET current_streak_days = 1,
                     current_streak_weeks = CASE 
                         WHEN current_streak_days % 7 = 0 THEN current_streak_weeks + 1
                         ELSE current_streak_weeks
                     END,
                     last_reading_date = CURRENT_DATE
                 WHERE user_id = $1`,
                [user_id]
            );
        } else {
            // Increment streak
            await tasksDB.query(
                `UPDATE btw.reading_streaks 
                 SET current_streak_days = current_streak_days + 1,
                     current_streak_weeks = CASE 
                         WHEN (current_streak_days + 1) % 7 = 0 THEN current_streak_weeks + 1
                         ELSE current_streak_weeks
                     END,
                     last_reading_date = CURRENT_DATE
                 WHERE user_id = $1`,
                [user_id]
            );
        }
    } finally {
    }
}

async function getReadingStats({ user_id }) {
    const tasksDB = await db.getTasksDB();

    try {
        const { rows: [streak] } = await tasksDB.query(
            `SELECT * FROM btw.reading_streaks WHERE user_id = $1`,
            [user_id]
        );

        const { rows: books } = await tasksDB.query(
            `SELECT COUNT(*) as total_books,
                    SUM(CASE WHEN status = 'read' THEN 1 ELSE 0 END) as books_read,
                    SUM(reading_time_minutes) as total_reading_time
             FROM btw.books
             WHERE user_id = $1`,
            [user_id]
        );

        return {
            streak: streak || { current_streak_days: 0, current_streak_weeks: 0, books_read_this_year: 0 },
            stats: books[0]
        };
    } finally {
    }
}

module.exports = {
    addBook,
    updateBook,
    getBooks,
    addReadingSession,
    createDefaultWorld,
    getReadingStats
}; 