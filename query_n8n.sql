SELECT substring(data::text from position('models/' in data::text) - 50 for 250) FROM execution_data WHERE "executionId" = 72;
