/*
  # EMVPIX Integration Database Schema

  1. New Tables
    - `sync_logs` - Main logging table for synchronization operations
      - `id` (uuid, primary key)
      - `nunota` (varchar, reference number)
      - `status` (varchar, operation status)
      - `pedido_mercos_id` (varchar, Mercos order ID)
      - `pix_data` (text, PIX information)
      - `error_message` (text, error details)
      - `execution_time_ms` (integer, performance tracking)
      - `created_at` (timestamp, audit trail)
    
    - `app_config` - Configuration storage
      - `id` (uuid, primary key)
      - `config_key` (varchar, unique key)
      - `config_value` (text, configuration value)
      - `updated_at` (timestamp, modification tracking)

  2. Security
    - Enable RLS on both tables
    - Add service access policies for all operations
    
  3. Performance
    - Multiple indexes for optimal query performance
    - Composite indexes for common query patterns
*/

-- Main sync logs table
CREATE TABLE IF NOT EXISTS sync_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nunota varchar(50) NOT NULL,
    status varchar(20) NOT NULL CHECK (status IN ('success', 'error', 'not_found')),
    pedido_mercos_id varchar(100),
    pix_data text,
    error_message text,
    execution_time_ms integer,
    created_at timestamptz DEFAULT now()
);

-- Configuration storage table
CREATE TABLE IF NOT EXISTS app_config (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key varchar(100) UNIQUE NOT NULL,
    config_value text NOT NULL,
    updated_at timestamptz DEFAULT now()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_sync_logs_nunota_created_at ON sync_logs(nunota, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_sync_logs_created_at ON sync_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_config_key ON app_config(config_key);

-- Enable Row Level Security
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- Service access policies
CREATE POLICY IF NOT EXISTS "Allow service access to sync_logs"
  ON sync_logs
  FOR ALL
  USING (true);

CREATE POLICY IF NOT EXISTS "Allow service access to app_config"
  ON app_config
  FOR ALL
  USING (true);