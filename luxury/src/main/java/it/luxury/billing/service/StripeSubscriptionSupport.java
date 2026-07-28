package it.luxury.billing.service;

import com.stripe.model.Subscription;
import com.stripe.model.SubscriptionItem;
import org.springframework.lang.Nullable;

/** Helper per campi subscription spostati su {@link SubscriptionItem} in stripe-java 33+. */
final class StripeSubscriptionSupport {

	private StripeSubscriptionSupport() {
	}

	@Nullable
	static Long currentPeriodEnd(@Nullable Subscription subscription) {
		if (subscription == null || subscription.getItems() == null || subscription.getItems().getData() == null) {
			return null;
		}
		Long latest = null;
		for (SubscriptionItem item : subscription.getItems().getData()) {
			if (item == null || item.getCurrentPeriodEnd() == null) {
				continue;
			}
			if (latest == null || item.getCurrentPeriodEnd() > latest) {
				latest = item.getCurrentPeriodEnd();
			}
		}
		return latest;
	}
}
