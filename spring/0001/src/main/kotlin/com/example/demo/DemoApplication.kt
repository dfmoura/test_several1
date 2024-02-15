package com.example.demo

import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RestController
import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@RestController
class HelloController {

    @GetMapping("/hello")
    fun hello(): String {
        return "Hello, world!"
    }
}
