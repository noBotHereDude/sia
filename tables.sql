CREATE TABLE account (id INT NOT NULL identity, account VARCHAR(255) NOT NULL, timestamp INT NOT NULL, PRIMARY KEY([id]));
CREATE TABLE code (id INT NOT NULL identity, code VARCHAR(2) NOT NULL UNIQUE, title VARCHAR(255) NULL, description VARCHAR(255) NULL, address VARCHAR(255) NULL, PRIMARY KEY([id]));
CREATE TABLE event (id INT NOT NULL identity, type VARCHAR(255) NOT NULL, account_id INT NULL, prefix VARCHAR(255) NULL, receiver VARCHAR(255) NULL, code_id INT NULL, address VARCHAR(255) NULL, timestamp INT NOT NULL, PRIMARY KEY([id]));
ALTER TABLE [event] ADD CONSTRAINT [event_code_id_code_id] FOREIGN KEY ([code_id]) REFERENCES [code]([id]) ON DELETE CASCADE;
ALTER TABLE [event] ADD CONSTRAINT [event_account_id_account_id] FOREIGN KEY ([account_id]) REFERENCES [account]([id]) ON DELETE CASCADE;
