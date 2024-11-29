<%@ page import="java.sql.*" %>
<%@ page contentType="text/html; charset=UTF-8" %>
<%@ page language="java" %>
<%@ page import="javax.naming.InitialContext" %>
<%@ page import="javax.naming.NamingException" %>
<%@ page import="javax.sql.DataSource" %>
<%@ page import="java.util.Date" %>
<!DOCTYPE html>
<html>
<head>
    <title>Insert Data</title>
</head>
<body>
<%
    Connection conn = null;
    PreparedStatement stmt = null;
    String message = "";

    try {
        // Create a DataSource object to get a database connection.
        InitialContext ic = new InitialContext();
        DataSource ds = (DataSource) ic.lookup("jdbc/your-datasource-name");

        conn = ds.getConnection();

        // Define your SQL INSERT statement with placeholders for the values.
        String sql = "INSERT INTO AD_DATATEST (ID, DT_ACTUAL, QTTYUSE, DESCRIP) VALUES (?, ?, ?, ?)";
        stmt = conn.prepareStatement(sql);

        // Set the values for the placeholders.
        stmt.setInt(1, 1);
        stmt.setDate(2, new java.sql.Date(new Date().getTime()));
        stmt.setInt(3, 100);
        stmt.setString(4, "TESTE");

        // Execute the INSERT statement.
        int rowsAffected = stmt.executeUpdate();

        if (rowsAffected > 0) {
            message = "Data inserted successfully.";
        } else {
            message = "Data insertion failed.";
        }
    } catch (Exception e) {
        message = "An error occurred: " + e.getMessage();
        e.printStackTrace();
    } finally {
        // Close resources.
        if (stmt != null) {
            stmt.close();
        }
        if (conn != null) {
            conn.close();
        }
    }
%>

<p><%= message %></p>

</body>
</html>

