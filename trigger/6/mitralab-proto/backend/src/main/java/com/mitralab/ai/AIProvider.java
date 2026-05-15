package com.mitralab.ai;

/**
 * Pluggable LLM backend. Implementations may call OpenAI, Ollama, Azure, etc.
 */
public interface AIProvider {

    String generate(String prompt);
}
