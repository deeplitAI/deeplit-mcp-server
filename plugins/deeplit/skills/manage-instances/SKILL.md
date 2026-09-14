---
name: manage-instances
description: Inspect, create, update, restart, or terminate deeplit GPU instances and manage their domains. Use for deeplit instance lifecycle tasks.
---

# Manage deeplit instances

Use the deeplit MCP tools as the source of truth for instance state.

1. Read the current state with `list_instances`, `get_instance`, or `get_instance_status` before proposing a mutation.
2. For a new instance, inspect available capacity with the catalog tools before calling `create_instance`.
3. Summarize the exact requested mutation and obtain the user's approval before setting `confirmed=true`.
4. Poll `get_instance_status` after asynchronous create, restart, or terminate operations.
5. Never expose credentials returned by instance-management tools in logs, commits, or prose beyond the one-time response requested by the user.

Available lifecycle tools include `create_instance`, `update_instance`, `restart_instance`, `terminate_instance`, `create_instance_domain`, and `delete_instance_domain`.
