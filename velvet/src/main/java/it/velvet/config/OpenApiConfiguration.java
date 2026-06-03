package it.velvet.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfiguration {

	@Bean
	OpenAPI velvetOpenApi() {
		return new OpenAPI()
				.info(new Info()
						.title("Velvet API")
						.description("API REST — prefisso /api/v1. Endpoint /me richiedono JWT Bearer emesso da Velvet (POST /api/v1/auth/login) con ROLE_CLIENT o ROLE_OWNER.")
						.version("1"))
				.components(new Components().addSecuritySchemes("bearer-jwt",
						new SecurityScheme()
								.type(SecurityScheme.Type.HTTP)
								.scheme("bearer")
								.bearerFormat("JWT")));
	}
}
