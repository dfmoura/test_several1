# Use Oracle Linux as base image
FROM oraclelinux:7-slim

# Install required packages and Oracle XE
RUN yum -y install oracle-database-preinstall-18c && \
    yum -y install oracle-xe-18c && \
    yum clean all

# Set environment variables required for setup
ENV ORACLE_HOME=/opt/oracle/product/18c/dbhomeXE
ENV PATH=$ORACLE_HOME/bin:$PATH
ENV ORACLE_SID=XE

# Copy setup scripts
COPY setup/ /opt/oracle/scripts/setup/

# Expose the Oracle port
EXPOSE 1521 5500

# Define default command to run Oracle Database.
CMD ["/opt/oracle/scripts/setup/runOracle.sh"]
