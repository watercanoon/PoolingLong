# ETAPA 1: Compilación (Build)
# Usamos una imagen de Maven segura y mantenida
FROM maven:3.8.5-openjdk-17-slim AS build
WORKDIR /app

# Descargamos las dependencias primero para aprovechar la caché de Docker
COPY pom.xml .
RUN mvn dependency:go-offline

# Copiamos el código fuente y compilamos saltando los tests
COPY src ./src
RUN mvn clean package -DskipTests

# ETAPA 2: Ejecución (Runtime)
# Usamos Eclipse Temurin sobre Alpine Linux para un contenedor súper ligero (~50MB)
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Copiamos el JAR generado de tu proyecto actual
COPY --from=build /app/target/PoolingLong-0.0.1-SNAPSHOT.jar app.jar

# Exponemos el puerto configurado en application.properties para evitar conflictos
EXPOSE 8092

# Comando de arranque
ENTRYPOINT ["java", "-jar", "app.jar"]