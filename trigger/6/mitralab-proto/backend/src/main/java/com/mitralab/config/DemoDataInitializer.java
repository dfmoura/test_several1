package com.mitralab.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Seeds a tiny demo table so mock AI and first-time users see charts without external DBs.
 */
@Component
public class DemoDataInitializer implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    public DemoDataInitializer(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) {
        jdbcTemplate.execute(
                """
                CREATE TABLE IF NOT EXISTS demo_sales (
                    month_ord INT PRIMARY KEY,
                    month_label VARCHAR(32) NOT NULL,
                    amount NUMERIC(14,2) NOT NULL
                )
                """);
        Integer n = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM demo_sales", Integer.class);
        if (n == null || n == 0) {
            jdbcTemplate.update(
                    "INSERT INTO demo_sales(month_ord, month_label, amount) VALUES (1,'Jan',12000),(2,'Fev',15000),(3,'Mar',9800),(4,'Abr',17200)");
        }
    }
}
