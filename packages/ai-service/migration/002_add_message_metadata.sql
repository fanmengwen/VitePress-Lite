ALTER TABLE messages ADD COLUMN metadata TEXT;

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
