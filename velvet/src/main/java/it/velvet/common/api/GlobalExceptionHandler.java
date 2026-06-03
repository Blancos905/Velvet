package it.velvet.common.api;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.context.MessageSourceResolvable;
import org.springframework.transaction.CannotCreateTransactionException;
import org.springframework.validation.FieldError;
import org.springframework.validation.method.ParameterValidationResult;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;
import org.springframework.security.access.AccessDeniedException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

	private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

	@ExceptionHandler(BusinessException.class)
	public ResponseEntity<ApiError> handleBusiness(BusinessException ex) {
		ApiError body = new ApiError(ex.getCode(), ex.getMessage(), ex.getDetails());
		return ResponseEntity.status(ex.getStatus()).body(body);
	}

	/** {@code @PreAuthorize} fallisce nel layer MVC (non nel filter chain): senza questo handler diventa 500. */
	@ExceptionHandler(AccessDeniedException.class)
	public ResponseEntity<ApiError> handleAccessDenied(AccessDeniedException ex) {
		return ResponseEntity.status(HttpStatus.FORBIDDEN)
				.body(new ApiError("FORBIDDEN", "Permessi insufficienti per questa operazione.", null));
	}

	@ExceptionHandler({ CannotCreateTransactionException.class, DataAccessException.class })
	public ResponseEntity<ApiError> handleDataAccess(RuntimeException ex) {
		log.warn("Database non disponibile o connessione persa", ex);
		return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
				.body(new ApiError(
						"DATABASE_UNAVAILABLE",
						"Database temporaneamente non raggiungibile. Verifica il tunnel SSH verso MariaDB (porta 3307) e riprova.",
						null));
	}

	@ExceptionHandler(Exception.class)
	public ResponseEntity<ApiError> handleUnexpected(Exception ex) {
		log.error("Errore interno non gestito", ex);
		return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
				.body(new ApiError("INTERNAL_ERROR", "Errore interno del server.", null));
	}

	@Override
	protected ResponseEntity<Object> handleMethodArgumentNotValid(
			MethodArgumentNotValidException ex,
			HttpHeaders headers,
			HttpStatusCode status,
			WebRequest request) {
		Map<String, Object> fieldErrors = new HashMap<>();
		for (FieldError fe : ex.getBindingResult().getFieldErrors()) {
			fieldErrors.put(fe.getField(), fe.getDefaultMessage());
		}
		ApiError body = new ApiError("VALIDATION_ERROR", "Parametri non validi.", Map.of("fields", fieldErrors));
		return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
	}

	/**
	 * Spring 6.1+ può sollevare {@link HandlerMethodValidationException} per {@code @Valid} sui parametri;
	 * senza override il client può vedere 500 invece di 400 con corpo coerente a {@link ApiError}.
	 */
	@Override
	protected ResponseEntity<Object> handleHandlerMethodValidationException(
			HandlerMethodValidationException ex,
			HttpHeaders headers,
			HttpStatusCode status,
			WebRequest request) {
		if (ex.isForReturnValue()) {
			return super.handleHandlerMethodValidationException(ex, headers, status, request);
		}
		try {
			Map<String, Object> fieldErrors = new HashMap<>();
			List<ParameterValidationResult> paramResults = ex.getParameterValidationResults();
			if (paramResults != null) {
				for (ParameterValidationResult result : paramResults) {
					if (result == null || result.getMethodParameter() == null) {
						continue;
					}
					String param = result.getMethodParameter().getParameterName();
					String fallbackKey = param != null ? param : "parameter";
					List<MessageSourceResolvable> errors = result.getResolvableErrors();
					if (errors == null) {
						continue;
					}
					for (MessageSourceResolvable resolvable : errors) {
						if (resolvable == null) {
							continue;
						}
						if (resolvable instanceof FieldError fe) {
							fieldErrors.put(fe.getField(), resolvableMessage(fe));
						}
						else {
							fieldErrors.put(fallbackKey, resolvableMessage(resolvable));
						}
					}
				}
			}
			List<MessageSourceResolvable> cross = ex.getCrossParameterValidationResults();
			if (cross != null) {
				int i = 0;
				for (MessageSourceResolvable resolvable : cross) {
					if (resolvable != null) {
						fieldErrors.put("crossParameter_" + i++, resolvableMessage(resolvable));
					}
				}
			}
			if (fieldErrors.isEmpty()) {
				return ResponseEntity.status(HttpStatus.BAD_REQUEST)
						.body(new ApiError("VALIDATION_ERROR", "Parametri non validi.", null));
			}
			ApiError body = new ApiError("VALIDATION_ERROR", "Parametri non validi.", Map.of("fields", fieldErrors));
			return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
		}
		catch (RuntimeException ignored) {
			return ResponseEntity.status(HttpStatus.BAD_REQUEST)
					.body(new ApiError("VALIDATION_ERROR", "Parametri non validi.", null));
		}
	}

	private static String resolvableMessage(MessageSourceResolvable resolvable) {
		try {
			return Objects.toString(resolvable.getDefaultMessage(), "non valido");
		}
		catch (RuntimeException e) {
			return "non valido";
		}
	}
}
