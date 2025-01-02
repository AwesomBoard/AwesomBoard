-- To generate readable ids: https://sqids.org/ocaml
CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    creator_id TEXT NOT NULL,
    creator_name TEXT NOT NULL,
    creator_elo REAL NOT NULL,
    chosen_opponent_id TEXT,
    chosen_opponent_name TEXT,
    chosen_opponent_elo TEXT,
    status TEXT NOT NULL,
    first_player TEXT NOT NULL,
    game_type TEXT NOT NULL,
    duration NUMBER NOT NULL,
    CONFIG TEXT NOT NULL,
    )

CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id INTEGER NOT NULL,
    author_id TEXT NOT NULL,
    author_name TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    content TEXT NOT NULL,
    FOREIGN KEY(game_id) REFERENCES games(id)
);

CREATE INDEX IF NOT EXISTS idx_game_id ON messages (game_id);

CREATE TABLE IF NOT EXISTS candidates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id INTEGER NOT NULL,
    candidate_id TEXT NOT NULL,
    candidate_name TEXT NOT_NULL,
    FOREIGN KEY(game_id) references games(id)
    )


CREATE INDEX IF NOT EXISTS idx_game_id ON candidates (game_id);

CREATE TABLE IF NOT EXISTS game_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id INTEGER NOT NULL,
    player BOOLEAN NOT NULL,
    kind TEXT NOT NULL, // AcceptDraw, RejectDraw, Move, etc.
    data TEXT NOT NULL, // move description
    FOREIGN KEY(game_id) REFERENCES games(id)
    )

CREATE INDEX IF NOT EXISTS idx_game_id ON games (game_id);
