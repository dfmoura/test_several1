package com.mitralab.ai;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record DashboardPlan(
        String intent,
        String sql,
        String chartType,
        String xKey,
        String yKey,
        String explanation) {}
