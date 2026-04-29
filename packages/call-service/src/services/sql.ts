export const INSERT_CALL_SQL = `
  INSERT INTO calls (id, type, status, queue_id, start_time)
  VALUES ($1, $2, $3, $4, NOW())
  ON CONFLICT (id) DO NOTHING
`;

export const SELECT_CALL_BY_ID_SQL = `SELECT * FROM calls WHERE id = $1`;

export const UPDATE_CALL_STATUS_SQL = `
  UPDATE calls
  SET status = $2::varchar,
      end_time = CASE WHEN $2::text = 'ended' THEN NOW() ELSE end_time END
  WHERE id = $1
`;

export const SELECT_CALLS_BASE_SQL = `
  SELECT id, type, status, queue_id, start_time, end_time
  FROM calls
`;

export const SELECT_CALL_EVENTS_BY_CALL_ID_SQL = `
  SELECT id, call_id, type, timestamp, metadata
  FROM call_events
  WHERE call_id = $1
  ORDER BY timestamp ASC
`;

export const INSERT_CALL_EVENT_SQL = `
  INSERT INTO call_events (id, call_id, type, timestamp, metadata)
  VALUES ($1, $2, $3, NOW(), $4::jsonb)
  RETURNING id, call_id, type, timestamp, metadata
`;
