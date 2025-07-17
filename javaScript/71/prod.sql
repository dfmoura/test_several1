CREATE OR REPLACE TRIGGER TGF_TGACLC_NOME_LOWER_SATIS
BEFORE INSERT OR UPDATE ON TGACLC
FOR EACH ROW
BEGIN
    -- Preserve original user input exactly as entered
    -- No modifications to NOMECLC - keep original case and formatting
    -- This prevents any system-level capitalization or modification
    NULL; -- Empty trigger body ensures no interference with user input
    :NEW.NOMECLC := :NEW.NOMECLC;
END;
/