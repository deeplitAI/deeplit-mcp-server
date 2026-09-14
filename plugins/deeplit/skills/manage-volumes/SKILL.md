---
name: manage-volumes
description: Inspect and manage deeplit persistent volumes, including create, attach, detach, cold-store, and delete operations.
---

# Manage deeplit volumes

Read volume and instance state before changing attachments. Use `list_volumes` and `get_volume` for inspection.

For `create_volume`, `attach_volume`, `detach_volume`, `cold_store_volume`, or `delete_volume`, explain the impact and obtain approval before setting `confirmed=true`. Treat deletion and cold storage as high-impact operations.
