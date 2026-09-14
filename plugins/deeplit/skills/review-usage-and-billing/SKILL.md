---
name: review-usage-and-billing
description: Review deeplit wallet, transactions, instance billing, usage, and service logs. Use for cost analysis and instance diagnostics.
---

# Review usage and billing

Use `get_wallet_summary`, `list_wallet_transactions`, `get_instance_billing`, `get_payment_config`, and `get_topup_status` for billing reads. Payment checkout redirection is intentionally unavailable.

Use `get_instance_usage`, `get_instance_logs`, `get_instance_runtime_logs`, and `get_instance_service_logs` for diagnostics. Preserve request IDs when reporting failures so deeplit support can correlate the request across services.
