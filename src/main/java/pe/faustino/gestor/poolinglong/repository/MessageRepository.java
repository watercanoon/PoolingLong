package pe.faustino.gestor.poolinglong.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.faustino.gestor.poolinglong.entity.ChatMessage;

public interface MessageRepository extends JpaRepository<ChatMessage, Long> {
}