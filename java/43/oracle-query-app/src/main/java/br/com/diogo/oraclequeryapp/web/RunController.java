package br.com.diogo.oraclequeryapp.web;

import br.com.diogo.oraclequeryapp.model.DbConnection;
import br.com.diogo.oraclequeryapp.model.SavedQuery;
import br.com.diogo.oraclequeryapp.repository.DbConnectionRepository;
import br.com.diogo.oraclequeryapp.repository.SavedQueryRepository;
import br.com.diogo.oraclequeryapp.service.OracleQueryService;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Controller
public class RunController {

    private final DbConnectionRepository connectionRepository;
    private final SavedQueryRepository queryRepository;
    private final OracleQueryService queryService;

    public RunController(DbConnectionRepository connectionRepository, 
                        SavedQueryRepository queryRepository,
                        OracleQueryService queryService) {
        this.connectionRepository = connectionRepository;
        this.queryRepository = queryRepository;
        this.queryService = queryService;
    }

    @GetMapping("/run")
    public String runPage(Model model) {
        model.addAttribute("connections", connectionRepository.findAll());
        model.addAttribute("queries", queryRepository.findAll());
        return "run";
    }

    @PostMapping("/run")
    public String executeQuery(@RequestParam Long connectionId, 
                              @RequestParam(required = false) Long queryId,
                              @RequestParam(required = false) String customSql,
                              RedirectAttributes redirectAttributes) {
        
        Optional<DbConnection> connectionOpt = connectionRepository.findById(connectionId);
        if (connectionOpt.isEmpty()) {
            redirectAttributes.addFlashAttribute("error", "Conexão não encontrada");
            return "redirect:/run";
        }

        String sql;
        if (queryId != null) {
            Optional<SavedQuery> queryOpt = queryRepository.findById(queryId);
            if (queryOpt.isEmpty()) {
                redirectAttributes.addFlashAttribute("error", "Query não encontrada");
                return "redirect:/run";
            }
            sql = queryOpt.get().getSql();
        } else if (customSql != null && !customSql.trim().isEmpty()) {
            sql = customSql.trim();
        } else {
            redirectAttributes.addFlashAttribute("error", "Selecione uma query ou digite SQL customizado");
            return "redirect:/run";
        }

        try {
            OracleQueryService.QueryResult result = queryService.executeQuery(connectionOpt.get(), sql);
            redirectAttributes.addFlashAttribute("result", result);
            redirectAttributes.addFlashAttribute("sql", sql);
            redirectAttributes.addFlashAttribute("connectionName", connectionOpt.get().getName());
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("error", "Erro ao executar query: " + e.getMessage());
        }

        return "redirect:/run";
    }

    // Comentário (PT-BR): Endpoint para executar query e retornar JSON
    @PostMapping("/api/execute-query")
    @ResponseBody
    public ResponseEntity<?> executeQueryApi(@RequestParam Long connectionId, 
                                           @RequestParam(required = false) Long queryId,
                                           @RequestParam(required = false) String customSql) {
        
        Optional<DbConnection> connectionOpt = connectionRepository.findById(connectionId);
        if (connectionOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Conexão não encontrada"));
        }

        String sql;
        if (queryId != null) {
            Optional<SavedQuery> queryOpt = queryRepository.findById(queryId);
            if (queryOpt.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Query não encontrada"));
            }
            sql = queryOpt.get().getSql();
        } else if (customSql != null && !customSql.trim().isEmpty()) {
            sql = customSql.trim();
        } else {
            return ResponseEntity.badRequest().body(Map.of("error", "Selecione uma query ou digite SQL customizado"));
        }

        try {
            OracleQueryService.QueryResult result = queryService.executeQuery(connectionOpt.get(), sql);
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("columns", result.getColumns());
            response.put("rows", result.getRows());
            response.put("sql", sql);
            response.put("connectionName", connectionOpt.get().getName());
            response.put("rowCount", result.getRows().size());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Erro ao executar query: " + e.getMessage()));
        }
    }
}


