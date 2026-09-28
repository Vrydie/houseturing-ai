SELECT regexp_matches(data, '"message":"([^"]+)"') FROM execution_data WHERE "executionId" = 30;
