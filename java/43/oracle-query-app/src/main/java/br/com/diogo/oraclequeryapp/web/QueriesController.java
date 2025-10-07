package br.com.diogo.oraclequeryapp.web;

import br.com.diogo.oraclequeryapp.model.SavedQuery;
import br.com.diogo.oraclequeryapp.repository.SavedQueryRepository;
import jakarta.validation.Valid;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;

@Controller
public class QueriesController {

    private final SavedQueryRepository repository;

    public QueriesController(SavedQueryRepository repository) {
        this.repository = repository;
    }

    @GetMapping("/queries")
    public String listQueries(Model model) {
        model.addAttribute("queries", repository.findAll());
        model.addAttribute("form", new SavedQuery());
        return "queries";
    }

    @PostMapping("/queries")
    public String createQuery(@Valid @ModelAttribute("form") SavedQuery form, BindingResult bindingResult, Model model) {
        if (bindingResult.hasErrors()) {
            model.addAttribute("queries", repository.findAll());
            return "queries";
        }
        repository.save(form);
        return "redirect:/queries";
    }
}


