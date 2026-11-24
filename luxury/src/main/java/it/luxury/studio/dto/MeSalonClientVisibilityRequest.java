package it.luxury.studio.dto;

import jakarta.validation.constraints.NotNull;

/** Abilita o nasconde il salone in ricerca e sulla vetrina pubblica. */
public record MeSalonClientVisibilityRequest(@NotNull Boolean enabled) {
}
