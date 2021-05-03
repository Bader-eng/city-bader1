DROP TABLE IF EXISTS location;

CREATE TABLE IF NOT EXISTS location (
    search_query VARCHAR(255),
    formatted_query VARCHAR(255),
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7)
);


