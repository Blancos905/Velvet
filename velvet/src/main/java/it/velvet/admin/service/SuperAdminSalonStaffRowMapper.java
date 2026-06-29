package it.velvet.admin.service;

import it.velvet.admin.dto.SuperAdminOverviewDtos.SuperAdminSalonStaffRow;
import it.velvet.catalog.domain.StaffOperator;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

final class SuperAdminSalonStaffRowMapper {

	private SuperAdminSalonStaffRowMapper() {
	}

	static SuperAdminSalonStaffRow fromOperator(StaffOperator o) {
		var profile = o.getConsumerProfile();
		String email = profile != null && profile.getEmail() != null && !profile.getEmail().isBlank()
				? profile.getEmail().trim()
				: null;
		return new SuperAdminSalonStaffRow(
				o.getId(),
				o.getDisplayName(),
				o.getRole(),
				o.getLocation().getName(),
				email,
				profile != null);
	}

	static Map<UUID, List<SuperAdminSalonStaffRow>> groupByStudioGroupId(List<StaffOperator> operators) {
		Map<UUID, List<SuperAdminSalonStaffRow>> out = new HashMap<>();
		for (StaffOperator o : operators) {
			UUID gid = o.getLocation().getStudioGroup().getId();
			out.computeIfAbsent(gid, k -> new ArrayList<>()).add(fromOperator(o));
		}
		return out;
	}
}
