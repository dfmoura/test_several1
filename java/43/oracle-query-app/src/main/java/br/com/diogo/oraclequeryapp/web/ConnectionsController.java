package br.com.diogo.oraclequeryapp.web;

import br.com.diogo.oraclequeryapp.model.DbConnection;
import br.com.diogo.oraclequeryapp.repository.DbConnectionRepository;
import jakarta.validation.Valid;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;

@Controller
public class ConnectionsController {

    private final DbConnectionRepository repository;

    public ConnectionsController(DbConnectionRepository repository) {
        this.repository = repository;
    }

    @GetMapping("/connections")
    public String listConnections(Model model) {
        model.addAttribute("connections", repository.findAll());
        model.addAttribute("form", new DbConnection());
        return "connections";
    }

    @PostMapping("/connections")
    public String createConnection(@Valid @ModelAttribute("form") DbConnection form, BindingResult bindingResult, Model model) {
        if (bindingResult.hasErrors()) {
            model.addAttribute("connections", repository.findAll());
            return "connections";
        }
        repository.save(form);
        return "redirect:/connections";
    }
}


