-- Check what channel enum values exist
SELECT unnest(enum_range(NULL::channel)) AS valid_channels;
