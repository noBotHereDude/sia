CREATE PROCEDURE registerSIAevent
@Code VARCHAR(2),
@Title VARCHAR(255),
@Description VARCHAR(255),
@AddressType VARCHAR(255),
@Account VARCHAR(255),
@Type VARCHAR(255),
@Prefix VARCHAR(255),
@Receiver VARCHAR(255),
@Address VARCHAR(255),
@Timestamp INT
AS
BEGIN
  DECLARE @CODE_ID AS INT
  DECLARE @ACCOUNT_ID AS INT
  IF @Code IS NOT NULL
  BEGIN
    -- Create SIA code row first
    BEGIN tran
      IF EXISTS (select * from code where code = @Code)
      BEGIN
        UPDATE code
        SET title = @Title, description = @Description, address = @AddressType
        WHERE code = @Code
      END
      ELSE
      BEGIN
        INSERT INTO code (code, title, description, address)
        VALUES (@Code, @Title, @Description, @AddressType)
      END
    COMMIT tran
    -- Save CODE_ID of current CODE row
    SELECT @CODE_ID = code.ID
      FROM code
      WHERE code.CODE = @Code
  END

  -- Create Account row first
  BEGIN tran
    IF EXISTS (select * from account where account = @Account)
    BEGIN
      UPDATE account
        SET timestamp = @Timestamp
        WHERE account = @Account
    END
    ELSE
    BEGIN
      INSERT INTO account (account, timestamp)
        VALUES (@Account, @Timestamp)
    END
  COMMIT tran
  
  -- Save ACCOUNT_ID of current ACCOUNT row
  SELECT @ACCOUNT_ID = account.ID
    FROM account
    WHERE account.account = @Account

  -- Insert event row
  IF @Type = 'SIA-DCS'
  BEGIN
    INSERT INTO event (type, account_id, prefix, receiver, code_id, address, timestamp)
      VALUES (@Type, @ACCOUNT_ID, @Prefix, @Receiver, @CODE_ID, @Address, @Timestamp)
    BEGIN tran
    
      -- ACA SE CONTINUA CON LOS PROCEDIMIENTOS EXTRAS...
      
    COMMIT tran
  END
END
