-- To generate readable ids: https://sqids.org/ocaml

-- This is the main element, created first: the config room
CREATE TABLE IF NOT EXISTS config_rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    creator_id TEXT NOT NULL,
    -- For simplifying queries, we cache user names
    creator_name TEXT NOT NULL,
    creator_elo REAL NOT NULL,
    -- The chosen opponent is initially empty
    chosen_opponent_id TEXT,
    chosen_opponent_name TEXT,
    status TEXT NOT NULL,
    first_player TEXT NOT NULL,
    game_type TEXT NOT NULL,
    move_duration NUMBER NOT NULL,
    game_duration NUMBER NOT NULL,
    -- The config is a string representing the JSON config of the game
    config TEXT NOT NULL,
    -- This is the name of the game (used to be in "games", but it is better to have it in the config room too)
    game_name TEXT NOT NULL
    );

-- When players join the config room, they are added as candidates
CREATE TABLE IF NOT EXISTS candidates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id INTEGER NOT NULL,
    candidate_id TEXT NOT NULL,
    candidate_name TEXT NOT_NULL,
    FOREIGN KEY(game_id) references config_rooms(id),
    UNIQUE(game_id, candidate_id)
    );

-- Indices allow for faster queries on these specific fields. As most (all?) queries will be wade with a specific game_id, we want this index.
CREATE INDEX IF NOT EXISTS idx_game_id ON candidates (game_id);

-- When the config room is accepted, the game is created
CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY NOT NULL, -- same as id from config_rooms
    game_name TEXT NOT NULL,
    player_zero_id TEXT NOT NULL,
    player_zero_name TEXT NOT NULL,
    -- Player one used to be optional; not anymore!
    player_one_id TEXT NOT NULL,
    player_one_name TEXT NOT NULL,
    result TEXT NOT NULL,
    beginning INT NOT NULL,
    FOREIGN KEY(id) references config_rooms(id)
    );

CREATE INDEX IF NOT EXISTS idx_game_id ON games (id);

-- A game is made of events: starting the game, playing a move, asking for take back, finishing the game, etc.
CREATE TABLE IF NOT EXISTS game_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id INTEGER NOT NULL,
    -- New: events are now time-stamped (added by the backend)
    time INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    data TEXT NOT NULL, -- description of the event in JSON
    FOREIGN KEY(game_id) REFERENCES games(id)
    );

CREATE INDEX IF NOT EXISTS idx_game_id ON games (game_id);

CREATE TABLE IF NOT EXISTS elos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    game_name TEXT NOT NULL,
    current_elo REAL NOT NULL,
    number_of_games_played INT NOT NULL
);

-- TODO: to "insert or update" elo:
-- INSERT OR IGNORE INTO my_table (name, age) VALUES ('Karen', 34)
-- UPDATE my_table SET age = 34 WHERE name='Karen'

-- Elos are queried based on the user_id, game_name pair
CREATE INDEX IF NOT EXISTS idx_game_id ON elos (user_id, game_name);

-- These are chat messages
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id INTEGER NOT NULL,
    author_id TEXT NOT NULL,
    author_name TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    content TEXT NOT NULL
    -- FOREIGN KEY(game_id) REFERENCES games(id) actually not, because of lobby. Could use a dummy entry in the config_rooms for lobby
);

CREATE INDEX IF NOT EXISTS idx_game_id ON messages (game_id);
