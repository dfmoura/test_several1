#!/bin/bash
set -e

# Start Oracle XE
/etc/init.d/oracle-xe-18c start

# Run setup scripts
su - oracle -c "sqlplus / as sysdba @/opt/oracle/scripts/setup/create_database.sql"

# Keep the container running
tail -f /dev/null
