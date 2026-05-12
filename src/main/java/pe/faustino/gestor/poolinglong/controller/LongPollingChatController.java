package pe.faustino.gestor.poolinglong.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.context.request.async.DeferredResult;
import pe.faustino.gestor.poolinglong.entity.ChatMessage;
import pe.faustino.gestor.poolinglong.repository.MessageRepository;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.List;
import java.util.Queue;
import java.util.concurrent.ConcurrentLinkedQueue;

@RestController
@RequestMapping("/api/lp-chat")
@CrossOrigin(origins = "*")
public class LongPollingChatController {

    @Autowired
    private MessageRepository repository;

    // Cola Thread-Safe para almacenar las peticiones HTTP que están en espera
    private final Queue<DeferredResult<List<ChatMessage>>> waitingClients = new ConcurrentLinkedQueue<>();

    @GetMapping("/history")
    public List<ChatMessage> getHistory() {
        return repository.findAll();
    }

    // Endpoint clave: El cliente pide mensajes y la petición se queda "colgada"
    @GetMapping("/poll")
    public DeferredResult<List<ChatMessage>> pollMessages() {
        // Timeout de 30 segundos. Si pasa el tiempo, devuelve una lista vacía.
        DeferredResult<List<ChatMessage>> result = new DeferredResult<>(30000L, Collections.emptyList());

        result.onTimeout(() -> waitingClients.remove(result));
        result.onCompletion(() -> waitingClients.remove(result));

        waitingClients.add(result);

        return result;
    }

    @PostMapping("/send")
    public ResponseEntity<ChatMessage> sendMessage(@RequestBody ChatMessage message) {
        // Formateo de hora exacta para Perú
        ZonedDateTime nowInPeru = ZonedDateTime.now(ZoneId.of("America/Lima"));
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy hh:mm:ss a");
        message.setTimestamp(nowInPeru.format(formatter));

        ChatMessage savedMessage = repository.save(message);

        // Descongelamos TODAS las peticiones en espera y les enviamos el nuevo mensaje
        for (DeferredResult<List<ChatMessage>> client : waitingClients) {
            client.setResult(Collections.singletonList(savedMessage));
        }
        waitingClients.clear();

        return ResponseEntity.ok(savedMessage);
    }
}