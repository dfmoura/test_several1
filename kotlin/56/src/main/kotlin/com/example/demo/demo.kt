package com.example.demo

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController


@RestController
class SumController {

    @GetMapping("/sum")
    fun sum(
        @RequestParam("a") a: Int,
        @RequestParam("b") b: Int
    ): Int {
        return a + b
    }
}