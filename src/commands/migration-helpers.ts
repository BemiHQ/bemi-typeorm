export const bemiUpSQL = (): string => {
  return `
CREATE OR REPLACE FUNCTION _bemi_row_trigger_func()
  RETURNS TRIGGER
AS $$
DECLARE
  _bemi_metadata TEXT;
BEGIN
  SELECT split_part(split_part(current_query(), '/*Bemi ', 2), ' Bemi*/', 1) INTO _bemi_metadata;
  IF _bemi_metadata <> '' THEN
    PERFORM pg_logical_emit_message(true, '_bemi', _bemi_metadata);
  END IF;

  IF (TG_OP = 'DELETE') THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE _bemi_create_triggers()
AS $$
DECLARE
  current_tablename TEXT;
BEGIN
  FOR current_tablename IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format(
      'CREATE OR REPLACE TRIGGER _bemi_row_trigger_%I
      BEFORE INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW
      EXECUTE FUNCTION _bemi_row_trigger_func()',
      current_tablename, current_tablename
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION _bemi_create_table_trigger_func()
  RETURNS event_trigger
AS $$
BEGIN
  CALL _bemi_create_triggers();
END
$$ LANGUAGE plpgsql;

CREATE EVENT TRIGGER _bemi_create_table_trigger
ON ddl_command_end WHEN TAG IN ('CREATE TABLE')
EXECUTE FUNCTION _bemi_create_table_trigger_func();

CALL _bemi_create_triggers();
  `;
};

export const bemiDownSQL = (): string => {
  return `
DROP EVENT TRIGGER _bemi_create_table_trigger;
DROP FUNCTION _bemi_create_table_trigger_func;
DROP PROCEDURE _bemi_create_triggers;
DROP FUNCTION _bemi_row_trigger_func CASCADE;
  `;
};
