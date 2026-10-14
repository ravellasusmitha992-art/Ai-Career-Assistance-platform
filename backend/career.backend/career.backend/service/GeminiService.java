package com.career.backend.service;

import com.google.genai.Client;
import com.google.genai.types.GenerateContentResponse;
import org.springframework.stereotype.Service;

@Service
public class GeminiService {

    public String askGemini(String question) {

        String apiKey = System.getenv("GEMINI_API_KEY");

        if (apiKey == null || apiKey.isBlank()) {
            return "Gemini API key is missing.";
        }

        try (Client client = Client.builder()
                .apiKey(apiKey)
                .build()) {

            GenerateContentResponse response =
                    client.models.generateContent(
                            "gemini-2.5-flash",
                            question,
                            null
                    );

            return response.text();

        } catch (Exception e) {
            return "Gemini API error: " + e.getMessage();
        }
    }
}
