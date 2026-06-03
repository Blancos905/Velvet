package it.velvet;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class VelvetApplication {

	public static void main(String[] args) {
		SpringApplication.run(VelvetApplication.class, args);
	}

}
