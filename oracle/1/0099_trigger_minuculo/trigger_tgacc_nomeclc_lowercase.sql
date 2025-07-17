-- Trigger to convert NOMECLC field to proper case (first letter capitalized, rest lowercase)
-- on the TGACC table

CREATE OR REPLACE TRIGGER trg_tgacc_nomeclc_propercase
BEFORE INSERT OR UPDATE ON TGACC
FOR EACH ROW
BEGIN
    -- Convert NOMECLC field to proper case: first letter capitalized, rest lowercase
    :NEW.NOMECLC := INITCAP(LOWER(:NEW.NOMECLC));
END;
/

-- Example usage and testing:
/*
-- Test the trigger with an insert
INSERT INTO TGACC (NOMECLC, other_columns...) 
VALUES ('UPPERCASE TEXT', other_values...);
-- Result: 'Uppercase text'

INSERT INTO TGACC (NOMECLC, other_columns...) 
VALUES ('mixed CASE text', other_values...);
-- Result: 'Mixed case text'

INSERT INTO TGACC (NOMECLC, other_columns...) 
VALUES ('lowercase text', other_values...);
-- Result: 'Lowercase text'

-- Test the trigger with an update
UPDATE TGACC 
SET NOMECLC = 'ANOTHER UPPERCASE TEXT' 
WHERE some_condition;
-- Result: 'Another uppercase text'

-- Verify the data is stored in proper case
SELECT NOMECLC FROM TGACC WHERE some_condition;
*/

-- To drop the trigger if needed:
-- DROP TRIGGER trg_tgacc_nomeclc_propercase; 