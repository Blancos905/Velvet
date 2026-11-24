# =============================================================================
# Backend Luxury (Spring Boot, Java 21) — build multi-stage per Docker Compose.
#   Stage 1: build del jar con Maven.
#   Stage 2: runtime JRE minimale, utente non-root, healthcheck via /actuator/health.
# =============================================================================

# ---- Stage 1: build ----
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build
COPY pom.xml .
COPY src ./src
# Cache Maven sul daemon: un retry non riscarica tutto il repository.
RUN --mount=type=cache,target=/root/.m2 \
    mvn -B package -DskipTests -Dmaven.wagon.http.retryHandler.count=5

# ---- Stage 2: runtime ----
FROM eclipse-temurin:21-jre
# wget serve all'healthcheck definito nel docker-compose.
RUN apt-get update \
    && apt-get install -y --no-install-recommends wget \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /build/target/luxury-*.jar /app/app.jar
RUN useradd -r -u 10001 spring && chown -R spring:spring /app
USER spring
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
