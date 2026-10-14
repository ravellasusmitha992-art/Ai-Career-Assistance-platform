package com.career.backend.controller;

import com.career.backend.service.GeminiService;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/ai")
@CrossOrigin(origins = "*")
public class GeminiController {

    private final GeminiService geminiService;

    public GeminiController(GeminiService geminiService) {
        this.geminiService = geminiService;
    }

    @PostMapping("/ask")
    public Map<String, String> ask(
            @RequestBody Map<String, String> request) {

        String question = request.get("question");

        if (question == null || question.isBlank()) {
            return Map.of("answer", "Please provide a question.");
        }

        return Map.of(
            "answer", geminiService.askGemini(question)
        );
    }
}